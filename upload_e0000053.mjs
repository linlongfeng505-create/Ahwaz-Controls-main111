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
  console.log("Downloading E0000053 image via curl...");
  const imgUrl = "https://img3.fr-trading.com/2/5_423_3369270_800_800.jpg.webp";
  const imgPath = "e0000053_real.webp";

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
  
  if (buffer.length < 1000) {
    console.error("Image is too small, might be an error page.");
    return;
  }

  const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isWebp = buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; 
  
  if (!isJpeg && !isPng && !isWebp) {
      console.error("Downloaded file is NOT a valid JPEG/PNG/WEBP (likely an HTML anti-bot page). Cannot proceed.");
      return;
  }
  
  let ext = 'jpeg';
  if (isPng) ext = 'png';
  if (isWebp) ext = 'webp';

  console.log(`Image downloaded and verified successfully (${ext}). Size: ${buffer.length} bytes.`);
  
  const base64Image = buffer.toString('base64');
  const validImageDataUrl = `data:image/${ext};base64,${base64Image}`;

  console.log("Creating new product e0000053 on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann E0000053 Sootblower Drag Chain",
    brand: "Clyde Bergemann",
    model: "E0000053",
    category: "Sootblower Spares",
    description: "The Clyde Bergemann E0000053 is a highly durable industrial drag chain (cable carrier) specifically designed for boiler sootblowers. This essential component provides reliable protection and guidance for power and control cables during the repeated linear travel of the sootblower lance.\n\nManufactured to OEM specifications, the E0000053 drag chain guarantees high tensile strength, resistance to extreme thermal environments, and long operational life, preventing cable wear and system failures in harsh ash cleaning applications.",
    specs: [
      "Part Number: E0000053",
      "Application: Cable protection and guidance for Sootblowers",
      "Type: Industrial Drag Chain / Cable Carrier",
      "Feature: High thermal resistance and mechanical durability"
    ],
    extraImageDataUrls: [validImageDataUrl],
    translations: {}
  };

  const createRes = await fetchWithRetry('https://flonexis.com/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': '881001505Lin'
    },
    body: JSON.stringify(productData)
  });
  
  if (createRes.ok) {
    console.log("✅ Product E0000053 CREATED successfully with verified image!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
