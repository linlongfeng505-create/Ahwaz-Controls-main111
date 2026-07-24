import fs from "fs";
import path from "path";

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Usage: node publish-article.mjs <path-to-json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(process.cwd(), jsonPath), "utf-8");
  const data = JSON.parse(raw);

  if (!data.title || !data.content) {
    console.error("JSON must contain title and content");
    process.exit(1);
  }

  const slug = data.slug || data.title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();

  const payload = {
    title: data.title,
    slug: slug,
    summary: data.summary || "",
    content: data.content,
    published: true,
  };

  const API_URL = process.env.API_URL || "https://flonexis.com/api/articles";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "881001505Lin";

  console.log(`Publishing to ${API_URL}...`);

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": ADMIN_PASSWORD,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`❌ Failed to publish! Status: ${res.status}`);
    console.error(errText);
    process.exit(1);
  }

  const result = await res.json();
  console.log(`✅ Article published successfully! ID: ${result.id}, Slug: ${result.slug}`);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
