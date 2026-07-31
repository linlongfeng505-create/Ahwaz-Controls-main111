import https from 'https';

async function main() {
  const url = 'https://duckduckgo.com/html/?q=Clyde+A1011+limit+switch';
  
  https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      // Look for thumbnail images in duckduckgo
      // They look like //external-content.duckduckgo.com/iu/?u=...
      const regex = /\/\/external-content\.duckduckgo\.com\/iu\/\?u=([^&"']+)/g;
      let match;
      const urls = [];
      while ((match = regex.exec(data)) !== null) {
          urls.push(decodeURIComponent(match[1]));
      }
      console.log('Found image URLs:', urls.slice(0, 5));
    });
  }).on('error', console.error);
}

main();
