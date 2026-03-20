import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';

@Injectable({ providedIn: 'root' })
export class EcosystemSearchService {
  private readonly storageKey = 'tailworks.front.ecosystem-search:v1';
  private readonly browserStorage = inject(BrowserStorageService);
  readonly query = signal<string>(this.readStoredQuery());

  setQuery(value: string): void {
    const next = value ?? '';
    this.query.set(next);
    this.browserStorage.setItem(this.storageKey, next);
  }

  clear(): void {
    this.setQuery('');
  }

  private readStoredQuery(): string {
    return this.browserStorage.getItem(this.storageKey) ?? '';
  }
}
