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
  const query = "Kinetrol 034-100 actuator";
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
        const imgPath = `kinetrol_034_candidate_${i}.dat`;
        execSync(`curl.exe -k -s -L -A "Mozilla/5.0" "${url}" -o ${imgPath}`);
        
        if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath);
          const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
          const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
          const isWebp = buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

          if ((isJpeg || isPng || isWebp) && buffer.length > 5000) {
            console.log(`Success! Verified image size: ${buffer.length} bytes.`);
            let ext = 'jpeg';
            if (isPng) ext = 'png';
            if (isWebp) ext = 'webp';
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

  console.log("Creating new merged product Kinetrol 030-100 / 034-100 on flonexis.com...");

  const productData = {
    name: "Kinetrol 030-100 / 034-100 Pneumatic Rotary Actuator",
    brand: "Kinetrol",
    model: "030-100 / 034-100",
    category: "Pneumatic Actuators",
    description: "The Kinetrol 030-100 and 034-100 belong to the compact, high-efficiency Model 03 series of double-acting pneumatic rotary actuators. These highly sought-after actuators utilize Kinetrol's patented single moving part (vane) design, which completely eliminates the friction and wear problems associated with conventional rack-and-pinion actuators.\n\nBuilt for high-cycle, long-life operations in cramped industrial spaces, the 030-100 and 034-100 models provide smooth, direct quarter-turn (90-degree) rotational torque for small to medium-sized ball and butterfly valves. Featuring a robust zinc-alloy casing and Kinetrol's signature durable stove enamel finish, these actuators deliver reliable, leak-free actuation across demanding manufacturing, chemical, and process control applications.",
    specs: [
      "Models: 030-100, 034-100 (Model 03 Series)",
      "Type: Double-Acting Pneumatic Rotary Actuator",
      "Operation: Precision Quarter-turn (90°)",
      "Design: Frictionless single moving part vane",
      "Finish: Heavy-duty epoxy stove enamel for supreme corrosion resistance"
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
    console.log("✅ Product Kinetrol 030-100/034-100 CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
