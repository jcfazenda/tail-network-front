import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { StartModalService } from '../ui/start-role-modal/start-modal.service';
import { StartRoleModalComponent } from '../ui/start-role-modal/start-role-modal.component';
import { ThemeService } from '../../core/ui/theme.service';

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

  private router = inject(Router);
  public startModal = inject(StartModalService);
  public theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.init(); // 🔥 1 vez e acabou (aplica classe no body + localStorage)
  }

  toggleTheme(): void {
    this.theme.toggle(); // 🔥 alterna, persiste e atualiza CSS global
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
    if (ev.key === 'Escape') this.startModal.close();
  }
}