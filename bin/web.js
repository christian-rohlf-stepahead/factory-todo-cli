#!/usr/bin/env node
import { createServer } from '../src/webServer.js';

const baseUrl = process.env.TODO_API_URL || 'http://localhost:3000';
const port = Number(process.env.PORT) || 3000;

createServer({ baseUrl }).listen(port, () => {
  console.log(`Web terminal listening on port ${port}, proxying to ${baseUrl}`);
});
