import fs from 'fs';

async function main() {
  console.log("Starting proxy-based scraping to get the exact Clyde A1011 product...");

  // We know tengkai1.com has the exact product page. 
  const targetUrl = 'https://www.tengkai1.com/dome-valve/clyde-air-control-limit-switch-a1011-a2033.html';
  // Use allorigins to bypass local firewall/GFW
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

  try {
    console.log("Fetching exact product page via proxy...");
    const res = await fetch(proxyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();
    
    // Look for product image in the HTML (usually ends in .jpg)
    // Tengkai images might be like /uploads/..., let's find anything looking like a product image
    const regex = /https?:\/\/(?:www\.)?tengkai1\.com[^"'\s]*\.(?:jpg|jpeg|png)/gi;
    let match;
    const imgUrls = [];
    while ((match = regex.exec(html)) !== null) {
      imgUrls.push(match[0]);
    }

    if (imgUrls.length === 0) {
      console.log("No product images found on the page via regex.");
      return;
    }

    // Filter for plausible product images
    const candidateImgUrls = [...new Set(imgUrls)].filter(u => u.includes('a1011') || u.includes('switch') || u.includes('upload'));
    console.log(`Found candidate images:`, candidateImgUrls);
    
    let validImageDataUrl = null;
    const imageToTry = candidateImgUrls.length > 0 ? candidateImgUrls[0] : imgUrls[0];
    
    console.log(`Downloading actual product image from: ${imageToTry} via proxy...`);
    const imgProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(imageToTry)}`;
    
    const imgRes = await fetch(imgProxyUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    
    if (arrayBuffer.byteLength > 5000) {
       console.log(`Successfully downloaded! Size: ${arrayBuffer.byteLength} bytes.`);
       const buffer = Buffer.from(arrayBuffer);
       const base64Image = buffer.toString('base64');
       validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;
    } else {
       console.log("Image too small, download failed.");
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
      deleteImageIds: [8, 7], // clean up previous mistakes
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
      console.log("Product ID 8 updated successfully with the EXACT real product photo!");
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
