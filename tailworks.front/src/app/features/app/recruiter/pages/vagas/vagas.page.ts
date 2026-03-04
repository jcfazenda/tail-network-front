import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JobAdherenceCardComponent, JobAdherenceCardVM } from '../../components/job-adherence-card/job-adherence-card.component';

@Component({
  standalone: true,
  selector: 'recruiter-vagas-page',
  imports: [CommonModule, JobAdherenceCardComponent],
  templateUrl: './vagas.page.html',
  styleUrls: ['./vagas.page.scss'],
})
export class VagasPage {
  card: JobAdherenceCardVM = {
    title: 'Backend.NET Pleno',
    workModeLabel: 'Remoto',
    openedLabel: 'Aberta há 2 dias',
    recruiterName: 'Jorge Mendes',
    recruiterRole: 'Tech Recruiter',
    isYouLabel: 'Você',
    expectedPercent: 82,
    expectedLabel: 'Compatível',
    yourAdherencePercent: 78,
    minimumPercent: 75,
    requirements: [
      { name: '.NET', neededPercent: 80, yourPercent: 75 },
      { name: 'SQL Server', neededPercent: 60, yourPercent: 63 },
      { name: 'Soft Skills', neededPercent: 50, yourPercent: 54 },
    ],
  };
}
