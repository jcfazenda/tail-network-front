import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

type NavItem = {
  label: string;
  icon: string;
  route: string;
  badge?: string;
};

@Component({
  selector: 'tw-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  readonly items: NavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', route: '/recruiter/dashboard' },
    { label: 'Vagas', icon: 'work', route: '/recruiter/vagas' },
    { label: 'Radar', icon: 'radar', route: '/recruiter/radar' },
    { label: 'Mensagens', icon: 'chat', route: '/recruiter/mensagens', badge: '2' },
    { label: 'Equipe', icon: 'group', route: '/recruiter/equipe' },
  ];
}
