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
  console.log("Downloading C73451-A430-D80 image via curl...");
  const imgUrl = "https://cdn11.bigcommerce.com/s-hdj6s/images/stencil/500x659/products/45352/112066/siemens-c73451-a430-d80__47745.1774762703.jpg?c=2";
  const imgPath = "c73451_real.jpg";

  try {
      execSync(`curl.exe -k -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${imgUrl}" -o ${imgPath}`);
  } catch (e) {
      console.error("curl failed", e);
  }

  let validImageDataUrl = null;

  if (fs.existsSync(imgPath)) {
    const buffer = fs.readFileSync(imgPath);
    const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    if (isJpeg && buffer.length > 5000) {
      console.log(`Image downloaded and verified successfully. Size: ${buffer.length} bytes.`);
      validImageDataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    } else {
      console.log(`Image not valid JPEG or too small (${buffer.length} bytes).`);
    }
  } else {
    console.log("Image file not found after download.");
  }

  console.log("Creating new product C73451-A430-D80 on flonexis.com...");

  const productData = {
    name: "Siemens C73451-A430-D80 Pneumatic Block (Single-Acting) for SIPART PS2",
    brand: "Siemens",
    model: "C73451-A430-D80",
    category: "Positioner Spares",
    description: "The Siemens C73451-A430-D80 is the OEM Single-Acting Pneumatic Block (also known as the pneumatic module or I/P converter block) for the widely deployed SIPART PS2 intelligent valve positioner (6DR5.1 series). This critical component converts the positioner's electrical control signal into a precise pneumatic output that drives single-acting (spring-return) pneumatic actuators.\n\nShipped complete with factory seals and mounting screws, the C73451-A430-D80 is a direct drop-in replacement that restores full positioning accuracy and response speed to aging or malfunctioning SIPART PS2 units. It is an essential spare part for process control engineers maintaining valve automation in power generation, petrochemical, water treatment, and pharmaceutical facilities.",
    specs: [
      "Part Number: C73451-A430-D80",
      "Compatible With: Siemens SIPART PS2 (6DR5.1 series)",
      "Type: Single-Acting Pneumatic Block / I-P Converter Module",
      "Includes: Factory seal and mounting screws",
      "Function: Converts electrical signal to pneumatic output for spring-return actuators"
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
    console.log("✅ Product C73451-A430-D80 CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
