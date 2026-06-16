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

function isSafePath(path) {
  return (
    typeof path === "string" &&
    /^(characters|chapters|organizations|seasons)\/[a-zA-Z0-9._-]+\.md$/.test(path) &&
    !path.includes("..")
  );
}

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const path = (url.searchParams.get("path") || "").trim();

    if (!isSafePath(path)) {
      return json(
        {
          error: "Invalid path. Use something like characters/hwajin-na.md",
        },
        400
      );
    }

    const index = await loadIndex(env);
    const page = (index.pages || []).find((item) => item.path === path);

    if (!page) {
      return json(
        {
          error: "Page not found",
          path,
        },
        404
      );
    }

    return json({
      title: page.title,
      section: page.section,
      path: page.path,
      url_path: page.url_path,
      content: page.content,
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
