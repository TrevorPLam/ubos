#!/usr/bin/env node

/**
 * Environment Variable Coverage Verification
 * 
 * This script verifies that all environment variables used in the codebase
 * are documented in .env.example file following 2026 best practices.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract environment variables from source code
function extractEnvVarsFromCode() {
  const serverDir = path.join(__dirname, '..', 'server');
  const envVars = new Set();
  
  function processFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/process\.env\.([A-Z_][A-Z0-9_]*)/g);
      if (matches) {
        matches.forEach(match => {
          const envVar = match.substring(12); // Remove "process.env." prefix (12 chars)
          envVars.add(envVar);
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }
  
  function processDirectory(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          processDirectory(filePath);
        } else if (file.endsWith('.ts') || file.endsWith('.js')) {
          processFile(filePath);
        }
      });
    } catch {
      // Skip directories that can't be read
    }
  }
  
  processDirectory(serverDir);
  return Array.from(envVars).sort();
}

// Extract environment variables from .env.example
function extractEnvVarsFromExample() {
  const examplePath = path.join(__dirname, '..', '.env.example');
  const content = fs.readFileSync(examplePath, 'utf8');
  const envVars = new Set();
  
  const lines = content.split('\n');
  lines.forEach(line => {
    const match = line.match(/^([A-Z_]+)=/);
    if (match) {
      envVars.add(match[1]);
    }
  });
  
  return Array.from(envVars).sort();
}

// Main verification
function main() {
  console.log('🔍 Environment Variable Coverage Verification\n');
  
  const codeVars = extractEnvVarsFromCode();
  const exampleVars = extractEnvVarsFromExample();
  
  console.log(`📊 Found ${codeVars.length} environment variables in code`);
  console.log(`📝 Found ${exampleVars.length} environment variables in .env.example\n`);
  
  // Find variables in code but not in example
  const missingFromExample = codeVars.filter(v => !exampleVars.includes(v));
  
  // Find variables in example but not in code (might be deprecated)
  const missingFromCode = exampleVars.filter(v => !codeVars.includes(v));
  
  if (missingFromExample.length > 0) {
    console.log('❌ Missing from .env.example:');
    missingFromExample.forEach(v => {
      console.log(`   - ${v}`);
    });
    console.log();
  }
  
  if (missingFromCode.length > 0) {
    console.log('⚠️  In .env.example but not found in code (may be deprecated):');
    missingFromCode.forEach(v => {
      console.log(`   - ${v}`);
    });
    console.log();
  }
  
  if (missingFromExample.length === 0 && missingFromCode.length === 0) {
    console.log('✅ Perfect! All environment variables are documented.');
  } else {
    console.log(`📈 Coverage: ${((codeVars.length - missingFromExample.length) / codeVars.length * 100).toFixed(1)}%`);
  }
  
  // List all variables for reference
  console.log('\n📋 All environment variables found in code:');
  codeVars.forEach(v => {
    const status = exampleVars.includes(v) ? '✅' : '❌';
    console.log(`   ${status} ${v}`);
  });
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('verify-env-coverage.js')) {
  main();
}

export { extractEnvVarsFromCode, extractEnvVarsFromExample };
