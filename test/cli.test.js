import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run } from '../src/cli.js';
import { ApiConnectionError, ApiError } from '../src/apiClient.js';

function captureOutput() {
  const out = [];
  const err = [];
  return {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    out,
    err,
  };
}

test('add prints the created task in a human-readable form', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 201,
    statusText: 'Created',
    json: async () => ({ id: 1, title: 'Buy milk', done: false }),
  });

  const exitCode = await run(['add', 'Buy', 'milk'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['Added task 1  [ ] Buy milk']);
  assert.deepEqual(err, []);
});

test('add --due sends the due date and shows it on the created task', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({ id: 1, title: 'Renew passport', done: false, due: '2026-11-01' }),
    };
  };

  const exitCode = await run(
    ['add', 'Renew', 'passport', '--due', '2026-11-01'],
    { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr },
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { title: 'Renew passport', due: '2026-11-01' });
  assert.deepEqual(out, ['Added task 1  [ ] Renew passport (due: 2026-11-01)']);
  assert.deepEqual(err, []);
});

test('add --due with an invalid date surfaces the API error and creates no todo', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  let called = false;
  const fetchImpl = async () => {
    called = true;
    return {
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'due must be a valid YYYY-MM-DD date' }),
    };
  };

  const exitCode = await run(
    ['add', 'Renew', 'passport', '--due', 'not-a-date'],
    { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr },
  );

  assert.equal(called, true);
  assert.equal(exitCode, 1);
  assert.deepEqual(out, []);
  assert.deepEqual(err, ['Error: due must be a valid YYYY-MM-DD date']);
});

test('add --tag sends the tag and shows it on the created task', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({ id: 1, title: 'Buy milk', done: false, tags: ['home'] }),
    };
  };

  const exitCode = await run(
    ['add', 'Buy', 'milk', '--tag', 'home'],
    { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr },
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { title: 'Buy milk', tags: ['home'] });
  assert.deepEqual(out, ['Added task 1  [ ] Buy milk (tags: home)']);
  assert.deepEqual(err, []);
});

test('add --tag given twice sends both tags', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({ id: 1, title: 'Buy milk', done: false, tags: ['home', 'urgent'] }),
    };
  };

  const exitCode = await run(
    ['add', 'Buy', 'milk', '--tag', 'home', '--tag', 'urgent'],
    { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr },
  );

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { title: 'Buy milk', tags: ['home', 'urgent'] });
  assert.deepEqual(out, ['Added task 1  [ ] Buy milk (tags: home, urgent)']);
  assert.deepEqual(err, []);
});

test('add without --tag sends no tags field', async () => {
  const { stdout, stderr, out, err } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({ id: 1, title: 'Buy milk', done: false, tags: [] }),
    };
  };

  const exitCode = await run(['add', 'Buy', 'milk'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { title: 'Buy milk' });
  assert.deepEqual(out, ['Added task 1  [ ] Buy milk']);
  assert.deepEqual(err, []);
});

test('list shows due date when present and nothing extra when absent', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ([
      { id: 1, title: 'Buy milk', done: false },
      { id: 2, title: 'Renew passport', done: false, due: '2026-11-01' },
    ]),
  });

  const exitCode = await run(['list'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['1  [ ] Buy milk', '2  [ ] Renew passport (due: 2026-11-01)']);
});

test('list --overdue calls the overdue filter and prints exactly what the API returns', async () => {
  const { stdout, stderr, out } = captureOutput();
  let capturedUrl;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ([{ id: 2, title: 'Renew passport', done: false, due: '2026-01-01' }]),
    };
  };

  const exitCode = await run(['list', '--overdue'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.equal(capturedUrl, 'http://localhost:3000/tasks?overdue=true');
  assert.deepEqual(out, ['2  [ ] Renew passport (due: 2026-01-01)']);
});

test('list prints each task with ID, title, and status', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ([
      { id: 1, title: 'Buy milk', done: false },
      { id: 2, title: 'Clean house', done: true },
    ]),
  });

  const exitCode = await run(['list'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['1  [ ] Buy milk', '2  [x] Clean house']);
});

test('list shows tags when present and nothing extra when absent', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ([
      { id: 1, title: 'Buy milk', done: false, tags: ['home', 'urgent'] },
      { id: 2, title: 'Clean house', done: true, tags: [] },
    ]),
  });

  const exitCode = await run(['list'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['1  [ ] Buy milk (tags: home, urgent)', '2  [x] Clean house']);
});

test('list reports when there are no tasks', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => [] });

  const exitCode = await run(['list'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['No tasks.']);
});

test('complete marks a task done', async () => {
  const { stdout, stderr, out } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ id: 1, title: 'Buy milk', done: true }) };
  };

  const exitCode = await run(['complete', '1'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { done: true });
  assert.deepEqual(out, ['Completed task 1  [x] Buy milk']);
});

test('complete shows the task\'s tags when it has any', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ id: 1, title: 'Buy milk', done: true, tags: ['home'] }),
  });

  const exitCode = await run(['complete', '1'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['Completed task 1  [x] Buy milk (tags: home)']);
});

test('reopen marks a task not done', async () => {
  const { stdout, stderr, out } = captureOutput();
  let capturedBody;
  const fetchImpl = async (url, options) => {
    capturedBody = JSON.parse(options.body);
    return { ok: true, status: 200, statusText: 'OK', json: async () => ({ id: 1, title: 'Buy milk', done: false }) };
  };

  const exitCode = await run(['reopen', '1'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(capturedBody, { done: false });
  assert.deepEqual(out, ['Reopened task 1  [ ] Buy milk']);
});

test('reopen shows the task\'s tags when it has any', async () => {
  const { stdout, stderr, out } = captureOutput();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ id: 1, title: 'Buy milk', done: false, tags: ['home', 'urgent'] }),
  });

  const exitCode = await run(['reopen', '1'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.deepEqual(out, ['Reopened task 1  [ ] Buy milk (tags: home, urgent)']);
});

test('delete removes a task by id', async () => {
  const { stdout, stderr, out } = captureOutput();
  let capturedUrl;
  let capturedMethod;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedMethod = options.method;
    return { ok: true, status: 204, statusText: 'No Content', json: async () => { throw new Error('no body'); } };
  };

  const exitCode = await run(['delete', '1'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 0);
  assert.equal(capturedUrl, 'http://localhost:3000/tasks/1');
  assert.equal(capturedMethod, 'DELETE');
  assert.deepEqual(out, ['Deleted task 1']);
});

test('reports a clear error when the API is unreachable', async () => {
  const { stdout, stderr, err } = captureOutput();
  const fetchImpl = async () => { throw new Error('connect ECONNREFUSED'); };

  const exitCode = await run(['list'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 1);
  assert.equal(err.length, 1);
  assert.match(err[0], /^Error: /);
  assert.match(err[0], /http:\/\/localhost:3000/);
});

test('reports a clear error when the API returns an error', async () => {
  const { stdout, stderr, err } = captureOutput();
  const fetchImpl = async () => ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    json: async () => ({ error: 'task 99 not found' }),
  });

  const exitCode = await run(['complete', '99'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 1);
  assert.deepEqual(err, ['Error: task 99 not found']);
});

test('a missing argument is reported as a clear error instead of throwing', async () => {
  const { stdout, stderr, err } = captureOutput();
  const fetchImpl = async () => { throw new Error('should not be called'); };

  const exitCode = await run(['complete'], { baseUrl: 'http://localhost:3000', fetchImpl, stdout, stderr });

  assert.equal(exitCode, 1);
  assert.deepEqual(err, ['Error: Usage: todo complete <id>']);
});
