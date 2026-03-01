const fs = require('fs');
const tools = JSON.parse(fs.readFileSync('data/tools.json','utf8'));
const without = tools.filter(t => !t.parameters || t.parameters.length === 0);
const cats = {};
without.forEach(t => {
  t.categories.forEach(c => {
    if (!cats[c]) cats[c] = [];
    cats[c].push(t.id);
  });
});
Object.keys(cats).sort((a,b) => cats[b].length - cats[a].length).forEach(c => {
  console.log(c + ': ' + cats[c].length + ' — ' + cats[c].slice(0,10).join(', ') + (cats[c].length > 10 ? '...' : ''));
});
