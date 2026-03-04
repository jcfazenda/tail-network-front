import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface JobRequirementVM {
  name: string;
  neededPercent: number;
  yourPercent: number;
}

export interface JobAdherenceCardVM {
  title: string;
  workModeLabel: string;
  openedLabel: string;
  recruiterName: string;
  recruiterRole: string;
  isYouLabel: string;
  expectedPercent: number;
  expectedLabel: string;
  yourAdherencePercent: number;
  minimumPercent: number;
  requirements: JobRequirementVM[];
}

@Component({
  selector: 'job-adherence-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-adherence-card.component.html',
  styleUrls: ['./job-adherence-card.component.scss'],
})
export class JobAdherenceCardComponent {

  @Input() vm: JobAdherenceCardVM = {

      title: 'Backend .NET Pleno',
      workModeLabel: 'Remoto',
      openedLabel: 'Aberta há 2 dias',
      recruiterName: 'Jorge Mendes',
      recruiterRole: 'Tech Recruiter',
      isYouLabel: 'Você',
      expectedPercent: 82,
      expectedLabel: 'Esperado',
      yourAdherencePercent: 78,
      minimumPercent: 75,

      requirements: [
        { name: '.NET', neededPercent: 80, yourPercent: 75 },
        { name: 'SQL Server', neededPercent: 60, yourPercent: 63 },
        { name: 'Soft Skills', neededPercent: 50, yourPercent: 54 },
      ],
      
  };

  clampPercent(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  }

  pillClass(your: number, needed: number): string {
    return this.clampPercent(your) >= this.clampPercent(needed) ? 'pill--ok' : 'pill--warn';
  }
}
