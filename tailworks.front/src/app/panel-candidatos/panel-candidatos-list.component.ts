import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule, UpperCasePipe, NgClass } from '@angular/common';
import { VagasMockService } from '../vagas/data/vagas-mock.service';

export type CandidateStage =
  | 'radar'
  | 'candidatura'
  | 'processo'
  | 'tecnica'
  | 'aguardando'
  | 'aceito'
  | 'documentacao'
  | 'contratado'
  | 'proxima'
  | 'cancelado'
  | undefined;

interface PanelCandidate {
  id?: string;
  name: string;
  role: string;
  location?: string;
  match: number;
  avatar: string;
  stage?: CandidateStage;
  availabilityLabel?: string;
  radarOnly?: boolean;
  source?: 'seed' | 'system';
  stageOwner?: 'system' | 'talent' | 'recruiter';
  recruiterManagedJourney?: boolean;
  recruiterStageCommittedAt?: string;
  decision?: 'applied' | 'hidden';
}

interface GroupedCandidate {
  candidate: PanelCandidate;
  index: number;
  badgeCount: number;
}

interface CandidateGroup {
  stage?: CandidateStage;
  candidates: GroupedCandidate[];
}

@Component({
  selector: 'app-panel-candidatos-list',
  standalone: true,
  imports: [CommonModule, UpperCasePipe, NgClass],
  templateUrl: './panel-candidatos-list.component.html',
  styleUrls: ['./panel-candidatos-list.component.scss']
})
export class PanelCandidatosListComponent {
  private readonly vagasMockService = inject(VagasMockService);

  @Input() selectedJobPanel: any = null;
  @Input() sortedCandidatesFor!: (job: any) => any[];
  @Input() openCandidate!: (job: any, index: number) => void;
  @Input() stageLabel!: (stage?: CandidateStage) => string;
  @Input() embedded = false;
  @Output() closePanelEvent = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<number>();
  @Output() openCandidateProfile = new EventEmitter<number>();
  @Output() openCandidateStatus = new EventEmitter<number>();

  closePanel() {
    this.closePanelEvent.emit();
  }

  handleOpenChat(index: number) {
    this.openChat.emit(index);
  }

  handleOpenCandidateProfile(index: number): void {
    this.openCandidateProfile.emit(index);
  }

  handleOpenCandidateStatus(index: number): void {
    this.openCandidateStatus.emit(index);
  }

  candidateStatusLabel(candidate: PanelCandidate): string {
    return this.stageLabel(this.normalizeCandidateStage(candidate));
  }

  candidateStatusTone(candidate: PanelCandidate): string {
    return this.normalizeCandidateStage(candidate) ?? 'radar';
  }

  get groupedCandidates(): CandidateGroup[] {
    if (!this.selectedJobPanel || !this.sortedCandidatesFor) {
      return [];
    }

    const sorted = this.sortedCandidatesFor(this.selectedJobPanel) as PanelCandidate[];
    const groups: CandidateGroup[] = [];

    sorted.forEach((candidate, index) => {
      const currentStage: CandidateStage = this.normalizeCandidateStage(candidate);
      const previousGroup = groups[groups.length - 1];
      const candidateEntry: GroupedCandidate = {
        candidate,
        index,
        badgeCount: index % 3 === 0 ? 3 : index % 3 === 1 ? 1 : 2,
      };

      if (previousGroup && previousGroup.stage === currentStage) {
        previousGroup.candidates.push(candidateEntry);
        return;
      }

      groups.push({
        stage: currentStage,
        candidates: [candidateEntry],
      });
    });

    return groups;
  }

  get hasRadarProfiles(): boolean {
    return this.groupedCandidates.some(group => group.stage === 'radar');
  }

  private normalizeCandidateStage(candidate: PanelCandidate): CandidateStage {
    return this.vagasMockService.getEffectiveCandidateStage(candidate);
  }
}
