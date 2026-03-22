import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MockJobRecord } from '../../../vagas/data/vagas.models';

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
  talentCompatibleJobs: TalentCompatibleJobViewLike[];
  ecoFilteredJobs: MockJobRecord[];
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
};

@Component({
  standalone: true,
  selector: 'app-ecossistema-mobile',
  imports: [CommonModule],
  templateUrl: './ecossistema-mobile.component.html',
  styleUrl: './ecossistema-mobile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcossistemaMobileComponent {
  @Input({ required: true }) vm!: EcosistemaMobileViewModel;
}
