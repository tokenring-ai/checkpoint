import create from './commands/checkpoint/create.ts';
import history from './commands/checkpoint/history.ts';
import list from './commands/checkpoint/list.ts';
import restore from './commands/checkpoint/restore.ts';

export default [create, restore, list, history];
