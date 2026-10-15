import { createApiClient } from './apiClient.js';

export function formatTask(task) {
  const marker = task.done ? '[x]' : '[ ]';
  const due = task.due ? ` (due: ${task.due})` : '';
  return `${task.id}  ${marker} ${task.title}${due}`;
}

const USAGE = `Usage: todo <command> [arguments]

Commands:
  add <title> [--due YYYY-MM-DD]   Add a new task, optionally with a due date
  list [--overdue]                 List all tasks, or only overdue ones
  complete <id>                    Mark a task as done
  reopen <id>                      Mark a task as not done
  delete <id>                      Delete a task`;

export async function run(argv, { baseUrl, fetchImpl, stdout = console.log, stderr = console.error } = {}) {
  const client = createApiClient(baseUrl, fetchImpl);
  const [command, ...args] = argv;

  try {
    switch (command) {
      case 'add': {
        let due;
        let titleArgs = args;
        const dueIndex = args.indexOf('--due');
        if (dueIndex !== -1) {
          due = args[dueIndex + 1];
          if (!due) {
            throw new Error('Usage: todo add <title> [--due YYYY-MM-DD]');
          }
          titleArgs = [...args.slice(0, dueIndex), ...args.slice(dueIndex + 2)];
        }
        const title = titleArgs.join(' ').trim();
        if (!title) {
          throw new Error('Usage: todo add <title> [--due YYYY-MM-DD]');
        }
        const task = await client.addTask(title, due);
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
