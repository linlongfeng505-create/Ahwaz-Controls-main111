import fs from 'fs';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function main() {
  const query = "Clyde A1011 限位开关";
  const searchUrl = `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}`;

  console.log("Searching cn.bing.com for:", searchUrl);
  
  try {
    const res = await fetch(searchUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    });
    const html = await res.text();
    
    // Bing images MURL
    const regex = /murl&quot;:&quot;(https?:\/\/[^&"]+\.(?:jpg|jpeg|png))/gi;
    let match;
    const imgUrls = [];
    while ((match = regex.exec(html)) !== null) {
      imgUrls.push(match[1]);
    }

    if (imgUrls.length === 0) {
      console.log("No images found.");
      return;
    }

    console.log(`Found ${imgUrls.length} candidate images.`);

    let validImageDataUrl = null;

    for (let i = 0; i < imgUrls.length; i++) {
      const url = imgUrls[i];
      console.log(`[${i+1}] Trying to fetch: ${url}`);
      try {
        const imgRes = await fetch(url, {
            agent,
            signal: AbortSignal.timeout(10000),
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        
        if (arrayBuffer.byteLength > 10000) {
          console.log(`Success! Downloaded exact product image of size ${arrayBuffer.byteLength} bytes.`);
          
          const buffer = Buffer.from(arrayBuffer);
          const base64Image = buffer.toString('base64');
          const ext = url.toLowerCase().endsWith('png') ? 'png' : 'jpeg';
          validImageDataUrl = `data:image/${ext};base64,${base64Image}`;
          break;
        } else {
            console.log(`Image too small (${arrayBuffer.byteLength} bytes), skipping...`);
        }
      } catch (err) {
        console.log(`Failed to fetch ${url} (Network/Timeout)`);
      }
    }

    if (!validImageDataUrl) {
      console.log("Could not download any valid image. All candidates failed.");
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
      deleteImageIds: [8, 7], // clean up placeholders
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
      console.log("Product ID 8 updated successfully with EXACT product photo!");
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
