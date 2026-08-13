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
  console.log("Downloading C73451-A430-D81 image via curl...");
  // Found this image on the same b2esurplus BigCommerce CDN from previous search
  const imgUrl = "https://cdn11.bigcommerce.com/s-hdj6s/images/stencil/500x659/products/46469/103929/siemens-c73451-a430-d81__13252.1774749711.jpg?c=2";
  const imgPath = "c73451_d81_real.jpg";

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

  console.log("Creating new product C73451-A430-D81 on flonexis.com...");

  const productData = {
    name: "Siemens C73451-A430-D81 Pneumatic Block (Double-Acting) for SIPART PS2",
    brand: "Siemens",
    model: "C73451-A430-D81",
    category: "Positioner Spares",
    description: "The Siemens C73451-A430-D81 is the OEM Double-Acting Pneumatic Block (pneumatic module / I/P converter block) for the SIPART PS2 intelligent valve positioner (6DR5.1 series). Unlike the single-acting variant (C73451-A430-D80), this double-acting module provides two opposing pneumatic outputs, enabling precise bidirectional control of double-acting (piston-type) pneumatic actuators without the need for a spring return.\n\nSupplied with original factory seals and mounting hardware, the C73451-A430-D81 is a direct OEM-equivalent replacement that fully restores the positioning accuracy and dynamic response of SIPART PS2 positioners. It is a mission-critical spare for process control systems across power generation, petrochemical, pharmaceutical, and water treatment industries.",
    specs: [
      "Part Number: C73451-A430-D81",
      "Compatible With: Siemens SIPART PS2 (6DR5.1 series)",
      "Type: Double-Acting Pneumatic Block / I-P Converter Module",
      "Includes: Factory seal and mounting screws",
      "Function: Dual pneumatic output for double-acting (piston) actuators"
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
    console.log("✅ Product C73451-A430-D81 CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
