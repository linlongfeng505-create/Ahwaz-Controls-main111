import fs from 'fs';
import https from 'https';
import { execSync } from 'child_process';

const agent = new https.Agent({ rejectUnauthorized: false });
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
  console.log("Downloading reference image for Clyde Dome Valve Seal...");
  // Use the verified TengKai dome valve spare parts image which perfectly represents the inflatable seals
  const imgUrl = "https://www.tengkai1.com/uploads/202215557/clyde-bergemann-dome-valve-spare57544694446.jpg";
  const imgPath = "p19080c_reference.jpg";
  let validImageDataUrl = null;

  try {
      execSync(`curl.exe -k -s -L -A "Mozilla/5.0" "${imgUrl}" -o ${imgPath}`);
      
      if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath);
          const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

          if (isJpeg && buffer.length > 5000) {
              console.log(`Success! Verified image size: ${buffer.length} bytes.`);
              validImageDataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
          }
      }
  } catch (e) {
      console.error("Image download failed:", e.message);
  }

  console.log("Creating new product P19080C-00 (DN50) on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann DN50 Insert Seal P19080C-00",
    brand: "Clyde Bergemann",
    model: "DN50 P19080C-00",
    category: "Dome Valve Spares",
    description: "The Clyde Bergemann P19080C-00 is a specialized Inflatable Insert Seal engineered specifically for compact DN50 (2-inch) Dome Valves. Manufactured from premium, high-temperature elastomeric compounds, this critical sealing ring creates an absolute airtight barrier to prevent the escape of highly abrasive media (such as fly ash and cement) in dense phase pneumatic conveying systems.\n\nBy inflating when the dome valve enters the closed position, it conforms perfectly to the dome surface, compensating for wear and ensuring pressure-tight integrity. Routine replacement of the P19080C-00 insert seal is paramount to avoiding pneumatic pressure loss and extending overall system efficiency.",
    specs: [
      "Part Number: P19080C-00",
      "Valve Size: DN50 (2-inch)",
      "Type: Inflatable Insert Seal / Sealing Ring",
      "Application: Clyde Bergemann Dome Valves (Ash Handling / Pneumatic Conveying)",
      "Material: High-temperature, abrasion-resistant elastomer"
    ],
    translations: {}
  };

  if (validImageDataUrl) {
      productData.extraImageDataUrls = [validImageDataUrl];
  } else {
      console.log("No valid image found. Creating product without image.");
  }

  const createRes = await fetchWithRetry('https://flonexis.com/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': '881001505Lin'
    },
    body: JSON.stringify(productData)
  });
  
  if (createRes.ok) {
    console.log("✅ Product P19080C-00 (DN50) CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
