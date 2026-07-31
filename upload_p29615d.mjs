import fs from 'fs';
import { execSync } from 'child_process';

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
      if (!res.ok && res.status !== 404) {
         console.warn(`Attempt ${i+1}: Server returned ${res.status}`);
      }
      return res;
    } catch (e) {
      console.warn(`Attempt ${i+1} failed: ${e.message}`);
      if (i === retries - 1) throw e;
      await delay(2000);
    }
  }
}

async function main() {
  console.log("Downloading P29615D image via curl...");
  const imgUrl = "https://www.tengkai1.com/uploads/202215557/clyde-bergemann-dome-valve-spare57544694446.jpg";
  const imgPath = "p29615d_real.jpg";

  try {
      // Use curl to bypass Node.js strict SSL/TLS requirements
      execSync(`curl.exe -k -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${imgUrl}" -o ${imgPath}`);
  } catch (e) {
      console.error("curl failed", e);
  }

  if (!fs.existsSync(imgPath)) {
    console.error("Failed to download image file!");
    return;
  }
  
  const buffer = fs.readFileSync(imgPath);
  
  if (buffer.length < 5000) {
    console.error("Image is too small, might be an error page.");
    return;
  }

  // Verify it's a real JPEG
  const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  if (!isJpeg) {
      console.error("Downloaded file is NOT a valid JPEG (likely an HTML anti-bot page). Cannot proceed.");
      return;
  }
  
  console.log(`Image downloaded and verified successfully. Size: ${buffer.length} bytes.`);
  
  const base64Image = buffer.toString('base64');
  const validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;

  console.log("Checking if product P29615D exists on flonexis.com...");
  let targetId = null;
  let currentImageUrls = [];
  try {
      const listRes = await fetchWithRetry('https://flonexis.com/api/products?limit=100');
      const listData = await listRes.json();
      const product = (listData.data || []).find(p => p.model && p.model.includes('P29615D'));
      if (product) {
          targetId = product.id;
          currentImageUrls = product.imageUrls || [];
          console.log(`Found existing product ID: ${targetId}`);
      }
  } catch (e) {
      console.error("Could not fetch product list:", e);
      return;
  }

  const deleteIds = currentImageUrls.map(url => {
    const match = url.match(/\/images\/(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }).filter(Boolean);

  const productData = {
    name: "P29615D-00 Clyde Bergemann Dome Valve Spigot Ring",
    brand: "Clyde Bergemann",
    model: "P29615D-00",
    category: "Dome Valve Spares",
    description: "The P29615D-00 Spigot Ring is an essential sealing component specifically designed for Clyde Bergemann dome valves. It acts as an inflatable seal ring to ensure a completely airtight closure, preventing material leakage and maintaining optimal pressure in pneumatic conveying systems.\n\nManufactured from highly durable, wear-resistant elastomer materials to withstand abrasive industrial environments.",
    specs: [
      "Application: Sealing for Clyde Bergemann Dome Valves",
      "Function: Inflatable Airtight Seal",
      "Material: Wear-resistant industrial elastomer",
      "Type: Spigot Ring / Inflatable Seal"
    ],
    deleteImageIds: deleteIds,
    extraImageDataUrls: [validImageDataUrl],
    translations: {}
  };

  if (targetId) {
      console.log(`Updating existing product ${targetId}...`);
      const updateRes = await fetchWithRetry(`https://flonexis.com/api/products/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': '881001505Lin'
        },
        body: JSON.stringify(productData)
      });
      if (updateRes.ok) {
        console.log("✅ Product UPDATED successfully with verified image!");
      } else {
        console.error("Update failed:", await updateRes.text());
      }
  } else {
      console.log("Product not found. Creating NEW product...");
      delete productData.deleteImageIds; // remove update-only field
      const createRes = await fetchWithRetry('https://flonexis.com/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': '881001505Lin'
        },
        body: JSON.stringify(productData)
      });
      if (createRes.ok) {
        console.log("✅ Product CREATED successfully with verified image!");
      } else {
        console.error("Create failed:", await createRes.text());
      }
  }
}

main();
