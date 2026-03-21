import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Params, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthFacade } from '../../facades/auth.facade';
import { JobsFacade } from '../../facades/jobs.facade';
import { SidebarVisibilityService } from './sidebar-visibility.service';
import { BrowserStorageService } from '../../storage/browser-storage.service';

type NavItem = { label: string; route: string; icon: string };
type CandidateTreeItem = {
  label: string;
  icon: string;
  route?: string;
  queryParams?: Params;
};
type CandidateTreeGroup = {
  label: string;
  items: CandidateTreeItem[];
};
type CandidateBasicProfile = {
  name?: string;
  city?: string;
  state?: string;
  location?: string;
};
type CandidateBasicDraft = {
  profile?: CandidateBasicProfile;
  photoPreviewUrl?: string;
};

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly overlayMode = input(false);
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly recruiterAvatarAsset = '/assets/avatars/avatar-default.svg';
  private readonly router = inject(Router);
  private readonly authService = inject(AuthFacade);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly browserStorage = inject(BrowserStorageService);
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
    { label: 'Sair', route: '/login', icon: 'logout' },
  ];

  private readonly candidateTreeGroupsValue: CandidateTreeGroup[] = [
    {
      label: 'Home',
      items: [
        { label: 'Página Principal', icon: 'home', route: '/usuario/ecossistema' },
        { label: 'Notícias', icon: 'newspaper' },
        { label: 'Timeline', icon: 'timeline' },
      ],
    },
    {
      label: 'Meus Dados',
      items: [
        { label: 'Dados Básicos', icon: 'badge', route: '/usuario/dados-cadastrais' },
        { label: 'Documentos', icon: 'description', route: '/usuario/documentos' },
        { label: 'Minhas Stacks', icon: 'deployed_code', route: '/usuario/stacks' },
        { label: 'Experiências', icon: 'business_center', route: '/usuario/experiencia' },
      ],
    },
    {
      label: 'Minha Rede',
      items: [
        { label: 'Candidaturas', icon: 'task_alt', route: '/usuario/minhas-candidaturas' },
        { label: 'Radar do Ecossistema', icon: 'radar', route: '/usuario/minhas-candidaturas', queryParams: { ecosystem: 'open' } },
      ],
    },
    {
      label: 'Conta',
      items: [
        { label: 'Sair', icon: 'logout', route: '/login' },
      ],
    },
  ];

  private readonly selectionItems: NavItem[] = [
    { label: 'Home', route: '/home', icon: 'home' },
  ];

  get items(): NavItem[] {
    if (this.isSelectionMode) {
      return this.selectionItems;
    }

    return this.recruiterItems;
  }

  get candidateTreeGroups(): CandidateTreeGroup[] {
    return this.candidateTreeGroupsValue;
  }

  get recruiterTreeGroups(): CandidateTreeGroup[] {
    const recruiter = this.jobsFacade.getCurrentRecruiterIdentity();
    const canManageDirectory = recruiter.isMaster;
    const canCreateRecruiter = recruiter.isMaster;

    return [
      {
        label: 'Recrutamento',
        items: [
          { label: 'Radar', icon: 'radar', route: '/radar' },
          { label: 'Novo Card', icon: 'add_box', route: '/vagas/cadastro' },
          { label: 'Minhas Vagas', icon: 'work', route: '/vagas' },
          { label: 'Talentos', icon: 'group', route: '/talentos' },
          { label: 'Propostas', icon: 'assignment', route: '/propostas' },
        ],
      },
      {
        label: 'Time',
        items: [
          { label: 'Chat do Time', icon: 'forum', route: '/recruiter/time' },
          ...(canManageDirectory ? [{ label: 'Recruiters', icon: 'badge', route: '/recruiter/panel' }] : []),
          ...(canCreateRecruiter ? [{ label: 'Novo Recruiter', icon: 'person_add', route: '/recruiter/cadastro' }] : []),
        ],
      },
      ...(canManageDirectory
        ? [{
            label: 'Empresas',
            items: [
              { label: 'Lista de Empresas', icon: 'apartment', route: '/empresa' },
              { label: 'Nova Empresa', icon: 'domain_add', route: '/empresa/cadastro' },
            ],
          } satisfies CandidateTreeGroup]
        : []),
      {
        label: 'Conta',
        items: [
          { label: 'Sair', icon: 'logout', route: '/login' },
        ],
      },
    ];
  }

  get sidebarTreeGroups(): CandidateTreeGroup[] {
    return this.isCandidateMode ? this.candidateTreeGroups : this.recruiterTreeGroups;
  }

  get profileName(): string {
    if (this.isSelectionMode) {
      return 'TailWorks';
    }

    return this.isCandidateMode ? this.candidateDisplayName : this.recruiterDisplayName;
  }

  get profileRole(): string {
    if (this.isSelectionMode) {
      return 'Escolha seu acesso';
    }

    return this.isCandidateMode ? 'Usuario' : this.recruiterDisplayMeta;
  }

  get footerMessage(): string {
    if (this.isSelectionMode) {
      return 'Entre como recruiter ou talento';
    }

    return this.isCandidateMode
      ? 'Seu perfil esta pronto para novas oportunidades'
      : 'Você tem 5 novas mensagens';
  }

  get isRecruiterMode(): boolean {
    return !this.isSelectionMode && !this.isCandidateMode;
  }

  get isProfileSidebarMode(): boolean {
    return this.isCandidateMode || this.isRecruiterMode;
  }

  get isSelectionMode(): boolean {
    const url = this.primaryPath;
    return url === '/home' || url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.primaryPath.startsWith('/usuario');
  }

  get candidateAvatarUrl(): string {
    const rawDraft = this.browserStorage.getItem(SidebarComponent.basicDraftStorageKey);
    if (!rawDraft) {
      return '';
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      return draft.photoPreviewUrl?.trim() || '';
    } catch {
      this.browserStorage.removeItem(SidebarComponent.basicDraftStorageKey);
      return '';
    }
  }

  get candidateDisplayName(): string {
    const draft = this.readCandidateDraft();
    return draft?.profile?.name?.trim() || 'Julio Fazenda';
  }

  get candidateDisplayLocation(): string {
    const draft = this.readCandidateDraft();
    const city = draft?.profile?.city?.trim();
    const state = draft?.profile?.state?.trim();
    const location = draft?.profile?.location?.trim();

    if (city && state) {
      return `${city} ${state} - Brasil`;
    }

    if (location) {
      return `${location} - Brasil`;
    }

    return 'Rio de Janeiro RJ - Brasil';
  }

  get candidateDisplayInitials(): string {
    const parts = this.candidateDisplayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'JF';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get recruiterAvatarUrl(): string {
    return SidebarComponent.recruiterAvatarAsset;
  }

  get recruiterDisplayName(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().name;
  }

  get recruiterDisplayMeta(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().role;
  }

  get recruiterDisplayInitials(): string {
    const parts = this.recruiterDisplayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'JF';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get sidebarAvatarUrl(): string {
    return this.isCandidateMode ? this.candidateAvatarUrl : this.recruiterAvatarUrl;
  }

  get sidebarDisplayName(): string {
    return this.isCandidateMode ? this.candidateDisplayName : this.recruiterDisplayName;
  }

  get sidebarDisplayMeta(): string {
    return this.isCandidateMode ? this.candidateDisplayLocation : this.recruiterDisplayMeta;
  }

  get sidebarDisplayInitials(): string {
    return this.isCandidateMode ? this.candidateDisplayInitials : this.recruiterDisplayInitials;
  }

  isCandidateTreeItemActive(item: CandidateTreeItem): boolean {
    if (!item.route) {
      return false;
    }

    const current = this.router.parseUrl(this.currentUrl());
    const currentPath = this.readPrimaryPath(this.currentUrl());
    const targetPath = item.route;

    if (currentPath !== targetPath) {
      return false;
    }

    const currentParams = current.queryParams;
    const targetParams = item.queryParams ?? {};

    if (!Object.keys(targetParams).length) {
      return !Object.keys(currentParams).length;
    }

    return Object.entries(targetParams).every(([key, value]) => `${currentParams[key] ?? ''}` === `${value}`);
  }

  isExactRoute(item: NavItem): boolean {
    return item.route !== '/vagas' && item.route !== '/usuario/dados-cadastrais';
  }

  handleTreeItemClick(item: CandidateTreeItem): void {
    if (item.icon !== 'logout') {
      return;
    }

    this.authService.logout();
  }

  handleFlatItemClick(item: NavItem): void {
    if (item.icon !== 'logout') {
      return;
    }

    this.authService.logout();
  }

  hideSidebar(): void {
    this.sidebarVisibilityService.hide();
  }

  private readPrimaryPath(url: string): string {
    const [path] = url.split('?');
    return path.split('#')[0];
  }

  private get primaryPath(): string {
    return this.readPrimaryPath(this.currentUrl());
  }

  private readCandidateDraft(): CandidateBasicDraft | null {
    const rawDraft = this.browserStorage.getItem(SidebarComponent.basicDraftStorageKey);
    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as CandidateBasicDraft;
    } catch {
      this.browserStorage.removeItem(SidebarComponent.basicDraftStorageKey);
      return null;
    }
  }
}
