import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, NgZone, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatJob } from '../domain/chat.models';

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
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
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

    window.setTimeout(() => {
      this.ngZone.run(() => {
        const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        this.messages = [
          ...this.messages,
          {
            sender: 'candidate',
            text: 'Perfeito, recebi sua mensagem. Posso seguir por aqui.',
            time: replyTime,
          },
        ];
        this.cdr.detectChanges();
      });
    }, 450);
  }
}
