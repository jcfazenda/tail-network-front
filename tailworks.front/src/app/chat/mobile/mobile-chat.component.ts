import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatJob } from '../components/tail-chat-panel/tail-chat-panel.component';

type MobileChatMessage = {
  sender: 'candidate' | 'recruiter';
  text: string;
  time: string;
};

@Component({
  standalone: true,
  selector: 'app-mobile-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './mobile-chat.component.html',
  styleUrl: './mobile-chat.component.scss',
})
export class MobileChatComponent implements OnChanges {
  @Input({ required: true }) job!: ChatJob;
  @Input() startIndex = 0;

  messageText = '';
  messages: MobileChatMessage[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['job'] || changes['startIndex']) {
      this.messages = [
        { sender: 'candidate', text: 'Olá, tenho interesse nessa oportunidade.', time: '16:04' },
        { sender: 'recruiter', text: 'Perfeito. Vamos conversar sobre sua experiência?', time: '16:06' },
      ];
    }
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text) {
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.messages = [...this.messages, { sender: 'recruiter', text, time }];
    this.messageText = '';
  }
}
