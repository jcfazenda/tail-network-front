import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, OnChanges, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobsFacade } from '../../../core/facades/jobs.facade';

export interface ChatCandidate {
  id?: string;
  name: string;
  role: string;
  location?: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
  stack?: string;
  lastMessage?: string;
  time?: string;
  stage?: string;
  availabilityLabel?: string;
  radarOnly?: boolean;
  source?: 'seed' | 'system';
  stageOwner?: 'system' | 'talent' | 'recruiter';
  recruiterManagedJourney?: boolean;
  recruiterStageCommittedAt?: string;
  decision?: 'applied' | 'hidden';
  submittedDocuments?: string[];
  documentsConsentAccepted?: boolean;
}

export interface ChatTechStackItem {
  name: string;
  match: number;
}

export interface ChatJob {
  id: string;
  title: string;
  company: string;
  location: string;
  workModel?: string;
  techStack: ChatTechStackItem[];
  candidates: ChatCandidate[];
  hiringDocuments?: string[];
  talentSubmittedDocuments?: string[];
  talentDocumentsConsentAccepted?: boolean;
}

type StageStatus = 'done' | 'pending';

interface ConfettiPiece {
  left: number;
  top: number;
  offsetX: number;
  offsetY: number;
  color: string;
  delay: number;
  duration: number;
}

interface Stage {
  label: string;
  status: StageStatus;
  meta?: string;
  active?: boolean;
}

type CandidateModalTab = 'journey' | 'curriculum';

type CandidateBasicDraft = {
  profile?: {
    name?: string;
    location?: string;
  };
  photoPreviewUrl?: string;
};

type FormationCopyDraft = {
  graduation: string;
  specialization: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  graduated: boolean;
  educationStatus: string;
};

type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  workModel: 'Presencial' | 'Híbrido' | 'Remoto';
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentlyWorkingHere: boolean;
  responsibilities: string;
  positionLevel: 'Júnior' | 'Pleno' | 'Sênior' | 'Tech Lead';
  companySize: 'Startup' | 'Média' | 'Grande';
  companySegment: string;
  sector: string;
  actuation: number;
};

interface CandidateJourneyStep {
  label: string;
  timeLabel?: string;
  description: string;
  ownerText: string;
  completed: boolean;
  active: boolean;
}

