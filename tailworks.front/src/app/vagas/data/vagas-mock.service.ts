import { Injectable } from '@angular/core';
import { JobBenefitItem, SaveMockJobCommand, MockJobRecord } from './vagas.models';

@Injectable({ providedIn: 'root' })
export class VagasMockService {
  private readonly storageKey = 'tailworks.front.mock-vagas.publish-only';
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

  updateJob(id: string, command: SaveMockJobCommand): MockJobRecord {
    const jobs = this.loadJobs();
    const existing = jobs.find((job) => job.id === id);

    if (!existing) {
      return this.saveJob(command);
    }

    const record = this.buildRecord(command, existing);
    this.cache = [record, ...jobs.filter((job) => job.id !== id)];
    this.persist();
    return record;
  }

  publishOnlyJob(command: SaveMockJobCommand): MockJobRecord {
    const record = this.buildRecord(command);
    this.cache = [record];
    this.persist();
    return record;
  }

  clearJobs(): void {
    this.cache = [];

    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(this.storageKey);
  }

  deleteJob(id: string): void {
    const jobs = this.loadJobs();
    this.cache = jobs.filter((job) => job.id !== id);
    this.persist();
  }

  private loadJobs(): MockJobRecord[] {
    if (this.cache) {
      return this.cache;
    }

    const storage = this.getStorage();
    if (!storage) {
      this.cache = [];
      return this.cache;
    }

    const raw = storage.getItem(this.storageKey);
    if (!raw) {
      this.cache = [];
      return this.cache;
    }

    try {
      const parsed = JSON.parse(raw) as MockJobRecord[];
      this.cache = Array.isArray(parsed) && parsed.length ? this.normalizeJobs(parsed) : [];
    } catch {
      this.cache = [];
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

  private buildRecord(command: SaveMockJobCommand, existing?: MockJobRecord): MockJobRecord {
    const now = new Date().toISOString();
    const talents = Math.max(8, command.previewAvatarExtraCount + command.previewAvatars.length);
    const radarCount = Math.max(4, Math.round(talents * 0.72));
    const match = Math.min(99, Math.max(42, Math.round(command.previewAderencia)));

    return {
      id: existing?.id ?? this.createId(),
      priority: command.draft.location.toUpperCase(),
      match,
      talents,
      radarCount,
      ageLabel: 'Agora',
      postedLabel: '',
      avatars: [...command.previewAvatars],
      extraCount: command.previewAvatarExtraCount,
      status: command.status,
      candidates: existing?.candidates.map((candidate) => ({ ...candidate })) ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...command.draft,
      benefits: command.draft.benefits.map((item) => ({ ...item })),
      techStack: command.draft.techStack.map((item) => ({ ...item })),
      differentials: [...command.draft.differentials],
    };
  }

  private normalizeJobs(records: MockJobRecord[]): MockJobRecord[] {
    return records.map((record) => ({
      ...record,
      showSalaryRangeInCard: record.showSalaryRangeInCard ?? true,
      benefits: this.normalizeBenefits(record.benefits),
      techStack: record.techStack.map((item) => ({ ...item })),
      differentials: [...record.differentials],
      candidates: record.candidates.map((candidate) => ({ ...candidate })),
      avatars: [...record.avatars],
    }));
  }

  private normalizeBenefits(benefits: unknown): JobBenefitItem[] {
    if (!Array.isArray(benefits)) {
      return [];
    }

    return benefits.map((item) => {
      if (typeof item === 'string') {
        return { title: item };
      }

      if (item && typeof item === 'object') {
        const value = item as Partial<JobBenefitItem>;
        return {
          title: value.title?.trim() || 'Benefício',
          sideLabel: value.sideLabel?.trim() || undefined,
          description: value.description?.trim() || undefined,
        };
      }

      return { title: 'Benefício' };
    });
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `vaga-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}
