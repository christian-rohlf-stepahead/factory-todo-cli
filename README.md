# Todo Cli

A command-line client for the todo HTTP API. It lets you add, list, complete,
reopen, and delete tasks by calling the API — it never touches the task data
directly.

## Requirements

- Node.js 18 or later (uses the built-in `fetch`).
- A running instance of the todo API (see `todo-api`'s own README for how to
  start it locally).

## Running it locally

From this directory, point the CLI at your local API with the `TODO_API_URL`
environment variable (defaults to `http://localhost:3000` if unset), then run
commands with `node bin/todo.js`:

```sh
export TODO_API_URL=http://localhost:3000   # the address your todo-api is listening on

node bin/todo.js add "Buy milk"
node bin/todo.js add "Renew passport" --due 2026-11-01
node bin/todo.js add "Buy milk" --tag home --tag urgent
node bin/todo.js add "Ship the release" --priority high
node bin/todo.js list
node bin/todo.js list --overdue
node bin/todo.js list --tag home
node bin/todo.js list --sort priority
node bin/todo.js update 1 --priority high
node bin/todo.js complete 1
node bin/todo.js reopen 1
node bin/todo.js delete 1
```

## Commands

| Command                                                              | Description                                                        |
|------------------------------------------------------------------------|------------------------------------------------------------------------|
| `add <title> [--due YYYY-MM-DD] [--tag <tag>]... [--priority <level>]` | Create a new task, optionally with a due date, tags, and priority. |
| `list [--overdue] [--tag <tag>] [--sort priority]`                     | Show every task, optionally filtered by overdue/tag or sorted by priority. |
| `update <id> --priority <level>`                                        | Change an existing task's priority.                                 |
| `complete <id>`                                                        | Mark a task as done.                                                 |
| `reopen <id>`                                                          | Mark a task as not done.                                             |
| `delete <id>`                                                          | Delete a task.                                                        |

`--tag <tag>` may be given more than once on `add` to attach several tags to
the new task. `--priority <level>` accepts `low`, `normal`, or `high`; the API
defaults a task to `normal` priority when `--priority` is omitted, and rejects
any other value.

Tasks are printed as `<id>  [x] <title>` for done tasks and `<id>  [ ] <title>`
for open tasks. A task with a due date has `(due: YYYY-MM-DD)` appended, a
task with tags has `(tags: tag1, tag2)` appended, and a task with `low` or
`high` priority has `(priority: low)` or `(priority: high)` appended (a
`normal`-priority task shows no priority annotation), for example
`<id>  [ ] <title> (due: 2026-11-01) (tags: home, urgent) (priority: high)`.

`list --overdue` asks the API for only the todos that are not done and past
their due date, and prints exactly what it returns. `list --tag <tag>` asks
the API for only the todos carrying that tag, and prints exactly what it
returns; combined with `--overdue`, both filters narrow the list together.
`list --sort priority` asks the API to sort the results by priority and
prints them in the order returned, without any client-side re-sorting.

If the API can't be reached, or it responds with an error (for example, an
unknown task ID), the CLI prints a message starting with `Error:` to stderr
and exits with a non-zero status instead of crashing.

## Web terminal

A small Node server serves a page where you can type the same commands (`add`,
`list`, `update`, `complete`, `reopen`, `delete`) in a browser and see the
CLI's output, run against `TODO_API_URL` exactly as `bin/todo.js` does
locally.

```sh
export TODO_API_URL=http://localhost:3000   # the address your todo-api is listening on
node bin/web.js                             # listens on PORT (defaults to 3000)
```

Open the server's address in a browser, type a command into the input box,
and its output appears below, line by line.

## Running the tests

```sh
npm test
```