@Component({
  standalone: true,
  selector: 'app-tail-chat-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './tail-chat-panel.component.html',
  styleUrls: [
    './tail-chat-panel.component.panel.scss',
    './tail-chat-panel.component.active.scss',
    './tail-chat-panel.component.modal.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TailChatPanelComponent implements OnChanges {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly experiencesStorageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly jobsFacade = inject(JobsFacade);

  @Input() job!: ChatJob;
  @Input() startIndex = 0;
  @Input() showConversationList = true;
  @Input() embedded = false;
  @Output() close = new EventEmitter<void>();
  @Output() openCandidateProfile = new EventEmitter<{ job: ChatJob; candidate: ChatCandidate; initialTab: CandidateModalTab }>();

  searchText = '';
  messageText = '';

  conversations: ChatCandidate[] = [];
  selectedConversationIndex = 0;
  stages: Stage[] = [];
  private readonly stageOrder = ['candidatura', 'processo', 'tecnica', 'documentacao', 'aguardando'];
  confettiPieces: ConfettiPiece[] = [];
  confettiActive = false;

  messages = [
    { sender: 'candidate', text: 'Olá, tenho interesse na vaga!', time: '16:04' },
    { sender: 'recruiter', text: 'Ótimo, vamos marcar?', time: '16:06' },
  ];

  ngOnChanges() {
    this.conversations = this.job?.candidates ?? [];
    const maxIndex = Math.max(0, this.conversations.length - 1);
    this.selectedConversationIndex = Math.min(this.startIndex || 0, maxIndex);
    this.updateStagesForSelected();
    this.buildConfetti();
  }

  get filteredConversations(): ChatCandidate[] {
    const term = this.searchText.trim().toLowerCase();
    if (!term) return this.conversations;
    return this.conversations.filter(c =>
      c.name.toLowerCase().includes(term) ||
      c.role.toLowerCase().includes(term)
    );
  }

  get selectedConversation(): ChatCandidate | undefined {
    return this.filteredConversations[this.selectedConversationIndex] ?? this.filteredConversations[0];
  }

  get recruiterDisplayName(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().name;
  }

  get recruiterDisplayRole(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().role;
  }

  get selectedAvailabilityLabel(): string | null {
    return this.selectedConversation?.availabilityLabel ?? null;
  }

  get selectedRoleLabel(): string {
    return this.selectedConversation?.stack || this.selectedConversation?.role || '';
  }

  get jobTechStack(): ChatTechStackItem[] {
    return this.job?.techStack ?? [];
  }

  get jobTechStackAverage(): number {
    if (!this.jobTechStack.length) {
      return 0;
    }

    const total = this.jobTechStack.reduce((sum, item) => sum + item.match, 0);
    return total / this.jobTechStack.length;
  }

  get selectedFitNearTarget(): boolean {
    const selectedMatch = this.selectedConversation?.match ?? 0;
    const average = this.jobTechStackAverage;

    if (!average) {
      return false;
    }

    return selectedMatch >= average - 4;
  }

  get showHiringFlow(): boolean {
    return !this.selectedConversation?.radarOnly;
  }

  selectConversation(index: number) {
    this.selectedConversationIndex = index;
    this.updateStagesForSelected();
  }

  openCandidateModal(tab: CandidateModalTab = 'curriculum') {
    const selected = this.selectedConversation;

    if (!selected) {
      return;
    }

    this.openCandidateProfile.emit({
      job: this.job,
      candidate: selected,
      initialTab: tab,
    });
  }

  sendMessage() {
    const text = this.messageText.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.messages = [
      ...this.messages,
      { sender: 'recruiter', text, time }
    ];
    this.messageText = '';
    this.cdr.markForCheck();

    setTimeout(() => {
      this.messages = [
        ...this.messages,
        { sender: 'candidate', text: 'Recebi sua mensagem, já estou olhando! 👍', time }
      ];
      this.cdr.markForCheck();
    }, 450);
  }

  advanceStage() {
    const nextIndex = this.stages.findIndex(s => s.status === 'pending');
    if (nextIndex === -1) return;

    const now = new Date();
    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const weekDay = now.toLocaleDateString([], { weekday: 'short' });
    this.stages = this.stages.map((s, idx) =>
      idx === nextIndex ? { ...s, status: 'done', meta: `${weekDay} ${timeLabel}` } : s
    );
    this.triggerConfetti();
    this.cdr.markForCheck();
  }

  private buildConfetti() {
    const colors = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#a5f3fc', '#d946ef'];
    this.confettiPieces = Array.from({ length: 110 }, (): ConfettiPiece => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40; // vh distance
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      return {
        left: 50,
        top: 50,
        offsetX: dx,
        offsetY: dy,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 900,
        duration: 4800 + Math.random() * 3200,
      };
    });
  }

  private triggerConfetti() {
    this.buildConfetti();
    this.confettiActive = false;
    this.cdr.markForCheck();
    requestAnimationFrame(() => {
      this.confettiActive = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.confettiActive = false;
        this.cdr.markForCheck();
      }, 1400);
    });
  }

  private resetStages() {
    this.stages = this.stageOrder.map((key, idx) => ({
      label: this.stageLabelFromKey(key),
      status: idx === 0 ? 'done' : 'pending',
      meta: idx === 0 ? 'Qui 12:21' : undefined,
      active: idx === 0,
    }));
  }

  private updateStagesForSelected() {
    const selected = this.selectedConversation;
    if (selected?.radarOnly) {
      this.stages = [];
      this.cdr.markForCheck();
      return;
    }

    const fallbackIndex = this.stageOrder.indexOf('processo');
    const currentIndexRaw = selected?.stage ? this.stageOrder.indexOf(selected.stage) : fallbackIndex;
    const currentIndex = currentIndexRaw === -1 ? fallbackIndex : currentIndexRaw;

    this.stages = this.stageOrder.map((key, idx) => {
      const status: StageStatus = idx < currentIndex ? 'done' : 'pending';
      const active = idx === currentIndex;
      return {
        label: this.stageLabelFromKey(key),
        status,
        active,
        meta: idx === 0 ? 'Qui 12:21' : undefined,
      };
    });
    this.cdr.markForCheck();
  }

  private stageLabelFromKey(key: string): string {
    switch (key) {
      case 'candidatura':
        return 'Candidatado';
      case 'processo':
        return 'Em Processo';
      case 'tecnica':
        return 'Em Entrevista Técnica';
      case 'documentacao':
        return 'Documentação recebida';
      case 'aguardando':
        return 'Aguardando aceite de Aprovação';
      default:
        return 'Em Processo';
    }
  }

  closePanel() {
    this.close.emit();
  }

  trackByConversation(_i: number, c: ChatCandidate) {
    return c.id ?? c.name;
  }

  trackByMessage(index: number) {
    return index;
  }

  private stageLabelFor(candidate: ChatCandidate): string {
    const stage = this.normalizeCandidateStage(candidate);

    switch (stage) {
      case 'radar':
        return 'Radar';
      case 'candidatura':
        return 'Candidatura enviada';
      case 'processo':
        return 'Em processo';
      case 'tecnica':
        return 'Em entrevista técnica';
      case 'aguardando':
        return 'Contratação solicitada';
      case 'aceito':
        return 'Aceito';
      case 'documentacao':
        return 'Validando documentos';
      case 'contratado':
        return 'Contratado';
      case 'proxima':
        return 'Ficou pra próxima';
      case 'cancelado':
        return 'Candidatura cancelada';
      default:
        return 'Radar';
    }
  }

  private normalizeCandidateStage(candidate: ChatCandidate): string {
    return this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar';
  }
}
