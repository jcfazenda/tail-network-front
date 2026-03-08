import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

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

  private readonly recruiterItems: NavItem[] = [
    { label: 'Radar', route: '/radar', icon: 'radar' },
    { label: 'Minhas Vagas', route: '/vagas', icon: 'work' },
    { label: 'Talentos', route: '/talentos', icon: 'group' },
    { label: 'Propostas', route: '/propostas', icon: 'assignment' },
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
    return this.router.url === '/home' || this.router.url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.router.url.startsWith('/usuario');
  }

  isExactRoute(item: NavItem): boolean {
    return item.route !== '/vagas' && item.route !== '/usuario/dados-cadastrais';
  }
}
