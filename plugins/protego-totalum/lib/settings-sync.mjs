import { isDeepStrictEqual } from 'node:util';

export class SettingsSync {
  #shippedSettings;
  #settingsFile;
  #lockFile;

  constructor({ shippedSettings, settingsFile, lockFile }) {
    this.#shippedSettings = shippedSettings;
    this.#settingsFile = settingsFile;
    this.#lockFile = lockFile;
  }

  run() {
    const currentSettings = this.#settingsFile.read() ?? {};
    const previousSettings = this.#lockFile.read() ?? {};
    const skipped = [];
    const mergedSettings = SettingsSync.#merge({
      current: currentSettings,
      shipped: this.#shippedSettings,
      previous: previousSettings,
      keyPath: [],
      skipped,
    }) ?? {};
    const changed = !isDeepStrictEqual(currentSettings, mergedSettings);
    if (changed) this.#settingsFile.write(mergedSettings);
    if (!isDeepStrictEqual(previousSettings, this.#shippedSettings)) this.#lockFile.write(this.#shippedSettings);
    return { changed, skipped };
  }

  static #merge(values) {
    const { current, shipped, previous } = values;
    const ours = shipped ?? previous;
    if (SettingsSync.#isObject(ours) && (current === undefined || SettingsSync.#isObject(current))) {
      return SettingsSync.#mergeObject(values);
    }
    if (Array.isArray(ours) && (current === undefined || Array.isArray(current))) {
      return SettingsSync.#mergeArray(values);
    }
    return SettingsSync.#mergeValue(values);
  }

  static #mergeObject({ current = {}, shipped, previous, keyPath, skipped }) {
    const shippedObject = SettingsSync.#isObject(shipped) ? shipped : {};
    const previousObject = SettingsSync.#isObject(previous) ? previous : {};
    const merged = { ...current };
    for (const key of new Set([...Object.keys(shippedObject), ...Object.keys(previousObject)])) {
      const value = SettingsSync.#merge({
        current: current[key],
        shipped: shippedObject[key],
        previous: previousObject[key],
        keyPath: [...keyPath, key],
        skipped,
      });
      if (value === undefined) delete merged[key];
      else merged[key] = value;
    }
    if (shipped === undefined && Object.keys(merged).length === 0) return undefined;
    return merged;
  }

  static #mergeArray({ current = [], shipped, previous }) {
    const shippedItems = Array.isArray(shipped) ? shipped : [];
    const previousItems = Array.isArray(previous) ? previous : [];
    const keptItems = current.filter((item) => SettingsSync.#includes(shippedItems, item) || !SettingsSync.#includes(previousItems, item));
    const addedItems = shippedItems.filter((item) => !SettingsSync.#includes(keptItems, item));
    const merged = [...keptItems, ...addedItems];
    if (shipped === undefined && merged.length === 0) return undefined;
    return merged;
  }

  static #mergeValue({ current, shipped, previous, keyPath, skipped }) {
    if (current === undefined || isDeepStrictEqual(current, previous)) return shipped;
    if (shipped !== undefined && !isDeepStrictEqual(current, shipped)) skipped.push(keyPath.join('.'));
    return current;
  }

  static #includes(items, wantedItem) {
    return items.some((item) => isDeepStrictEqual(item, wantedItem));
  }

  static #isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
