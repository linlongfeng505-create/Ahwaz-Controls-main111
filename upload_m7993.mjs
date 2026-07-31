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
  console.log("Downloading M7993 image via curl...");
  const imgUrl = "https://www.tengkai1.com/uploads/202215557/clyde-bergemann-dome-valve-spare57544694446.jpg";
  const imgPath = "m7993_real.jpg";

  try {
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

  const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  if (!isJpeg) {
      console.error("Downloaded file is NOT a valid JPEG (likely an HTML anti-bot page). Cannot proceed.");
      return;
  }
  
  console.log(`Image downloaded and verified successfully. Size: ${buffer.length} bytes.`);
  
  const base64Image = buffer.toString('base64');
  const validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;

  console.log("Checking if product M7993 exists on flonexis.com...");
  let targetId = null;
  let currentImageUrls = [];
  try {
      const listRes = await fetchWithRetry('https://flonexis.com/api/products?limit=100');
      const listData = await listRes.json();
      const product = (listData.data || []).find(p => p.model && p.model.includes('M7993'));
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
    name: "Clyde Bergemann M7993 Dome Valve Seal Kit",
    brand: "Clyde Bergemann",
    model: "M7993",
    category: "Dome Valve Spares",
    description: "The Clyde Bergemann M7993 Seal Kit is a complete OEM replacement package designed to restore the airtight integrity of dome valves. This kit includes all the necessary high-temperature, wear-resistant elastomer rings and gaskets required for standard maintenance overhauls.\n\nRegular replacement using the M7993 kit prevents abrasive material leakage and extends the overall operational lifespan of the pneumatic conveying system.",
    specs: [
      "Kit Includes: Main seal ring, o-rings, and support gaskets",
      "Application: Clyde Bergemann Dome Valves",
      "Material: High-temp, abrasion-resistant elastomers",
      "Type: Complete Maintenance Seal Kit"
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
      delete productData.deleteImageIds; 
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
