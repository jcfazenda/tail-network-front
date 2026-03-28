import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Type, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { SidebarVisibilityService } from '../sidebar/sidebar-visibility.service';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [CommonModule, RouterOutlet],
  templateUrl: './app-shell.component.html',
  styleUrls: ['./app-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  readonly sidebarComponent = signal<Type<unknown> | null>(null);
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

  constructor() {
    effect(() => {
      if (this.hasSidebar && (!this.isCompactSidebarMode || this.isSidebarOpen) && !this.sidebarComponent()) {
        void this.loadSidebarComponent();
      }
    });
  }

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

  get isCandidateBasicDataPage(): boolean {
    return this.primaryPath === '/usuario/dados-cadastrais';
  }

  get isTemplateEcosystem(): boolean {
    return this.primaryPath === '/home/ecossistema';
  }

  get isJobCreatePage(): boolean {
    return this.primaryPath === '/vagas/cadastro';
  }

  get isCoreAlgorithmPage(): boolean {
    return this.primaryPath === '/recruiter/core-algoritimo';
  }

  get hasSidebar(): boolean {
    if (this.isCandidateEcosystem) {
      return this.isCompactSidebarMode;
    }

    return !this.isHomeEntry;
  }

  get isSidebarOpen(): boolean {
    return this.sidebarVisibilityService.isOpen();
  }

  get isCompactSidebarMode(): boolean {
    return this.sidebarVisibilityService.isCompactViewport();
  }

  get shouldReserveSidebarSpace(): boolean {
    return this.hasSidebar && this.sidebarVisibilityService.shouldReserveLayoutSpace();
  }

  get isSidebarOverlayVisible(): boolean {
    return this.hasSidebar && this.isSidebarOpen && this.isCompactSidebarMode;
  }

  get shouldMainSpanFull(): boolean {
    if (this.isCandidateEcosystem) {
      return true;
    }

    if (!this.hasSidebar) {
      return true;
    }

    return this.isCompactSidebarMode;
  }

  hideSidebar(): void {
    this.sidebarVisibilityService.hide();
  }

  get sidebarComponentInputs(): { overlayMode: boolean; collapsedMode: boolean } {
    return {
      overlayMode: this.isCompactSidebarMode,
      collapsedMode: !this.isCompactSidebarMode && !this.isSidebarOpen,
    };
  }

  private get primaryPath(): string {
    return this.currentUrl().split('?')[0]?.split('#')[0] || this.currentUrl();
  }
  private async loadSidebarComponent(): Promise<void> {
    const { SidebarComponent } = await import('../sidebar/sidebar.component');
    this.sidebarComponent.set(SidebarComponent);
  }
}
