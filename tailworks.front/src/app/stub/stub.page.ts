import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface RadarCategory {
  label: string;
  value: number;
  color: string;
  offset?: number;
}

interface JobCard {
  title: string;
  priority: string;
  workModel: string;
  match: number;
  talents: number;
  radarCount: number;
  ageLabel: string;
  postedLabel: string;
  avatars: string[];
  extraCount: number;
  status: 'ativas' | 'rascunhos' | 'encerradas';
}

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule],
  templateUrl: './stub.page.html',
  styleUrls: ['./stub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  private readonly route = inject(ActivatedRoute);

  readonly radarTotal = 87;
  readonly radarDelta = 12;
  readonly radarCategories: RadarCategory[] = [
    { label: 'Backend', value: 92, color: 'linear-gradient(90deg, #f5b300, #f59e0b)', offset: -2 },
    { label: 'Frontend', value: 81, color: 'linear-gradient(90deg, #f6c340, #f5b300)' },
    { label: 'Cloud', value: 66, color: '#d5d9e6' },
    { label: 'DevOps', value: 55, color: '#cacedc' },
  ];

  readonly funnel = [
    { label: 'Radar', count: 154, percent: 88 },
    { label: 'Negociação', count: 65, percent: 62 },
    { label: 'Contratação', count: 12, percent: 28 },
  ];

  readonly conversations = [
    { name: 'Alex Chen', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Enviei rea portfólio attaaiada...', minutesAgo: 22, statusDot: 'online' },
    { name: 'Maria Silva', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Enviei o portfólio e o Design.', minutesAgo: 30, statusDot: 'online' },
    { name: 'James Wilson', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Aceitei o convite de entrevista.', minutesAgo: 32, statusDot: 'online' },
  ];

  readonly aiSummary = [
    '3 vagas com alto match',
    '2 candidatos próximos da contratações',
    '1 negociação parada há 3 dias'
  ];

  activeTab: JobCard['status'] = 'ativas';

  readonly jobCards: JobCard[] = [
    {
      title: 'Backend .NET Sênior',
      priority: 'Rio de Janeiro - RJ',
      workModel: 'Remoto',
      match: 89,
      talents: 23,
      radarCount: 23,
      ageLabel: '2 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 18,
      status: 'ativas',
    },
    {
      title: 'Senior Product Designer',
      priority: 'SÃO PAULO - SP',
      workModel: 'Presencial',
      match: 94,
      talents: 15,
      radarCount: 6,
      ageLabel: '1 dia',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 18,
      status: 'ativas',
    },
    {
      title: 'Data Analyst Mid-Level',
      priority: '',
      workModel: 'Híbrido',
      match: 76,
      talents: 9,
      radarCount: 4,
      ageLabel: '3 dias',
      postedLabel: 'Posticado na 6 a 9 dias',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 6,
      status: 'rascunhos',
    },
    {
      title: 'DevOps Engineer',
      priority: 'Remoto',
      workModel: 'Remoto',
      match: 82,
      talents: 18,
      radarCount: 12,
      ageLabel: '4 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 10,
      status: 'ativas',
    },
    {
      title: 'QA Automation Pleno',
      priority: 'Prioridade Média',
      workModel: 'Híbrido',
      match: 74,
      talents: 11,
      radarCount: 7,
      ageLabel: '5 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 5,
      status: 'ativas',
    },
    {
      title: 'Product Manager',
      priority: '',
      workModel: 'Remoto',
      match: 68,
      talents: 8,
      radarCount: 3,
      ageLabel: '2 dias',
      postedLabel: 'Posticado na 2 a 5 dias',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 4,
      status: 'encerradas',
    },
  ];

  setTab(tab: JobCard['status']) {
    this.activeTab = tab;
  }

  get filteredJobs(): JobCard[] {
    return this.jobCards.filter(j => j.status === this.activeTab);
  }
}
