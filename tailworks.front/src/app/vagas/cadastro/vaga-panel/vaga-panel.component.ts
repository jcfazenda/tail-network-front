import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { VagaPanelDraft } from '../../data/vagas.models';

export interface VagaPanelRecruiter {
  name: string;
  role: string;
  avatar: string;
}

@Component({
  standalone: true,
  selector: 'app-vaga-panel',
  imports: [CommonModule],
  templateUrl: './vaga-panel.component.html',
  styleUrls: ['./vaga-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VagaPanelComponent {
  @Input({ required: true }) recruiter!: VagaPanelRecruiter;
  @Input({ required: true }) jobDraft!: VagaPanelDraft;
}
