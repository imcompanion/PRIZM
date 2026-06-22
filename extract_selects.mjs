import fs from 'fs';
import path from 'path';

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory() && file !== 'dataconnect-generated' && file !== 'node_modules') {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk('./src');
const selects = new Set();
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const matches = content.matchAll(/\.select\(\s*['"](.*?)['"]\s*\)/g);
  for (const match of matches) {
    selects.add(match[1]);
  }
});
console.log(Array.from(selects).sort());
