import http from 'node:http';
import { run } from './cli.js';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>todo-cli web terminal</title>
</head>
<body>
<pre id="output"></pre>
<form id="command-form">
  <input id="command" type="text" autocomplete="off" autofocus>
  <button type="submit">Run</button>
</form>
<script>
const output = document.getElementById('output');
const form = document.getElementById('command-form');
const input = document.getElementById('command');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const command = input.value;
  input.value = '';
  output.textContent += '$ ' + command + '\\n';

  const res = await fetch('/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  });
  const { lines } = await res.json();
  lines.forEach((line) => { output.textContent += line + '\\n'; });
});
</script>
</body>
</html>
`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function createServer({ baseUrl, fetchImpl } = {}) {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(PAGE);
      return;
    }

    if (req.method === 'POST' && req.url === '/run') {
      const body = await readBody(req);
      let command;
      try {
        ({ command } = JSON.parse(body));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request body must be JSON with a "command" field.' }));
        return;
      }

      const argv = (command || '').trim().split(/\s+/).filter(Boolean);
      const lines = [];
      const collect = (line) => lines.push(line);
      const exitCode = await run(argv, { baseUrl, fetchImpl, stdout: collect, stderr: collect });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ exitCode, lines }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
}
