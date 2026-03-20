import { Injectable, inject } from '@angular/core';
import { BrowserStorageService } from '../core/storage/browser-storage.service';
import { RecruiterRecord } from './recruiter.models';

export type RecruiterWorkspaceState = {
  recruiterId: string;
  company: string;
};

@Injectable({ providedIn: 'root' })
export class RecruiterDirectoryRepository {
  private readonly directoryStorageKey = 'tailworks:recruiter-directory:v1';
  private readonly workspaceStorageKey = 'tailworks:recruiter-workspace:v1';
  private readonly browserStorage = inject(BrowserStorageService);

  readAll(): RecruiterRecord[] | null {
    return this.browserStorage.readJson<RecruiterRecord[]>(this.directoryStorageKey);
  }

  writeAll(recruiters: RecruiterRecord[]): void {
    this.browserStorage.writeJson(this.directoryStorageKey, recruiters);
  }

  clearDirectory(): void {
    this.browserStorage.setItem(this.directoryStorageKey, '[]');
  }

  readWorkspace(): RecruiterWorkspaceState | null {
    return this.browserStorage.readJson<RecruiterWorkspaceState>(this.workspaceStorageKey);
  }

  writeWorkspace(workspace: RecruiterWorkspaceState): void {
    this.browserStorage.writeJson(this.workspaceStorageKey, workspace);
  }

  clearWorkspace(): void {
    this.browserStorage.removeItem(this.workspaceStorageKey);
  }
}
