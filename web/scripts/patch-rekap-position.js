const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../src/app/dashboard/admin/page.tsx');
let content = fs.readFileSync(file, 'utf8');

const regex = /      \{\/\* Tab Content: Rekapitulasi \*\/\}[\s\S]*?            \}\)/;
const match = content.match(regex);

if (match) {
  const block = match[0];
  // Remove it from current position
  content = content.replace(block + '\n\n', ''); // remove with trailing newlines
  content = content.replace(block + '\n', ''); 
  content = content.replace(block, ''); 
  
  // Target anchor
  const target = `          </div>
        )}
      </main>`;
      
  if (content.includes(target)) {
    content = content.replace(target, `${block}\n\n${target}`);
    fs.writeFileSync(file, content);
    console.log('Moved successfully!');
  } else {
    console.log('Target anchor not found!');
  }
} else {
  console.log('Block not found!');
}
