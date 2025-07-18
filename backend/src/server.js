#!/usr/bin/env node

// JavaScript wrapper to execute TypeScript server
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Execute the TypeScript server using tsx
const tsServerPath = join(__dirname, 'server.ts');
const child = spawn('node', ['--expose-gc', '--import', 'tsx/esm', tsServerPath], {
  stdio: 'inherit',
  env: process.env
});

// Forward signals to child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

// Exit when child process exits
child.on('exit', (code) => {
  process.exit(code);
});