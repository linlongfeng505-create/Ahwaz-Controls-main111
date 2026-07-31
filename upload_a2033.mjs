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
  const query = "Clyde Bergemann A2033 limit switch";
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
        const imgPath = `a2033_candidate_${i}.dat`;
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

  console.log("Creating new product A2033 on flonexis.com...");

  const productData = {
    name: "Clyde Bergemann A2033 Pneumatic Limit Switch",
    brand: "Clyde Bergemann",
    model: "A2033",
    category: "Valves & Controls",
    description: "The Clyde Bergemann A2033 is a heavy-duty pneumatic limit switch specifically designed to detect the mechanical position of Dome Valves (such as DN50 and DN80 series) within pneumatic material conveying systems. \n\nConstructed from durable lightweight aluminum (distinguishing it from the brass-bodied A1011), this critical sensor ensures proper synchronization between the mechanical movement of the dome and the inflation of the sealing ring. Built to operate in extremely abrasive and high-temperature environments, the A2033 prevents operational faults and protects the dome valve from premature failure.",
    specs: [
      "Model: A2033",
      "Type: Pneumatic Limit Switch / Position Sensor",
      "Material: Aluminum housing",
      "Operating Pressure: 0.4 - 0.6 MPa (Max 1.0 MPa)",
      "Protection Rating: IP67 (High dust/water resistance)",
      "Application: Dome Valve position detection"
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
    console.log("✅ Product A2033 CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
