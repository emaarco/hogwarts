import { readStdin } from './lib/read-stdin.js';
import { resolveLogPath } from './lib/resolve-log-path.js';
import { appendRecord } from './lib/append-record.js';

const input = await readStdin();
if (input) {
  appendRecord(resolveLogPath(), {
    timestamp: new Date().toISOString(),
    event: 'PostToolUseFailure',
    session_id: input.session_id,
    cwd: input.cwd,
    tool_name: input.tool_name,
    tool_use_id: input.tool_use_id,
    tool_input: input.tool_input,
    error: input.error ?? input.tool_response?.error,
  });
}
process.exit(0);
