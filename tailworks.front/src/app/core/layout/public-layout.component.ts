import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { StartModalService } from '../ui/start-role-modal/start-modal.service';
import { StartRoleModalComponent } from '../ui/start-role-modal/start-role-modal.component';
import { ThemeMode, ThemeService } from '../../core/ui/theme.service';

@Component({
  selector: 'tw-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    StartRoleModalComponent,
  ],
  templateUrl: './public-layout.component.html',
  styleUrls: ['./public-layout.component.scss'],
})
export class PublicLayoutComponent implements OnInit {
  private readonly darkToneStorageKey = 'tw-dark-tone';
  isThemeMenuOpen = false;
  darkTone: 'default' | 'graphite' = 'default';

  private router = inject(Router);
  public startModal = inject(StartModalService);
  public theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.init(); // 🔥 1 vez e acabou (aplica classe no body + localStorage)
    this.loadDarkTone();
    this.applyDarkToneClass();
  }

  toggleTheme(): void {
    this.theme.toggle(); // 🔥 alterna, persiste e atualiza CSS global
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

  openRoleModal(): void {
    console.log('ABRINDO MODAL', new Date());
    this.startModal.open();
  }

  closeRoleModal(): void {
    this.startModal.close();
  }

  goRole(role: 'recruiter' | 'talent'): void {
    this.startModal.close();
    this.router.navigate(['/choose'], { queryParams: { role } });
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(ev: KeyboardEvent): void {
    if (ev.key === 'Escape') {
      this.startModal.close();
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
}
