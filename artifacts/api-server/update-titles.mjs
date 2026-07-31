import fs from "fs";

async function main() {
  const updates = [
    { id: 22, title: "Clyde Dome Valve Troubleshooting: Fixing Inflatable Seal Leaks & Timing Issues" },
    { id: 23, title: "Clyde Dome Valve Inflatable Seal Failures: Deep Dive into PLC Timing and Pressure" },
    { id: 24, title: "Clyde Dome Valve Jamming Troubleshooting: How to Fix Material Build-up & Sticking" },
    { id: 25, title: "Clyde Dome Valve Low Seal Pressure Alarm: Troubleshooting Pneumatics & Switches" },
    { id: 26, title: "Clyde Dome Valve Seal Replacement SOP: 6-Step Installation & Commissioning Guide" },
    { id: 27, title: "Clyde Dome Valve Upgrades for Extreme Conditions: Tungsten Carbide & Viton Seals" },
    { id: 28, title: "Prevent Clyde Dome Valve Blowouts: Upgrading to Closed-Loop Pressure Switch Control" }
  ];

  const API_URL = process.env.API_URL || "https://flonexis.com/api/articles";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "881001505Lin";

  for (const { id, title } of updates) {
    // Fetch existing
    const res = await fetch(`${API_URL}/${id}`, {
      headers: { "x-admin-password": ADMIN_PASSWORD }
    });
    if (!res.ok) {
      console.error(`Failed to fetch ID ${id}:`, res.status);
      continue;
    }
    const article = await res.json();
    
    // Generate new slug
    const slug = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now();
    
    const payload = {
      ...article,
      title: title,
      slug: slug
    };
    
    // Clean payload for insert schema
    delete payload.id;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.coverUrl;
    delete payload.recommendedArticles;
    delete payload.recommendedProducts;

    const putRes = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": ADMIN_PASSWORD
      },
      body: JSON.stringify(payload)
    });
    
    if (!putRes.ok) {
      const err = await putRes.text();
      console.error(`Failed to update ID ${id}:`, putRes.status, err);
    } else {
      console.log(`Successfully updated ID ${id} -> ${title}`);
    }
  }
}

main().catch(console.error);
