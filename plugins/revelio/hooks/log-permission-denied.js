import { readStdin } from './lib/read-stdin.js';
import { resolveLogPath } from './lib/resolve-log-path.js';
import { appendRecord } from './lib/append-record.js';

const input = await readStdin();
if (input) {
  appendRecord(resolveLogPath(), {
    timestamp: new Date().toISOString(),
    event: 'PermissionDenied',
    session_id: input.session_id,
    cwd: input.cwd,
    tool_name: input.tool_name,
    tool_use_id: input.tool_use_id,
    tool_input: input.tool_input,
    reason: input.reason ?? input.permission_decision,
  });
}
process.exit(0);
