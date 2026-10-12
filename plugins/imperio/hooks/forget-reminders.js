import { readStdin } from './lib/read-stdin.js';
import { forgetReminders } from './lib/reminder-memory.js';

try {
  const input = await readStdin();
  if (input?.session_id) forgetReminders(input.session_id);
} catch {
  process.exitCode = 0;
}
