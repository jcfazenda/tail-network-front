import { Injectable, inject } from '@angular/core';
import { TalentDirectoryRepository } from './talent-directory.repository';
import { BrowserStorageService } from '../core/storage/browser-storage.service';

export type TalentStackProfile = Record<string, number>;

export type TalentRecord = {
  id: string;
  name: string;
  email: string;
  location: string;
  avatarUrl: string;
  visibleInEcosystem: boolean;
  availableForHiring: boolean;
  stacks: TalentStackProfile;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class TalentDirectoryService {
  private static readonly suppressSeedStorageKey = 'tailworks:talent-directory:suppress-seed:v1';
  private readonly defaultAvatarUrl = '/assets/avatars/avatar-default.svg';
  private readonly repository = inject(TalentDirectoryRepository);
  private readonly browserStorage = inject(BrowserStorageService);

  listTalents(): TalentRecord[] {
    this.ensureSeeded();
    return this.load();
  }

  upsertTalent(input: Pick<TalentRecord, 'name' | 'email' | 'location'> & Partial<Pick<TalentRecord, 'stacks' | 'avatarUrl' | 'visibleInEcosystem' | 'availableForHiring'>>): TalentRecord {
    const email = input.email.trim().toLocaleLowerCase('pt-BR');
    const now = new Date().toISOString();
    const current = this.load();
    const existingIndex = current.findIndex((item) => item.email.toLocaleLowerCase('pt-BR') === email);

    const next: TalentRecord = {
      id: existingIndex >= 0 ? current[existingIndex].id : `talent-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      name: input.name.trim() || 'Talento',
      email,
      location: input.location?.trim() || 'Brasil',
      avatarUrl: input.avatarUrl?.trim() || (existingIndex >= 0 ? current[existingIndex].avatarUrl : this.defaultAvatarUrl),
      visibleInEcosystem: input.visibleInEcosystem ?? (existingIndex >= 0 ? current[existingIndex].visibleInEcosystem : true),
      availableForHiring: input.availableForHiring ?? (existingIndex >= 0 ? current[existingIndex].availableForHiring : true),
      stacks: input.stacks ?? (existingIndex >= 0 ? current[existingIndex].stacks : {}),
      updatedAt: now,
    };

    const nextList = [...current];
    if (existingIndex >= 0) {
      nextList[existingIndex] = next;
    } else {
      nextList.unshift(next);
    }

    this.persist(nextList);
    return next;
  }

  clearDirectory(): void {
    this.browserStorage.setItem(TalentDirectoryService.suppressSeedStorageKey, 'true');
    this.persist([]);
  }

  clearSeededTalents(): void {
    const retained = this.load().filter((talent) => !talent.email.toLocaleLowerCase('pt-BR').endsWith('@talent.local'));
    this.persist(retained);
  }

  ensureSeeded(): void {
    if (this.browserStorage.getItem(TalentDirectoryService.suppressSeedStorageKey) === 'true') {
      return;
    }

    const existing = this.load();
    if (existing.length) {
      const allowedSeeds = new Set(['janaina@gmail.com', 'thais@gmail.com']);
      const hasLegacyDemoOnly = existing.every((item) => item.email.toLocaleLowerCase('pt-BR').endsWith('@tailworks.local'));

      if (hasLegacyDemoOnly) {
        this.persist(this.buildSeedList());
        return;
      }

      const filtered = existing.filter((item) => !item.email.toLocaleLowerCase('pt-BR').endsWith('@tailworks.local'));
      const next = filtered.filter((item) => allowedSeeds.has(item.email.toLocaleLowerCase('pt-BR')));

      if (next.length !== existing.length && next.length > 0) {
        this.persist(next);
      }

      return;
    }

    this.persist(this.buildSeedList());
  }

  private load(): TalentRecord[] {
    const stored = this.repository.readAll();
    if (!stored) {
      return [];
    }

    if (!stored.length) {
      return [];
    }

    return stored
      .filter((item) => !!item && typeof item === 'object')
      .map((item) => ({
        id: `${item.id ?? ''}`.trim() || `talent-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        name: `${item.name ?? ''}`.trim() || 'Talento',
        email: `${item.email ?? ''}`.trim().toLocaleLowerCase('pt-BR'),
        location: `${item.location ?? ''}`.trim() || 'Brasil',
        avatarUrl: `${item.avatarUrl ?? ''}`.trim() || this.defaultAvatarUrl,
        visibleInEcosystem: item.visibleInEcosystem !== false,
        availableForHiring: item.availableForHiring !== false,
        stacks: (item.stacks && typeof item.stacks === 'object') ? (item.stacks as TalentStackProfile) : {},
        updatedAt: `${item.updatedAt ?? ''}`.trim() || new Date().toISOString(),
      }))
      .filter((item) => !!item.email);
  }

  private persist(list: TalentRecord[]): void {
    if (list.length) {
      this.browserStorage.removeItem(TalentDirectoryService.suppressSeedStorageKey);
    }

    this.repository.writeAll(list);
  }

  private buildSeedList(): TalentRecord[] {
    const now = new Date().toISOString();

    return [
      {
        id: 'talent-janaina',
        name: 'Janaina Talento',
        email: 'janaina@gmail.com',
        location: 'Rio de Janeiro - RJ',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:dotnet': 82,
          'repo:csharp': 80,
          'repo:aspnet-core': 72,
          'repo:entity-framework': 67,
          'repo:rest-api': 76,
          'repo:sql-server': 71,
          'repo:azure': 56,
        },
        updatedAt: now,
      },
      {
        id: 'talent-thais',
        name: 'Thais Talento',
        email: 'thais@gmail.com',
        location: 'São Paulo - SP',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:react': 84,
          'repo:typescript': 81,
          'repo:javascript': 76,
          'repo:html': 74,
          'repo:css': 72,
          'repo:nextjs': 61,
        },
        updatedAt: now,
      },
    ];
  }
}
