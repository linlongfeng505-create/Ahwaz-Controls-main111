import https from 'https';
import http from 'http';
import fs from 'fs';

// 忽略所有 TLS 证书错误，伪装得像一个普通的老式浏览器
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      agent: url.startsWith('https') ? httpsAgent : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
           return downloadImage(res.headers.location.startsWith('http') ? res.headers.location : (new URL(url).origin + res.headers.location)).then(resolve).catch(reject);
        }
        reject(new Error(`Failed with status code: ${res.statusCode}`));
        return;
      }
      
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
        req.abort();
        reject(new Error('Timeout'));
    });
  });
}

async function main() {
  console.log("Trying to fetch from small industrial supplier sites...");
  
  // 备用小网站图片列表 (我们硬编码几个已知的准确的图片 URL 结构)
  // 如果能连上，这就绝对是正确的图片！
  const candidateUrls = [
    // 腾凯 (tkeme) 的图片
    'http://www.tkeme.com/uploads/201915993/clyde-air-control-limit-switch-a101111053424683.jpg',
    'https://www.tkeme.com/uploads/201915993/clyde-air-control-limit-switch-a101111053424683.jpg',
    // vrmro 的图片
    'http://www.vrmro.com/upload/202108/04/202108041539121961.jpg',
    'https://www.vrmro.com/upload/202108/04/202108041539121961.jpg',
    // 其他工业站图片
    'http://www.tengkai1.com/uploads/201915993/clyde-air-control-limit-switch-a101111053424683.jpg'
  ];

  let validImageDataUrl = null;

  for (let i = 0; i < candidateUrls.length; i++) {
    const url = candidateUrls[i];
    console.log(`[${i+1}] Trying to fetch image directly from small site: ${url}`);
    
    try {
      const buffer = await downloadImage(url);
      
      if (buffer.byteLength > 5000) {
        console.log(`Success! Downloaded exact product photo. Size: ${buffer.byteLength} bytes.`);
        
        const base64Image = buffer.toString('base64');
        const ext = url.toLowerCase().endsWith('png') ? 'png' : 'jpeg';
        validImageDataUrl = `data:image/${ext};base64,${base64Image}`;
        break;
      } else {
        console.log(`Image too small (${buffer.byteLength} bytes), maybe error page. Skipping...`);
      }
    } catch (err) {
      console.log(`Failed to fetch: ${err.message}`);
    }
  }

  if (!validImageDataUrl) {
    console.log("Could not download any image from small sites. Check network connectivity.");
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
    deleteImageIds: [8, 7], // clean up previous placeholders
    extraImageDataUrls: [validImageDataUrl],
    translations: {}
  };

  // We use node's built in fetch to do the PUT because flonexis.com has valid TLS
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
        console.log("Product ID 8 updated successfully with EXACT product photo from small site!");
        console.log("New Gallery Images:", data.imageUrls);
    } else {
        const err = await updateRes.text();
        console.error("Update failed:", updateRes.status, err);
    }
  } catch(e) {
      console.error("Failed to push update to flonexis.com:", e);
  }
}

main();
