import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MockJobRecord } from '../../../vagas/data/vagas.models';
import { PanelCandidatosListComponent } from '../../../panel-candidatos/panel-candidatos-list.component';
import { ChatCandidate, ChatJob, TailChatPanelComponent } from '../../../chat/tail-chat-panel.component';

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
  chatStartIndex: number;
  recruiterPanelDisplayName: string;
  recruiterPanelDisplayRole: string;
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
  imports: [CommonModule, PanelCandidatosListComponent, TailChatPanelComponent],
  templateUrl: './ecossistema-mobile.component.html',
  styleUrl: './ecossistema-mobile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcossistemaMobileComponent {
  @Input({ required: true }) vm!: EcosistemaMobileViewModel;
}
