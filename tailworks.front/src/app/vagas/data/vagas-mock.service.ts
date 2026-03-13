import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { JobBenefitItem, JobResponsibilitySection, SaveMockJobCommand, MockJobCandidate, MockJobRecord, TalentJobDecision } from './vagas.models';

type CandidateBasicProfile = {
  name: string;
  location: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type TalentIdentity = {
  name: string;
  avatar: string;
  location: string;
  hasProfileAvatar: boolean;
};

@Injectable({ providedIn: 'root' })
export class VagasMockService {
  private readonly storageKey = 'tailworks.front.mock-vagas.publish-only';
  private readonly syncChannelName = 'tailworks.front.mock-vagas.sync';
  private readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private readonly fallbackTalentAvatar = '/assets/avatars/avatar-rafael.png';
  private readonly fallbackTalentCandidateName = 'Rafael Oliveira';
  private readonly zone = inject(NgZone);
  private readonly jobsChangedSubject = new Subject<void>();
  private cache: MockJobRecord[] | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  readonly jobsChanged$ = this.jobsChangedSubject.asObservable();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('storage', this.handleStorageSync);

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(this.syncChannelName);
      this.broadcastChannel.addEventListener('message', this.handleBroadcastSync);
    }
  }

  getJobs(): MockJobRecord[] {
    return [...this.loadJobs()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getJobById(id: string): MockJobRecord | undefined {
    return this.loadJobs().find((job) => job.id === id);
  }

  getTalentCandidateIdentity(): TalentIdentity {
    return this.readTalentIdentity();
  }

  findTalentCandidate(job: Pick<MockJobRecord, 'candidates'>): MockJobCandidate | undefined {
    const identity = this.readTalentIdentity();
    return job.candidates.find((candidate) => this.isTalentCandidate(candidate, identity));
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
      this.emitJobsChanged();
      return;
    }

    storage.removeItem(this.storageKey);
    this.broadcastSync();
    this.emitJobsChanged();
  }

  deleteJob(id: string): void {
    const jobs = this.loadJobs();
    this.cache = jobs.filter((job) => job.id !== id);
    this.persist();
  }

  applyAsTalent(jobId: string): MockJobRecord | undefined {
    return this.updateTalentStage(jobId, 'candidatura', 'applied');
  }

  acceptOfferAsTalent(jobId: string): MockJobRecord | undefined {
    return this.updateTalentStage(jobId, 'aceito', 'applied');
  }

  submitTalentDocuments(
    jobId: string,
    checkedDocuments: string[],
    consentAccepted: boolean,
  ): MockJobRecord | undefined {
    const normalizedDocuments = checkedDocuments.map((item) => item.trim()).filter(Boolean);

    return this.updateTalentStage(jobId, 'documentacao', 'applied', {
      talentSubmittedDocuments: normalizedDocuments,
      talentDocumentsConsentAccepted: consentAccepted,
    });
  }

  keepJobForNextOpportunity(jobId: string): MockJobRecord | undefined {
    return this.updateTalentStage(jobId, 'proxima', undefined);
  }

  cancelTalentApplication(jobId: string): MockJobRecord | undefined {
    return this.updateTalentStage(jobId, 'cancelado', undefined);
  }

  updateRecruiterTalentStage(
    jobId: string,
    stage: MockJobCandidate['stage'],
    talentDecision?: TalentJobDecision,
  ): MockJobRecord | undefined {
    const talentCandidate = this.findTalentCandidateByJobId(jobId);

    if (!talentCandidate) {
      return undefined;
    }

    return this.updateCandidateStage(
      jobId,
      talentCandidate.name,
      stage,
      talentDecision ?? (stage === 'radar' || stage === 'cancelado' ? undefined : 'applied'),
    );
  }

  updateCandidateStage(
    jobId: string,
    candidateName: string,
    stage: MockJobCandidate['stage'],
    talentDecision?: TalentJobDecision,
    options?: {
      talentSubmittedDocuments?: string[];
      talentDocumentsConsentAccepted?: boolean;
    },
  ): MockJobRecord | undefined {
    const jobs = this.loadJobs();
    const existing = jobs.find((job) => job.id === jobId);

    if (!existing) {
      return undefined;
    }

    const nextCandidates = existing.candidates.map((candidate) => {
      if (!this.isCandidateMatch(candidate, candidateName)) {
        return { ...candidate };
      }

      return {
        ...candidate,
        ...(this.isTalentCandidate(candidate) ? this.buildTalentCandidate(existing) : {}),
        stage,
        radarOnly: stage === 'radar',
      };
    });

    const targetCandidate = existing.candidates.find((candidate) => this.isCandidateMatch(candidate, candidateName));

    if (!targetCandidate) {
      return undefined;
    }

    const isTalentCandidate = this.isTalentCandidate(targetCandidate);
    const shouldPreserveSubmittedDocuments = isTalentCandidate && (stage === 'documentacao' || stage === 'contratado');
    const nextSubmittedDocuments =
      options?.talentSubmittedDocuments !== undefined
        ? options.talentSubmittedDocuments
        : shouldPreserveSubmittedDocuments
          ? [...(existing.talentSubmittedDocuments ?? [])]
          : isTalentCandidate
            ? []
            : [...(existing.talentSubmittedDocuments ?? [])];
    const nextConsentAccepted =
      options?.talentDocumentsConsentAccepted !== undefined
        ? options.talentDocumentsConsentAccepted
        : shouldPreserveSubmittedDocuments
          ? existing.talentDocumentsConsentAccepted ?? false
          : isTalentCandidate
            ? false
            : existing.talentDocumentsConsentAccepted ?? false;

    const updatedJob: MockJobRecord = this.decorateTalentVisibility({
      ...existing,
      talentDecision: isTalentCandidate ? talentDecision : existing.talentDecision,
      talentSubmittedDocuments: nextSubmittedDocuments,
      talentDocumentsConsentAccepted: nextConsentAccepted,
      candidates: nextCandidates,
      updatedAt: new Date().toISOString(),
    });

    this.cache = jobs.map((job) => (job.id === jobId ? updatedJob : job));
    this.persist();
    return updatedJob;
  }

  hideFromTalent(jobId: string): MockJobRecord | undefined {
    const jobs = this.loadJobs();
    const existing = jobs.find((job) => job.id === jobId);

    if (!existing) {
      return undefined;
    }

    const updatedJob: MockJobRecord = {
      ...existing,
      talentDecision: 'hidden',
      updatedAt: new Date().toISOString(),
    };

    this.cache = jobs.map((job) => (job.id === jobId ? this.decorateTalentVisibility(updatedJob) : job));
    this.persist();
    return this.cache.find((job) => job.id === jobId);
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
    this.cache = this.parseJobs(raw);

    return this.cache;
  }

  private persist(): void {
    const storage = this.getStorage();
    if (!storage || !this.cache) {
      return;
    }

    storage.setItem(this.storageKey, JSON.stringify(this.cache));
    this.broadcastSync();
    this.emitJobsChanged();
  }

  private updateTalentStage(
    jobId: string,
    stage: MockJobCandidate['stage'],
    talentDecision?: TalentJobDecision,
    options?: {
      talentSubmittedDocuments?: string[];
      talentDocumentsConsentAccepted?: boolean;
    },
  ): MockJobRecord | undefined {
    const jobs = this.loadJobs();
    const existing = jobs.find((job) => job.id === jobId);

    if (!existing) {
      return undefined;
    }

    const appliedCandidate = this.buildTalentCandidate(existing);
    const hasCandidate = existing.candidates.some((candidate) => this.isTalentCandidate(candidate));
    const nextCandidates: MockJobCandidate[] =
      stage === 'radar'
        ? hasCandidate
          ? existing.candidates.map((candidate) =>
              this.isTalentCandidate(candidate)
                ? { ...candidate, ...appliedCandidate, stage: 'radar' as const, radarOnly: true }
                : { ...candidate },
            )
          : [{ ...appliedCandidate, stage: 'radar' as const, radarOnly: true }, ...existing.candidates.map((candidate) => ({ ...candidate }))]
        : hasCandidate
          ? existing.candidates.map((candidate) =>
              this.isTalentCandidate(candidate)
                ? { ...candidate, ...appliedCandidate, stage, radarOnly: false }
                : { ...candidate },
            )
          : [{ ...appliedCandidate, stage, radarOnly: false }, ...existing.candidates.map((candidate) => ({ ...candidate }))];
    const shouldPreserveSubmittedDocuments = stage === 'documentacao' || stage === 'contratado';
    const nextSubmittedDocuments =
      options?.talentSubmittedDocuments !== undefined
        ? options.talentSubmittedDocuments
        : shouldPreserveSubmittedDocuments
          ? [...(existing.talentSubmittedDocuments ?? [])]
          : [];
    const nextConsentAccepted =
      options?.talentDocumentsConsentAccepted !== undefined
        ? options.talentDocumentsConsentAccepted
        : shouldPreserveSubmittedDocuments
          ? existing.talentDocumentsConsentAccepted ?? false
          : false;

    const updatedJob: MockJobRecord = this.decorateTalentVisibility({
      ...existing,
      talentDecision,
      talentSubmittedDocuments: nextSubmittedDocuments,
      talentDocumentsConsentAccepted: nextConsentAccepted,
      candidates: nextCandidates,
      updatedAt: new Date().toISOString(),
    });

    this.cache = jobs.map((job) => (job.id === jobId ? updatedJob : job));
    this.persist();
    return updatedJob;
  }

  private findTalentCandidateByJobId(jobId: string): MockJobCandidate | undefined {
    const existing = this.getJobById(jobId);
    if (!existing) {
      return undefined;
    }

    return this.findTalentCandidate(existing);
  }

  private parseJobs(raw: string | null): MockJobRecord[] {
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as MockJobRecord[];
      return Array.isArray(parsed) && parsed.length ? this.normalizeJobs(parsed) : [];
    } catch {
      return [];
    }
  }

  private handleStorageSync = (event: StorageEvent): void => {
    if (event.key !== this.storageKey) {
      return;
    }

    this.cache = this.parseJobs(event.newValue);
    this.emitJobsChanged();
  };

  private handleBroadcastSync = (): void => {
    const storage = this.getStorage();
    this.cache = this.parseJobs(storage?.getItem(this.storageKey) ?? null);
    this.emitJobsChanged();
  };

  private broadcastSync(): void {
    this.broadcastChannel?.postMessage({ key: this.storageKey, updatedAt: Date.now() });
  }

  private emitJobsChanged(): void {
    this.zone.run(() => this.jobsChangedSubject.next());
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

    return this.decorateTalentVisibility({
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
      talentDecision: existing?.talentDecision,
      talentSubmittedDocuments:
        existing?.talentSubmittedDocuments
          ?.filter((item) => command.draft.hiringDocuments.includes(item))
          ?? [],
      talentDocumentsConsentAccepted: existing?.talentDocumentsConsentAccepted ?? false,
      candidates: existing?.candidates.map((candidate) => ({ ...candidate })) ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...command.draft,
      benefits: command.draft.benefits.map((item) => ({ ...item })),
      hiringDocuments: [...command.draft.hiringDocuments],
      techStack: command.draft.techStack.map((item) => ({ ...item })),
      differentials: [...command.draft.differentials],
      responsibilitySections: command.draft.responsibilitySections.map((section) => ({
        ...section,
        items: [...section.items],
      })),
    });
  }

  private normalizeJobs(records: MockJobRecord[]): MockJobRecord[] {
    return records.map((record) => ({
      ...record,
      showSalaryRangeInCard: record.showSalaryRangeInCard ?? true,
      talentDecision: record.talentDecision,
      benefits: this.normalizeBenefits(record.benefits),
      hiringDocuments: this.normalizeHiringDocuments(record.hiringDocuments),
      talentSubmittedDocuments: this.normalizeHiringDocuments(record.talentSubmittedDocuments)
        .filter((item) => this.normalizeHiringDocuments(record.hiringDocuments).includes(item)),
      talentDocumentsConsentAccepted: record.talentDocumentsConsentAccepted ?? false,
      techStack: record.techStack.map((item) => ({ ...item })),
      differentials: [...record.differentials],
      responsibilitySections: this.normalizeResponsibilitySections(record.responsibilitySections, record.differentials),
      candidates: record.candidates.map((candidate) => this.normalizeCandidate(candidate)),
      avatars: [...record.avatars],
    })).map((record) => this.decorateTalentVisibility(record));
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

  private normalizeHiringDocuments(documents: unknown): string[] {
    if (!Array.isArray(documents)) {
      return [];
    }

    return documents
      .map((item) => `${item ?? ''}`.trim())
      .filter(Boolean);
  }

  private normalizeResponsibilitySections(
    sections: unknown,
    differentials: string[],
  ): JobResponsibilitySection[] {
    if (!Array.isArray(sections) || sections.length === 0) {
      return this.buildFallbackResponsibilitySections(differentials);
    }

    const normalized = sections
      .filter((item): item is Partial<JobResponsibilitySection> => !!item && typeof item === 'object')
      .map((item, index) => ({
        id: item.id?.trim() || `summary-section-${index + 1}`,
        pageId: (item.pageId === 'back' ? 'back' : 'front') as JobResponsibilitySection['pageId'],
        title: item.title?.trim() || 'Requisitos e habilidades que buscamos:',
        items: Array.isArray(item.items)
          ? item.items.map((value) => `${value ?? ''}`.trim()).filter(Boolean)
          : [],
      }))
      .filter((section) => section.items.length > 0);

    return normalized.length ? normalized : this.buildFallbackResponsibilitySections(differentials);
  }

  private buildFallbackResponsibilitySections(differentials: string[]): JobResponsibilitySection[] {
    return [
      {
        id: 'summary-section-1',
        pageId: 'front',
        title: 'Requisitos e habilidades que buscamos:',
        items: differentials.length
          ? [...differentials]
          : ['Trabalho em Equipe', 'Teste Unitário e Integrado'],
      },
    ];
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `vaga-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }

  private buildTalentCandidate(job: MockJobRecord): MockJobCandidate {
    const identity = this.readTalentIdentity();

    return {
      name: identity.name,
      role: `${job.seniority} ${job.title}`.trim(),
      location: identity.location,
      match: Math.max(72, Math.min(98, job.match)),
      minutesAgo: 1,
      status: 'online',
      avatar: identity.avatar,
      stage: 'candidatura',
      availabilityLabel: 'Disponibilidade imediata',
      radarOnly: false,
      source: 'system',
      hasProfileAvatar: identity.hasProfileAvatar,
    };
  }

  private decorateTalentVisibility(job: MockJobRecord): MockJobRecord {
    const highlightedAvatars = this.collectVisibleSystemAvatars(job);

    return {
      ...job,
      avatars: highlightedAvatars.slice(0, 3),
      extraCount: Math.max(0, highlightedAvatars.length - 3),
    };
  }

  private normalizeCandidate(candidate: MockJobCandidate): MockJobCandidate {
    const isSystemCandidate = this.isTalentCandidate(candidate);
    const identity = isSystemCandidate ? this.readTalentIdentity() : null;

    return {
      ...candidate,
      name: identity?.name ?? candidate.name,
      avatar: identity?.avatar ?? candidate.avatar,
      location: identity?.location ?? candidate.location,
      source: candidate.source ?? (isSystemCandidate ? 'system' : 'seed'),
      hasProfileAvatar: isSystemCandidate
        ? identity?.hasProfileAvatar ?? false
        : candidate.hasProfileAvatar ?? false,
    };
  }

  private collectVisibleSystemAvatars(job: MockJobRecord): string[] {
    const identity = this.readTalentIdentity();
    const systemCandidates = job.candidates.filter((candidate) => this.isTalentCandidate(candidate, identity));
    const candidatesToShow = systemCandidates.length
      ? systemCandidates
      : this.shouldShowTalentAsRadar(job, identity)
        ? [{ ...this.buildTalentCandidate(job), stage: 'radar' as const, radarOnly: true }]
        : [];

    return candidatesToShow
      .filter((candidate) => candidate.hasProfileAvatar && this.shouldShowCandidateAvatar(candidate))
      .map((candidate) => candidate.avatar.trim())
      .filter(Boolean)
      .filter((avatar, index, items) => items.indexOf(avatar) === index);
  }

  private shouldShowTalentAsRadar(job: MockJobRecord, identity: TalentIdentity): boolean {
    if (!identity.hasProfileAvatar || job.status !== 'ativas' || job.talentDecision === 'hidden') {
      return false;
    }

    return !job.candidates.some((candidate) => this.isTalentCandidate(candidate, identity));
  }

  private shouldShowCandidateAvatar(candidate: MockJobCandidate): boolean {
    return candidate.radarOnly === true || !!candidate.stage;
  }

  private isTalentCandidate(candidate: MockJobCandidate, identity = this.readTalentIdentity()): boolean {
    return candidate.source === 'system'
      || candidate.name === identity.name
      || candidate.name === this.fallbackTalentCandidateName;
  }

  private isCandidateMatch(candidate: MockJobCandidate, candidateName: string): boolean {
    return candidate.name === candidateName;
  }

  private hasRealProfileAvatar(avatar: string | undefined): boolean {
    return !!avatar?.trim() && avatar !== this.fallbackTalentAvatar;
  }

  private readTalentIdentity(): TalentIdentity {
    const storage = this.getStorage();
    const fallback: TalentIdentity = {
      name: this.fallbackTalentCandidateName,
      avatar: this.fallbackTalentAvatar,
      location: '',
      hasProfileAvatar: false,
    };

    if (!storage) {
      return fallback;
    }

    const rawDraft = storage.getItem(this.basicDraftStorageKey);

    if (!rawDraft) {
      return fallback;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      const name = draft.profile?.name?.trim() || fallback.name;
      const avatar = draft.photoPreviewUrl?.trim() || fallback.avatar;
      const location = draft.profile?.location?.trim() || fallback.location;

      return {
        name,
        avatar,
        location,
        hasProfileAvatar: this.hasRealProfileAvatar(draft.photoPreviewUrl),
      };
    } catch {
      storage.removeItem(this.basicDraftStorageKey);
      return fallback;
    }
  }
}
