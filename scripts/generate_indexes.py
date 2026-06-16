from pathlib import Path
import re

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


def title_from_filename(path: Path) -> str:
    return path.stem.replace("-", " ").replace("_", " ").title()


def title_from_file(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        text = path.read_text(encoding="utf-8", errors="ignore")

    for line in text.splitlines():
        match = re.match(r"^#\s+(.+)", line.strip())
        if match:
            return match.group(1).strip()

    return title_from_filename(path)


def natural_sort_key(path: Path):
    parts = re.split(r"(\d+)", path.stem.lower())
    return [int(part) if part.isdigit() else part for part in parts]


def generate_section_index(section_name: str, config: dict):
    section_dir = DOCS_DIR / section_name
    section_dir.mkdir(parents=True, exist_ok=True)

    pages = sorted(
        [
            page
            for page in section_dir.glob("*.md")
            if page.name != "index.md" and not page.name.startswith(".")
        ],
        key=natural_sort_key,
    )

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
            title = title_from_file(page)
            lines.append(f"- [{title}]({page.name})")
    else:
        lines.append("No pages have been added yet.")

    lines.append("")
    lines.append("<!-- This page is generated automatically by scripts/generate_indexes.py. -->")
    lines.append("")

    index_path = section_dir / "index.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Generated {index_path} with {len(pages)} page(s).")


def main():
    for section_name, config in SECTIONS.items():
        generate_section_index(section_name, config)


if __name__ == "__main__":
    main()
