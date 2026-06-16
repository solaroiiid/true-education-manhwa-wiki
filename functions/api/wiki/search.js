function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
    },
  });
}

async function loadIndex(env) {
  const response = await env.ASSETS.fetch("https://assets.local/wiki-index.json");

  if (!response.ok) {
    throw new Error("Could not load wiki-index.json. Make sure the build generated it.");
  }

  return await response.json();
}

function normalize(text) {
  return String(text || "").toLowerCase();
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeExcerpt(content, terms) {
  const clean = String(content || "").replace(/\s+/g, " ").trim();

  if (!clean) return "";

  const lower = clean.toLowerCase();
  const foundTerm = terms.find((term) => lower.includes(term));

  if (!foundTerm) {
    return clean.slice(0, 280);
  }

  const index = lower.indexOf(foundTerm);
  const start = Math.max(0, index - 120);
  const end = Math.min(clean.length, index + 220);

  return `${start > 0 ? "..." : ""}${clean.slice(start, end)}${end < clean.length ? "..." : ""}`;
}

function scorePage(page, terms) {
  const title = normalize(page.title);
  const path = normalize(page.path);
  const content = normalize(page.content);

  let score = 0;

  for (const term of terms) {
    if (!term) continue;

    if (title.includes(term)) score += 50;
    if (path.includes(term)) score += 20;

    const matches = content.match(new RegExp(escapeRegex(term), "g"));
    if (matches) score += Math.min(matches.length, 30);
  }

  return score;
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);

    const q = (url.searchParams.get("q") || "").trim();
    const section = (url.searchParams.get("section") || "").trim().toLowerCase();
    const limit = Math.min(Number(url.searchParams.get("limit") || 8), 20);

    const index = await loadIndex(env);

    let pages = index.pages || [];

    if (section) {
      pages = pages.filter((page) => page.section === section);
    }

    const terms = q
      .toLowerCase()
      .split(/\s+/)
      .map((term) => term.trim())
      .filter(Boolean);

    let results = pages;

    if (terms.length > 0) {
      results = pages
        .map((page) => ({
          ...page,
          score: scorePage(page, terms),
        }))
        .filter((page) => page.score > 0)
        .sort((a, b) => b.score - a.score);
    } else {
      results = pages.sort((a, b) => a.title.localeCompare(b.title));
    }

    results = results.slice(0, limit).map((page) => ({
      title: page.title,
      section: page.section,
      path: page.path,
      url_path: page.url_path,
      score: page.score || null,
      excerpt: makeExcerpt(page.content, terms),
    }));

    return json({
      query: q,
      section: section || null,
      count: results.length,
      results,
    });
  } catch (error) {
    return json(
      {
        error: error.message || "Unknown error",
      },
      500
    );
  }
}

export async function onRequestOptions() {
  return json({ ok: true });
}
