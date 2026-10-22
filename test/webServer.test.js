import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from '../src/webServer.js';

async function withServer(options, fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'todo-web-terminal-'));
  const socketPath = path.join(dir, 'server.sock');
  const server = createServer(options);
  await new Promise((resolve) => server.listen(socketPath, resolve));
  try {
    await fn(socketPath);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
}

function request(socketPath, { method, path: reqPath, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { socketPath, path: reqPath, method, headers: body ? { 'Content-Type': 'application/json' } : {} },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      },
    );
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runCommand(socketPath, command) {
  const res = await request(socketPath, { method: 'POST', path: '/run', body: { command } });
  return { ...res, json: res.body ? JSON.parse(res.body) : undefined };
}

test('AC1: GET / serves a page with an input box for typing CLI commands', async () => {
  await withServer({ baseUrl: 'http://api.internal:3000' }, async (socketPath) => {
    const res = await request(socketPath, { method: 'GET', path: '/' });

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.body, /<input/i);
  });
});

test("AC1/AC3: typing 'list' shows the CLI's list output for existing todos", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ([
      { id: 1, title: 'Buy milk', done: false },
      { id: 2, title: 'Water the plants', done: false, priority: 'low' },
    ]),
  });

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'list');

    assert.equal(res.status, 200);
    assert.equal(res.json.exitCode, 0);
    assert.deepEqual(res.json.lines, ['1  [ ] Buy milk', '2  [ ] Water the plants (priority: low)']);
  });
});

test("AC1/AC3: typing 'add' shows the CLI's add output for the created todo", async () => {
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({ id: 3, title: 'Renew passport', done: false, due: '2026-11-01' }),
    };
  };

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'add Renew passport --due 2026-11-01');

    assert.equal(res.json.exitCode, 0);
    assert.deepEqual(capturedBody, { title: 'Renew passport', due: '2026-11-01' });
    assert.deepEqual(res.json.lines, ['Added task 3  [ ] Renew passport (due: 2026-11-01)']);
  });
});

test("AC1/AC3: typing 'update' shows the CLI's update output for the changed priority", async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ id: 1, title: 'Buy milk', done: false, priority: 'high' }),
  });

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'update 1 --priority high');

    assert.equal(res.json.exitCode, 0);
    assert.deepEqual(res.json.lines, ['Updated task 1  [ ] Buy milk (priority: high)']);
  });
});

test("AC1/AC3: typing 'delete' shows the CLI's delete output", async () => {
  let capturedMethod;
  const fetchImpl = async (url, options) => {
    capturedMethod = options.method;
    return { ok: true, status: 204, statusText: 'No Content', json: async () => { throw new Error('no body'); } };
  };

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'delete 1');

    assert.equal(res.json.exitCode, 0);
    assert.equal(capturedMethod, 'DELETE');
    assert.deepEqual(res.json.lines, ['Deleted task 1']);
  });
});

test('AC2/AC3: typed commands call the configured API over HTTP, never a local file', async () => {
  let calledUrl;
  const fetchImpl = async (url) => {
    calledUrl = url;
    return { ok: true, status: 200, statusText: 'OK', json: async () => [] };
  };

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    await runCommand(socketPath, 'list');

    assert.equal(calledUrl, 'http://api.internal:3000/tasks');
  });
});

test("AC2/AC3: 'complete <id>' sends and reads the completed field the API actually uses, not done", async () => {
  let capturedBody;
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    if (!('completed' in body)) {
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: '"completed" must be a boolean.' }),
      };
    }
    capturedBody = body;
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ id: 1, title: 'Buy milk', completed: true }) };
  };

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'complete 1');

    assert.deepEqual(capturedBody, { completed: true });
    assert.equal(res.json.exitCode, 0);
    assert.deepEqual(res.json.lines, ['Completed task 1  [x] Buy milk']);
  });
});

test("AC2/AC3: 'reopen <id>' sends and reads the completed field the API actually uses, not done", async () => {
  let capturedBody;
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    if (!('completed' in body)) {
      return {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: '"completed" must be a boolean.' }),
      };
    }
    capturedBody = body;
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ id: 1, title: 'Buy milk', completed: false }) };
  };

  await withServer({ baseUrl: 'http://api.internal:3000', fetchImpl }, async (socketPath) => {
    const res = await runCommand(socketPath, 'reopen 1');

    assert.deepEqual(capturedBody, { completed: false });
    assert.equal(res.json.exitCode, 0);
    assert.deepEqual(res.json.lines, ['Reopened task 1  [ ] Buy milk']);
  });
});
