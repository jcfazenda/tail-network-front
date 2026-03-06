import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, UpperCasePipe, NgClass } from '@angular/common';

export type CandidateStage = 'processo' | 'aguardando' | 'tecnica' | 'cancelado' | undefined;

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
  @Input() findJobByTitle!: (title: string) => any;
  @Input() stageLabel!: (stage?: CandidateStage) => string;
  @Output() closePanelEvent = new EventEmitter<void>();

  closePanel() {
    this.closePanelEvent.emit();
  }
}
