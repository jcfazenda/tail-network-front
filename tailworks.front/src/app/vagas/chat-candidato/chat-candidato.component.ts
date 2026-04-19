import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ChatBubble = {
  id: string;
  author: 'recruiter' | 'candidate';
  text: string;
  time: string;
};

@Component({
  standalone: true,
  selector: 'app-chat-candidato',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-candidato.component.html',
  styleUrls: ['./chat-candidato.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCandidatoComponent {
  @Input() candidateName = 'Candidato';
  @Input() candidateLocation = 'Brasil';
  @Input() candidateAvatarUrl = 'assets/avatars/john-doe.png';
  @Input() jobTitle = 'Vaga em aberto';
  @Input() companyName = 'Empresa';

  draftMessage = '';

  messages: ChatBubble[] = [
    {
      id: '1',
      author: 'candidate',
      text: 'Oi! Vi a vaga e tenho interesse. Posso tirar uma dúvida sobre o stack principal da posição?',
      time: '09:14',
    },
    {
      id: '2',
      author: 'recruiter',
      text: 'Claro. A prioridade agora está em .NET e Angular, mas queremos entender profundidade real e contexto de projeto.',
      time: '09:18',
    },
    {
      id: '3',
      author: 'candidate',
      text: 'Perfeito. Tenho experiência forte com APIs em .NET e projetos SPA com Angular em ambiente corporativo.',
      time: '09:22',
    },
  ];

  sendMessage(): void {
    const text = this.draftMessage.trim();
    if (!text) {
      return;
    }

    this.messages = [
      ...this.messages,
      {
        id: `${Date.now()}`,
        author: 'recruiter',
        text,
        time: 'agora',
      },
    ];
    this.draftMessage = '';
  }
}
