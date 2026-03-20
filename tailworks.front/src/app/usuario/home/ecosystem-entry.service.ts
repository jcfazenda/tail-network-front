import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from '../../core/storage/browser-storage.service';

export type EcosystemEntryMode = 'recruiter' | 'talent';

@Injectable({ providedIn: 'root' })
export class EcosystemEntryService {
  private readonly storageKey = 'tailworks.front.ecosystem-entry-mode:v1';
  private readonly browserStorage = inject(BrowserStorageService);
  readonly mode = signal<EcosystemEntryMode>(this.readStoredMode());

  getMode(): EcosystemEntryMode {
    return this.mode();
  }

  setMode(mode: EcosystemEntryMode): void {
    this.mode.set(mode);
    this.browserStorage.setItem(this.storageKey, mode);
  }

  syncModeFromUrl(url: string): void {
    const resolvedMode = this.resolveModeForUrl(url);
    if (!resolvedMode || resolvedMode === this.mode()) {
      return;
    }

    this.setMode(resolvedMode);
  }

  resolveModeForUrl(url: string): EcosystemEntryMode | null {
    const primaryPath = url.split('?')[0]?.split('#')[0] || url;

    if (primaryPath.startsWith('/usuario') && primaryPath !== '/usuario/ecossistema') {
      return 'talent';
    }

    if (
      primaryPath.startsWith('/recruiter')
      || primaryPath.startsWith('/empresa')
      || primaryPath === '/vagas'
      || primaryPath === '/radar'
      || primaryPath === '/talentos'
      || primaryPath === '/propostas'
    ) {
      return 'recruiter';
    }

    return null;
  }

  private readStoredMode(): EcosystemEntryMode {
    const raw = this.browserStorage.getItem(this.storageKey);
    return raw === 'recruiter' ? 'recruiter' : 'talent';
  }
}
