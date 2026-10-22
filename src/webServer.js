import http from 'node:http';

export function createServer() {
  return http.createServer((req, res) => {
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not implemented' }));
  });
}
