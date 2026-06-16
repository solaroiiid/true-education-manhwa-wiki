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
    throw new Error("Could not load wiki-index.json.");
  }

  return await response.json();
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const section = (url.searchParams.get("section") || "").trim().toLowerCase();

    const allowedSections = ["characters", "chapters", "organizations", "seasons"];

    if (section && !allowedSections.includes(section)) {
      return json(
        {
          error: "Invalid section",
          allowed_sections: allowedSections,
        },
        400
      );
    }

    const index = await loadIndex(env);

    let pages = index.pages || [];

    if (section) {
      pages = pages.filter((page) => page.section === section);
    }

    pages = pages
      .map((page) => ({
        title: page.title,
        section: page.section,
        path: page.path,
        url_path: page.url_path,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));

    return json({
      section: section || null,
      count: pages.length,
      pages,
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
