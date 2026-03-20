import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { RecruiterRecord } from '../recruiter.models';

type TeamChatSender = 'me' | 'teammate' | 'system';

type TeamChatMessage = {
  id: string;
  sender: TeamChatSender;
  text: string;
  time: string;
};

@Component({
  standalone: true,
  selector: 'app-recruiter-time-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recruiter-time.page.html',
  styleUrls: ['./recruiter-time.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruiterTimePage implements OnDestroy {
  readonly defaultRecruiterAvatarUrl = '/assets/avatars/avatar-default.svg';
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private readonly responseTimeouts = new Set<number>();

  searchTerm = '';
  messageText = '';
  selectedRecruiterId = '';
  private readonly threadMap: Record<string, TeamChatMessage[]> = {};

  constructor() {
    this.ensureSelection();
    this.subscriptions.add(
      this.recruitersFacade.changes$.subscribe(() => {
        this.ensureSelection();
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.responseTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    this.responseTimeouts.clear();
  }

  get currentRecruiter(): RecruiterRecord {
    return this.recruitersFacade.getCurrentRecruiter();
  }

  get companyRecruiters(): RecruiterRecord[] {
    return this.recruitersFacade.listRecruiters(this.currentRecruiter.company);
  }

  get filteredRecruiters(): RecruiterRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');
    if (!normalizedSearch) {
      return this.companyRecruiters;
    }

    return this.companyRecruiters.filter((recruiter) => {
      return [
        recruiter.name,
        recruiter.role,
        recruiter.email,
        recruiter.areas.join(' '),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });
  }

  get selectedRecruiter(): RecruiterRecord | undefined {
    return this.companyRecruiters.find((recruiter) => recruiter.id === this.selectedRecruiterId)
      ?? this.companyRecruiters[0];
  }

  get selectedMessages(): TeamChatMessage[] {
    const recruiter = this.selectedRecruiter;
    if (!recruiter) {
      return [];
    }

    return this.ensureThread(recruiter);
  }

  get totalRecruiters(): number {
    return this.companyRecruiters.length;
  }

  get activeRecruiters(): number {
    return this.companyRecruiters.filter((recruiter) => recruiter.active).length;
  }

  get managedAreasLabel(): string {
    const areas = new Set(
      this.companyRecruiters.flatMap((recruiter) => recruiter.areas),
    );

    return Array.from(areas).slice(0, 3).join(' · ') || 'Operação geral';
  }

  get emptyTeamHint(): string {
    return this.searchTerm.trim()
      ? 'Tente buscar por outro nome, área ou e-mail para localizar alguém do time.'
      : 'Assim que novos recruiters forem adicionados a esta empresa, eles aparecem aqui automaticamente.';
  }

  get hasSearchTerm(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  get canSendMessage(): boolean {
    return !!this.selectedRecruiter && this.messageText.trim().length > 0;
  }

  selectRecruiter(recruiter: RecruiterRecord): void {
    this.selectedRecruiterId = recruiter.id;
    this.ensureThread(recruiter);
    this.cdr.markForCheck();
  }

  sendMessage(): void {
    const recruiter = this.selectedRecruiter;
    const text = this.messageText.trim();

    if (!recruiter || !text) {
      return;
    }

    this.pushMessage(recruiter.id, {
      id: this.createMessageId('me'),
      sender: 'me',
      text,
      time: this.timeLabel(),
    });
    this.messageText = '';
    this.cdr.markForCheck();

    if (recruiter.id === this.currentRecruiter.id) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      this.pushMessage(recruiter.id, {
        id: this.createMessageId('reply'),
        sender: 'teammate',
        text: this.replyTemplate(recruiter),
        time: this.timeLabel(),
      });
      this.responseTimeouts.delete(timeoutId);
      this.cdr.markForCheck();
    }, 420);

    this.responseTimeouts.add(timeoutId);
  }

  resetSearch(): void {
    this.searchTerm = '';
    this.ensureSelection();
    this.cdr.markForCheck();
  }

  isCurrentRecruiter(recruiter: RecruiterRecord): boolean {
    return recruiter.id === this.currentRecruiter.id;
  }

  areaSummary(recruiter: RecruiterRecord): string {
    return recruiter.areas.slice(0, 2).join(' · ') || 'Recrutamento geral';
  }

  viewScopeLabel(recruiter: RecruiterRecord): string {
    switch (recruiter.viewScope) {
      case 'company':
        return 'Ve toda a empresa';
        
      case 'following':
        return 'Acompanha vagas compartilhadas';
      default:
        return 'Opera vagas próprias';
    }
  }

  messageAuthorLabel(message: TeamChatMessage): string {
    if (message.sender === 'me') {
      return 'Você';
    }

    if (message.sender === 'system') {
      return 'Sistema';
    }

    return this.selectedRecruiter?.name || 'Time';
  }

  trackRecruiter(_index: number, recruiter: RecruiterRecord): string {
    return recruiter.id;
  }

  trackMessage(_index: number, message: TeamChatMessage): string {
    return message.id;
  }

  private ensureSelection(): void {
    if (!this.companyRecruiters.length) {
      this.selectedRecruiterId = '';
      return;
    }

    const selectedExists = this.companyRecruiters.some((recruiter) => recruiter.id === this.selectedRecruiterId);
    if (selectedExists) {
      const selectedRecruiter = this.selectedRecruiter;
      if (selectedRecruiter) {
        this.ensureThread(selectedRecruiter);
      }
      return;
    }

    const prioritizedRecruiter = this.companyRecruiters.find((recruiter) => recruiter.id !== this.currentRecruiter.id)
      ?? this.companyRecruiters[0];
    this.selectedRecruiterId = prioritizedRecruiter.id;
    this.ensureThread(prioritizedRecruiter);
  }

  private ensureThread(recruiter: RecruiterRecord): TeamChatMessage[] {
    const existingThread = this.threadMap[recruiter.id];
    if (existingThread) {
      return existingThread;
    }

    const seededThread = this.seedThread(recruiter);
    this.threadMap[recruiter.id] = seededThread;
    return seededThread;
  }

  private seedThread(recruiter: RecruiterRecord): TeamChatMessage[] {
    const recruiterArea = recruiter.areas[0] || 'recrutamento';
    const company = recruiter.company;
    const isCurrentUser = recruiter.id === this.currentRecruiter.id;

    return [
      {
        id: this.createMessageId('system'),
        sender: 'system',
        text: `Canal interno do time ${company}. Use este espaço para alinhar vagas, radar e andamento do processo.`,
        time: '09:00',
      },
      {
        id: this.createMessageId('seed'),
        sender: isCurrentUser ? 'me' : 'teammate',
        text: isCurrentUser
          ? 'Canal aberto. Este espaço pode servir como bloco rápido para combinados internos.'
          : `Estou cobrindo a frente de ${recruiterArea.toLocaleLowerCase('pt-BR')} hoje. Se surgir algo do radar, me chama por aqui.`,
        time: '09:12',
      },
    ];
  }

  private pushMessage(recruiterId: string, message: TeamChatMessage): void {
    const currentThread = this.threadMap[recruiterId] ?? [];
    this.threadMap[recruiterId] = [...currentThread, message];
  }

  private replyTemplate(recruiter: RecruiterRecord): string {
    const area = recruiter.areas[0]?.toLocaleLowerCase('pt-BR') || 'recrutamento';
    return `Perfeito. Vi sua mensagem e sigo com a frente de ${area}.`;
  }

  private createMessageId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private timeLabel(): string {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
