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
const fromUsage = new Set();
const rpcUsage = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // Match supabase.from("table_name")
  const fromRegex = /from\(\s*['"]([a-zA-Z_]+)['"]/g;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    fromUsage.add(match[1]);
  }
  
  const rpcRegex = /\.rpc\(\s*['"]([a-zA-Z_]+)['"]/g;
  while ((match = rpcRegex.exec(content)) !== null) {
    rpcUsage.add(match[1]);
  }
});

console.log('Tables accessed via .from():', Array.from(fromUsage).sort());
console.log('RPCs accessed via .rpc():', Array.from(rpcUsage).sort());
