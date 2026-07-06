// Script to extract all Supabase migrations into a single consolidated SQL file
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
const outputFile = path.join(__dirname, 'database-schema.sql');

// Get all migration files sorted by name (which includes timestamp)
const files = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

let consolidatedSQL = '';
consolidatedSQL += '-- Consolidated database schema from Supabase migrations\n';
consolidatedSQL += '-- Generated for Hostinger migration\n';
consolidatedSQL += '-- Number of migration files: ' + files.length + '\n\n';

files.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  consolidatedSQL += '-- Migration ' + (index + 1) + ': ' + file + '\n';
  consolidatedSQL += '-- ==================================================\n';
  consolidatedSQL += content.trim() + '\n\n';
});

// Write consolidated file
fs.writeFileSync(outputFile, consolidatedSQL);
console.log('Created consolidated schema file: ' + outputFile);
console.log('Total migrations processed: ' + files.length);