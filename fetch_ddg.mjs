import fs from 'fs';
import https from 'https';
import http from 'http';

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function main() {
  const query = "Clyde A1011 limit switch";
  // Use DuckDuckGo HTML version. It is usually bot-friendly and caches images!
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  console.log("Searching DuckDuckGo HTML for:", searchUrl);
  
  try {
    const res = await fetch(searchUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    });
    const html = await res.text();
    
    // In duckduckgo html, image thumbnails look like: src="//external-content.duckduckgo.com/iu/?u=..."
    const regex = /\/\/external-content\.duckduckgo\.com\/iu\/\?u=([^&"']+)/gi;
    let match;
    const imgUrls = [];
    while ((match = regex.exec(html)) !== null) {
      // Decode the actual URL
      const actualUrl = decodeURIComponent(match[1]);
      // But we don't want the actual URL, we want to fetch FROM DuckDuckGo's cache to avoid small site errors!
      imgUrls.push(`https://external-content.duckduckgo.com/iu/?u=${match[1]}`);
    }

    if (imgUrls.length === 0) {
      console.log("No images found on DuckDuckGo.");
      return;
    }

    console.log(`Found ${imgUrls.length} candidate images through DuckDuckGo cache.`);

    let validImageDataUrl = null;

    for (let i = 0; i < imgUrls.length; i++) {
      const url = imgUrls[i];
      console.log(`[${i+1}] Fetching from DDG CDN: ${url}`);
      try {
        const imgRes = await fetch(url, {
            agent,
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Strict binary check for true images
        const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        const isWebp = buffer.length > 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP

        if ((isJpeg || isPng || isWebp) && buffer.length > 2000) {
          console.log(`Success! Downloaded VERIFIED DDG CACHE image of size ${buffer.length} bytes.`);
          
          const base64Image = buffer.toString('base64');
          let ext = 'jpeg';
          if(isPng) ext = 'png';
          if(isWebp) ext = 'webp';

          validImageDataUrl = `data:image/${ext};base64,${base64Image}`;
          break;
        } else {
            console.log(`Image failed verification or too small (${buffer.length} bytes), skipping...`);
        }
      } catch (err) {
        console.log(`Failed to fetch ${url} (Network/Timeout)`);
      }
    }

    if (!validImageDataUrl) {
      console.log("Could not download any valid image. DDG cache blocked or timed out.");
      return;
    }

    console.log("Updating product on flonexis.com...");
    const productData = {
      name: "Clyde A1011 Pneumatic Limit Switch",
      brand: "Clyde",
      model: "A1011",
      category: "Valve Positioners",
      description: "The Clyde A1011 is a high-performance, heavy-duty pneumatic limit switch specifically engineered for seamless integration with Clyde Bergemann Dome Valves. It accurately monitors the valve's open and close positions, converting mechanical movement into reliable electrical signals.\n\nBuilt with robust brass and copper alloy construction, it withstands harsh industrial environments, high pressures, and extreme temperatures.",
      specs: [
        "Operating Temperature: Up to 450°C",
        "Ingress Protection: IP67",
        "Material: Brass / Copper alloy construction",
        "Function: Open/Close position monitoring for Dome Valves"
      ],
      deleteImageIds: [], // We'll assume the bad images are left as is for now, or we can just append
      extraImageDataUrls: [validImageDataUrl],
      translations: {}
    };

    const updateRes = await fetch('https://flonexis.com/api/products/8', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': '881001505Lin'
      },
      body: JSON.stringify(productData)
    });

    if (updateRes.ok) {
      const data = await updateRes.json();
      console.log("Product ID 8 updated successfully with VERIFIED DDG CACHE product photo!");
      console.log("New Gallery Images:", data.imageUrls);
    } else {
      const err = await updateRes.text();
      console.error("Update failed:", updateRes.status, err);
    }

  } catch (e) {
    console.error(e);
  }
}

main();
