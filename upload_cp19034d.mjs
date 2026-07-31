import fs from 'fs';
import https from 'https';

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
  const query = "CP19034D-00 Clyde Concentration Stabilizer";
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
        const imgRes = await fetch(url, { agent, signal: AbortSignal.timeout(10000) });
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

        if ((isJpeg || isPng) && buffer.length > 5000) {
          console.log(`Success! Verified image size: ${buffer.length} bytes.`);
          const ext = isPng ? 'png' : 'jpeg';
          validImageDataUrl = `data:image/${ext};base64,${buffer.toString('base64')}`;
          break;
        }
      } catch (err) {
        console.log(`Failed to fetch ${url}`);
      }
    }
  } catch (e) {
    console.error("DDG Search failed:", e);
  }

  // If DDG blocked us or found nothing, we fallback to a placeholder text because we MUST create the product per user request.
  // But usually DDG works.

  console.log("Creating new product CP19034D-00 on flonexis.com...");

  const productData = {
    name: "Clyde DN15 Concentration Stabilizer CP19034D-00",
    brand: "Clyde Bergemann",
    model: "DN15 CP19034D-00",
    category: "Pneumatic Conveying Spares",
    description: "The Clyde DN15 CP19034D-00 is a critical Concentration Stabilizer (also known as a Fluidizing Nozzle or Aeration Air Injector) used in dense phase pneumatic conveying systems. It effectively regulates and stabilizes the concentration of materials (such as fly ash or cement) inside the pipeline, preventing blockages and ensuring smooth transport.\n\n**Alternate / International Codes**: \nDepending on the region and OEM supplier, this component may also be cross-referenced with generic aeration nozzles, fluidizing pads, or under alternate regional codes such as:\n- **Fluidizing Nozzle DN15**\n- **Aeration Injector Valve Assembly**\n- **OEM Equivalent Codes**: Commonly cross-referenced with standard industrial fluidization valves for ash handling.",
    specs: [
      "Model: CP19034D-00",
      "Size: DN15",
      "Type: Concentration Stabilizer / Fluidizing Nozzle",
      "Application: Dense Phase Pneumatic Conveying Systems",
      "Function: Stabilize material-to-air ratio and prevent pipe blockage"
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
    console.log("✅ Product CP19034D-00 CREATED successfully!");
  } else {
    console.error("Create failed:", await createRes.text());
  }
}

main();
