import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatJob, TailChatPanelComponent } from '../chat/tail-chat-panel.component';

interface RadarCategory {
  label: string;
  value: number;
  color: string;
  offset?: number;
}

interface JobCard {
  title: string;
  company: string;
  location: string;
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
  candidates: Candidate[];
}

interface Candidate {
  name: string;
  role: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
}

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule, TailChatPanelComponent],
  templateUrl: './stub.page.html',
  styleUrls: ['./stub.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  private readonly route = inject(ActivatedRoute);

  readonly radarTotal = 87;
  readonly radarDelta = 12;

  readonly radarCategories: RadarCategory[] = [
    { label: 'Backend', value: 92, color: 'linear-gradient(90deg, #f5b300, #f59e0b)' },
    { label: 'Frontend', value: 81, color: 'linear-gradient(90deg, #f6c340, #f5b300)' },
    { label: 'Cloud', value: 66, color: '#d5d9e6' },
    { label: 'DevOps', value: 55, color: '#cacedc' },
  ];

  activeTab: JobCard['status'] = 'ativas';

  selectedJobPanel: ChatJob | null = null;
  selectedChatJob: ChatJob | null = null;
  chatStartIndex = 0;

  readonly jobCards: JobCard[] = [
    {
      title: 'Backend .NET Sênior',
      company: 'Banco Itaú',
      location: 'Rio de Janeiro - RJ',
      priority: 'RIO DE JANEIRO - RJ',
      workModel: 'Remoto',
      match: 89,
      talents: 23,
      radarCount: 23,
      ageLabel: '2 dias',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 18,
      status: 'ativas',
      candidates: [
        { name: 'Alex Chen', role: 'Backend .NET', match: 92, minutesAgo: 8, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Bianca Lima', role: 'Eng. Software', match: 88, minutesAgo: 16, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Carlos Souza', role: 'Tech Lead .NET', match: 81, minutesAgo: 28, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
    {
      title: 'Senior Product Designer',
      company: 'Nubank',
      location: 'São Paulo - SP',
      priority: 'SÃO PAULO - SP',
      workModel: 'Presencial',
      match: 94,
      talents: 15,
      radarCount: 6,
      ageLabel: '1 dia',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 18,
      status: 'ativas',
      candidates: [
        { name: 'Marina Dias', role: 'Product Designer', match: 95, minutesAgo: 5, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Ivan Costa', role: 'UX Researcher', match: 87, minutesAgo: 21, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Letícia Prado', role: 'Design Ops', match: 82, minutesAgo: 37, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
    {
      title: 'Data Analyst Mid-Level',
      company: 'XP Inc.',
      location: 'Rio de Janeiro - RJ',
      priority: '',
      workModel: 'Híbrido',
      match: 76,
      talents: 9,
      radarCount: 4,
      ageLabel: '3 dias',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 6,
      status: 'rascunhos',
      candidates: [
        { name: 'Paula Neri', role: 'Data Analyst', match: 79, minutesAgo: 42, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Rafael Nunes', role: 'BI Analyst', match: 74, minutesAgo: 58, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
    {
      title: 'DevOps Engineer',
      company: 'Stone',
      location: 'Remoto - Brasil',
      priority: 'REMOTO',
      workModel: 'Remoto',
      match: 82,
      talents: 18,
      radarCount: 12,
      ageLabel: '4 dias',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 10,
      status: 'ativas',
      candidates: [
        { name: 'Camila Rocha', role: 'DevOps', match: 86, minutesAgo: 11, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Diego Martins', role: 'SRE', match: 80, minutesAgo: 29, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
    {
      title: 'QA Automation Pleno',
      company: 'RD Station',
      location: 'Florianópolis - SC',
      priority: 'PRIORIDADE MÉDIA',
      workModel: 'Híbrido',
      match: 74,
      talents: 11,
      radarCount: 7,
      ageLabel: '5 dias',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 5,
      status: 'ativas',
      candidates: [
        { name: 'Juliana Prado', role: 'QA Engineer', match: 77, minutesAgo: 34, status: 'online', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Felipe Ramos', role: 'Automation Eng.', match: 71, minutesAgo: 62, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
    {
      title: 'Product Manager',
      company: 'Loft',
      location: 'São Paulo - SP',
      priority: '',
      workModel: 'Remoto',
      match: 68,
      talents: 8,
      radarCount: 3,
      ageLabel: '2 dias',
      postedLabel: '',
      avatars: [
        '/assets/avatars/avatar-rafael.png',
        '/assets/avatars/avatar-rafael.png'
      ],
      extraCount: 4,
      status: 'encerradas',
      candidates: [
        { name: 'Ana Paula', role: 'PM', match: 70, minutesAgo: 80, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
        { name: 'Rogério Lima', role: 'Product Ops', match: 65, minutesAgo: 120, status: 'offline', avatar: '/assets/avatars/avatar-rafael.png' },
      ],
    },
  ];

  readonly stageLabels = [
    'Em Candidatura',
    'Em Entrevista',
    'Em Entrevista Técnica',
    'Documentação recebida',
    'Aguardando aceite de Aprovação',
  ];

  setTab(tab: JobCard['status']) {
    this.activeTab = tab;
  }

  get filteredJobs(): JobCard[] {
    return this.jobCards.filter(j => j.status === this.activeTab);
  }

  findJobByTitle(title: string): JobCard {
    return this.jobCards.find(j => j.title === title)!;
  }

  openPanel(job: JobCard) {
    const asChatJob: ChatJob = {
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      candidates: job.candidates,
    };

    this.selectedJobPanel = asChatJob;
    this.selectedChatJob = null;
    this.chatStartIndex = 0;
  }

  openCandidate(job: JobCard, index: number) {
    const asChatJob: ChatJob = {
      title: job.title,
      company: job.company,
      location: job.location,
      workModel: job.workModel,
      candidates: job.candidates,
    };

    this.selectedJobPanel = asChatJob;
    this.selectedChatJob = asChatJob;
    this.chatStartIndex = index;
  }

  getStageLabel(index: number): string {
    if (index >= 0 && index < this.stageLabels.length) return this.stageLabels[index];
    return this.stageLabels[this.stageLabels.length - 1];
  }

  closeChat() {
    this.selectedChatJob = null;
  }
}
