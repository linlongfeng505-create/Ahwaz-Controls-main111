async function main() {
  const res = await fetch('https://flonexis.com/api/products/8/images/7');
  if (res.ok) {
    const buffer = await res.arrayBuffer();
    console.log("Image size (bytes):", buffer.byteLength);
    console.log("Content-Type:", res.headers.get('content-type'));
  } else {
    console.log("Error:", res.status, await res.text());
  }
}
main();
