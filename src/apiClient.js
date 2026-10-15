export class ApiConnectionError extends Error {
  constructor(baseUrl, cause) {
    super(`Could not reach the API at ${baseUrl}: ${cause.message}`);
    this.name = 'ApiConnectionError';
    this.cause = cause;
  }
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(baseUrl, path, options, fetchImpl) {
  let response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, options);
  } catch (cause) {
    throw new ApiConnectionError(baseUrl, cause);
  }

  if (!response.ok) {
    let message = `API returned ${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // Response body wasn't usable JSON; keep the status-based message.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function createApiClient(baseUrl, fetchImpl = globalThis.fetch) {
  return {
    addTask(title, due, tags) {
      const body = { title };
      if (due !== undefined) body.due = due;
      if (tags !== undefined) body.tags = tags;
      return request(baseUrl, '/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }, fetchImpl);
    },

    listTasks({ overdue } = {}) {
      const path = overdue ? '/tasks?overdue=true' : '/tasks';
      return request(baseUrl, path, { method: 'GET' }, fetchImpl);
    },

    setTaskDone(id, done) {
      return request(baseUrl, `/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done }),
      }, fetchImpl);
    },

    deleteTask(id) {
      return request(baseUrl, `/tasks/${id}`, { method: 'DELETE' }, fetchImpl);
    },
  };
}
