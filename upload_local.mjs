import fs from 'fs';
import path from 'path';

async function main() {
  console.log("Reading downloaded local image (from small site ozhat.com)...");
  
  const imgPath = path.join(process.cwd(), 'ozhat_image.jpg');
  
  if (!fs.existsSync(imgPath)) {
    console.error("Local image file not found!");
    return;
  }
  
  const buffer = fs.readFileSync(imgPath);
  
  if (buffer.length < 5000) {
    console.error("Image is too small, might be an error page.");
    return;
  }
  
  console.log(`Image read successfully. Size: ${buffer.length} bytes.`);
  
  const base64Image = buffer.toString('base64');
  const validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;
  
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
    deleteImageIds: [10, 9, 8], // clean up placeholders from previous failed attempts
    extraImageDataUrls: [validImageDataUrl],
    translations: {}
  };

  try {
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
      console.log("Product ID 8 updated successfully with EXACT product photo from ozhat.com!");
      console.log("New Gallery Images:", data.imageUrls);
    } else {
      const err = await updateRes.text();
      console.error("Update failed:", updateRes.status, err);
    }
  } catch (e) {
    console.error("Error communicating with flonexis API:", e);
  }
}

main();
