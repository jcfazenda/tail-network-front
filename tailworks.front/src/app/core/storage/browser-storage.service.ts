import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  get storage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  getItem(key: string): string | null {
    return this.storage?.getItem(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage?.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage?.removeItem(key);
  }

  listKeys(): string[] {
    const storage = this.storage;
    if (!storage) {
      return [];
    }

    return Array.from({ length: storage.length }, (_value, index) => storage.key(index))
      .filter((key): key is string => !!key);
  }

  removeByPrefixes(prefixes: string[]): void {
    if (!prefixes.length) {
      return;
    }

    this.listKeys()
      .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => this.removeItem(key));
  }

  readJson<T>(key: string): T | null {
    const raw = this.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.removeItem(key);
      return null;
    }
  }

  writeJson(key: string, value: unknown): void {
    this.setItem(key, JSON.stringify(value));
  }
}
