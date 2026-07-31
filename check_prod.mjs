async function main() {
  const res = await fetch('https://flonexis.com/api/products/8');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main();
