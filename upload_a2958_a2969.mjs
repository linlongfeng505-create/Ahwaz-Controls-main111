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
  console.log("Downloading merged product image via curl...");
  const imgUrl = "https://www.tengkai1.com/Content/uploads/2023289457/202307181503195fa2cbcf2d0242058f801c3d439af60d.jpg";
  const imgPath = "merged_a2958_a2969.jpg";

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

  console.log("Creating new merged product on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann Non-return Valve A2958 / A2969",
    brand: "Clyde Bergemann",
    model: "A2958 / A2969",
    category: "Valves & Controls",
    description: "The Clyde Bergemann A2958 and A2969 series represent industrial-grade Non-return Valves (Check Valves) explicitly designed for pneumatic ash handling and material transport systems. Serving as critical air supply non-return or diaphragm check valves, they prevent the backflow of highly abrasive materials (such as fly ash or cement) into the pneumatic control lines.\n\nConstructed from heavy-duty cast iron with threaded connections, these valves ensure long-term durability in extreme environments. The series combines two main sizing models: the A2958 (DN15, 0.5-inch) and the A2969 (DN25, 1-inch), allowing for versatile integration into various Clyde Bergemann Dome Valve systems.",
    specs: [
      "Models: A2958 (DN15, 0.5\"), A2969 (DN25, 1\")",
      "Type: Non-return Valve / Check Valve / One-way Valve",
      "Connection Type: Threaded connection",
      "Material: Heavy-duty Cast Iron",
      "System Application: Pneumatic Ash Handling & Dome Valve Control"
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
    console.log("✅ Merged Product A2958/A2969 CREATED successfully with verified image!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
