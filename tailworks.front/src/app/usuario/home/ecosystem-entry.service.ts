import { Injectable, signal } from '@angular/core';

export type EcosystemEntryMode = 'recruiter' | 'talent';

@Injectable({ providedIn: 'root' })
export class EcosystemEntryService {
  private readonly storageKey = 'tailworks.front.ecosystem-entry-mode:v1';
  readonly mode = signal<EcosystemEntryMode>(this.readStoredMode());

  getMode(): EcosystemEntryMode {
    return this.mode();
  }

  setMode(mode: EcosystemEntryMode): void {
    this.mode.set(mode);

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey, mode);
  }

  private readStoredMode(): EcosystemEntryMode {
    if (typeof window === 'undefined') {
      return 'talent';
    }

    const raw = window.localStorage.getItem(this.storageKey);
    return raw === 'recruiter' ? 'recruiter' : 'talent';
  }
}
