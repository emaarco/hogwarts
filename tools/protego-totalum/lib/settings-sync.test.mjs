import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsSync } from './settings-sync.mjs';

class MemoryFile {
  value;

  constructor(value) {
    this.value = value;
  }

  read() {
    return structuredClone(this.value);
  }

  write(value) {
    this.value = structuredClone(value);
  }
}

function syncSettings({ shippedSettings, currentSettings, previousSettings }) {
  const settingsFile = new MemoryFile(currentSettings);
  const lockFile = new MemoryFile(previousSettings);
  const report = new SettingsSync({ shippedSettings, settingsFile, lockFile }).run();
  return { report, settings: settingsFile.value, lock: lockFile.value };
}

test('writes the shipped settings when there is no settings file yet and records them in the lock', () => {
  const shippedSettings = { sandbox: { enabled: true } };

  const { report, settings, lock } = syncSettings({ shippedSettings });

  assert.deepEqual(settings, { sandbox: { enabled: true } });
  assert.deepEqual(lock, shippedSettings);
  assert.deepEqual(report, { changed: true, skipped: [] });
});

test('adds the shipped keys next to the keys of the user', () => {
  const { settings } = syncSettings({
    shippedSettings: { sandbox: { enabled: true, network: { strictAllowlist: true } } },
    currentSettings: { model: 'opus', sandbox: { network: { allowedDomains: ['github.com'] } } },
  });

  assert.deepEqual(settings, {
    model: 'opus',
    sandbox: { network: { allowedDomains: ['github.com'], strictAllowlist: true }, enabled: true },
  });
});

test('keeps a value the user set on their own and reports the key as skipped', () => {
  const shippedSettings = { sandbox: { enabled: true } };
  const firstRun = syncSettings({ shippedSettings, currentSettings: { sandbox: { enabled: false } } });

  const secondRun = syncSettings({ shippedSettings, currentSettings: firstRun.settings, previousSettings: firstRun.lock });

  assert.deepEqual(secondRun.settings, { sandbox: { enabled: false } });
  assert.deepEqual(secondRun.report, { changed: false, skipped: ['sandbox.enabled'] });
});

test('adopts a key the user already set to the shipped value', () => {
  const { report } = syncSettings({
    shippedSettings: { sandbox: { enabled: true } },
    currentSettings: { sandbox: { enabled: true } },
  });

  assert.deepEqual(report, { changed: false, skipped: [] });
});

test('updates a value it wrote earlier when the shipped value changes', () => {
  const { settings } = syncSettings({
    shippedSettings: { sandbox: { enabled: true, failIfUnavailable: true } },
    currentSettings: { sandbox: { enabled: true, failIfUnavailable: false } },
    previousSettings: { sandbox: { enabled: true, failIfUnavailable: false } },
  });

  assert.deepEqual(settings, { sandbox: { enabled: true, failIfUnavailable: true } });
});

test('removes a key it wrote earlier that is no longer shipped', () => {
  const { settings } = syncSettings({
    shippedSettings: { sandbox: { enabled: true } },
    currentSettings: { model: 'opus', sandbox: { enabled: true, network: { strictAllowlist: true } } },
    previousSettings: { sandbox: { enabled: true, network: { strictAllowlist: true } } },
  });

  assert.deepEqual(settings, { model: 'opus', sandbox: { enabled: true } });
});

test('keeps a retired key whose value the user changed', () => {
  const { settings } = syncSettings({
    shippedSettings: {},
    currentSettings: { sandbox: { enabled: false } },
    previousSettings: { sandbox: { enabled: true } },
  });

  assert.deepEqual(settings, { sandbox: { enabled: false } });
});

test('adds shipped list items after the items of the user and never duplicates them', () => {
  const { settings } = syncSettings({
    shippedSettings: { permissions: { deny: ['Bash(printenv)', 'Read(./.env)'] } },
    currentSettings: { permissions: { deny: ['Read(./secrets/**)', 'Read(./.env)'] } },
  });

  assert.deepEqual(settings, { permissions: { deny: ['Read(./secrets/**)', 'Read(./.env)', 'Bash(printenv)'] } });
});

test('replaces a list item it added earlier and leaves the items of the user alone', () => {
  const userHook = { matcher: 'Bash', hooks: [{ type: 'command', command: 'my-hook' }] };
  const oldHook = { matcher: 'Read', hooks: [{ type: 'command', command: 'bash patronum-hook.sh' }] };
  const newHook = { matcher: 'Read|Bash', hooks: [{ type: 'command', command: 'bash patronum-hook.sh' }] };

  const { settings } = syncSettings({
    shippedSettings: { hooks: { PreToolUse: [newHook] } },
    currentSettings: { hooks: { PreToolUse: [userHook, oldHook] } },
    previousSettings: { hooks: { PreToolUse: [oldHook] } },
  });

  assert.deepEqual(settings, { hooks: { PreToolUse: [userHook, newHook] } });
});

test('a second run changes nothing', () => {
  const shippedSettings = { sandbox: { enabled: true }, permissions: { deny: ['Bash(printenv)'] } };
  const firstRun = syncSettings({ shippedSettings, currentSettings: { model: 'opus' } });

  const secondRun = syncSettings({ shippedSettings, currentSettings: firstRun.settings, previousSettings: firstRun.lock });

  assert.deepEqual(secondRun.report, { changed: false, skipped: [] });
  assert.deepEqual(secondRun.settings, firstRun.settings);
});
