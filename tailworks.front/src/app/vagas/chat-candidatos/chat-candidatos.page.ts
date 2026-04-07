import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { MockJobRecord } from '../data/vagas.models';

interface ChatMessage {
  readonly id: number;
  readonly author: 'candidate' | 'recruiter';
  readonly content: string;
  readonly time: string;
}

interface ChatConversation {
  readonly id: number;
  readonly name: string;
  readonly role: string;
  readonly avatar: string;
  readonly status: string;
  readonly lastMessage: string;
  readonly lastSeen: string;
  readonly unreadCount?: number;
  readonly favorite?: boolean;
  readonly messages: ChatMessage[];
}

@Component({
  standalone: true,
  selector: 'app-chat-candidatos-page',
  imports: [CommonModule],
  templateUrl: './chat-candidatos.page.html',
  styleUrls: ['./chat-candidatos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCandidatosPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  selectedJobId: string | null = null;

  readonly conversations: ChatConversation[] = [
    {
      id: 1,
      name: 'Robert Fox',
      role: 'Front-end Engineer',
      avatar: 'https://i.pravatar.cc/160?img=12',
      status: 'Typing...',
      lastMessage: 'Hello! I’m having trouble accessing my account.',
      lastSeen: 'Hoje · 06:32 PM',
      unreadCount: 1,
      favorite: true,
      messages: [
        { id: 11, author: 'candidate', content: 'Hello! I’m having trouble accessing my account.', time: '04:45 PM' },
        { id: 12, author: 'recruiter', content: 'Boa tarde, Robert. Pode me contar em qual etapa isso acontece?', time: '04:45 PM' },
        { id: 13, author: 'candidate', content: 'The issue has been resolved. Thank you for your help.', time: '04:45 PM' },
        { id: 14, author: 'recruiter', content: 'Perfeito. Se quiser, posso validar também o e-mail e o ID da conta vinculada.', time: '04:45 PM' },
        { id: 15, author: 'candidate', content: 'I appreciate the prompt assistance. I will try that now.', time: '04:45 PM' },
      ],
    },
    {
      id: 2,
      name: 'Kathryn Murphy',
      role: 'Product Designer',
      avatar: 'https://i.pravatar.cc/160?img=32',
      status: 'Online',
      lastMessage: 'Enviei o case e a apresentação final.',
      lastSeen: 'Hoje · 05:18 PM',
      favorite: true,
      messages: [{ id: 21, author: 'candidate', content: 'Enviei o case e a apresentação final.', time: '05:18 PM' }],
    },
    {
      id: 3,
      name: 'Floyd Miles',
      role: 'Back-end Engineer',
      avatar: 'https://i.pravatar.cc/160?img=15',
      status: 'Offline',
      lastMessage: 'Podemos remarcar a entrevista técnica?',
      lastSeen: 'Ontem · 07:10 PM',
      messages: [{ id: 31, author: 'candidate', content: 'Podemos remarcar a entrevista técnica?', time: '07:10 PM' }],
    },
    {
      id: 4,
      name: 'Arlene McCoy',
      role: 'UX Researcher',
      avatar: 'https://i.pravatar.cc/160?img=20',
      status: 'Online',
      lastMessage: 'Obrigada pelo retorno rápido.',
      lastSeen: 'Hoje · 03:05 PM',
      messages: [{ id: 41, author: 'candidate', content: 'Obrigada pelo retorno rápido.', time: '03:05 PM' }],
    },
    {
      id: 5,
      name: 'Dianne Russell',
      role: 'QA Analyst',
      avatar: 'https://i.pravatar.cc/160?img=48',
      status: 'Offline',
      lastMessage: 'Teste concluído, tudo certo por aqui.',
      lastSeen: 'Ontem · 11:02 AM',
      messages: [{ id: 51, author: 'candidate', content: 'Teste concluído, tudo certo por aqui.', time: '11:02 AM' }],
    },
    {
      id: 6,
      name: 'Marvin McKinney',
      role: 'Tech Lead',
      avatar: 'https://i.pravatar.cc/160?img=58',
      status: 'Online',
      lastMessage: 'Vamos falar sobre expectativa salarial.',
      lastSeen: 'Hoje · 01:44 PM',
      messages: [{ id: 61, author: 'candidate', content: 'Vamos falar sobre expectativa salarial.', time: '01:44 PM' }],
    },
  ];

  selectedConversationId = this.conversations[0]?.id ?? null;

  constructor() {
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.selectedJobId = params.get('jobId')?.trim() || null;
        this.cdr.markForCheck();
      }),
    );

    this.subscriptions.add(this.jobsFacade.jobsChanged$.subscribe(() => this.cdr.markForCheck()));
  }

  get selectedConversation(): ChatConversation | null {
    return this.conversations.find((conversation) => conversation.id === this.selectedConversationId) ?? null;
  }

  get selectedJob(): MockJobRecord | null {
    if (this.selectedJobId) {
      return this.jobsFacade.getJobById(this.selectedJobId) ?? null;
    }

    return this.jobsFacade.getJobs()[0] ?? null;
  }

  get selectedJobAvatarBadges(): Array<{ src: string; label: string }> {
    const job = this.selectedJob;
    if (!job) {
      return [];
    }

    const candidateAvatars = (job.candidates ?? [])
      .filter((candidate) => (this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar') === 'radar')
      .map((candidate) => ({ src: candidate.avatar?.trim(), label: candidate.name }))
      .filter((candidate): candidate is { src: string; label: string } => !!candidate.src);

    return candidateAvatars.slice(0, 4);
  }

  get selectedJobAvatarExtraCount(): number {
    const job = this.selectedJob;
    if (!job) {
      return 0;
    }

    const radarCandidates = (job.candidates ?? [])
      .filter((candidate) => (this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar') === 'radar')
      .length;
    const totalCandidates = Math.max(radarCandidates, job.radarCount ?? 0);
    return Math.max(0, totalCandidates - this.selectedJobAvatarBadges.length);
  }

  jobCompanyLogoUrl(job: MockJobRecord): string {
    const explicit = job.companyLogoUrl?.trim();
    if (explicit) {
      return explicit;
    }

    const normalized = job.company?.trim().toLocaleLowerCase('pt-BR') ?? '';
    if (normalized.includes('itaú') || normalized.includes('itau')) {
      return '/assets/images/logo-itau.png';
    }

    if (normalized.includes('nubank')) {
      return '/assets/images/logo-nubank-roxinho.webp';
    }

    if (normalized.includes('mercado livre') || normalized.includes('ifood') || normalized.includes('stone')) {
      return '/assets/images/logo-nubank.png';
    }

    return '/assets/images/logo-itau.png';
  }

  jobCompanyLabel(job: MockJobRecord): string {
    const normalized = job.company?.trim() || 'TW';
    const parts = normalized.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'TW';
  }

  jobWorkModelLabel(job: MockJobRecord): string {
    return job.workModel?.trim() || 'Modelo flexível';
  }

  jobLocationLabel(job: MockJobRecord): string {
    return job.location?.trim() || 'Brasil';
  }

  jobSalaryLabel(job: MockJobRecord): string {
    return job.salaryRange?.trim() || 'R$ a combinar';
  }

  trackByConversation(_: number, conversation: ChatConversation): number {
    return conversation.id;
  }

  trackByMessage(_: number, message: ChatMessage): number {
    return message.id;
  }

  trackByAvatar(_: number, avatar: { src: string; label: string }): string {
    return `${avatar.label}-${avatar.src}`;
  }

  selectConversation(conversationId: number): void {
    this.selectedConversationId = conversationId;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
