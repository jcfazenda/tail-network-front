import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, OnChanges, ChangeDetectorRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface ChatCandidate {
  name: string;
  role: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
  stack?: string;
  lastMessage?: string;
  time?: string;
}

export interface ChatJob {
  title: string;
  company: string;
  location: string;
  workModel?: string;
  candidates: ChatCandidate[];
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
}

@Component({
  standalone: true,
  selector: 'app-tail-chat-panel',
  imports: [CommonModule, FormsModule],
  templateUrl: './tail-chat-panel.component.html',
  styleUrls: ['./tail-chat-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TailChatPanelComponent implements OnChanges {
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() job!: ChatJob;
  @Output() close = new EventEmitter<void>();

  searchText = '';
  messageText = '';

  conversations: ChatCandidate[] = [];
  selectedConversationIndex = 0;
  stages: Stage[] = [
    { label: 'Candidatado', status: 'done', meta: 'Qui 12:21' },
    { label: 'Em Entrevista', status: 'pending' },
    { label: 'Em Entrevista Técnica', status: 'pending' },
    { label: 'Documentação recebida', status: 'pending' },
    { label: 'Aguardando aceite de Aprovação', status: 'pending' },
  ];
  confettiPieces: ConfettiPiece[] = [];
  confettiActive = false;

  messages = [
    { sender: 'candidate', text: 'Olá, tenho interesse na vaga!', time: '16:04' },
    { sender: 'recruiter', text: 'Ótimo, vamos marcar?', time: '16:06' },
  ];

  ngOnChanges() {
    this.conversations = this.job?.candidates ?? [];
    this.selectedConversationIndex = 0;
    this.resetStages();
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

  selectConversation(index: number) {
    this.selectedConversationIndex = index;
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
    this.confettiPieces = Array.from({ length: 90 }, (): ConfettiPiece => {
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
        delay: Math.random() * 700,
        duration: 3600 + Math.random() * 2600,
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
    this.stages = [
      { label: 'Candidatado', status: 'done', meta: 'Qui 12:21' },
      { label: 'Em Entrevista', status: 'pending' },
      { label: 'Em Entrevista Técnica', status: 'pending' },
      { label: 'Documentação recebida', status: 'pending' },
      { label: 'Aguardando aceite de Aprovação', status: 'pending' },
    ];
  }

  closePanel() {
    this.close.emit();
  }

  trackByConversation(_i: number, c: ChatCandidate) {
    return _i;
  }

  trackByMessage(index: number) {
    return index;
  }
}
