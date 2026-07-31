import fs from 'fs';

async function uploadProduct() {
  const imagePath = 'C:\\Users\\huangdc\\.gemini\\antigravity-ide\\brain\\4937f0c6-1732-400b-8510-8c070ded728f\\clyde_a1011_switch_1785219316003.png';
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${base64Image}`;

  const productData = {
    name: "Clyde A1011 Pneumatic Limit Switch",
    brand: "Clyde",
    model: "A1011",
    category: "Valve Positioners",
    description: "The Clyde A1011 is a high-performance, heavy-duty pneumatic limit switch specifically engineered for seamless integration with Clyde Bergemann Dome Valves. It is designed to accurately monitor the valve's open and close positions, converting mechanical movement into reliable electrical signals for seamless process automation.\n\nBuilt with robust brass and copper alloy construction, the A1011 switch is highly resilient and built to withstand harsh industrial environments, high pressures, and extreme temperatures up to 450°C. With its high ingress protection (IP67), it keeps dust and moisture at bay. It is an essential component for bulk material transfer systems such as fly ash handling and coal injection.",
    specs: [
      "Operating Temperature: Up to 450°C",
      "Ingress Protection: IP67",
      "Material: Brass / Copper alloy construction",
      "Application: Fly ash handling, coal injection systems",
      "Function: Open/Close position monitoring for Dome Valves"
    ],
    imageDataUrl: imageDataUrl,
    translations: {}
  };

  try {
    const response = await fetch('https://flonexis.com/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': '881001505Lin'
      },
      body: JSON.stringify(productData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Upload failed with status ${response.status}:`, errorText);
    } else {
      const result = await response.json();
      console.log('Upload successful! Product ID:', result.id);
      console.log('Product details:', result);
    }
  } catch (err) {
    console.error('Error during upload:', err);
  }
}

uploadProduct();
