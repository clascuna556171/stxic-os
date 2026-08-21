const url = process.argv[2];
const r = await fetch(url);
if (!r.ok) { console.error("HTTP", r.status); process.exit(1); }
console.log(await r.text());