import { readStdin } from './lib/read-stdin.js';
import { resolveLogPath } from './lib/resolve-log-path.js';
import { appendRecord } from './lib/append-record.js';

const input = await readStdin();
if (input) {
  appendRecord(resolveLogPath(), {
    timestamp: new Date().toISOString(),
    event: 'StopFailure',
    session_id: input.session_id,
    cwd: input.cwd,
    stop_reason: input.stop_reason,
    error: input.error,
  });
}
process.exit(0);
