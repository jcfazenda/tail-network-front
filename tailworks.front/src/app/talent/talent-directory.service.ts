import { Injectable, inject } from '@angular/core';
import { TalentDirectoryRepository } from './talent-directory.repository';

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
  private readonly defaultAvatarUrl = '/assets/avatars/avatar-default.svg';
  private readonly repository = inject(TalentDirectoryRepository);

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

  ensureSeeded(): void {
    const existing = this.load();
    if (existing.length) {
      // Se o usuário já tinha um diretório "seedado" antigo (ex: dezenas de *@tailworks.local),
      // a intenção agora é refletir somente talentos realmente cadastrados.
      const hasAnyRealEmail = existing.some((item) => !item.email.toLocaleLowerCase('pt-BR').endsWith('@tailworks.local'));
      const demoOnly = !hasAnyRealEmail;

      if (demoOnly && existing.length > 1) {
        const breno = existing.find((item) => item.email.toLocaleLowerCase('pt-BR') === 'breno@tailworks.local')
          ?? existing[0];
        this.persist([breno]);
      }

      return;
    }

    const now = new Date().toISOString();

    const seed: TalentRecord[] = [
      {
        id: 'talent-breno',
        name: 'Breno Almeida',
        email: 'breno@tailworks.local',
        location: 'São Paulo - SP',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:dotnet': 78,
          'repo:csharp': 76,
          'repo:aspnet-core': 70,
          'repo:entity-framework': 62,
          'repo:rest-api': 74,
          'repo:sql-server': 66,
          'repo:azure': 48,
          'repo:docker': 44,
        },
        updatedAt: now,
      },
    ];

    this.persist(seed);
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
    this.repository.writeAll(list);
  }
}
