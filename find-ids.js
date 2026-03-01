const fs = require('fs');
const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf8'));
const search = process.argv.slice(2);
for (const s of search) {
  const found = tools.filter(t => t.id.includes(s) || t.name.toLowerCase().includes(s.toLowerCase()));
  if (found.length) found.forEach(f => console.log(`${s} -> "${f.id}" (${f.name})`));
  else console.log(`${s} -> NOT FOUND`);
}
