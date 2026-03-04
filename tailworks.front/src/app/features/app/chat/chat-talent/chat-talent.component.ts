import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatMsg } from '../../recruiter/models/recruiter.models';

@Component({
  selector: 'chat-talent',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-talent.component.html',
  styleUrls: ['./chat-talent.component.scss'],
})
export class ChatTalentComponent {
  @Input() isOpen = false;
  @Input() job: { id: string; title: string; company: string; location: string; type: string; recruiterName?: string } | null = null;
  @Input() messages: ChatMsg[] = [];
  @Input() recruiterAvatarUrl = 'assets/recuiter-job.png';
  @Input() candidateAvatarUrl = 'assets/avatar-default.png';

  draft = '';

  @Output() send = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  trackMsg(_: number, m: ChatMsg): string {
    return m.id || `${m.from}-${m.text}-${m.time}`;
  }
}
