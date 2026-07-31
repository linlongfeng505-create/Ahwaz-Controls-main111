async function main() {
  const realImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Limit_switch.JPG/800px-Limit_switch.JPG";
  const imgRes = await fetch(realImageUrl);
  const text = await imgRes.text();
  console.log("Response text start:", text.substring(0, 100));
}
main();
