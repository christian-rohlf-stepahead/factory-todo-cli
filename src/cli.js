import { createApiClient } from './apiClient.js';

export function formatTask(task) {
  const done = task.completed ?? task.done;
  const marker = done ? '[x]' : '[ ]';
  const due = task.due ? ` (due: ${task.due})` : '';
  const tags = task.tags && task.tags.length > 0 ? ` (tags: ${task.tags.join(', ')})` : '';
  const priority = task.priority && task.priority !== 'normal' ? ` (priority: ${task.priority})` : '';
  const note = task.note ? `\n  note: ${task.note}` : '';
  return `${task.id}  ${marker} ${task.title}${due}${tags}${priority}${note}`;
}

const ADD_USAGE = 'Usage: todo add <title> [--due YYYY-MM-DD] [--tag <tag>]... [--priority <level>]';
const LIST_USAGE = 'Usage: todo list [--overdue] [--tag <tag>] [--sort priority]';
const UPDATE_USAGE = 'Usage: todo update <id> [--priority <level>] [--note "<text>"]';

const USAGE = `Usage: todo <command> [arguments]

Commands:
  add <title> [--due YYYY-MM-DD] [--tag <tag>]... [--priority <level>]   Add a new task, optionally with a due date, tags, and priority (low, normal, or high)
  list [--overdue] [--tag <tag>] [--sort priority]                      List all tasks, optionally filtered by overdue/tag or sorted by priority
  update <id> [--priority <level>] [--note "<text>"]                    Change a task's priority (low, normal, or high) and/or note (empty string clears it)
  complete <id>                                                        Mark a task as done
  reopen <id>                                                          Mark a task as not done
  delete <id>                                                          Delete a task`;

export async function run(argv, { baseUrl, fetchImpl, stdout = console.log, stderr = console.error } = {}) {
  const client = createApiClient(baseUrl, fetchImpl);
  const [command, ...args] = argv;

  try {
    switch (command) {
      case 'add': {
        let due;
        let priority;
        const tags = [];
        const titleArgs = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--due') {
            due = args[++i];
            if (!due) {
              throw new Error(ADD_USAGE);
            }
          } else if (args[i] === '--tag') {
            const tag = args[++i];
            if (!tag) {
              throw new Error(ADD_USAGE);
            }
            tags.push(tag);
          } else if (args[i] === '--priority') {
            priority = args[++i];
            if (!priority) {
              throw new Error(ADD_USAGE);
            }
          } else {
            titleArgs.push(args[i]);
          }
        }
        const title = titleArgs.join(' ').trim();
        if (!title) {
          throw new Error(ADD_USAGE);
        }
        const task = await client.addTask(title, due, tags.length > 0 ? tags : undefined, priority);
        stdout(`Added task ${formatTask(task)}`);
        return 0;
      }

      case 'list': {
        let overdue = false;
        let tag;
        let sort;
        for (let i = 0; i < args.length; i++) {
          if (args[i] === '--overdue') {
            overdue = true;
          } else if (args[i] === '--tag') {
            tag = args[++i];
            if (!tag) {
              throw new Error(LIST_USAGE);
            }
          } else if (args[i] === '--sort') {
            sort = args[++i];
            if (!sort) {
              throw new Error(LIST_USAGE);
            }
          }
        }
        const tasks = await client.listTasks({ overdue, tag, sort });
        if (tasks.length === 0) {
          stdout('No tasks.');
        } else {
          tasks.forEach((task) => stdout(formatTask(task)));
        }
        return 0;
      }

      case 'update': {
        const id = args[0];
        if (!id) {
          throw new Error(UPDATE_USAGE);
        }
        let priority;
        let note;
        for (let i = 1; i < args.length; i++) {
          if (args[i] === '--priority') {
            priority = args[++i];
            if (!priority) {
              throw new Error(UPDATE_USAGE);
            }
          } else if (args[i] === '--note') {
            note = args[++i];
            if (note === undefined) {
              throw new Error(UPDATE_USAGE);
            }
          }
        }
        if (!priority && note === undefined) {
          throw new Error(UPDATE_USAGE);
        }
        const task = await client.updateTask(id, { priority, note });
        stdout(`Updated task ${formatTask(task)}`);
        return 0;
      }

      case 'complete':
      case 'reopen': {
        const id = args[0];
        if (!id) {
          throw new Error(`Usage: todo ${command} <id>`);
        }
        const task = await client.setTaskDone(id, command === 'complete');
        stdout(`${command === 'complete' ? 'Completed' : 'Reopened'} task ${formatTask(task)}`);
        return 0;
      }

      case 'delete': {
        const id = args[0];
        if (!id) {
          throw new Error('Usage: todo delete <id>');
        }
        await client.deleteTask(id);
        stdout(`Deleted task ${id}`);
        return 0;
      }

      default: {
        stdout(USAGE);
        return command ? 1 : 0;
      }
    }
  } catch (err) {
    stderr(`Error: ${err.message}`);
    return 1;
  }
}
