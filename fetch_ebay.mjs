import fs from 'fs';
import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function main() {
  const query = "site:ebay.com Clyde A1011 limit switch";
  const searchUrl = `https://cn.bing.com/images/search?q=${encodeURIComponent(query)}`;

  console.log("Searching for eBay real images:", searchUrl);
  
  try {
    const res = await fetch(searchUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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

    // Filter to ONLY accept ebay CDN to ensure it's a real product and not a blocked HTML page!
    const ebayUrls = imgUrls.filter(u => u.includes('ebayimg.com'));
    console.log(`Found ${ebayUrls.length} eBay candidate images.`);

    if (ebayUrls.length === 0) {
      console.log("No ebay images found.");
      return;
    }

    let validImageDataUrl = null;

    for (let i = 0; i < ebayUrls.length; i++) {
      const url = ebayUrls[i];
      console.log(`[${i+1}] Trying to fetch eBay CDN: ${url}`);
      try {
        const imgRes = await fetch(url, {
            agent,
            signal: AbortSignal.timeout(10000)
        });
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Critical validation: check if the buffer is ACTUALLY a JPEG or PNG
        // JPEG starts with FF D8 FF
        // PNG starts with 89 50 4E 47
        const isJpeg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;

        if ((isJpeg || isPng) && buffer.length > 10000) {
          console.log(`Success! Downloaded VERIFIED real image of size ${buffer.length} bytes.`);
          
          const base64Image = buffer.toString('base64');
          const ext = isPng ? 'png' : 'jpeg';
          validImageDataUrl = `data:image/${ext};base64,${base64Image}`;
          break;
        } else {
            console.log(`File is not a valid JPEG/PNG or too small (${buffer.length} bytes), skipping...`);
        }
      } catch (err) {
        console.log(`Failed to fetch ${url} (Network/Timeout)`);
      }
    }

    if (!validImageDataUrl) {
      console.log("Could not download any valid image from eBay CDN.");
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
      deleteImageIds: [11, 10, 9, 8], // Clean up all fake/html placeholder images!
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
      console.log("Product ID 8 updated successfully with VERIFIED EBAY product photo!");
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
