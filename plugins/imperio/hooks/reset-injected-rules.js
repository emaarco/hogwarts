import fs from 'node:fs';
import { resetInjectedRules } from './lib/injected-rules.js';

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8'));
  if (input.session_id) resetInjectedRules(input.session_id);
} catch {
  process.exitCode = 0;
}
