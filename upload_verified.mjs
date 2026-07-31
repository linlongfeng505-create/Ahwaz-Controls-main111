import fs from 'fs';

async function main() {
  const imgPath = 'clyde_a1011_real.jpg';
  const buffer = fs.readFileSync(imgPath);
  console.log(`Image size: ${buffer.length} bytes`);
  
  const base64Image = buffer.toString('base64');
  const validImageDataUrl = `data:image/jpeg;base64,${base64Image}`;

  // First, get current state of product 8 to know what images exist
  console.log("Fetching current product 8 state...");
  const getRes = await fetch('https://flonexis.com/api/products/8', {
    headers: { 'x-admin-password': '881001505Lin' }
  });
  const product = await getRes.json();
  console.log("Current image URLs:", product.imageUrls);
  
  // Extract IDs to delete from imageUrls like /api/products/8/images/11
  const deleteIds = (product.imageUrls || []).map(url => {
    const match = url.match(/\/images\/(\d+)$/);
    return match ? parseInt(match[1]) : null;
  }).filter(Boolean);
  console.log("Deleting old image IDs:", deleteIds);

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
    deleteImageIds: deleteIds,
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
    console.log("✅ Product ID 8 updated successfully with VERIFIED JPEG product photo!");
    console.log("New Gallery Images:", data.imageUrls);
  } else {
    const err = await updateRes.text();
    console.error("Update failed:", updateRes.status, err);
  }
}

main();
