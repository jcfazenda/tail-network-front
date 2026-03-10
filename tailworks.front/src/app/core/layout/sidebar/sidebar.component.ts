import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { EcosystemEntryService } from '../../../usuario/home/ecosystem-entry.service';

type NavItem = { label: string; route: string; icon: string };

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  private readonly recruiterItems: NavItem[] = [
    { label: 'Radar', route: '/radar', icon: 'radar' },
    { label: 'Minhas Vagas', route: '/vagas', icon: 'work' },
    { label: 'Talentos', route: '/talentos', icon: 'group' },
    { label: 'Propostas', route: '/propostas', icon: 'assignment' },
    { label: 'Sair', route: '/home', icon: 'logout' },
  ];

  private readonly candidateItems: NavItem[] = [
    { label: 'Home', route: '/usuario/ecossistema', icon: 'home' },
    { label: 'Dados Cadastrais', route: '/usuario/dados-cadastrais', icon: 'badge' },
    { label: 'Minhas Candidaturas', route: '/usuario/minhas-candidaturas', icon: 'task_alt' },
    { label: 'Sair', route: '/login', icon: 'logout' },
  ];

  private readonly selectionItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
  ];

  get items(): NavItem[] {
    if (this.isSelectionMode) {
      return this.selectionItems;
    }

    return this.isCandidateMode ? this.candidateItems : this.recruiterItems;
  }

  get profileName(): string {
    if (this.isSelectionMode) {
      return 'TailWorks';
    }

    return this.isCandidateMode ? 'Camila Ferreira' : 'Rafael Souza';
  }

  get profileRole(): string {
    if (this.isSelectionMode) {
      return 'Escolha seu acesso';
    }

    return this.isCandidateMode ? 'Usuario' : 'Talent Acquisition';
  }

  get footerMessage(): string {
    if (this.isSelectionMode) {
      return 'Entre como recruiter ou talento';
    }

    return this.isCandidateMode
      ? 'Seu perfil esta pronto para novas oportunidades'
      : 'Você tem 5 novas mensagens';
  }

  get isSelectionMode(): boolean {
    const url = this.currentUrl();
    return url === '/home' || url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.currentUrl().startsWith('/usuario');
  }

  isExactRoute(item: NavItem): boolean {
    return item.route !== '/vagas' && item.route !== '/usuario/dados-cadastrais';
  }

  protected openEcosystem(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode(this.isCandidateMode ? 'talent' : 'recruiter');
    void this.router.navigateByUrl('/usuario/ecossistema');
  }
}
