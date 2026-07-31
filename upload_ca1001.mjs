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
  const query = "Clyde CA1001 CA1003 CA1035 pneumatic cylinder";
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  console.log("Searching DuckDuckGo HTML for:", searchUrl);
  
  let validImageDataUrl = null;
  
  try {
    const res = await fetch(searchUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/114.0.0.0 Safari/537.36',
      }
    });
    const html = await res.text();
    
    const regex = /\/\/external-content\.duckduckgo\.com\/iu\/\?u=([^&"']+)/gi;
    let match;
    const imgUrls = [];
    while ((match = regex.exec(html)) !== null) {
      imgUrls.push(`https://external-content.duckduckgo.com/iu/?u=${match[1]}`);
    }

    console.log(`Found ${imgUrls.length} candidate images through DDG.`);

    for (let i = 0; i < Math.min(imgUrls.length, 5); i++) {
      const url = imgUrls[i];
      console.log(`[${i+1}] Fetching DDG CDN: ${url}`);
      try {
        const imgPath = `ca1001_candidate_${i}.dat`;
        execSync(`curl.exe -k -s -L -A "Mozilla/5.0" "${url}" -o ${imgPath}`);
        
        if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath);
          const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
          const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

          if ((isJpeg || isPng) && buffer.length > 5000) {
            console.log(`Success! Verified image size: ${buffer.length} bytes.`);
            let ext = isPng ? 'png' : 'jpeg';
            validImageDataUrl = `data:image/${ext};base64,${buffer.toString('base64')}`;
            break;
          } else {
             fs.unlinkSync(imgPath);
          }
        }
      } catch (err) {
        console.log(`Failed to fetch ${url}`);
      }
    }
  } catch (e) {
    console.error("DDG Search failed:", e.message);
  }

  console.log("Creating new merged product CA1001/CA1003/CA1035/CA1036 on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann CA1001 / CA1003 / CA1035 / CA1036 Cylinder Assembly",
    brand: "Clyde Bergemann",
    model: "CA1001 / CA1003 / CA1035 / CA1036",
    category: "Pneumatic Cylinders",
    description: "The Clyde Bergemann CA series (including CA1001, CA1003, CA1035, and CA1036) comprises robust pneumatic cylinder assemblies engineered for high-performance actuation in dense phase pneumatic conveying systems and dome valves.\n\nThese double-acting pneumatic cylinders provide the massive thrust necessary to shear through static columns of abrasive ash, ensuring reliable opening and closing of the dome valve. Designed as direct OEM replacements, these cylinder assemblies share common structural profiles and are built with corrosion-resistant housings and specialized heavy-duty seals.",
    specs: [
      "Compatible Models: CA1001, CA1003, CA1035, CA1036",
      "Application: Dome Valve Actuation / Pneumatic Conveying",
      "Type: Double-Acting Pneumatic Cylinder Assembly",
      "Features: High thrust capacity, heavy-duty wear rings, corrosion resistant"
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
    console.log("✅ Product CA Series CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
