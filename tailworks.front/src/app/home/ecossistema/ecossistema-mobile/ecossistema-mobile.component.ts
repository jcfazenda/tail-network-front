import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MockJobRecord } from '../../../vagas/data/vagas.models';
import { PanelCandidatosListComponent } from '../../../panel-candidatos/panel-candidatos-list.component';
import { ChatCandidate, ChatJob } from '../../../chat/domain/chat.models';
import { MobileChatComponent } from '../../../chat/mobile/mobile-chat.component';

type HiredSpotlightCardLike = {
  name: string;
  company: string;
  roleTitle: string;
  avatarUrl: string;
  stacks: Array<{ label?: string | null }>;
};

type RadarCategoryLike = {
  label: string;
  value: number;
};

type TalentCompatibleJobViewLike = {
  job: MockJobRecord;
};

export type EcosistemaMobileViewModel = {
  activeHiredIndex: number;
  mobileVisibleHiredCards: HiredSpotlightCardLike[];
  radarDelta: number;
  radarCategories: RadarCategoryLike[];
  isTalentEcosystemMode: boolean;
  isCompactViewport: boolean;
  talentCompatibleJobs: TalentCompatibleJobViewLike[];
  ecoFilteredJobs: MockJobRecord[];
  selectedJobPanel: ChatJob | null;
  selectedChatJob: ChatJob | null;
  openingRecruiterPanelJobId: string | null;
  recruiterPanelProgressCurrent: number;
  recruiterPanelProgressTotal: number;
  chatStartIndex: number;
  recruiterPanelDisplayName: string;
  recruiterPanelDisplayRole: string;
  selectedJobPanelCompanyLogoUrl: string | null;
  selectedJobPanelCompanyLogoLabel: string;
  selectedJobPanelDisplayTitle: string;
  selectedJobPanelCode: string;
  selectedJobPanelWorkModel: string;
  selectedJobPanelTopStacks: Array<{ name: string }>;
  selectedJobPanelSalary: string | null;
  trackByHiredCard(index: number, card: HiredSpotlightCardLike): unknown;
  mobileTapeTilt(pageIndex: number, cardIndex: number, seed: string): string;
  mobilePolaroidTilt(pageIndex: number, cardIndex: number, seed: string): string;
  mobileHireMatch(seed: string): number;
  trackByRadarCategory(index: number, category: RadarCategoryLike): unknown;
  radarDotColor(value: number): string;
  radarBarFill(value: number): string;
  trackByTalentCompatibleJob(index: number, view: TalentCompatibleJobViewLike): unknown;
  jobCompanyLogoUrl(job: MockJobRecord): string | null;
  jobCompanyLogoLabel(job: MockJobRecord): string;
  jobCardLocation(job: MockJobRecord): string;
  jobCardWorkModel(job: MockJobRecord): string;
  talentJobMainStacks(view: TalentCompatibleJobViewLike): Array<{ name: string }>;
  trackByJob(index: number, job: MockJobRecord): unknown;
  topJobTechStacks(job: MockJobRecord): Array<{ name: string }>;
  jobTalentCount(job: MockJobRecord): number;
  jobInteractionExtraCount(job: MockJobRecord): number;
  openCreateJob(): void;
  openEditJob(jobId: string): void;
  openRecruiterCandidatesPanel(job: MockJobRecord): void;
  sortedCandidatesForPanel(job: MockJobRecord | ChatJob): any[];
  recruiterPanelStageLabel(stage?: string): string;
  openRecruiterPanelCandidate(index: number): void;
  closeRecruiterPanel(): void;
  handleRecruiterPanelAction(): void;
  closeRecruiterChat(): void;
  handleRecruiterCandidateProfile(context: { job: ChatJob; candidate: ChatCandidate; initialTab: 'journey' | 'curriculum' }): void;
  ecoTopFilters: Array<{ id: string; label: string }>;
  ecoFilter: string;
  ecoFilterIcon(filter: string): string | null;
  setEcoFilter(filter: string): void;
};

@Component({
  standalone: true,
  selector: 'app-ecossistema-mobile',
  imports: [CommonModule, PanelCandidatosListComponent, MobileChatComponent],
  templateUrl: './ecossistema-mobile.component.html',
  styleUrl: './ecossistema-mobile.component.scss',
})
export class EcossistemaMobileComponent {
  @Input({ required: true }) vm!: EcosistemaMobileViewModel;
}
