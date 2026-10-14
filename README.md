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
node bin/todo.js list
node bin/todo.js list --overdue
node bin/todo.js complete 1
node bin/todo.js reopen 1
node bin/todo.js delete 1
```

## Commands

| Command                           | Description                                         |
|-------------------------------------|-------------------------------------------------------|
| `add <title> [--due YYYY-MM-DD]`    | Create a new task, optionally with a due date.      |
| `list [--overdue]`                  | Show every task, or only overdue ones.              |
| `complete <id>`                     | Mark a task as done.                                |
| `reopen <id>`                       | Mark a task as not done.                            |
| `delete <id>`                       | Delete a task.                                      |

Tasks are printed as `<id>  [x] <title>` for done tasks and `<id>  [ ] <title>`
for tasks that aren't done yet. A task with a due date has `(due: YYYY-MM-DD)`
appended, for example `<id>  [ ] <title> (due: 2026-11-01)`.

`list --overdue` asks the API for only the todos that are not done and past
their due date, and prints exactly what it returns.

If the API can't be reached, or it responds with an error (for example, an
unknown task ID), the CLI prints a message starting with `Error:` to stderr
and exits with a non-zero status instead of crashing.

## Running the tests

```sh
npm test
```
