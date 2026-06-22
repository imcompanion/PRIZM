import fs from 'fs';
import path from 'path';

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
        output += `type ${toPascalCase(currentTable)} @table {\n`;
        if (!currentFields.some(f => f.name === 'id')) {
           output += `  id: UUID! @default(expr: "uuidV4()")\n`;
        }
        for (const f of currentFields) {
          if (f.name === 'id') {
             output += `  id: UUID! @default(expr: "uuidV4()")\n`;
             continue;
          }
          let gqlType = 'String';
          if (f.type === 'number') gqlType = 'Float';
          if (f.type === 'boolean') gqlType = 'Boolean';
          if (f.type === 'Json') gqlType = 'Any';
          if (f.name === 'created_at' || f.name === 'updated_at' || f.name.includes('date')) gqlType = 'Date';
          if (f.name.endsWith('_id')) gqlType = 'UUID';
          let suffix = f.nullable ? '' : '!';
          output += `  ${toCamelCase(f.name)}: ${gqlType}${suffix}\n`;
        }
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
          const name = fieldMatch[1];
          let typeStr = fieldMatch[2].replace(',', '');
          let nullable = false;
          if (typeStr.includes('| null')) {
            nullable = true;
            typeStr = typeStr.replace(' | null', '');
          }
          currentFields.push({ name, type: typeStr, nullable });
        }
        j++;
      }
      i = j;
    }
  }
}

if (currentTable) {
  output += `type ${toPascalCase(currentTable)} @table {\n`;
  for (const f of currentFields) {
    if (f.name === 'id') {
       output += `  id: UUID! @default(expr: "uuidV4()")\n`;
       continue;
    }
    let gqlType = 'String';
    if (f.type === 'number') gqlType = 'Float';
    if (f.type === 'boolean') gqlType = 'Boolean';
    if (f.type === 'Json') gqlType = 'Any';
    if (f.name === 'created_at' || f.name === 'updated_at' || f.name.includes('date')) gqlType = 'Date';
    if (f.name.endsWith('_id')) gqlType = 'UUID';
    let suffix = f.nullable ? '' : '!';
    output += `  ${toCamelCase(f.name)}: ${gqlType}${suffix}\n`;
  }
  output += `}\n\n`;
}

fs.writeFileSync('dataconnect/schema/schema.gql', output);
console.log('schema.gql generated!');
