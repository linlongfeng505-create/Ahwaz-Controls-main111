import fs from 'fs';
let c = fs.readFileSync('src/lib/i18n.ts', 'utf8');
c = c.replace(/,,+/g, ',');
fs.writeFileSync('src/lib/i18n.ts', c);
console.log('Fixed double commas');
