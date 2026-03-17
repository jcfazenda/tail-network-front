import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { SidebarVisibilityService } from '../sidebar/sidebar-visibility.service';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly router = inject(Router);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  get isHomeEntry(): boolean {
    const url = this.primaryPath;
    return url === '/home' || url === '/login';
  }

  get isCandidateArea(): boolean {
    return this.primaryPath.startsWith('/usuario');
  }

  get isCandidateEcosystem(): boolean {
    return this.primaryPath === '/usuario/ecossistema';
  }

  get isTemplateEcosystem(): boolean {
    return this.primaryPath === '/home/ecossistema';
  }

  get hasSidebar(): boolean {
    return !this.isHomeEntry && !this.isCandidateEcosystem;
  }

  get isSidebarOpen(): boolean {
    return this.sidebarVisibilityService.isOpen();
  }

  get isCompactSidebarMode(): boolean {
    return this.sidebarVisibilityService.isCompactViewport();
  }

  get shouldReserveSidebarSpace(): boolean {
    if (this.isTemplateEcosystem) {
      return false;
    }

    return this.hasSidebar && this.sidebarVisibilityService.shouldReserveLayoutSpace();
  }

  get isSidebarOverlayVisible(): boolean {
    if (this.isTemplateEcosystem) {
      return this.hasSidebar && this.isSidebarOpen;
    }

    return this.hasSidebar && this.isSidebarOpen && this.isCompactSidebarMode;
  }

  hideSidebar(): void {
    this.sidebarVisibilityService.hide();
  }

  private get primaryPath(): string {
    return this.currentUrl().split('?')[0]?.split('#')[0] || this.currentUrl();
  }
}
