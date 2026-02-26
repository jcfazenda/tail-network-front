import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ThemeService } from '../ui/theme.service';

@Component({
  selector: 'tw-recruit-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './recruit-layout.component.html',
  styleUrls: ['./recruit-layout.component.scss'],
})
export class RecruitLayoutComponent implements OnInit {
  theme = inject(ThemeService);

  isSidebarOpen = false;

  ngOnInit(): void {
    this.theme.init();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }
}
