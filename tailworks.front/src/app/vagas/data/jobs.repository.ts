import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../../core/storage/browser-storage.service';
import { MockJobRecord } from './vagas.models';

@Injectable({ providedIn: 'root' })
export class JobsRepository {
  private readonly storageKey = 'tailworks.front.mock-vagas.publish-only';
  private readonly browserStorage = inject(BrowserStorageService);

  get key(): string {
    return this.storageKey;
  }

  readAll(): MockJobRecord[] | null {
    return this.browserStorage.readJson<MockJobRecord[]>(this.storageKey);
  }

  readRaw(): string | null {
    return this.browserStorage.getItem(this.storageKey);
  }

  writeAll(jobs: MockJobRecord[]): void {
    this.browserStorage.writeJson(this.storageKey, jobs);
  }
}
