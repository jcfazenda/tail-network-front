import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { RecruiterJob, RecruiterTalent, ChatMsg } from '../../recruiter/models/recruiter.models';

@Component({
  selector: 'chat-talent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-talent.component.html',
  styleUrls: ['./chat-talent.component.scss'],
})
export class ChatTalentComponent implements OnChanges {
  // =============================
  // INPUTS / OUTPUTS
  // =============================
  @Input() isOpen = false;
  @Input() job: RecruiterJob | null = null;
  @Input() talents: RecruiterTalent[] = [];

  @Output() close = new EventEmitter<void>();

  // =============================
  // STATE
  // =============================
  activeCandidate: RecruiterTalent | null = null;
  chatInput = '';

  // =============================
  // SYNC
  // =============================
  ngOnChanges(changes: SimpleChanges): void {
    const opened = changes['isOpen']?.currentValue === true;
    const jobChanged = !!changes['job'];
    const talentsChanged = !!changes['talents'];

    if (opened && (jobChanged || talentsChanged)) {
      this.activeCandidate = this.talents[0] ?? null;
      if (this.activeCandidate) this.activeCandidate.unreadCount = 0;
      this.chatInput = '';
    }
  }

  // =============================
  // UI ACTIONS
  // =============================
  onClose(): void {
    this.close.emit();
    this.activeCandidate = null;
    this.chatInput = '';
  }

  selectCandidate(c: RecruiterTalent): void {
    this.activeCandidate = c;
    c.unreadCount = 0;
  }

  get activeMessages(): ChatMsg[] {
    return this.activeCandidate?.messages ?? [];
  }

  sendMessage(): void {
    const text = (this.chatInput ?? '').trim();
    if (!text || !this.activeCandidate) return;

    const msg: ChatMsg = {
      id: `m-${Date.now()}`,
      from: 'me',
      text,
      time: this.nowHHMM(),
    };

    this.activeCandidate.messages = [...this.activeCandidate.messages, msg];
    this.activeCandidate.lastMessage = text;
    this.chatInput = '';

    setTimeout(() => {
      if (!this.activeCandidate) return;

      const reply: ChatMsg = {
        id: `m-${Date.now()}-r`,
        from: 'candidate',
        text: this.getAutoReply(text),
        time: this.nowHHMM(),
      };

      this.activeCandidate.messages = [...this.activeCandidate.messages, reply];
      this.activeCandidate.lastMessage = reply.text;
    }, 500);
  }

  private nowHHMM(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private getAutoReply(input: string): string {
    const t = input.toLowerCase();
    if (t.includes('remoto')) return 'Sim, remoto pode rolar dependendo do perfil.';
    if (t.includes('entrevista')) return 'Fechado. Pode ser amanhã no fim da tarde?';
    if (t.includes('salário') || t.includes('salario')) return 'Qual sua pretensão salarial pra eu alinhar aqui?';
    return 'Boa. Me manda mais detalhes do teu contexto?';
  }

  // =============================
  // TRACK BY
  // =============================
  trackByTalentId(_: number, t: RecruiterTalent): string {
    return t.id;
  }

  trackByMsgId(_: number, m: ChatMsg): string {
    return m.id;
  }
}