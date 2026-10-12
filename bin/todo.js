#!/usr/bin/env node
import { run } from '../src/cli.js';

const baseUrl = process.env.TODO_API_URL || 'http://localhost:3000';
const exitCode = await run(process.argv.slice(2), { baseUrl });
process.exit(exitCode);
