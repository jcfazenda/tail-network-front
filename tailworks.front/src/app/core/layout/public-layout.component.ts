import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { StartModalService } from '../ui/start-modal.service'; 
import { StartRoleModalComponent } from '../ui/start-role-modal.component';

@Component({
  selector: 'tw-public-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    StartRoleModalComponent, // <-- AQUI
  ],
  templateUrl: './public-layout.component.html',
  styleUrls: ['./public-layout.component.scss'],
})
export class PublicLayoutComponent {
  private router = inject(Router);
  public startModal = inject(StartModalService);

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