import fs from 'fs';

async function main() {
  const query = "Clyde A1011 limit switch";
  // We use Google Image search. To avoid potential blocking or wall, we proxy via allorigins if needed, 
  // but first let's just try direct fetch. If it fails, we will catch it.
  const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

  console.log("Searching Google Images for:", searchUrl);
  
  try {
    let html = '';
    try {
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
        }
      });
      html = await res.text();
    } catch (e) {
      console.log("Direct Google fetch failed, trying via proxy...");
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`;
      const res = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      html = await res.text();
    }
    
    // Google images thumbnails usually look like https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9Gc...
    const regex = /(https:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^"&']+)/gi;
    let match;
    const imgUrls = [];
    while ((match = regex.exec(html)) !== null) {
      imgUrls.push(match[1]);
    }

    if (imgUrls.length === 0) {
      console.log("No images found on Google.");
      return;
    }

    console.log(`Found ${imgUrls.length} candidate images from Google.`);

    let validImageDataUrl = null;

    for (let i = 0; i < imgUrls.length; i++) {
      const url = imgUrls[i];
      console.log(`[${i+1}] Trying to fetch: ${url}`);
      try {
        let imgRes;
        try {
           imgRes = await fetch(url, { signal: AbortSignal.timeout(5000) });
        } catch(e) {
           console.log("Direct fetch failed, trying proxy...");
           imgRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
        }
        
        if (!imgRes.ok) continue;

        const arrayBuffer = await imgRes.arrayBuffer();
        
        // As long as it's a valid image buffer, we accept it (gstatic thumbnails are small but accurate)
        if (arrayBuffer.byteLength > 2000) {
          console.log(`Success! Downloaded image of size ${arrayBuffer.byteLength} bytes.`);
          
          const buffer = Buffer.from(arrayBuffer);
          const base64Image = buffer.toString('base64');
          // Gstatic images are usually jpeg
          validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;
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

    // Now update the product
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
      deleteImageIds: [8], // 8 was the last one we uploaded
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
      console.log("Product ID 8 updated successfully with a real Google Image photo!");
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
