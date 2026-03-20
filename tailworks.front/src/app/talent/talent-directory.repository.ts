import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { TalentRecord } from './talent-directory.service';

@Injectable({ providedIn: 'root' })
export class TalentDirectoryRepository {
  private readonly storageKey = 'tailworks:talent-directory:v1';
  private readonly browserStorage = inject(BrowserStorageService);

  readAll(): TalentRecord[] | null {
    return this.browserStorage.readJson<TalentRecord[]>(this.storageKey);
  }

  writeAll(talents: TalentRecord[]): void {
    this.browserStorage.writeJson(this.storageKey, talents);
  }
}
