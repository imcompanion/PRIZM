import fs from 'fs';

function toPascalCase(str) {
  return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

const typesContent = fs.readFileSync('src/integrations/supabase/types.ts', 'utf8');
const lines = typesContent.split('\n');
let insideTables = false;
let currentTable = null;
let currentFields = [];
let output = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('Tables: {')) {
    insideTables = true;
    continue;
  }
  if (insideTables && line.includes('Views: {')) break;
  
  if (insideTables) {
    const tableMatch = line.match(/^ {6}([a-zA-Z0-9_]+): \{/);
    if (tableMatch) {
      if (currentTable) {
        if (!currentFields.some(f => f.name === 'id')) {
           currentFields.unshift({name: 'id', type: 'string'});
        }
        output += `query List${toPascalCase(currentTable)}($where: ${toPascalCase(currentTable)}_Filter, $limit: Int, $orderBy: [${toPascalCase(currentTable)}_Order!]) @auth(level: PUBLIC) {\n`;
        output += `  ${toCamelCase(currentTable)}s(where: $where, limit: $limit, orderBy: $orderBy) {\n`;
        for (const f of currentFields) {
          output += `    ${toCamelCase(f.name)}\n`;
        }
        output += `  }\n`;
        output += `}\n\n`;
      }
      currentTable = tableMatch[1];
      currentFields = [];
      continue;
    }
    
    if (currentTable && line.includes('Row: {')) {
      let j = i + 1;
      while (!lines[j].includes('}')) {
        const fieldMatch = lines[j].match(/^ {10}([a-zA-Z0-9_]+): (.*)$/);
        if (fieldMatch) {
          currentFields.push({ name: fieldMatch[1] });
        }
        j++;
      }
      i = j;
    }
  }
}

if (currentTable) {
  if (!currentFields.some(f => f.name === 'id')) {
     currentFields.unshift({name: 'id', type: 'string'});
  }
  output += `query List${toPascalCase(currentTable)}($where: ${toPascalCase(currentTable)}_Filter, $limit: Int, $orderBy: [${toPascalCase(currentTable)}_Order!]) @auth(level: PUBLIC) {\n`;
  output += `  ${toCamelCase(currentTable)}s(where: $where, limit: $limit, orderBy: $orderBy) {\n`;
  for (const f of currentFields) {
    output += `    ${toCamelCase(f.name)}\n`;
  }
  output += `  }\n`;
  output += `}\n\n`;
}

fs.writeFileSync('dataconnect/example/queries.gql', output);
console.log('queries.gql generated!');
