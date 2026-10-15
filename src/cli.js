import { createApiClient } from './apiClient.js';

export function formatTask(task) {
  const marker = task.done ? '[x]' : '[ ]';
  const due = task.due ? ` (due: ${task.due})` : '';
  const tags = task.tags && task.tags.length > 0 ? ` (tags: ${task.tags.join(', ')})` : '';
  return `${task.id}  ${marker} ${task.title}${due}${tags}`;
}

const ADD_USAGE = 'Usage: todo add <title> [--due YYYY-MM-DD] [--tag <tag>]...';

const USAGE = `Usage: todo <command> [arguments]

Commands:
  add <title> [--due YYYY-MM-DD] [--tag <tag>]...   Add a new task, optionally with a due date and tags
  list [--overdue]                                  List all tasks, or only overdue ones
  complete <id>                                     Mark a task as done
  reopen <id>                                       Mark a task as not done
  delete <id>                                       Delete a task`;

export async function run(argv, { baseUrl, fetchImpl, stdout = console.log, stderr = console.error } = {}) {
  const client = createApiClient(baseUrl, fetchImpl);
  const [command, ...args] = argv;

  try {
    switch (command) {
      case 'add': {
        let due;
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
          } else {
            titleArgs.push(args[i]);
          }
        }
        const title = titleArgs.join(' ').trim();
        if (!title) {
          throw new Error(ADD_USAGE);
        }
        const task = await client.addTask(title, due, tags.length > 0 ? tags : undefined);
        stdout(`Added task ${formatTask(task)}`);
        return 0;
      }

      case 'list': {
        const overdue = args.includes('--overdue');
        const tasks = await client.listTasks({ overdue });
        if (tasks.length === 0) {
          stdout('No tasks.');
        } else {
          tasks.forEach((task) => stdout(formatTask(task)));
        }
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
