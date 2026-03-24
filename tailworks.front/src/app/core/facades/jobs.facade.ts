import { Injectable, inject } from '@angular/core';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import {
  CandidateStage,
  MockJobCandidate,
  MockJobDraft,
  MockJobRecord,
  RecruiterIdentity,
  SaveMockJobCommand,
  TalentJobDecision,
} from '../../vagas/data/vagas.models';
import { MatchLabDataset } from '../matching-lab/matching-lab.models';

@Injectable({ providedIn: 'root' })
export class JobsFacade {
  private readonly jobsService = inject(VagasMockService);

  readonly jobsChanged$ = this.jobsService.jobsChanged$;

  getJobs(): MockJobRecord[] {
    return this.jobsService.getJobs();
  }

  getJobById(id: string): MockJobRecord | undefined {
    return this.jobsService.getJobById(id);
  }

  getCurrentRecruiterIdentity(): RecruiterIdentity {
    return this.jobsService.getCurrentRecruiterIdentity();
  }

  getTalentCandidateIdentity() {
    return this.jobsService.getTalentCandidateIdentity();
  }

  getRecruitersForCompany(companyName?: string): RecruiterIdentity[] {
    return this.jobsService.getRecruitersForCompany(companyName);
  }

  canCurrentRecruiterAccessJob(job: Pick<MockJobRecord, 'id' | 'company' | 'createdByRecruiterId' | 'recruiterWatcherIds'>): boolean {
    return this.jobsService.canCurrentRecruiterAccessJob(job);
  }

  seedJobsFromMatchingLab(dataset: MatchLabDataset): Promise<number> {
    return this.jobsService.seedJobsFromMatchingLab(dataset);
  }

  syncFromRemote(): Promise<void> {
    return this.jobsService.syncFromRemote();
  }

  clearLabJobsAndSync(): Promise<number> {
    return this.jobsService.clearLabJobsAndSync();
  }

  signInAsTalent(name: string, location?: string): void {
    this.jobsService.signInAsTalent(name, location);
  }

  findTalentCandidate(job: Pick<MockJobRecord, 'candidates'>): MockJobCandidate | undefined {
    return this.jobsService.findTalentCandidate(job);
  }

  getEffectiveCandidateStage(
    candidate:
      | {
          stage?: string | undefined;
          radarOnly?: boolean;
          source?: 'seed' | 'system';
          stageOwner?: 'system' | 'talent' | 'recruiter';
          decision?: TalentJobDecision;
          recruiterManagedJourney?: boolean;
          recruiterStageCommittedAt?: string;
        }
      | undefined,
  ): CandidateStage | undefined {
    return this.jobsService.getEffectiveCandidateStage(candidate);
  }

  hideFromTalent(jobId: string): MockJobRecord | undefined {
    return this.jobsService.hideFromTalent(jobId);
  }

  applyAsTalent(jobId: string): MockJobRecord | undefined {
    return this.jobsService.applyAsTalent(jobId);
  }

  cancelTalentApplication(jobId: string): MockJobRecord | undefined {
    return this.jobsService.cancelTalentApplication(jobId);
  }

  acceptOfferAsTalent(jobId: string): MockJobRecord | undefined {
    return this.jobsService.acceptOfferAsTalent(jobId);
  }

  keepJobForNextOpportunity(jobId: string): MockJobRecord | undefined {
    return this.jobsService.keepJobForNextOpportunity(jobId);
  }

  submitTalentDocuments(jobId: string, submittedDocuments: string[], consentAccepted: boolean): MockJobRecord | undefined {
    return this.jobsService.submitTalentDocuments(jobId, submittedDocuments, consentAccepted);
  }

  clearJobs(): void {
    this.jobsService.clearJobs();
  }

  renameCompany(previousName: string, nextName: string): void {
    this.jobsService.renameCompany(previousName, nextName);
  }

  saveJob(command: SaveMockJobCommand): MockJobRecord {
    return this.jobsService.saveJob(command);
  }

  updateJob(jobId: string, command: SaveMockJobCommand): MockJobRecord {
    return this.jobsService.updateJob(jobId, command);
  }

  deleteJob(jobId: string): void {
    this.jobsService.deleteJob(jobId);
  }

  updateRecruiterTalentStage(
    jobId: string,
    stage: MockJobCandidate['stage'],
    talentDecision?: TalentJobDecision,
  ): MockJobRecord | undefined {
    return this.jobsService.updateRecruiterTalentStage(jobId, stage, talentDecision);
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
    return this.jobsService.updateCandidateStage(jobId, candidateName, stage, talentDecision, options);
  }

  updateJobStatus(jobId: string, status: MockJobRecord['status'], statusReason?: string): MockJobRecord | undefined {
    return this.jobsService.updateJobStatus(jobId, status, statusReason);
  }

  getRecruiterWorkflowActions(stage: CandidateStage | undefined) {
    return this.jobsService.getRecruiterWorkflowActions(stage);
  }

  getTalentWorkflowActions(stage: CandidateStage | undefined, decision: TalentJobDecision | undefined) {
    return this.jobsService.getTalentWorkflowActions(stage, decision);
  }

  updateTalentStage(jobId: string, stage: MockJobCandidate['stage'], decision?: TalentJobDecision): MockJobRecord | undefined {
    if (stage === 'radar' && decision === 'hidden') {
      return this.jobsService.hideFromTalent(jobId);
    }

    return undefined;
  }
}
