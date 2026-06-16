from pathlib import Path
import re
import json

DOCS_DIR = Path("docs")

SECTIONS = {
    "characters": {
        "title": "Characters",
        "intro": "This section contains character pages for the True Education manhwa.",
        "list_title": "Character List",
    },
    "organizations": {
        "title": "Organizations",
        "intro": "This section contains organizations, schools, groups, and institutions from True Education.",
        "list_title": "Organization List",
    },
    "seasons": {
        "title": "Seasons",
        "intro": "This section organizes True Education by seasons.",
        "list_title": "Season List",
    },
    "chapters": {
        "title": "Chapters",
        "intro": "This section organizes True Education by chapters.",
        "list_title": "Chapter List",
    },
}


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="ignore")


def title_from_filename(path: Path) -> str:
    return path.stem.replace("-", " ").replace("_", " ").title()


def title_from_text(path: Path, text: str) -> str:
    for line in text.splitlines():
        match = re.match(r"^#\s+(.+)", line.strip())
        if match:
            return match.group(1).strip()
    return title_from_filename(path)


def natural_sort_key(path: Path):
    parts = re.split(r"(\d+)", path.stem.lower())
    return [int(part) if part.isdigit() else part for part in parts]


def get_section_pages(section_name: str):
    section_dir = DOCS_DIR / section_name
    section_dir.mkdir(parents=True, exist_ok=True)

    return sorted(
        [
            page
            for page in section_dir.glob("*.md")
            if page.name != "index.md" and not page.name.startswith(".")
        ],
        key=natural_sort_key,
    )


def generate_section_index(section_name: str, config: dict):
    pages = get_section_pages(section_name)

    lines = [
        f"# {config['title']}",
        "",
        config["intro"],
        "",
        f"## {config['list_title']}",
        "",
    ]

    if pages:
        for page in pages:
            text = read_text(page)
            title = title_from_text(page, text)
            lines.append(f"- [{title}]({page.name})")
    else:
        lines.append("No pages have been added yet.")

    lines.append("")
    lines.append("<!-- This page is generated automatically by scripts/generate_indexes.py. -->")
    lines.append("")

    index_path = DOCS_DIR / section_name / "index.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {index_path} with {len(pages)} page(s).")


def generate_wiki_json_index():
    items = []

    for section_name in SECTIONS:
        for page in get_section_pages(section_name):
            text = read_text(page)
            title = title_from_text(page, text)

            relative_path = f"{section_name}/{page.name}"
            url_path = f"/{section_name}/{page.stem}/"

            items.append(
                {
                    "title": title,
                    "section": section_name,
                    "path": relative_path,
                    "url_path": url_path,
                    "content": text,
                }
            )

    output = {
        "site": "True Education Manhwa Wiki",
        "page_count": len(items),
        "pages": items,
    }

    index_path = DOCS_DIR / "wiki-index.json"
    index_path.write_text(
        json.dumps(output, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Generated {index_path} with {len(items)} indexed page(s).")


def main():
    for section_name, config in SECTIONS.items():
        generate_section_index(section_name, config)

    generate_wiki_json_index()


if __name__ == "__main__":
    main()
