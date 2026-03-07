import { Injectable } from '@angular/core';
import { SaveMockJobCommand, MockJobCandidate, MockJobDraft, MockJobRecord } from './vagas.models';
import { VAGAS_MOCK_SEED } from './vagas-mock.seed';

@Injectable({ providedIn: 'root' })
export class VagasMockService {
  private readonly storageKey = 'tailworks.front.mock-vagas';
  private cache: MockJobRecord[] | null = null;

  getJobs(): MockJobRecord[] {
    return [...this.loadJobs()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getJobById(id: string): MockJobRecord | undefined {
    return this.loadJobs().find((job) => job.id === id);
  }

  saveJob(command: SaveMockJobCommand): MockJobRecord {
    const jobs = this.loadJobs();
    const record = this.buildRecord(command);
    this.cache = [record, ...jobs];
    this.persist();
    return record;
  }

  private loadJobs(): MockJobRecord[] {
    if (this.cache) {
      return this.cache;
    }

    const storage = this.getStorage();
    if (!storage) {
      this.cache = [...VAGAS_MOCK_SEED];
      return this.cache;
    }

    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      this.cache = [...VAGAS_MOCK_SEED];
      return this.cache;
    }

    try {
      const parsed = JSON.parse(raw) as MockJobRecord[];
      this.cache = Array.isArray(parsed) && parsed.length ? parsed : [...VAGAS_MOCK_SEED];
    } catch {
      this.cache = [...VAGAS_MOCK_SEED];
    }

    return this.cache;
  }

  private persist(): void {
    const storage = this.getStorage();
    if (!storage || !this.cache) {
      return;
    }

    storage.setItem(this.storageKey, JSON.stringify(this.cache));
  }

  private getStorage(): Storage | null {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return null;
    }

    return window.localStorage;
  }

  private buildRecord(command: SaveMockJobCommand): MockJobRecord {
    const now = new Date().toISOString();
    const talents = Math.max(8, command.previewAvatarExtraCount + command.previewAvatars.length);
    const radarCount = Math.max(4, Math.round(talents * 0.72));
    const match = Math.min(99, Math.max(42, Math.round(command.previewAderencia)));

    return {
      id: this.createId(),
      priority: command.draft.location.toUpperCase(),
      match,
      talents,
      radarCount,
      ageLabel: 'Agora',
      postedLabel: '',
      avatars: [...command.previewAvatars],
      extraCount: command.previewAvatarExtraCount,
      status: command.status,
      candidates: this.buildCandidates(command.draft, match),
      createdAt: now,
      updatedAt: now,
      ...command.draft,
      benefits: [...command.draft.benefits],
      techStack: command.draft.techStack.map((item) => ({ ...item })),
      differentials: [...command.draft.differentials],
    };
  }

  private buildCandidates(draft: MockJobDraft, match: number): MockJobCandidate[] {
    const avatar = '/assets/avatars/avatar-rafael.png';
    const primaryStack = draft.techStack[0]?.name || draft.title;
    const roleBase = this.resolveRoleBase(draft.title, primaryStack);

    return [
      {
        name: 'Amanda Costa',
        role: roleBase,
        match: Math.min(98, match + 3),
        minutesAgo: 6,
        status: 'online',
        avatar,
        stage: 'aguardando',
        availabilityLabel: 'Disponibilidade imediata',
      },
      {
        name: 'Bruno Martins',
        role: roleBase,
        match: Math.max(70, match - 2),
        minutesAgo: 18,
        status: 'offline',
        avatar,
        stage: 'processo',
      },
      {
        name: 'Carla Nogueira',
        role: roleBase,
        match: Math.max(68, match - 5),
        minutesAgo: 32,
        status: 'online',
        avatar,
        stage: 'processo',
        radarOnly: true,
      },
      {
        name: 'Diego Prado',
        role: roleBase,
        match: Math.max(64, match - 8),
        minutesAgo: 47,
        status: 'offline',
        avatar,
        stage: 'tecnica',
      },
    ];
  }

  private resolveRoleBase(title: string, primaryStack: string): string {
    const normalized = title.toLowerCase();
    if (normalized.includes('designer')) {
      return 'Product Designer';
    }

    if (normalized.includes('devops')) {
      return 'DevOps Engineer';
    }

    if (normalized.includes('analyst') || normalized.includes('analista')) {
      return 'Data Analyst';
    }

    if (normalized.includes('qa')) {
      return 'QA Engineer';
    }

    if (normalized.includes('manager')) {
      return 'Product Manager';
    }

    return primaryStack;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `vaga-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}
