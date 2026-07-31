import fs from 'fs';

async function main() {
  try {
    const realImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Limit_switch.JPG/800px-Limit_switch.JPG";
    
    console.log("Downloading real image from:", realImageUrl);
    
    const imgRes = await fetch(realImageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const base64Image = buffer.toString('base64');
    const imageDataUrl = `data:image/jpeg;base64,${base64Image}`;
    
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
      // We must explicitly delete the old image (ID: 6) from the gallery
      deleteImageIds: [6],
      // And add the new one as a gallery image
      extraImageDataUrls: [imageDataUrl],
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
      console.log("Product ID 8 updated successfully!", data.imageUrls);
    } else {
      const err = await updateRes.text();
      console.error("Update failed:", updateRes.status, err);
    }
  } catch (e) {
    console.error(e);
  }
}

main();
