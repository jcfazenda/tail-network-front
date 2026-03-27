import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export type CoreMatchTone = 'high' | 'medium' | 'low';

export interface CoreMatchMetricViewModel {
  label: string;
  points: number;
  percent: number;
  fillClass: string;
}

export interface CoreMatchRequirementRowViewModel {
  label: string;
  minimumPercent: number;
  checked: boolean;
}

export interface CoreMatchSkillRowViewModel {
  label: string;
  percent: number;
  levelLabel: string;
  levelTone: 'empty' | 'base' | 'junior' | 'pleno' | 'senior' | 'especialista';
  monthsLabel: string;
  levelGuide: string;
}

export interface CoreMatchBreakdownRowViewModel {
  label: string;
  source: string;
  candidatePercent: number;
  vacancyPercent: number;
  strengthLabel: string;
  strengthPercent: number;
  hasCheck: boolean;
  timeLabel: string;
}

export interface CoreMatchInsightViewModel {
  label: string;
  value: string;
  warm?: boolean;
}

export interface CoreMatchSegmentViewModel {
  width: number;
  tone: string;
}

export interface CoreMatchSpotlightViewModel {
  avatar: string;
  candidateName: string;
  candidateMeta: string;
  candidateRole: string;
  score: number;
  scoreBarPercent: number;
  scoreLabel: string;
  scoreTone: CoreMatchTone;
  requirements: CoreMatchRequirementRowViewModel[];
  companyExperiencePercent: number;
  skills: CoreMatchSkillRowViewModel[];
  alternativeTasks: string[];
  breakdownRows: CoreMatchBreakdownRowViewModel[];
  contributionSegments: CoreMatchSegmentViewModel[];
  insights: CoreMatchInsightViewModel[];
}

@Component({
  standalone: true,
  selector: 'app-core-match-spotlight',
  imports: [CommonModule],
  templateUrl: './core-match-spotlight.component.html',
  styleUrls: ['./core-match-spotlight.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreMatchSpotlightComponent {
  @Input({ required: true }) viewModel!: CoreMatchSpotlightViewModel;
  @Output() loginAs = new EventEmitter<void>();
}
