import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

interface SidebarMenuItem {
  readonly id: number;
  readonly label: string;
  readonly icon: string;
  readonly active?: boolean;
  readonly notify?: boolean;
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
    avatar: 'https://i.pravatar.cc/220?img=12',
    unreadCount: 2,
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

  trackByMenuItem(_: number, item: SidebarMenuItem): number {
    return item.id;
  }
}