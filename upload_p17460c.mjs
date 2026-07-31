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
  const imgPath = "p17460c_reference.jpg";
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

  console.log("Creating new product P17460C-01 (DN200) on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann DN200 Insert Seal P17460C-01",
    brand: "Clyde Bergemann",
    model: "DN200 P17460C-01",
    category: "Dome Valve Spares",
    description: "The Clyde Bergemann P17460C-01 is a critical Inflatable Insert Seal explicitly designed for DN200 (8-inch) Dome Valves. Formulated from advanced high-temperature elastomeric compounds, this sealing ring provides a pressure-tight barrier against highly abrasive materials such as fly ash, cement, and bulk minerals during dense phase pneumatic conveying.\n\nUpon closure of the dome valve, this seal inflates to create a perfectly airtight closure over the dome surface, preventing pressure drops and material leakage. Regular replacement of the P17460C-01 ensures optimal performance and extends the lifespan of the pneumatic handling system.",
    specs: [
      "Part Number: P17460C-01",
      "Valve Size: DN200 (8-inch)",
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
    console.log("✅ Product P17460C-01 (DN200) CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
