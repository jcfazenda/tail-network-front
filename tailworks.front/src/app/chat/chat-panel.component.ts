import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface ChatCandidate {
  name: string;
  role: string;
  match: number;
  minutesAgo: number;
  status: 'online' | 'offline';
  avatar: string;
}

export interface ChatJob {
  title: string;
  company: string;
  location: string;
  candidates: ChatCandidate[];
}

@Component({
  standalone: true,
  selector: 'app-chat-panel',
  imports: [CommonModule],
  templateUrl: './chat-panel.component.html',
  styleUrls: ['./chat-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatPanelComponent {
  @Input() job!: ChatJob;
  @Output() close = new EventEmitter<void>();
}
