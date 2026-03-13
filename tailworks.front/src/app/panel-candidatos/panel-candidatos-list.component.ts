import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, UpperCasePipe, NgClass } from '@angular/common';

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
  name: string;
  role: string;
  location?: string;
  match: number;
  avatar: string;
  stage?: CandidateStage;
  availabilityLabel?: string;
  radarOnly?: boolean;
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
  @Input() selectedJobPanel: any = null;
  @Input() sortedCandidatesFor!: (job: any) => any[];
  @Input() openCandidate!: (job: any, index: number) => void;
  @Input() stageLabel!: (stage?: CandidateStage) => string;
  @Input() embedded = false;
  @Output() closePanelEvent = new EventEmitter<void>();
  @Output() openChat = new EventEmitter<number>();
  @Output() openCandidateProfile = new EventEmitter<number>();

  closePanel() {
    this.closePanelEvent.emit();
  }

  handleOpenChat(index: number) {
    this.openChat.emit(index);
  }

  handleOpenCandidateProfile(index: number): void {
    this.openCandidateProfile.emit(index);
  }

  get groupedCandidates(): CandidateGroup[] {
    if (!this.selectedJobPanel || !this.sortedCandidatesFor) {
      return [];
    }

    const sorted = this.sortedCandidatesFor(this.selectedJobPanel) as PanelCandidate[];
    const groups: CandidateGroup[] = [];

    sorted.forEach((candidate, index) => {
      const currentStage: CandidateStage = candidate.radarOnly ? 'radar' : candidate.stage;
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
}
