import { Injectable, inject, signal } from '@angular/core';
import { BrowserStorageService } from '../storage/browser-storage.service';

export type EcosystemJobFilters = {
  company: string;
  state: string;
  stack: string;
};

@Injectable({ providedIn: 'root' })
export class EcosystemJobFiltersService {
  private readonly storageKey = 'tailworks.front.ecosystem-job-filters:v1';
  private readonly browserStorage = inject(BrowserStorageService);

  readonly filters = signal<EcosystemJobFilters>(this.readStoredFilters());

  setFilters(filters: EcosystemJobFilters): void {
    const next: EcosystemJobFilters = {
      company: filters.company?.trim() ?? '',
      state: filters.state?.trim() ?? '',
      stack: filters.stack?.trim() ?? '',
    };

    this.filters.set(next);
    this.browserStorage.writeJson(this.storageKey, next);
  }

  clear(): void {
    this.setFilters({ company: '', state: '', stack: '' });
  }

  private readStoredFilters(): EcosystemJobFilters {
    const stored = this.browserStorage.readJson<Partial<EcosystemJobFilters>>(this.storageKey);
    return {
      company: stored?.company?.trim() ?? '',
      state: stored?.state?.trim() ?? '',
      stack: stored?.stack?.trim() ?? '',
    };
  }
}
