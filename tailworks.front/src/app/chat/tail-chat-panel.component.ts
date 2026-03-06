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
  readonly stages = [
    { label: 'Candidatado', status: 'done' as const, meta: 'Qui 12:21' },
    { label: 'Em Entrevista', status: 'pending' as const },
    { label: 'Em Entrevista Técnica', status: 'pending' as const },
    { label: 'Documentação recebida', status: 'pending' as const },
    { label: 'Aguardando aceite de Aprovação', status: 'pending' as const },
  ];

  messages = [
    { sender: 'candidate', text: 'Olá, tenho interesse na vaga!', time: '16:04' },
    { sender: 'recruiter', text: 'Ótimo, vamos marcar?', time: '16:06' },
  ];

  ngOnChanges() {
    this.conversations = this.job?.candidates ?? [];
    this.selectedConversationIndex = 0;
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
