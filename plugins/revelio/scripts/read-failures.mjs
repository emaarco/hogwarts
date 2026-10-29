#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const ERROR_TEXT_LIMIT = 500;
const INPUT_TEXT_LIMIT = 300;
const MESSAGE_TYPES = new Set(['user', 'assistant']);

export function transcriptDirFor(projectRoot, home = os.homedir()) {
  return path.join(home, '.claude', 'projects', projectRoot.replace(/[^a-zA-Z0-9]/g, '-'));
}

export function classifyToolError(entry, text) {
  if (entry.toolDenialKind) return entry.toolDenialKind;
  if (text.startsWith("The user doesn't want to proceed")) return 'user-rejected';
  if (text.startsWith('Permission for this action was denied by the Claude Code auto mode')) return 'automode-blocked';
  return 'tool-error';
}

function asText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(part => part?.text ?? '').join('\n');
  return JSON.stringify(value ?? '');
}

function truncate(text, limit) {
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

function contentBlocks(entry) {
  const content = entry?.message?.content;
  return Array.isArray(content) ? content : [];
}

export async function* readFailures(transcriptPath) {
  const toolCalls = new Map();
  const lines = readline.createInterface({ input: fs.createReadStream(transcriptPath) });
  for await (const line of lines) {
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (!MESSAGE_TYPES.has(entry.type)) continue;
    const base = { timestamp: entry.timestamp, sessionId: entry.sessionId, cwd: entry.cwd };

    if (entry.isApiErrorMessage) {
      const text = asText(contentBlocks(entry).find(block => block.type === 'text')?.text);
      yield { ...base, kind: 'api-error', tool: null, input: null, error: truncate(`${entry.error ?? ''} ${text}`.trim(), ERROR_TEXT_LIMIT) };
      continue;
    }

    for (const block of contentBlocks(entry)) {
      if (block.type === 'tool_use') toolCalls.set(block.id, { tool: block.name, input: block.input });
      if (block.type !== 'tool_result' || !block.is_error) continue;
      const call = toolCalls.get(block.tool_use_id) ?? {};
      const text = asText(block.content);
      yield {
        ...base,
        kind: classifyToolError(entry, text),
        tool: call.tool ?? null,
        input: call.input === undefined ? null : truncate(JSON.stringify(call.input), INPUT_TEXT_LIMIT),
        error: truncate(text, ERROR_TEXT_LIMIT),
      };
    }
  }
}

function isWithin(record, { session, since, until }) {
  if (session && record.sessionId !== session) return false;
  if (since && !(record.timestamp >= since)) return false;
  if (until && !(record.timestamp <= until)) return false;
  return true;
}

export async function collectFailures(transcriptDir, filters = {}) {
  if (!fs.existsSync(transcriptDir)) return [];
  const transcripts = fs.readdirSync(transcriptDir).filter(name => name.endsWith('.jsonl'));
  const records = [];
  for (const name of transcripts) {
    for await (const record of readFailures(path.join(transcriptDir, name))) {
      if (isWithin(record, filters)) records.push(record);
    }
  }
  records.sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
  return filters.limit ? records.slice(0, filters.limit) : records;
}

async function main() {
  const { values } = parseArgs({
    options: {
      project: { type: 'string', default: process.cwd() },
      limit: { type: 'string' },
      session: { type: 'string' },
      since: { type: 'string' },
      until: { type: 'string' },
    },
  });
  const transcriptDir = transcriptDirFor(path.resolve(values.project));
  const records = await collectFailures(transcriptDir, {
    session: values.session,
    since: values.since,
    until: values.until,
    limit: values.limit ? Number(values.limit) : undefined,
  });
  for (const record of records) process.stdout.write(`${JSON.stringify(record)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
