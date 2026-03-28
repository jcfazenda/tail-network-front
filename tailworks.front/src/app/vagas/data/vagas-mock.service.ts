import { Injectable, NgZone, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { CandidateStage, JobBenefitItem, JobResponsibilitySection, SaveMockJobCommand, MockJobCandidate, MockJobRecord, RecruiterIdentity, TalentJobDecision } from './vagas.models';
import { TalentNotificationService } from '../../usuario/talent-notification.service';
import { RecruiterDirectoryService } from '../../recruiter/recruiter-directory.service';
import { TalentDirectoryService, TalentRecord } from '../../talent/talent-directory.service';
import { BrowserStorageService } from '../../core/storage/browser-storage.service';
import { JobsRepository } from './jobs.repository';
import { MatchDomainService } from '../../core/matching/match-domain.service';
import { JobsSyncApiService } from './jobs-sync-api.service';
import { MatchLabDataset } from '../../core/matching-lab/matching-lab.models';
import { MatchingLabService } from '../../core/matching-lab/matching-lab.service';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';

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

type RecruiterWorkflowActions = {
  advanceToProcess: boolean;
  requestHiring: boolean;
  closeVacancy: boolean;
  cancelHiringRequest: boolean;
  hireCandidate: boolean;
  declineCandidate: boolean;
};

type TalentWorkflowActions = {
  apply: boolean;
  cancelApplication: boolean;
  respondToProposal: boolean;
  submitDocuments: boolean;
};

@Injectable({ providedIn: 'root' })
export class VagasMockService {
  private readonly storageKey = 'tailworks.front.mock-vagas.publish-only';
  private readonly syncChannelName = 'tailworks.front.mock-vagas.sync';
  private readonly resetLockStorageKey = 'tailworks.front.mock-vagas.reset-lock';
  private readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private readonly fallbackTalentAvatar = '/assets/avatars/avatar-default.svg';
  private readonly fallbackTalentCandidateName = 'Julio Fazenda';
  private readonly zone = inject(NgZone);
  private readonly talentNotificationService = inject(TalentNotificationService);
  private readonly recruiterDirectoryService = inject(RecruiterDirectoryService);
  private readonly talentDirectoryService = inject(TalentDirectoryService);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly jobsRepository = inject(JobsRepository);
  private readonly matchDomainService = inject(MatchDomainService);
  private readonly jobsSyncApi = inject(JobsSyncApiService);
  private readonly matchingLabService = inject(MatchingLabService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly jobsChangedSubject = new Subject<void>();
  private cache: MockJobRecord[] | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private remoteSyncTimer: number | null = null;
  private remoteSyncInFlight = false;

  readonly jobsChanged$ = this.jobsChangedSubject.asObservable();

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    this.talentDirectoryService.ensureSeeded();
    window.addEventListener('storage', this.handleStorageSync);

    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(this.syncChannelName);
      this.broadcastChannel.addEventListener('message', this.handleBroadcastSync);
    }

    void this.bootstrapRemoteSync();
  }

  getJobs(): MockJobRecord[] {
    const jobs = this.loadJobs();
    const acceptedJobId = this.findTalentAcceptedJobId(jobs);
    const acceptedCandidateNames = this.findAcceptedCandidateNames(jobs);
    return jobs
      .map((job) => this.decorateTalentVisibility(job, { acceptedJobId, acceptedCandidateNames }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  getJobById(id: string): MockJobRecord | undefined {
    const jobs = this.loadJobs();
    const acceptedJobId = this.findTalentAcceptedJobId(jobs);
    const acceptedCandidateNames = this.findAcceptedCandidateNames(jobs);
    const found = jobs.find((job) => job.id === id);
    return found ? this.decorateTalentVisibility(found, { acceptedJobId, acceptedCandidateNames }) : undefined;
  }

  getTalentCandidateIdentity(): TalentIdentity {
    return this.readTalentIdentity();
  }

  getCurrentRecruiterIdentity(): RecruiterIdentity {
    return this.recruiterDirectoryService.getCurrentRecruiterIdentity();
  }

  signInAsDefaultRecruiter(): RecruiterIdentity {
    return this.recruiterDirectoryService.signInAsRecruiter('julio-fazenda-recruiter', 'Banco Itaú');
  }

  signInAsRecruiter(recruiterId: string, companyName?: string): RecruiterIdentity {
    return this.recruiterDirectoryService.signInAsRecruiter(recruiterId, companyName);
  }

  signInAsDefaultTalent(): void {
    this.signInAsTalent('Julio Fazenda');
  }

  signInAsTalent(name: string, location = 'Rio de Janeiro - RJ'): void {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    const existingDraft = this.readStoredCandidateDraft(storage);
    const nextDraft: CandidateBasicDraft = {
      ...existingDraft,
      profile: {
        ...existingDraft?.profile,
        name: name.trim() || 'Talento',
        location: location.trim() || existingDraft?.profile?.location?.trim() || 'Rio de Janeiro - RJ',
      },
    };

    storage.setItem(this.basicDraftStorageKey, JSON.stringify(nextDraft));
  }

  getRecruitersForCompany(companyName?: string): RecruiterIdentity[] {
    return this.recruiterDirectoryService
      .listRecruiters(companyName)
      .map((recruiter) => ({
        id: recruiter.id,
        name: recruiter.name,
        role: recruiter.role,
        company: recruiter.company,
        isMaster: recruiter.isMaster,
      }));
  }

  getCurrentRecruiterCompanies(): string[] {
    return this.recruiterDirectoryService.getRecruiterCompanies();
  }

  canCurrentRecruiterAccessJob(job: Pick<MockJobRecord, 'id' | 'company' | 'createdByRecruiterId' | 'recruiterWatcherIds'>): boolean {
    if (job.id.startsWith('lab-')) {
      return true;
    }

    const recruiter = this.readRecruiterIdentity();
    const accessibleCompanies = this.getCurrentRecruiterCompanies();

    if (!accessibleCompanies.includes(job.company)) {
      return false;
    }

    if (recruiter.isMaster) {
      return true;
    }

    return job.createdByRecruiterId === recruiter.id
      || !!job.recruiterWatcherIds?.includes(recruiter.id);
  }

  findTalentCandidate(job: Pick<MockJobRecord, 'candidates'>): MockJobCandidate | undefined {
    const identity = this.readTalentIdentity();
    return job.candidates.find((candidate) => candidate.source === 'system')
      ?? job.candidates.find((candidate) => this.isTalentCandidate(candidate, identity));
  }

  getRecruiterWorkflowActions(stage: CandidateStage | undefined): RecruiterWorkflowActions {
    switch (stage) {
      case 'candidatura':
        return {
          advanceToProcess: true,
          requestHiring: false,
          closeVacancy: true,
          cancelHiringRequest: false,
          hireCandidate: false,
          declineCandidate: false,
        };
      case 'processo':
      case 'tecnica':
        return {
          advanceToProcess: false,
          requestHiring: true,
          closeVacancy: true,
          cancelHiringRequest: false,
          hireCandidate: false,
          declineCandidate: false,
        };
      case 'aguardando':
        return {
          advanceToProcess: false,
          requestHiring: false,
          closeVacancy: false,
          cancelHiringRequest: true,
          hireCandidate: false,
          declineCandidate: false,
        };
      case 'documentacao':
        return {
          advanceToProcess: false,
          requestHiring: false,
          closeVacancy: false,
          cancelHiringRequest: false,
          hireCandidate: true,
          declineCandidate: true,
        };
      default:
        return {
          advanceToProcess: false,
          requestHiring: false,
          closeVacancy: false,
          cancelHiringRequest: false,
          hireCandidate: false,
          declineCandidate: false,
        };
    }
  }

  getTalentWorkflowActions(stage: CandidateStage | undefined, decision: TalentJobDecision | undefined): TalentWorkflowActions {
    const applied = decision === 'applied';

    return {
      apply: !applied && stage !== 'proxima' && stage !== 'cancelado',
      cancelApplication: applied && ['candidatura', 'processo', 'tecnica', 'aceito', 'documentacao'].includes(stage ?? ''),
      respondToProposal: applied && stage === 'aguardando',
      submitDocuments: stage === 'aceito',
    };
  }

  getEffectiveCandidateStage(
    candidate:
      | { stage?: string | undefined; radarOnly?: boolean; source?: 'seed' | 'system'; stageOwner?: 'system' | 'talent' | 'recruiter'; decision?: TalentJobDecision; recruiterManagedJourney?: boolean; recruiterStageCommittedAt?: string }
      | undefined,
  ): CandidateStage | undefined {
    if (!candidate) {
      return undefined;
    }

    if (candidate.radarOnly || candidate.decision === 'hidden') {
      return 'radar';
    }

    if (!candidate.stage) {
      return candidate.decision === 'applied' ? 'candidatura' : 'radar';
    }

    if (candidate.stage === 'processo' || candidate.stage === 'tecnica' || candidate.stage === 'aguardando') {
      const recruiterOwnsStage =
        (
          candidate.recruiterManagedJourney
          && candidate.stageOwner === 'recruiter'
          && !!candidate.recruiterStageCommittedAt
        )
        || candidate.source === 'seed';

      if (!recruiterOwnsStage) {
        return candidate.decision === 'applied' ? 'candidatura' : 'radar';
      }
    }

    return this.isCandidateStage(candidate.stage)
      ? candidate.stage
      : candidate.decision === 'applied'
        ? 'candidatura'
        : 'radar';
  }

  saveJob(command: SaveMockJobCommand): MockJobRecord {
    const jobs = this.loadJobs();
    const record = this.buildRecord(command);
    const nextJobs = [record, ...jobs];
    this.notifyTalentAboutNewVacancies(jobs, nextJobs);
    this.cache = nextJobs;
    this.disableResetLock();
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
    const nextJobs = [record, ...jobs.filter((job) => job.id !== id)];
    this.notifyTalentAboutNewVacancies(jobs, nextJobs);
    this.cache = nextJobs;
    this.disableResetLock();
    this.persist();
    return record;
  }

  updateJobStatus(id: string, status: MockJobRecord['status'], statusReason?: string): MockJobRecord | undefined {
    const jobs = this.loadJobs();
    const existing = jobs.find((job) => job.id === id);

    if (!existing) {
      return undefined;
    }

    const updatedJob: MockJobRecord = {
      ...existing,
      status,
      statusReason: statusReason?.trim() || existing.statusReason,
      updatedAt: new Date().toISOString(),
    };

    const nextJobs = jobs.map((job) => (job.id === id ? updatedJob : job));
    this.notifyTalentAboutNewVacancies(jobs, nextJobs);
    this.cache = nextJobs;
    this.disableResetLock();
    this.persist();
    return updatedJob;
  }

  publishOnlyJob(command: SaveMockJobCommand): MockJobRecord {
    const record = this.buildRecord(command);
    this.cache = [record];
    this.disableResetLock();
    this.persist();
    return record;
  }

  clearJobs(): void {
    this.cache = [];
    this.enableResetLock();

    const storage = this.getStorage();
    if (!storage) {
      void this.pushRemoteSnapshot();
      this.emitJobsChanged();
      return;
    }

    this.jobsRepository.writeAll([]);
    this.broadcastSync();
    void this.pushRemoteSnapshot();
    this.emitJobsChanged();
  }

  clearPublishedJobsForTesting(): void {
    this.clearJobs();
  }

  async clearJobsAndSync(): Promise<void> {
    this.cache = [];
    this.enableResetLock();
    this.jobsRepository.writeAll([]);
    this.broadcastSync();
    this.emitJobsChanged();
    await this.jobsSyncApi.writeAll([]);
  }

  async clearLabJobsAndSync(): Promise<number> {
    const retained = this.loadJobs().filter((job) => !job.id.startsWith('lab-'));
    const removed = (this.cache ?? this.loadJobs()).length - retained.length;
    this.cache = retained;
    if (retained.length) {
      this.disableResetLock();
    }
    this.jobsRepository.writeAll(retained);
    this.broadcastSync();
    this.emitJobsChanged();
    await this.pushRemoteSnapshot();
    return Math.max(0, removed);
  }

  async seedJobsFromMatchingLab(dataset: MatchLabDataset): Promise<number> {
    if (!dataset.jobs.length || !dataset.results.length) {
      return 0;
    }

    const recruiter = this.getCurrentRecruiterIdentity();
    const currentJobs = this.loadJobs().filter((job) => !job.id.startsWith('lab-'));

    const seededJobs = dataset.results.map((result, index) => {
      const createdAt = new Date(Date.now() - (index * 60_000)).toISOString();

      return this.decorateTalentVisibility({
        id: `lab-${result.job.id}`,
        code: result.job.code,
        title: result.job.title,
        company: result.job.company,
        companyLogoUrl: this.matchingLabCompanyLogoUrl(result.job.company),
        homeAnnouncementImageUrl: '',
        location: result.job.location,
        workModel: result.job.workModel,
        seniority: result.job.seniority,
        summary: result.job.summary,
        contractType: 'CLT',
        statusReason: '',
        salaryRange: result.job.salaryMin ? `R$ ${result.job.salaryMin.toLocaleString('pt-BR')}` : '',
        radarAdherenceThreshold: 85,
        showSalaryRangeInCard: true,
        allowCandidateSalarySuggestion: false,
        hybridOnsiteDaysDescription: '',
        benefits: [],
        hiringDocuments: [],
        techStack: result.job.stacks.map((stack) => ({ name: stack.stackName, match: stack.percent })),
        differentials: [],
        responsibilitySections: [],
        createdByRecruiterId: recruiter.id,
        createdByRecruiterName: recruiter.name,
        createdByRecruiterRole: recruiter.role,
        recruiterWatcherIds: [recruiter.id],
        priority: 'Carga local',
        match: result.ranking[0]?.score ?? 0,
        talents: 0,
        radarCount: 0,
        ageLabel: 'Agora',
        postedLabel: 'Carga local',
        avatars: [],
        extraCount: 0,
        status: 'ativas',
        candidates: [],
        createdAt,
        updatedAt: createdAt,
      });
    });

    this.cache = [...seededJobs, ...currentJobs];
    this.disableResetLock();
    this.jobsRepository.writeAll(this.cache);
    this.broadcastSync();
    this.emitJobsChanged();
    await this.pushRemoteSnapshot();
    return seededJobs.length;
  }

  async syncFromRemote(): Promise<void> {
    await this.pullRemoteSnapshot();
  }

  deleteJob(id: string): void {
    const jobs = this.loadJobs();
    this.cache = jobs.filter((job) => job.id !== id);
    if (this.cache.length) {
      this.disableResetLock();
    } else {
      this.enableResetLock();
    }
    this.persist();
  }

  renameCompany(previousName: string, nextName: string): void {
    const normalizedPrevious = previousName.trim();
    const normalizedNext = nextName.trim();

    if (!normalizedPrevious || !normalizedNext || normalizedPrevious === normalizedNext) {
      return;
    }

    this.cache = this.loadJobs().map((job) => (
      job.company === normalizedPrevious
        ? {
            ...job,
            company: normalizedNext,
            updatedAt: new Date().toISOString(),
          }
        : job
    ));
    this.disableResetLock();
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
    const hasDecisionOverride = arguments.length >= 4;

    if (!existing) {
      return undefined;
    }

    let targetCandidate: MockJobCandidate | undefined;
    let nextTargetCandidate: MockJobCandidate | undefined;
    const nextCandidates = existing.candidates.map((candidate) => {
      if (!this.isCandidateMatch(candidate, candidateName)) {
        return { ...candidate };
      }

      targetCandidate = candidate;
      const currentSubmittedDocuments = this.normalizeCandidateSubmittedDocuments(candidate.submittedDocuments, existing.hiringDocuments);
      const shouldResetTalentDocuments = this.isTalentCandidate(candidate) && stage !== 'documentacao' && stage !== 'contratado';

      nextTargetCandidate = {
        ...candidate,
        ...(this.isTalentCandidate(candidate) ? this.buildTalentCandidate(existing, candidate) : {}),
        stage,
        radarOnly: stage === 'radar',
        stageOwner: this.resolveStageOwner(stage, talentDecision, 'recruiter', candidate.stageOwner),
        recruiterManagedJourney: true,
        recruiterStageCommittedAt: new Date().toISOString(),
        decision: hasDecisionOverride ? talentDecision : candidate.decision,
        submittedDocuments:
          options?.talentSubmittedDocuments !== undefined
            ? this.normalizeCandidateSubmittedDocuments(options.talentSubmittedDocuments, existing.hiringDocuments)
            : shouldResetTalentDocuments
              ? []
              : currentSubmittedDocuments,
        documentsConsentAccepted:
          options?.talentDocumentsConsentAccepted !== undefined
            ? options.talentDocumentsConsentAccepted
            : shouldResetTalentDocuments
              ? false
              : candidate.documentsConsentAccepted ?? false,
      };

      return nextTargetCandidate;
    });

    if (!targetCandidate) {
      return undefined;
    }

    const currentRecruiter = this.readRecruiterIdentity();
    const updatedJob: MockJobRecord = this.decorateTalentVisibility({
      ...existing,
      recruiterWatcherIds: Array.from(new Set([...(existing.recruiterWatcherIds ?? []), currentRecruiter.id])),
      candidates: nextCandidates,
      updatedAt: new Date().toISOString(),
    });

    const previousEffectiveStage = this.getEffectiveCandidateStage(targetCandidate);
    const nextEffectiveStage = this.getEffectiveCandidateStage(nextTargetCandidate);
    if (
      targetCandidate
      && nextTargetCandidate
      && this.isTalentCandidate(targetCandidate)
      && previousEffectiveStage !== 'processo'
      && nextEffectiveStage === 'processo'
    ) {
      this.talentNotificationService.pushProcessAdvancedNotification(updatedJob, nextTargetCandidate);
    }

    const tentativeJobs = jobs.map((job) => (job.id === jobId ? updatedJob : job));
    const acceptedJobId = this.findTalentAcceptedJobId(tentativeJobs);
    const acceptedCandidateNames = this.findAcceptedCandidateNames(tentativeJobs);
    const normalizedJobs = this.enforceTalentExclusivity(tentativeJobs, acceptedJobId);
    this.cache = normalizedJobs.map((job) => this.decorateTalentVisibility(job, { acceptedJobId, acceptedCandidateNames }));
    this.persist();
    return this.cache.find((job) => job.id === jobId);
  }

  hideFromTalent(jobId: string): MockJobRecord | undefined {
    return this.updateTalentStage(jobId, 'radar', 'hidden');
  }

  private loadJobs(): MockJobRecord[] {
    if (this.cache) {
      return this.cache;
    }

    const stored = this.jobsRepository.readAll();
    if (!stored) {
      this.cache = [];
      return this.cache;
    }

    this.cache = stored.length ? this.normalizeJobs(stored) : [];

    return this.cache;
  }

  private persist(): void {
    if (!this.cache) {
      return;
    }

    this.jobsRepository.writeAll(this.cache);
    this.broadcastSync();
    this.emitJobsChanged();
    void this.pushRemoteSnapshot();
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
    const hasDecisionOverride = arguments.length >= 3;

    if (!existing) {
      return undefined;
    }

    const existingTalentCandidate = this.findTalentCandidate(existing);
    const baseTalentCandidate = this.buildTalentCandidate(existing, existingTalentCandidate);
    const currentSubmittedDocuments = this.normalizeCandidateSubmittedDocuments(
      existingTalentCandidate?.submittedDocuments,
      existing.hiringDocuments,
    );
    const nextSubmittedDocuments =
      options?.talentSubmittedDocuments !== undefined
        ? this.normalizeCandidateSubmittedDocuments(options.talentSubmittedDocuments, existing.hiringDocuments)
        : stage === 'documentacao' || stage === 'contratado'
          ? currentSubmittedDocuments
          : [];
    const nextConsentAccepted =
      options?.talentDocumentsConsentAccepted !== undefined
        ? options.talentDocumentsConsentAccepted
        : stage === 'documentacao' || stage === 'contratado'
          ? existingTalentCandidate?.documentsConsentAccepted ?? false
          : false;
    const nextTalentCandidate: MockJobCandidate = {
      ...baseTalentCandidate,
      stage,
      radarOnly: stage === 'radar',
      stageOwner: this.resolveStageOwner(stage, talentDecision, 'talent', existingTalentCandidate?.stageOwner),
      recruiterManagedJourney: existingTalentCandidate?.recruiterManagedJourney ?? false,
      recruiterStageCommittedAt: existingTalentCandidate?.recruiterStageCommittedAt,
      decision: hasDecisionOverride ? talentDecision : existingTalentCandidate?.decision,
      submittedDocuments: nextSubmittedDocuments,
      documentsConsentAccepted: nextConsentAccepted,
    };
    const hasCandidate = existing.candidates.some((candidate) => this.isTalentCandidate(candidate));
    const nextCandidates: MockJobCandidate[] = hasCandidate
      ? existing.candidates.map((candidate) =>
          this.isTalentCandidate(candidate)
            ? nextTalentCandidate
            : { ...candidate },
        )
      : [nextTalentCandidate, ...existing.candidates.map((candidate) => ({ ...candidate }))];

    const updatedJob: MockJobRecord = this.decorateTalentVisibility({
      ...existing,
      candidates: nextCandidates,
      updatedAt: new Date().toISOString(),
    });

    const tentativeJobs = jobs.map((job) => (job.id === jobId ? updatedJob : job));
    const acceptedJobId = this.findTalentAcceptedJobId(tentativeJobs);
    const acceptedCandidateNames = this.findAcceptedCandidateNames(tentativeJobs);
    const normalizedJobs = this.enforceTalentExclusivity(tentativeJobs, acceptedJobId);
    this.cache = normalizedJobs.map((job) => this.decorateTalentVisibility(job, { acceptedJobId, acceptedCandidateNames }));
    this.persist();
    return this.cache.find((job) => job.id === jobId);
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
    this.cache = this.parseJobs(this.jobsRepository.readRaw());
    this.emitJobsChanged();
  };

  private async bootstrapRemoteSync(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const localJobs = this.jobsRepository.readAll() ?? [];
    const remoteJobs = await this.jobsSyncApi.readAll();

    if (this.isResetLocked()) {
      this.cache = [];
      this.jobsRepository.writeAll([]);
      this.broadcastSync();
      this.emitJobsChanged();

      if (remoteJobs?.length) {
        await this.jobsSyncApi.writeAll([]);
      }

      this.startRemotePolling();
      return;
    }

    if (remoteJobs) {
      const localRaw = JSON.stringify(localJobs);
      const remoteRaw = JSON.stringify(remoteJobs);

      if (remoteJobs.length > 0 && remoteRaw !== localRaw) {
        if (this.shouldPreferLocalJobs(localJobs, remoteJobs)) {
          await this.jobsSyncApi.writeAll(localJobs);
        } else {
          this.applyRemoteJobs(remoteJobs);
        }
      } else if (!remoteJobs.length && localJobs.length > 0) {
        this.applyRemoteJobs([]);
      }
    }

    this.startRemotePolling();
  }

  private startRemotePolling(): void {
    if (this.remoteSyncTimer !== null || typeof window === 'undefined') {
      return;
    }

    this.remoteSyncTimer = window.setInterval(() => {
      void this.pullRemoteSnapshot();
    }, 3000);
  }

  private async pullRemoteSnapshot(): Promise<void> {
    if (this.remoteSyncInFlight) {
      return;
    }

    this.remoteSyncInFlight = true;

    try {
      const remoteJobs = await this.jobsSyncApi.readAll();
      if (!remoteJobs) {
        return;
      }

      if (this.isResetLocked()) {
        const localRaw = this.jobsRepository.readRaw() ?? '[]';
        if (localRaw !== '[]') {
          this.cache = [];
          this.jobsRepository.writeAll([]);
          this.broadcastSync();
          this.emitJobsChanged();
        }

        if (remoteJobs.length) {
          await this.jobsSyncApi.writeAll([]);
        }

        return;
      }

      const localRaw = this.jobsRepository.readRaw() ?? '[]';
      const remoteRaw = JSON.stringify(remoteJobs);

      if (remoteRaw === localRaw) {
        return;
      }

      if (!remoteJobs.length) {
        this.applyRemoteJobs([]);
        return;
      }

      const localJobs = this.jobsRepository.readAll() ?? [];
      if (this.shouldPreferLocalJobs(localJobs, remoteJobs)) {
        await this.jobsSyncApi.writeAll(localJobs);
        return;
      }

      this.applyRemoteJobs(remoteJobs);
    } finally {
      this.remoteSyncInFlight = false;
    }
  }

  private async pushRemoteSnapshot(): Promise<void> {
    if (!this.cache) {
      return;
    }

    await this.jobsSyncApi.writeAll(this.cache);
  }

  private applyRemoteJobs(remoteJobs: MockJobRecord[]): void {
    const previousJobs = this.cache ?? this.jobsRepository.readAll() ?? [];
    const normalizedJobs = remoteJobs.length ? this.normalizeJobs(remoteJobs) : [];
    if (normalizedJobs.length) {
      this.disableResetLock();
    }
    this.notifyTalentAboutNewVacancies(previousJobs, normalizedJobs);
    this.cache = normalizedJobs;
    this.jobsRepository.writeAll(normalizedJobs);
    this.broadcastSync();
    this.emitJobsChanged();
  }

  private notifyTalentAboutNewVacancies(previousJobs: MockJobRecord[], nextJobs: MockJobRecord[]): void {
    if (!previousJobs.length) {
      return;
    }

    const previousActiveJobIds = new Set(
      previousJobs
        .filter((job) => job.status === 'ativas')
        .map((job) => job.id),
    );

    for (const job of nextJobs) {
      if (job.status !== 'ativas' || previousActiveJobIds.has(job.id)) {
        continue;
      }

      this.talentNotificationService.pushNewVacancyNotification(job);
    }
  }

  private broadcastSync(): void {
    this.broadcastChannel?.postMessage({ key: this.storageKey, updatedAt: Date.now() });
  }

  private emitJobsChanged(): void {
    this.zone.run(() => this.jobsChangedSubject.next());
  }

  private shouldPreferLocalJobs(localJobs: MockJobRecord[], remoteJobs: MockJobRecord[]): boolean {
    if (this.isResetLocked()) {
      return false;
    }

    if (!localJobs.length) {
      return false;
    }

    if (!remoteJobs.length) {
      return true;
    }

    return this.getLatestUpdatedAt(localJobs) > this.getLatestUpdatedAt(remoteJobs);
  }

  private getLatestUpdatedAt(jobs: Array<Pick<MockJobRecord, 'updatedAt'>>): number {
    return jobs.reduce((latest, job) => {
      const value = Date.parse(job.updatedAt ?? '');
      return Number.isFinite(value) ? Math.max(latest, value) : latest;
    }, 0);
  }

  private getStorage(): Storage | null {
    return this.browserStorage.storage;
  }

  private isResetLocked(): boolean {
    return this.browserStorage.getItem(this.resetLockStorageKey) === '1';
  }

  private enableResetLock(): void {
    this.browserStorage.setItem(this.resetLockStorageKey, '1');
  }

  private disableResetLock(): void {
    this.browserStorage.removeItem(this.resetLockStorageKey);
  }

  private buildRecord(command: SaveMockJobCommand, existing?: MockJobRecord): MockJobRecord {
    const now = new Date().toISOString();
    const talents = Math.max(8, command.previewAvatarExtraCount + command.previewAvatars.length);
    const radarCount = Math.max(4, Math.round(talents * 0.72));
    const match = Math.min(99, Math.max(42, this.matchDomainService.clampScore(command.previewAderencia)));
    const recruiterIdentity = this.syncRecruiterWorkspaceForCompany(command.draft.company);
    const recruiterWatcherIds = Array.from(new Set([
      ...(existing?.recruiterWatcherIds ?? []),
      recruiterIdentity.id,
    ]));

    return this.decorateTalentVisibility({
      id: existing?.id ?? this.createId(),
      code: existing?.code ?? this.createJobCode(this.loadJobs(), existing?.id),
      createdByRecruiterId: existing?.createdByRecruiterId ?? recruiterIdentity.id,
      createdByRecruiterName: existing?.createdByRecruiterName ?? recruiterIdentity.name,
      createdByRecruiterRole: existing?.createdByRecruiterRole ?? recruiterIdentity.role,
      recruiterWatcherIds,
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
      candidates:
        existing?.candidates.map((candidate) => this.cloneCandidate(candidate, command.draft.hiringDocuments))
          ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...command.draft,
      benefits: command.draft.benefits.map((item) => ({ ...item })),
      hiringDocuments: [...command.draft.hiringDocuments],
      techStack: command.draft.techStack.map((item) => ({ ...item })),
      experienceStacks: (command.draft.experienceStacks ?? []).map((item) => ({ ...item })),
      differentials: [...command.draft.differentials],
      responsibilitySections: command.draft.responsibilitySections.map((section) => ({
        ...section,
        items: [...section.items],
      })),
    });
  }

  private normalizeJobs(records: MockJobRecord[]): MockJobRecord[] {
    const acceptedJobId = this.findTalentAcceptedJobId(records);
    const normalized = records.map((record) => ({
      ...record,
      code: record.code?.trim() || this.createJobCode(records, record.id),
      hiringDocuments: this.normalizeHiringDocuments(record.hiringDocuments),
      radarAdherenceThreshold: this.matchDomainService.clampScore(record.radarAdherenceThreshold ?? 85),
      showSalaryRangeInCard: record.showSalaryRangeInCard ?? true,
      talentDecision: record.talentDecision,
      benefits: this.normalizeBenefits(record.benefits),
      talentSubmittedDocuments: this.normalizeHiringDocuments(record.talentSubmittedDocuments)
        .filter((item) => this.normalizeHiringDocuments(record.hiringDocuments).includes(item)),
      talentDocumentsConsentAccepted: record.talentDocumentsConsentAccepted ?? false,
      techStack: record.techStack.map((item) => ({ ...item })),
      experienceStacks: (record.experienceStacks ?? []).map((item) => ({ ...item })),
      differentials: [...record.differentials],
      responsibilitySections: this.normalizeResponsibilitySections(record.responsibilitySections, record.differentials),
      candidates: record.candidates.map((candidate, index) =>
        this.normalizeCandidate(candidate, record.id, index, this.normalizeHiringDocuments(record.hiringDocuments)),
      ),
      avatars: [...record.avatars],
    }))
      .map((record) => this.ensureRecruiterMetadata(record))
      .map((record) => this.migrateLegacyTalentState(record));

    const enforced = this.enforceTalentExclusivity(normalized, acceptedJobId);
    const acceptedCandidateNames = this.findAcceptedCandidateNames(enforced);
    return enforced.map((record) => this.decorateTalentVisibility(record, { acceptedJobId, acceptedCandidateNames }));
  }

  private findTalentAcceptedJobId(records: Array<Pick<MockJobRecord, 'id' | 'updatedAt' | 'candidates'>>): string | null {
    const identity = this.readTalentIdentity();
    const acceptedStages: CandidateStage[] = ['aceito', 'documentacao', 'contratado'];
    const accepted = records
      .map((job) => {
        const talentCandidate = job.candidates.find((candidate) => this.isTalentCandidate(candidate, identity));
        const stage = this.getEffectiveCandidateStage(talentCandidate);
        if (!stage || !acceptedStages.includes(stage)) {
          return null;
        }
        return { id: job.id, updatedAt: job.updatedAt };
      })
      .filter((value): value is { id: string; updatedAt: string } => !!value);

    if (!accepted.length) {
      return null;
    }

    accepted.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return accepted[0].id;
  }

  private findAcceptedCandidateNames(records: Array<Pick<MockJobRecord, 'candidates'>>): Set<string> {
    const acceptedStages: CandidateStage[] = ['aceito', 'documentacao', 'contratado'];
    const names = new Set<string>();

    for (const job of records) {
      for (const candidate of job.candidates) {
        const stage = this.getEffectiveCandidateStage(candidate);
        if (stage && acceptedStages.includes(stage)) {
          names.add(candidate.name);
        }
      }
    }

    return names;
  }

  private enforceTalentExclusivity(
    records: MockJobRecord[],
    acceptedJobId: string | null,
  ): MockJobRecord[] {
    if (!acceptedJobId) {
      return records;
    }

    const identity = this.readTalentIdentity();

    return records.map((job) => {
      if (job.id === acceptedJobId) {
        return job;
      }

      const hadTalent = job.candidates.some((candidate) => this.isTalentCandidate(candidate, identity));
      if (!hadTalent) {
        return job;
      }

      return {
        ...job,
        candidates: job.candidates.filter((candidate) => !this.isTalentCandidate(candidate, identity)),
        talentDecision: undefined,
        talentSubmittedDocuments: [],
        talentDocumentsConsentAccepted: false,
      };
    });
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

  private createJobCode(existingJobs: MockJobRecord[], currentId?: string): string {
    const usedCodes = new Set(
      existingJobs
        .filter((job) => job.id !== currentId)
        .map((job) => job.code?.trim())
        .filter((value): value is string => !!value),
    );

    let sequence = 1;
    while (usedCodes.has(`VG-${String(sequence).padStart(4, '0')}`)) {
      sequence += 1;
    }

    return `VG-${String(sequence).padStart(4, '0')}`;
  }

  private ensureRecruiterMetadata(job: MockJobRecord): MockJobRecord {
    const recruiterIdentity = job.createdByRecruiterId
      ? this.getRecruitersForCompany(job.company).find((recruiter) => recruiter.id === job.createdByRecruiterId)
        ?? {
          id: job.createdByRecruiterId,
          name: job.createdByRecruiterName?.trim() || 'Recruiter',
          role: job.createdByRecruiterRole?.trim() || 'Talent Acquisition',
          company: job.company,
          isMaster: false,
        }
      : this.inferRecruiterForJob(job);

    const recruiterWatcherIds = Array.from(new Set([
      ...(job.recruiterWatcherIds ?? []).filter((value): value is string => typeof value === 'string' && !!value.trim()),
      recruiterIdentity.id,
    ]));

    return {
      ...job,
      createdByRecruiterId: recruiterIdentity.id,
      createdByRecruiterName: job.createdByRecruiterName?.trim() || recruiterIdentity.name,
      createdByRecruiterRole: job.createdByRecruiterRole?.trim() || recruiterIdentity.role,
      recruiterWatcherIds,
    };
  }

  private inferRecruiterForJob(job: Pick<MockJobRecord, 'company' | 'id' | 'createdAt'>): RecruiterIdentity {
    const recruiters = this.getRecruitersForCompany(job.company);
    if (!recruiters.length) {
      return this.resolveRecruiterIdentityForCompany(job.company);
    }

    const index = Math.abs(this.hashString(`${job.company}:${job.id}:${job.createdAt}`)) % recruiters.length;
    return recruiters[index];
  }

  private resolveRecruiterIdentityForCompany(companyName: string): RecruiterIdentity {
    const normalizedCompany = companyName.trim();
    const currentRecruiter = this.readRecruiterIdentity();
    const accessibleCompanies = this.getCurrentRecruiterCompanies();

    if (!normalizedCompany || currentRecruiter.company === normalizedCompany) {
      return currentRecruiter;
    }

    if (accessibleCompanies.includes(normalizedCompany)) {
      return {
        ...currentRecruiter,
        company: normalizedCompany,
      };
    }

    const recruiterFromCompany = this.getRecruitersForCompany(normalizedCompany)[0]
      ?? this.recruiterDirectoryService.ensureMasterForCompany(normalizedCompany);

    return {
      id: recruiterFromCompany.id,
      name: recruiterFromCompany.name,
      role: recruiterFromCompany.role,
      company: recruiterFromCompany.company,
      isMaster: recruiterFromCompany.isMaster,
    };
  }

  private syncRecruiterWorkspaceForCompany(companyName: string): RecruiterIdentity {
    const normalizedCompany = companyName.trim();
    const currentRecruiter = this.readRecruiterIdentity();
    const accessibleCompanies = this.getCurrentRecruiterCompanies();

    if (!normalizedCompany || currentRecruiter.company === normalizedCompany || accessibleCompanies.includes(normalizedCompany) || !currentRecruiter.isMaster) {
      return this.resolveRecruiterIdentityForCompany(normalizedCompany || currentRecruiter.company);
    }

    const recruiterForCompany = this.recruiterDirectoryService.getRecruiterById(currentRecruiter.id, normalizedCompany)
      ?? this.recruiterDirectoryService.ensureMasterForCompany(normalizedCompany);

    const signedRecruiter = this.recruiterDirectoryService.signInAsRecruiter(
      recruiterForCompany.id,
      recruiterForCompany.company,
    );

    return {
      id: signedRecruiter.id,
      name: signedRecruiter.name,
      role: signedRecruiter.role,
      company: signedRecruiter.company,
      isMaster: signedRecruiter.isMaster,
    };
  }

  private buildTalentCandidate(job: MockJobRecord, existingCandidate?: MockJobCandidate): MockJobCandidate {
    const identity = this.readTalentIdentity();

    return {
      id: existingCandidate?.id ?? `system-${job.id}`,
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
      stageOwner: existingCandidate?.stageOwner,
      recruiterManagedJourney: existingCandidate?.recruiterManagedJourney ?? false,
      recruiterStageCommittedAt: existingCandidate?.recruiterStageCommittedAt,
      decision: existingCandidate?.decision,
      submittedDocuments: this.normalizeCandidateSubmittedDocuments(existingCandidate?.submittedDocuments, job.hiringDocuments),
      documentsConsentAccepted: existingCandidate?.documentsConsentAccepted ?? false,
    };
  }

  private decorateTalentVisibility(job: MockJobRecord, context?: { acceptedJobId?: string | null; acceptedCandidateNames?: Set<string> }): MockJobRecord {
    const canonicalJob = this.collapseTalentCandidates(job);
    const jobWithTalentState = this.withDerivedTalentState(canonicalJob);
    const acceptedCandidateNames = context?.acceptedCandidateNames ?? new Set<string>();
    const realtimeRadarCandidates = this.buildRealtimeRadarCandidates(jobWithTalentState, acceptedCandidateNames);
    const labRadarCandidates = this.buildLabRadarCandidates(jobWithTalentState, acceptedCandidateNames);
    const fallbackRadarCandidates = jobWithTalentState.candidates.filter((candidate) => this.getEffectiveCandidateStage(candidate) === 'radar');
    const effectiveRadarCandidates = realtimeRadarCandidates.length
      ? realtimeRadarCandidates
      : labRadarCandidates.length
        ? labRadarCandidates
        : fallbackRadarCandidates;
    const highlightedAvatars = effectiveRadarCandidates
      .map((candidate) => candidate.avatar?.trim() ?? '')
      .filter(Boolean);
    const totalRadar = effectiveRadarCandidates.length;
    const nonRadarCandidates = jobWithTalentState.candidates.filter((candidate) => this.getEffectiveCandidateStage(candidate) !== 'radar');
    const candidates = labRadarCandidates.length
      ? [...nonRadarCandidates, ...effectiveRadarCandidates]
      : realtimeRadarCandidates.length
        ? [...nonRadarCandidates, ...effectiveRadarCandidates]
        : jobWithTalentState.candidates;

    return {
      ...jobWithTalentState,
      candidates,
      talents: Math.max(candidates.length, totalRadar),
      radarCount: totalRadar,
      avatars: highlightedAvatars.slice(0, 3),
      extraCount: Math.max(0, totalRadar - Math.min(3, highlightedAvatars.length)),
    };
  }

  private buildLabRadarCandidates(job: MockJobRecord, acceptedCandidateNames: Set<string>): MockJobCandidate[] {
    if (!job.id.startsWith('lab-')) {
      return [];
    }

    const jobId = job.id.replace(/^lab-/, '');
    const result = this.matchingLabService.getDataset().results.find((entry) => entry.job.id === jobId);
    if (!result) {
      return [];
    }

    const talentByName = new Map(
      this.talentDirectoryService.listTalents().map((talent) => [talent.name.trim().toLocaleLowerCase('pt-BR'), talent]),
    );

    const adherenceThreshold = this.jobRadarAdherenceThreshold(job);

    return result.ranking
      .filter((entry) => entry.score >= adherenceThreshold)
      .filter((entry) => !acceptedCandidateNames.has(entry.candidate.name.trim().toLocaleLowerCase('pt-BR')))
      .map((entry, index) => {
        const talent = talentByName.get(entry.candidate.name.trim().toLocaleLowerCase('pt-BR'));

        return {
          id: `${result.job.id}-candidate-${index + 1}`,
          name: entry.candidate.name,
          role: entry.candidate.summary,
          location: entry.candidate.location,
          match: entry.score,
          minutesAgo: 5 + index,
          status: 'online',
          avatar: talent?.avatarUrl?.trim() || this.fallbackTalentAvatar,
          stage: 'radar',
          radarOnly: true,
          source: 'seed',
          availabilityLabel: 'Disponibilidade imediata',
        } satisfies MockJobCandidate;
      });
  }

  private buildRealtimeRadarCandidates(job: MockJobRecord, acceptedCandidateNames: Set<string>): MockJobCandidate[] {
    const jobProfile = this.matchDomainService.buildJobProfile({
      techStack: job.techStack,
      seniority: job.seniority,
      responsibilitySections: job.responsibilitySections,
    });

    if (!jobProfile.requiredRepoIds.length) {
      return [];
    }

    const talentByName = new Map(
      this.talentDirectoryService.listTalents().map((talent) => [talent.name.trim().toLocaleLowerCase('pt-BR'), talent]),
    );

    const adherenceThreshold = this.jobRadarAdherenceThreshold(job);

    return this.talentProfileStore.listRankableCandidates()
      .filter(({ candidate }) => !acceptedCandidateNames.has(candidate.name.trim().toLocaleLowerCase('pt-BR')))
      .map(({ candidate, talentProfile }, index) => {
        const score = this.matchDomainService.scoreTalentAgainstJob(jobProfile, talentProfile);
        const talent = talentByName.get(candidate.name.trim().toLocaleLowerCase('pt-BR'));

        return {
          id: `realtime-${job.id}-${index + 1}`,
          name: candidate.name,
          role: candidate.summary,
          location: candidate.location,
          match: score.overallScore,
          minutesAgo: 5 + index,
          status: 'online' as const,
          avatar: talent?.avatarUrl?.trim() || this.fallbackTalentAvatar,
          stage: 'radar',
          radarOnly: true,
          source: 'seed' as const,
          availabilityLabel: 'Disponibilidade imediata',
        } satisfies MockJobCandidate;
      })
      .filter((candidate) => candidate.match >= adherenceThreshold)
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'));
  }

  private jobRadarAdherenceThreshold(job: MockJobRecord): number {
    const primaryStacks = [...(job.techStack ?? [])]
      .filter((stack) => Number.isFinite(stack.match) && stack.match > 0)
      .sort((left, right) => right.match - left.match)
      .slice(0, 3);

    if (!primaryStacks.length) {
      return 50;
    }

    const average = primaryStacks.reduce((sum, stack) => sum + stack.match, 0) / primaryStacks.length;
    return Math.max(35, Math.min(95, Math.round(average)));
  }

  private matchingLabCompanyLogoUrl(company: string): string {
    const normalized = company.trim().toLocaleLowerCase('pt-BR');

    if (normalized.includes('itaú') || normalized.includes('itau')) {
      return '/assets/images/logo-itau.png';
    }

    if (normalized.includes('nubank')) {
      return '/assets/images/logo-nubank-roxinho.webp';
    }

    if (normalized.includes('mercado livre') || normalized.includes('ifood') || normalized.includes('stone')) {
      return '/assets/images/logo-nubank.png';
    }

    return '';
  }

  private normalizeCandidate(
    candidate: MockJobCandidate,
    jobId: string,
    index: number,
    allowedDocuments: string[],
  ): MockJobCandidate {
    const isSystemCandidate = this.isTalentCandidate(candidate);
    const identity = isSystemCandidate ? this.readTalentIdentity() : null;

    return {
      ...candidate,
      id: candidate.id?.trim() || `${isSystemCandidate ? 'system' : 'candidate'}-${jobId}-${index + 1}`,
      name: identity?.name ?? candidate.name,
      avatar: identity?.avatar ?? candidate.avatar,
      location: identity?.location ?? candidate.location,
      source: candidate.source ?? (isSystemCandidate ? 'system' : 'seed'),
      hasProfileAvatar: isSystemCandidate
        ? identity?.hasProfileAvatar ?? false
        : candidate.hasProfileAvatar ?? false,
      stageOwner: candidate.stageOwner,
      recruiterManagedJourney: candidate.recruiterManagedJourney ?? false,
      recruiterStageCommittedAt: candidate.recruiterStageCommittedAt,
      decision: candidate.decision,
      submittedDocuments: this.normalizeCandidateSubmittedDocuments(candidate.submittedDocuments, allowedDocuments),
      documentsConsentAccepted: candidate.documentsConsentAccepted ?? false,
    };
  }

  private collapseTalentCandidates(job: MockJobRecord): MockJobRecord {
    const canonicalTalentCandidate = this.findTalentCandidate(job);

    if (!canonicalTalentCandidate) {
      return job;
    }

    const nextCandidates = job.candidates.filter((candidate) =>
      !this.isTalentCandidate(candidate) || candidate === canonicalTalentCandidate,
    );

    if (nextCandidates.length === job.candidates.length) {
      return job;
    }

    return {
      ...job,
      candidates: nextCandidates,
    };
  }

  private collectRadarTalents(job: MockJobRecord, acceptedJobId: string | null, acceptedCandidateNames: Set<string>): TalentRecord[] {
    const jobProfile = this.matchDomainService.buildJobProfile({
      techStack: job.techStack,
      seniority: job.seniority,
      responsibilitySections: job.responsibilitySections,
    });
    if (jobProfile.requiredRepoIds.length === 0) {
      return [];
    }

    const acceptedNamesLower = new Set(Array.from(acceptedCandidateNames).map((name) => name.trim().toLocaleLowerCase('pt-BR')));

    const candidates = this.talentDirectoryService.listTalents()
      .filter((talent) => talent.visibleInEcosystem && talent.availableForHiring)
      .filter((talent) => !acceptedNamesLower.has(talent.name.trim().toLocaleLowerCase('pt-BR')));
    const scored = candidates
      .map((talent) => ({
        talent,
        score: this.matchDomainService.scoreTalentAgainstJob(jobProfile, {
          stackScores: talent.stacks,
        }).overallScore,
      }))
      .filter((item) => item.score >= 45);

    scored.sort((a, b) => b.score - a.score || a.talent.name.localeCompare(b.talent.name, 'pt-BR'));

    // Cap defensivo: evita listas gigantes no mock.
    return scored.slice(0, 120).map((item) => item.talent);
  }

  private shouldShowCandidateAvatar(candidate: MockJobCandidate): boolean {
    return candidate.decision !== 'hidden' && (candidate.radarOnly === true || !!candidate.stage);
  }

  private isTalentCandidate(candidate: MockJobCandidate, identity = this.readTalentIdentity()): boolean {
    return candidate.source === 'system'
      || candidate.id?.startsWith('system-')
      || candidate.name === identity.name
      || candidate.name === this.fallbackTalentCandidateName;
  }

  private isCandidateMatch(candidate: MockJobCandidate, candidateName: string): boolean {
    return candidate.id === candidateName || candidate.name === candidateName;
  }

  private cloneCandidate(candidate: MockJobCandidate, allowedDocuments: string[]): MockJobCandidate {
    return {
      ...candidate,
      submittedDocuments: this.normalizeCandidateSubmittedDocuments(candidate.submittedDocuments, allowedDocuments),
      documentsConsentAccepted: candidate.documentsConsentAccepted ?? false,
    };
  }

  private resolveStageOwner(
    stage: MockJobCandidate['stage'],
    talentDecision: TalentJobDecision | undefined,
    preferredOwner: 'system' | 'talent' | 'recruiter',
    fallbackOwner?: MockJobCandidate['stageOwner'],
  ): MockJobCandidate['stageOwner'] {
    if (stage === 'radar') {
      return talentDecision === 'hidden' ? 'talent' : 'system';
    }

    if (stage === 'candidatura' || stage === 'aceito' || stage === 'documentacao') {
      return 'talent';
    }

    if (stage === 'proxima' || stage === 'cancelado') {
      return preferredOwner === 'recruiter' ? 'recruiter' : 'talent';
    }

    if (stage === 'processo' || stage === 'tecnica' || stage === 'aguardando' || stage === 'contratado') {
      return preferredOwner === 'talent' ? (fallbackOwner ?? 'recruiter') : preferredOwner;
    }

    return fallbackOwner ?? preferredOwner;
  }

  private normalizeCandidateSubmittedDocuments(documents: unknown, allowedDocuments: string[]): string[] {
    return this.normalizeHiringDocuments(documents)
      .filter((item) => allowedDocuments.includes(item));
  }

  private isCandidateStage(value: string | undefined): value is CandidateStage {
    return value === 'radar'
      || value === 'candidatura'
      || value === 'processo'
      || value === 'tecnica'
      || value === 'aguardando'
      || value === 'aceito'
      || value === 'documentacao'
      || value === 'contratado'
      || value === 'proxima'
      || value === 'cancelado';
  }

  private migrateLegacyTalentState(job: MockJobRecord): MockJobRecord {
    const identity = this.readTalentIdentity();
    const topLevelSubmittedDocuments = this.normalizeCandidateSubmittedDocuments(
      job.talentSubmittedDocuments,
      job.hiringDocuments,
    );
    const hasLegacyTalentState =
      job.talentDecision !== undefined
      || topLevelSubmittedDocuments.length > 0
      || !!job.talentDocumentsConsentAccepted;
    const talentCandidateIndex = job.candidates.findIndex((candidate) => this.isTalentCandidate(candidate, identity));

    if (talentCandidateIndex === -1) {
      if (!hasLegacyTalentState) {
        return job;
      }

      return {
        ...job,
        candidates: [
          {
            ...this.buildTalentCandidate(job),
            stage: job.talentDecision === 'hidden' ? 'radar' : 'candidatura',
            radarOnly: job.talentDecision === 'hidden',
            recruiterManagedJourney: false,
            recruiterStageCommittedAt: undefined,
            decision: job.talentDecision,
            submittedDocuments: topLevelSubmittedDocuments,
            documentsConsentAccepted: job.talentDocumentsConsentAccepted ?? false,
          },
          ...job.candidates.map((candidate) => ({ ...candidate })),
        ],
      };
    }

    const talentCandidate = job.candidates[talentCandidateIndex];
    const nextTalentCandidate: MockJobCandidate = {
      ...talentCandidate,
      recruiterManagedJourney: talentCandidate.recruiterManagedJourney ?? false,
      recruiterStageCommittedAt: talentCandidate.recruiterStageCommittedAt,
      decision: talentCandidate.decision ?? job.talentDecision,
      submittedDocuments: talentCandidate.submittedDocuments?.length
        ? this.normalizeCandidateSubmittedDocuments(talentCandidate.submittedDocuments, job.hiringDocuments)
        : topLevelSubmittedDocuments,
      documentsConsentAccepted: talentCandidate.documentsConsentAccepted ?? job.talentDocumentsConsentAccepted ?? false,
    };

    return {
      ...job,
      candidates: job.candidates.map((candidate, index) => (
        index === talentCandidateIndex ? nextTalentCandidate : { ...candidate }
      )),
    };
  }

  private withDerivedTalentState(job: MockJobRecord): MockJobRecord {
    const talentCandidate = this.findTalentCandidate(job);

    return {
      ...job,
      talentDecision: talentCandidate?.decision,
      talentSubmittedDocuments: this.normalizeCandidateSubmittedDocuments(
        talentCandidate?.submittedDocuments,
        job.hiringDocuments,
      ),
      talentDocumentsConsentAccepted: talentCandidate?.documentsConsentAccepted ?? false,
    };
  }

  private hasRealProfileAvatar(avatar: string | undefined): boolean {
    return !!avatar?.trim() && avatar !== this.fallbackTalentAvatar;
  }

  private readStoredCandidateDraft(storage: Storage): CandidateBasicDraft | null {
    const rawDraft = storage.getItem(this.basicDraftStorageKey);
    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as CandidateBasicDraft;
    } catch {
      storage.removeItem(this.basicDraftStorageKey);
      return null;
    }
  }

  private readRecruiterIdentity(): RecruiterIdentity {
    return this.recruiterDirectoryService.getCurrentRecruiterIdentity();
  }

  private hashString(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = ((hash << 5) - hash) + value.charCodeAt(index);
      hash |= 0;
    }

    return hash;
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

    const draft = this.readStoredCandidateDraft(storage);
    if (!draft) {
      return fallback;
    }

    const name = draft.profile?.name?.trim() || fallback.name;
    const avatar = draft.photoPreviewUrl?.trim() || fallback.avatar;
    const location = draft.profile?.location?.trim() || fallback.location;

    return {
      name,
      avatar,
      location,
      hasProfileAvatar: this.hasRealProfileAvatar(draft.photoPreviewUrl),
    };
  }
}
