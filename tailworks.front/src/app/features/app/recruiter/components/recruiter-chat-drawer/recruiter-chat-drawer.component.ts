import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
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
  readonly talentAvatarFallbackUrl = 'assets/avatar-default.png';

  @Input() isOpen = false;
  @Input() job: RecruiterJob | null = null;
  @Input() talents: RecruiterTalent[] = [];

  @Output() close = new EventEmitter<void>();
  @ViewChild('talentRailScroller') talentRailScroller?: ElementRef<HTMLDivElement>;

  draft = '';
  profileTab: 'dados' | 'stacks' = 'dados';
  private localMessagesByTalent: Record<string, ChatMsg[]> = {};
  private adherentStacksByTalent: Record<string, Set<string>> = {};
  selectedTalentId: string | null = null;
  profileTalentId: string | null = null;
  private seenTalentIds = new Set<string>();
  private bodyOverflowBeforeOpen = '';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isTalentProfileOpen) {
      this.closeTalentProfile();
      return;
    }
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
    return this.selectedTalent?.avatarUrl ?? this.talentAvatarFallbackUrl;
  }

  get selectedTalent(): RecruiterTalent | null {
    if (!this.talents.length) return null;
    if (!this.selectedTalentId) return this.talents[0];
    return this.talents.find(t => t.id === this.selectedTalentId) ?? this.talents[0];
  }

  get profileTalent(): RecruiterTalent | null {
    if (!this.profileTalentId) return null;
    return this.talents.find(t => t.id === this.profileTalentId) ?? null;
  }

  get isTalentProfileOpen(): boolean {
    return !!this.profileTalent;
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
      this.adherentStacksByTalent = {};
      this.seenTalentIds = new Set();
      this.profileTalentId = null;
      this.profileTab = 'dados';
      this.draft = '';
      if (this.selectedTalentId) {
        this.seenTalentIds.add(this.selectedTalentId);
      }
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
    const talentName = this.selectedTalent.name;
    const prev = this.localMessagesByTalent[talentId] ?? [];
    const nextMessages: ChatMsg[] = [
      ...prev,
      {
        id: `local-${talentId}-${Date.now()}`,
        from: 'me',
        text,
        time,
        createdAt: now.toISOString(),
      },
    ];

    const replyNow = new Date();
    const replyTime = replyNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    nextMessages.push({
      id: `auto-${talentId}-${Date.now()}-reply`,
      from: 'candidate',
      text: this.buildMockTalentReply(talentName, text),
      time: replyTime,
      createdAt: replyNow.toISOString(),
    });

    this.localMessagesByTalent = {
      ...this.localMessagesByTalent,
      [talentId]: nextMessages,
    };

    this.draft = '';
  }

  handleClose(): void {
    this.closeTalentProfile();
    this.close.emit();
  }

  selectTalent(talent: RecruiterTalent): void {
    if (this.selectedTalentId === talent.id) return;
    this.selectedTalentId = talent.id;
    this.seenTalentIds.add(talent.id);
    this.draft = '';
  }

  openTalentProfile(talent: RecruiterTalent): void {
    this.selectTalent(talent);
    this.profileTalentId = talent.id;
    this.profileTab = 'dados';
  }

  closeTalentProfile(): void {
    this.profileTalentId = null;
    this.profileTab = 'dados';
  }

  setProfileTab(tab: 'dados' | 'stacks'): void {
    this.profileTab = tab;
  }

  isStackAdherent(talent: RecruiterTalent, stackName: string): boolean {
    return this.adherentStacksByTalent[talent.id]?.has(stackName) ?? false;
  }

  toggleStackAdherent(talent: RecruiterTalent, stackName: string): void {
    const current = this.adherentStacksByTalent[talent.id] ?? new Set<string>();
    const next = new Set(current);
    if (next.has(stackName)) {
      next.delete(stackName);
    } else {
      next.add(stackName);
    }
    this.adherentStacksByTalent = {
      ...this.adherentStacksByTalent,
      [talent.id]: next,
    };
  }

  isUnreadVisible(talent: RecruiterTalent): boolean {
    return (talent.unreadCount ?? 0) > 0 && !this.seenTalentIds.has(talent.id);
  }

  scrollTalentsNext(): void {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: 140, behavior: 'smooth' });
  }

  scrollTalentsPrev(): void {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: -140, behavior: 'smooth' });
  }

  scrollTalentsFirst(): void {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: 0, behavior: 'smooth' });
  }

  scrollTalentsLast(): void {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
  }

  canScrollTalentsPrev(): boolean {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return false;
    return el.scrollLeft > 2;
  }

  canScrollTalentsNext(): boolean {
    const el = this.talentRailScroller?.nativeElement;
    if (!el) return false;
    return el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
  }

  onTalentRailScroll(): void {
    // Intentionally empty: keeps Angular change detection in sync for nav disabled states.
  }

  downloadTalentProfilePdf(talent: RecruiterTalent): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') return;

    const lines = [
      'TAILWORKS - PERFIL DE CANDIDATO (FICTICIO)',
      '',
      `Nome: ${talent.name}`,
      `ID: ${talent.id}`,
      `Vaga: ${this.job?.title ?? '-'}`,
      `Local: ${this.job?.location ?? '-'}`,
      `Tipo: ${this.job?.type ?? '-'}`,
      `Nivel: ${this.talentRoleLabel}`,
      `Ultimo acesso: ${talent.lastSeen}`,
      `Mensagens nao lidas: ${talent.unreadCount ?? 0}`,
      `Aplicado em: ${talent.appliedAt ?? '-'}`,
      '',
      'Observacao: PDF ficticio para demonstracao do fluxo.',
      'No futuro, o curriculo sera gerado automaticamente pelo sistema.',
    ].join('\n');

    const blob = new Blob([lines], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = talent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    a.href = url;
    a.download = `${safeName || 'candidato'}-perfil.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  private buildMockTalentReply(talentName: string, recruiterText: string): string {
    const txt = recruiterText.toLowerCase();
    if (txt.includes('entrevista')) return 'Perfeito, consigo sim. Pode me enviar um horário?';
    if (txt.includes('curr') || txt.includes('cv')) return 'Ótimo. Fico no aguardo do material gerado pelo sistema.';
    if (txt.includes('remoto')) return 'Tenho disponibilidade para remoto/híbrido, sem problemas.';
    if (txt.includes('sal') || txt.includes('pretensão')) return 'Podemos alinhar a pretensão conforme escopo e benefícios.';
    return `Obrigado pelo retorno! (${talentName.split(' ')[0]})`;
  }

}
