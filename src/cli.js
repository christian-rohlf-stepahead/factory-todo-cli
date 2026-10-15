import { createApiClient } from './apiClient.js';

export function formatTask(task) {
  const marker = task.done ? '[x]' : '[ ]';
  const due = task.due ? ` (due: ${task.due})` : '';
  const priority = task.priority && task.priority !== 'normal' ? ` (priority: ${task.priority})` : '';
  return `${task.id}  ${marker} ${task.title}${due}${priority}`;
}

const USAGE = `Usage: todo <command> [arguments]

Commands:
  add <title> [--due YYYY-MM-DD] [--priority <level>]   Add a new task, optionally with a due date and priority
  list [--overdue] [--priority <level>]                 List all tasks, optionally filtered by overdue or priority
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
        let priority;
        let titleArgs = args;
        const dueIndex = titleArgs.indexOf('--due');
        if (dueIndex !== -1) {
          due = titleArgs[dueIndex + 1];
          if (!due) {
            throw new Error('Usage: todo add <title> [--due YYYY-MM-DD] [--priority <level>]');
          }
          titleArgs = [...titleArgs.slice(0, dueIndex), ...titleArgs.slice(dueIndex + 2)];
        }
        const priorityIndex = titleArgs.indexOf('--priority');
        if (priorityIndex !== -1) {
          priority = titleArgs[priorityIndex + 1];
          if (!priority) {
            throw new Error('Usage: todo add <title> [--due YYYY-MM-DD] [--priority <level>]');
          }
          titleArgs = [...titleArgs.slice(0, priorityIndex), ...titleArgs.slice(priorityIndex + 2)];
        }
        const title = titleArgs.join(' ').trim();
        if (!title) {
          throw new Error('Usage: todo add <title> [--due YYYY-MM-DD] [--priority <level>]');
        }
        const task = await client.addTask(title, due, priority);
        stdout(`Added task ${formatTask(task)}`);
        return 0;
      }

      case 'list': {
        const overdue = args.includes('--overdue');
        let priority;
        const priorityIndex = args.indexOf('--priority');
        if (priorityIndex !== -1) {
          priority = args[priorityIndex + 1];
          if (!priority) {
            throw new Error('Usage: todo list [--overdue] [--priority <level>]');
          }
        }
        const tasks = await client.listTasks({ overdue, priority });
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
