import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

interface SidebarMenuItem {
  readonly id: number;
  readonly label: string;
  readonly icon: string;
  readonly active?: boolean;
  readonly notify?: boolean;
}

interface CandidateSkill {
  readonly label: string;
  readonly score: number;
}

interface ContactItem {
  readonly id: number;
  readonly name: string;
  readonly avatar: string;
  readonly status: 'online' | 'offline' | 'busy' | 'away';
  readonly statusLabel: string;
  readonly role: string;
  readonly company: string;
  readonly pipelineStatus: string;
  readonly location: string;
  readonly availability: string;
  readonly skills: CandidateSkill[];
}

interface ChatMessage {
  readonly id: number;
  readonly author: 'other' | 'me';
  readonly content: string;
  readonly seenLabel: string;
}

@Component({
  standalone: true,
  selector: 'app-chat-candidatos-page',
  imports: [CommonModule],
  templateUrl: './chat-candidatos.page.html',
  styleUrls: ['./chat-candidatos.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatCandidatosPage {
  readonly profile = {
    name: 'Adrain Nader',
    email: 'adrain.nader@yahoo.com',
    avatar: 'https://i.pravatar.cc/240?img=12',
    unreadCount: 2,
  };

  readonly activeChat = {
    name: 'Alberta Reyes',
    status: 'Online',
    avatar: 'https://i.pravatar.cc/160?img=32',
  };

  readonly menuItems: SidebarMenuItem[] = [
    { id: 1, label: 'Dashboard', icon: 'grid_view' },
    { id: 2, label: 'Messenger', icon: 'chat', active: true, notify: true },
    { id: 3, label: 'Invoice', icon: 'description' },
    { id: 4, label: 'Files', icon: 'cloud' },
    { id: 5, label: 'Events', icon: 'home' },
    { id: 6, label: 'Teams', icon: 'groups' },
    { id: 7, label: 'Calendars', icon: 'calendar_month' },
    { id: 8, label: 'Settings', icon: 'build' },
  ];

  readonly contacts: ContactItem[] = [
    {
      id: 1,
      name: 'Mariana Gama',
      avatar: 'https://i.pravatar.cc/160?img=47',
      status: 'online',
      statusLabel: 'Online',
      role: 'Software Engineer',
      company: 'Accenture',
      pipelineStatus: 'Radar',
      location: 'Curitiba - PR',
      availability: 'Disponibilidade imediata',
      skills: [
        { label: '.NET / C#', score: 99 },
        { label: 'Docker', score: 100 },
      ],
    },
    {
      id: 2,
      name: 'Alberta Reyes',
      avatar: 'https://i.pravatar.cc/160?img=32',
      status: 'online',
      statusLabel: 'Online',
      role: 'Front-end Engineer',
      company: 'Nubank',
      pipelineStatus: 'Em avaliação',
      location: 'São Paulo - SP',
      availability: 'Disponível em 15 dias',
      skills: [
        { label: 'Angular', score: 96 },
        { label: 'Design System', score: 91 },
      ],
    },
    {
      id: 3,
      name: 'Ivan Gibbs',
      avatar: 'https://i.pravatar.cc/160?img=12',
      status: 'online',
      statusLabel: 'Online',
      role: 'Back-end Engineer',
      company: 'Stone',
      pipelineStatus: 'Entrevista técnica',
      location: 'Belo Horizonte - MG',
      availability: 'Disponível em 30 dias',
      skills: [
        { label: '.NET', score: 94 },
        { label: 'Azure', score: 88 },
      ],
    },
    {
      id: 4,
      name: 'Mabelle Jones',
      avatar: 'https://i.pravatar.cc/160?img=5',
      status: 'offline',
      statusLabel: 'Offline',
      role: 'Product Designer',
      company: 'iFood',
      pipelineStatus: 'Case enviado',
      location: 'Rio de Janeiro - RJ',
      availability: 'Disponibilidade imediata',
      skills: [
        { label: 'UX', score: 97 },
        { label: 'Research', score: 89 },
      ],
    },
  ];

  readonly highlightedCandidate: ContactItem = this.contacts[0];

  readonly messages: ChatMessage[] = [
    {
      id: 1,
      author: 'other',
      content:
        'Welcome to Weavesocial! Whether you’re opening an online store or are interested in using Weavesocial as your platform, you can find out more information about your options here.',
      seenLabel: 'Message seen 1:13pm',
    },
    {
      id: 2,
      author: 'me',
      content:
        'After you register for a free trial, follow the initial setup guide to start using Weavesocial. The initial setup guide features step-by-step tutorials for the main tasks you need to complete before you start selling.',
      seenLabel: 'Message seen 1:04pm',
    },
    {
      id: 3,
      author: 'other',
      content:
        'We work to make sure your business is available when your customers want to shop.',
      seenLabel: 'Message seen 12:28pm',
    },
    {
      id: 4,
      author: 'me',
      content: 'Sweet! Where do I sign up! Take my money!',
      seenLabel: 'Message seen 11:00am',
    },
  ];

  trackByMenuItem(_: number, item: SidebarMenuItem): number {
    return item.id;
  }

  trackByContact(_: number, item: ContactItem): number {
    return item.id;
  }

  trackByMessage(_: number, item: ChatMessage): number {
    return item.id;
  }
}