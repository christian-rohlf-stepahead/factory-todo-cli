import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient, ApiConnectionError, ApiError } from '../src/apiClient.js';

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status text',
    json: async () => body,
  };
}

test('addTask posts the title and returns the created task', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return jsonResponse(201, { id: 1, title: 'Buy milk', done: false });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.addTask('Buy milk');

  assert.equal(capturedUrl, 'http://localhost:3000/tasks');
  assert.equal(capturedOptions.method, 'POST');
  assert.deepEqual(JSON.parse(capturedOptions.body), { title: 'Buy milk' });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', done: false });
});

test('addTask sends the due date when one is given', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(201, { id: 1, title: 'Renew passport', done: false, due: '2026-11-01' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.addTask('Renew passport', '2026-11-01');

  assert.deepEqual(JSON.parse(capturedOptions.body), { title: 'Renew passport', due: '2026-11-01' });
  assert.deepEqual(task, { id: 1, title: 'Renew passport', done: false, due: '2026-11-01' });
});

test('addTask sends tags when given', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(201, { id: 1, title: 'Buy milk', done: false, tags: ['home', 'urgent'] });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.addTask('Buy milk', undefined, ['home', 'urgent']);

  assert.deepEqual(JSON.parse(capturedOptions.body), { title: 'Buy milk', tags: ['home', 'urgent'] });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', done: false, tags: ['home', 'urgent'] });
});

test('AC1: addTask sends the priority when one is given', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(201, { id: 1, title: 'Ship the release', done: false, priority: 'high' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.addTask('Ship the release', undefined, undefined, 'high');

  assert.deepEqual(JSON.parse(capturedOptions.body), { title: 'Ship the release', priority: 'high' });
  assert.deepEqual(task, { id: 1, title: 'Ship the release', done: false, priority: 'high' });
});

test('AC2: addTask sends no priority field when none is given', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(201, { id: 1, title: 'Buy milk', done: false, priority: 'normal' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.addTask('Buy milk');

  assert.deepEqual(JSON.parse(capturedOptions.body), { title: 'Buy milk' });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', done: false, priority: 'normal' });
});

test('listTasks returns the array of tasks', async () => {
  const fetchImpl = async () => jsonResponse(200, [{ id: 1, title: 'Buy milk', done: false }]);
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const tasks = await client.listTasks();

  assert.deepEqual(tasks, [{ id: 1, title: 'Buy milk', done: false }]);
});

test('listTasks requests the overdue filter when asked', async () => {
  let capturedUrl;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return jsonResponse(200, [{ id: 2, title: 'Renew passport', done: false, due: '2026-01-01' }]);
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const tasks = await client.listTasks({ overdue: true });

  assert.equal(capturedUrl, 'http://localhost:3000/tasks?overdue=true');
  assert.deepEqual(tasks, [{ id: 2, title: 'Renew passport', done: false, due: '2026-01-01' }]);
});

test('listTasks requests the tag filter when asked', async () => {
  let capturedUrl;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return jsonResponse(200, [{ id: 1, title: 'Buy milk', done: false, tags: ['home'] }]);
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const tasks = await client.listTasks({ tag: 'home' });

  assert.equal(capturedUrl, 'http://localhost:3000/tasks?tag=home');
  assert.deepEqual(tasks, [{ id: 1, title: 'Buy milk', done: false, tags: ['home'] }]);
});

test('listTasks combines the overdue and tag filters when both are asked', async () => {
  let capturedUrl;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return jsonResponse(200, []);
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await client.listTasks({ overdue: true, tag: 'home' });

  assert.equal(capturedUrl, 'http://localhost:3000/tasks?overdue=true&tag=home');
});

test('AC8: listTasks requests the priority sort when asked', async () => {
  let capturedUrl;
  const fetchImpl = async (url) => {
    capturedUrl = url;
    return jsonResponse(200, []);
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await client.listTasks({ sort: 'priority' });

  assert.equal(capturedUrl, 'http://localhost:3000/tasks?sort=priority');
});

test('AC4: updateTask sends a PATCH with the new priority', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return jsonResponse(200, { id: 1, title: 'Buy milk', done: false, priority: 'high' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.updateTask(1, { priority: 'high' });

  assert.equal(capturedUrl, 'http://localhost:3000/tasks/1');
  assert.equal(capturedOptions.method, 'PATCH');
  assert.deepEqual(JSON.parse(capturedOptions.body), { priority: 'high' });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', done: false, priority: 'high' });
});

test('updateTask sends a PATCH with the new note', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(200, { id: 1, title: 'Buy milk', done: false, note: 'Ask Sam.' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.updateTask(1, { note: 'Ask Sam.' });

  assert.equal(capturedOptions.method, 'PATCH');
  assert.deepEqual(JSON.parse(capturedOptions.body), { note: 'Ask Sam.' });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', done: false, note: 'Ask Sam.' });
});

test('updateTask sends note: "" to clear a note, distinct from omitting it', async () => {
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedOptions = options;
    return jsonResponse(200, { id: 1, title: 'Buy milk', done: false, note: '' });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await client.updateTask(1, { note: '' });

  assert.deepEqual(JSON.parse(capturedOptions.body), { note: '' });
});

test('setTaskDone sends a PATCH with the completed field the API uses, not done', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return jsonResponse(200, { id: 1, title: 'Buy milk', completed: true });
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const task = await client.setTaskDone(1, true);

  assert.equal(capturedUrl, 'http://localhost:3000/tasks/1');
  assert.equal(capturedOptions.method, 'PATCH');
  assert.deepEqual(JSON.parse(capturedOptions.body), { completed: true });
  assert.deepEqual(task, { id: 1, title: 'Buy milk', completed: true });
});

test('deleteTask sends a DELETE and tolerates an empty response body', async () => {
  let capturedUrl;
  let capturedOptions;
  const fetchImpl = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return { ok: true, status: 204, statusText: 'No Content', json: async () => { throw new Error('no body'); } };
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  const result = await client.deleteTask(1);

  assert.equal(capturedUrl, 'http://localhost:3000/tasks/1');
  assert.equal(capturedOptions.method, 'DELETE');
  assert.equal(result, null);
});

test('a network failure raises a clear ApiConnectionError', async () => {
  const fetchImpl = async () => {
    throw new Error('connect ECONNREFUSED');
  };
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await assert.rejects(
    () => client.listTasks(),
    (err) => {
      assert.ok(err instanceof ApiConnectionError);
      assert.match(err.message, /http:\/\/localhost:3000/);
      assert.match(err.message, /connect ECONNREFUSED/);
      return true;
    },
  );
});

test('an error response with a JSON error field raises ApiError with that message', async () => {
  const fetchImpl = async () => jsonResponse(404, { error: 'task 99 not found' });
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await assert.rejects(
    () => client.setTaskDone(99, true),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 404);
      assert.equal(err.message, 'task 99 not found');
      return true;
    },
  );
});

test('an error response without a usable JSON body still raises a clear ApiError', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
    json: async () => { throw new Error('not json'); },
  });
  const client = createApiClient('http://localhost:3000', fetchImpl);

  await assert.rejects(
    () => client.listTasks(),
    (err) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 500);
      assert.match(err.message, /500/);
      return true;
    },
  );
});
