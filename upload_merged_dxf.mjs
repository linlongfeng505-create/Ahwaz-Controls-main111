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
  const imgPath = "merged_dxf_real.jpg";

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
    name: "Clyde Bergemann A2958 / 2969 / DXF-15 / DXF-25 Series",
    brand: "Clyde Bergemann",
    model: "A2958 / 2969 / DXF-15 / DXF-25",
    category: "Pneumatic Valves & Controls",
    description: "The Clyde Bergemann DXF and A-Series (including models A2958, 2969, DXF-15, and DXF-25) represent the core pneumatic control valves and actuation units for Dome Valve systems. These heavy-duty pneumatic components control the inflation of the sealing ring and the actuation of the valve dome, ensuring synchronized and reliable operation in dense phase pneumatic conveying systems.\n\nDesigned for interchangeability and maximum durability, these valves share common mounting footprints and operational characteristics, making them ideal replacements for various generations of Clyde Bergemann ash handling systems.",
    specs: [
      "Compatible Models: A2958, 2969, DXF-15, DXF-25",
      "System Application: Dome Valve Pneumatic Actuation & Seal Control",
      "Function: Precision air flow control for inflatable seals",
      "Material: High-strength corrosion-resistant metal alloy"
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
    console.log("✅ Merged Product CREATED successfully with verified image!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
