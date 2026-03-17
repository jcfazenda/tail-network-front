import { Injectable } from '@angular/core';

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
  private readonly storageKey = 'tailworks:talent-directory:v1';
  private readonly defaultAvatarUrl = '/assets/avatars/avatar-default.svg';

  listTalents(): TalentRecord[] {
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
    // Se já existe algo (ex: só 1 talento), complementa com seeds para o radar ficar realista.
    const shouldComplement = existing.length > 0 && existing.length < 8;
    if (existing.length && !shouldComplement) {
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
      ...[
        'Camila Ribeiro',
        'Diego Santos',
        'Fernanda Lima',
        'Guilherme Rocha',
        'Helena Duarte',
        'Igor Martins',
        'Joana Ferreira',
        'Kleber Costa',
        'Larissa Souza',
        'Marcos Vinicius',
        'Natalia Araujo',
        'Otavio Mendes',
        'Patricia Oliveira',
        'Renato Almeida',
        'Sofia Carvalho',
        'Thiago Pereira',
      ].map((name, index): TalentRecord => ({
        id: `talent-dotnet-${index + 1}`,
        name,
        email: `dotnet-${index + 1}@tailworks.local`,
        location: index % 2 === 0 ? 'Rio de Janeiro - RJ' : 'São Paulo - SP',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:dotnet': 62 + (index % 5) * 6,
          'repo:csharp': 58 + (index % 6) * 6,
          'repo:aspnet-core': 52 + (index % 7) * 5,
          'repo:entity-framework': 44 + (index % 6) * 5,
          'repo:rest-api': 56 + (index % 5) * 6,
          'repo:microservices': 40 + (index % 6) * 6,
          'repo:sql-server': 44 + (index % 7) * 5,
          'repo:azure': 32 + (index % 6) * 6,
          'repo:docker': 30 + (index % 6) * 6,
        },
        updatedAt: now,
      })),
      {
        id: 'talent-ana',
        name: 'Ana Beatriz',
        email: 'ana@tailworks.local',
        location: 'Rio de Janeiro - RJ',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:angular': 72,
          'repo:typescript': 74,
          'repo:javascript': 68,
          'repo:html': 80,
          'repo:css': 78,
          'repo:rest-api': 40,
        },
        updatedAt: now,
      },
      {
        id: 'talent-carlos',
        name: 'Carlos Nogueira',
        email: 'carlos@tailworks.local',
        location: 'Curitiba - PR',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:aws': 76,
          'repo:serverless': 70,
          'repo:docker': 68,
          'repo:kubernetes': 54,
          'repo:terraform': 58,
          'repo:linux': 66,
        },
        updatedAt: now,
      },
      {
        id: 'talent-marina',
        name: 'Marina Dias',
        email: 'marina@tailworks.local',
        location: 'Belo Horizonte - MG',
        avatarUrl: this.defaultAvatarUrl,
        visibleInEcosystem: true,
        availableForHiring: true,
        stacks: {
          'repo:postgresql': 74,
          'repo:redis': 52,
          'repo:elasticsearch': 44,
          'repo:sql-server': 38,
          'repo:microservices': 46,
        },
        updatedAt: now,
      },
    ];

    if (!existing.length) {
      this.persist(seed);
      return;
    }

    const byEmail = new Map(existing.map((item) => [item.email.toLocaleLowerCase('pt-BR'), item]));
    for (const item of seed) {
      const key = item.email.toLocaleLowerCase('pt-BR');
      if (!byEmail.has(key)) {
        byEmail.set(key, item);
      }
    }

    // mantém a ordem: existentes primeiro, depois os novos seeds.
    const merged = [
      ...existing,
      ...seed.filter((item) => !existing.some((current) => current.email.toLocaleLowerCase('pt-BR') === item.email.toLocaleLowerCase('pt-BR'))),
    ].map((item) => ({ ...item, updatedAt: item.updatedAt || now }));

    this.persist(merged);
  }

  private load(): TalentRecord[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const storage = window.localStorage;
    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item): item is Partial<TalentRecord> => !!item && typeof item === 'object')
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
    } catch {
      storage.removeItem(this.storageKey);
      return [];
    }
  }

  private persist(list: TalentRecord[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.storageKey, JSON.stringify(list));
  }
}
