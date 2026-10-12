import { createApiClient } from './apiClient.js';

export function formatTask(task) {
  const marker = task.done ? '[x]' : '[ ]';
  return `${task.id}  ${marker} ${task.title}`;
}

const USAGE = `Usage: todo <command> [arguments]

Commands:
  add <title>     Add a new task
  list            List all tasks
  complete <id>   Mark a task as done
  reopen <id>     Mark a task as not done
  delete <id>     Delete a task`;

export async function run(argv, { baseUrl, fetchImpl, stdout = console.log, stderr = console.error } = {}) {
  const client = createApiClient(baseUrl, fetchImpl);
  const [command, ...args] = argv;

  try {
    switch (command) {
      case 'add': {
        const title = args.join(' ').trim();
        if (!title) {
          throw new Error('Usage: todo add <title>');
        }
        const task = await client.addTask(title);
        stdout(`Added task ${formatTask(task)}`);
        return 0;
      }

      case 'list': {
        const tasks = await client.listTasks();
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
