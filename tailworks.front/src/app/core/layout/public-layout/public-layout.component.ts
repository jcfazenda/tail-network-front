import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { ThemeService } from '../../ui/theme.service';
import { SidebarService } from '../services/sidebar.service';

@Component({
  selector: 'tw-public-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './public-layout.component.html',
  styleUrls: ['./public-layout.component.scss'],
})
export class PublicLayoutComponent implements OnInit {
  private readonly darkToneStorageKey = 'tw-dark-tone';
  isThemeMenuOpen = false;
  darkTone: 'default' | 'graphite' = 'default';
  private readonly hiddenRoutes = ['/home', '/login'];

  public auth = inject(AuthService);
  public theme = inject(ThemeService);
  public sidebar = inject(SidebarService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.theme.init();
    this.loadDarkTone();
    this.applyDarkToneClass();
    this.handleRoute(this.router.url);
    this.router.events.subscribe(ev => {
      if (ev instanceof NavigationEnd) {
        this.handleRoute(ev.urlAfterRedirects || ev.url);
      }
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
    this.applyDarkToneClass();
  }

  toggleThemeMenu(): void {
    this.isThemeMenuOpen = !this.isThemeMenuOpen;
  }

  closeThemeMenu(): void {
    this.isThemeMenuOpen = false;
  }

  setThemeOption(option: 'light' | 'dark' | 'graphite'): void {
    if (option === 'light') {
      this.theme.set('light');
      this.applyDarkToneClass();
      this.closeThemeMenu();
      return;
    }

    if (option === 'dark') {
      this.darkTone = 'default';
      this.theme.set('dark');
      this.persistDarkTone();
      this.applyDarkToneClass();
      this.closeThemeMenu();
      return;
    }

    this.darkTone = 'graphite';
    this.theme.set('dark');
    this.persistDarkTone();
    this.applyDarkToneClass();
    this.closeThemeMenu();
  }

  isThemeOptionActive(option: 'light' | 'dark' | 'graphite'): boolean {
    if (option === 'light') return this.theme.mode === 'light';
    if (option === 'dark') return this.theme.mode === 'dark' && this.darkTone === 'default';
    return this.theme.mode === 'dark' && this.darkTone === 'graphite';
  }

  showFooter(): boolean {
    return !this.router.url.startsWith('/recruiter');
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.closeThemeMenu();
    }
  }

  private loadDarkTone(): void {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem(this.darkToneStorageKey);
    if (saved === 'default' || saved === 'graphite') {
      this.darkTone = saved;
    }
  }

  private persistDarkTone(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.darkToneStorageKey, this.darkTone);
  }

  private applyDarkToneClass(): void {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('theme-graphite');
    if (this.theme.mode === 'dark' && this.darkTone === 'graphite') {
      document.body.classList.add('theme-graphite');
    }
  }

  private handleRoute(url: string): void {
    const path = url.split('?')[0];
    const shouldHide = this.hiddenRoutes.some(r => path === r || path.startsWith(`${r}/`));
    if (shouldHide) {
      this.sidebar.forceHide();
    } else {
      this.sidebar.releaseHide();
      this.sidebar.show();
    }
  }
}
