import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatMsg, RecruiterJob, RecruiterTalent } from '../../models/recruiter.models';

@Component({
  selector: 'recruiter-chat-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recruiter-chat-drawer.component.html',
  styleUrls: ['./recruiter-chat-drawer.component.scss'],
})
export class RecruiterChatDrawerComponent implements OnChanges, OnDestroy {
  readonly recruiterAvatarUrl = 'assets/recuiter-job.png';

  @Input() isOpen = false;
  @Input() job: RecruiterJob | null = null;
  @Input() talents: RecruiterTalent[] = [];

  @Output() close = new EventEmitter<void>();

  draft = '';
  private localMessagesByTalent: Record<string, ChatMsg[]> = {};
  selectedTalentId: string | null = null;
  private bodyOverflowBeforeOpen = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.handleClose();
  }

  get headerTitle(): string {
    return this.job?.title?.trim() || 'Chat da vaga';
  }

  get status(): string {
    return this.job?.status ?? '';
  }

  get conversationMessages(): ChatMsg[] {
    const base = this.selectedTalent?.messages ?? [];
    const local = this.selectedTalent ? (this.localMessagesByTalent[this.selectedTalent.id] ?? []) : [];
    return [...base, ...local];
  }

  get conversationLabel(): string {
    return this.selectedTalent?.name ?? 'Candidato';
  }

  get selectedTalentAvatarUrl(): string | null {
    return this.selectedTalent?.avatarUrl ?? null;
  }

  get selectedTalent(): RecruiterTalent | null {
    if (!this.talents.length) return null;
    if (!this.selectedTalentId) return this.talents[0];
    return this.talents.find(t => t.id === this.selectedTalentId) ?? this.talents[0];
  }

  get applicantsCount(): number {
    return this.job?.talents?.length ?? 0;
  }

  get talentRoleLabel(): string {
    const title = (this.job?.title ?? '').toLowerCase();
    if (title.includes('sênior') || title.includes('senior') || title.includes(' sr')) return 'Sr';
    if (title.includes('pleno')) return 'Pleno';
    if (title.includes('júnior') || title.includes('junior') || title.includes(' jr')) return 'Jr';
    return 'Especialista';
  }

  isTalentOnline(talent: RecruiterTalent): boolean {
    const lastSeen = (talent.lastSeen ?? '').toLowerCase();
    return lastSeen.includes('hoje') || lastSeen.includes('online');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['job'] || changes['talents']) {
      this.selectedTalentId = this.talents[0]?.id ?? null;
      this.localMessagesByTalent = {};
      this.draft = '';
    }

    if (changes['isOpen']) {
      this.syncBodyScrollLock();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  send(): void {
    const text = this.draft.trim();
    if (!text || !this.selectedTalent) return;

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const talentId = this.selectedTalent.id;
    const prev = this.localMessagesByTalent[talentId] ?? [];
    this.localMessagesByTalent = {
      ...this.localMessagesByTalent,
      [talentId]: [
        ...prev,
        {
          id: `local-${talentId}-${Date.now()}`,
          from: 'me',
          text,
          time,
          createdAt: now.toISOString(),
        },
      ],
    };

    this.draft = '';
  }

  handleClose(): void {
    this.close.emit();
  }

  selectTalent(talent: RecruiterTalent): void {
    if (this.selectedTalentId === talent.id) return;
    this.selectedTalentId = talent.id;
    this.draft = '';
  }

  trackByTalentId(_: number, talent: RecruiterTalent): string {
    return talent.id;
  }

  trackByMsgId(_: number, msg: ChatMsg): string {
    return msg.id;
  }

  isMine(message: ChatMsg): boolean {
    return message.from === 'me';
  }

  getMessageAvatarUrl(message: ChatMsg): string | null {
    return this.isMine(message) ? this.recruiterAvatarUrl : this.selectedTalentAvatarUrl;
  }

  getMessageAvatarFallback(message: ChatMsg): string {
    return this.isMine(message) ? 'TW' : this.conversationLabel.charAt(0);
  }

  private syncBodyScrollLock(): void {
    if (typeof document === 'undefined') return;
    if (this.isOpen) {
      this.bodyOverflowBeforeOpen = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return;
    }
    this.unlockBodyScroll();
  }

  private unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = this.bodyOverflowBeforeOpen;
  }
}
