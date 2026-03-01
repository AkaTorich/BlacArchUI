const fs = require('fs');
const tools = JSON.parse(fs.readFileSync('data/tools.json', 'utf8'));

const category = process.argv[2] || 'blackarch-scanner';
const noParams = tools.filter(t =>
  t.categories.includes(category) && (!t.parameters || t.parameters.length === 0)
);

console.log(`Category: ${category}`);
console.log(`Without params: ${noParams.length}`);
console.log('');
noParams.forEach(t => console.log(`"${t.id}": ${t.name} — ${t.description}`));
