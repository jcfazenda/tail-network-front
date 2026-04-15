import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Params, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TalentNotification } from '../../../usuario/talent-notification.service';
import { CandidateStage, MockJobRecord } from '../../../vagas/data/vagas.models';
import { AuthFacade } from '../../facades/auth.facade';
import { JobsFacade } from '../../facades/jobs.facade';
import { TalentNotificationsFacade } from '../../facades/talent-notifications.facade';
import { SidebarVisibilityService } from './sidebar-visibility.service';
import { BrowserStorageService } from '../../storage/browser-storage.service';
import { EcosystemJobFiltersService } from '../ecosystem-job-filters.service';
import { EcosystemFilterModalService } from '../ecosystem-filter-modal.service';
import { RecruitersFacade } from '../../facades/recruiters.facade';
import { CompaniesFacade } from '../../facades/companies.facade';

type NavItem = { label: string; route: string; icon: string };

type CandidateTreeItem = {
  label: string;
  icon: string;
  route?: string;
  queryParams?: Params;
  badge?: number | string | null;
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
  photoFileName?: string;
};

type ThemeMode = 'light' | 'dark';

type NotificationConfettiPiece = {
  left: string;
  top: string;
  delay: string;
  duration: string;
  size: string;
  rotate: string;
  color: string;
  dx: string;
  dy: string;
};

@Component({
  standalone: true,
  selector: 'app-sidebar',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly overlayMode = input(false);
  readonly collapsedMode = input(false);

  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly photoUpdatedEventName = 'tailworks:candidate-photo-updated';
  private static readonly themeStorageKey = 'tailworks:theme-mode:v1';

  readonly acceptedPhotoMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly maxPhotoSizeBytes = 5 * 1024 * 1024;

  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthFacade);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly talentNotificationsFacade = inject(TalentNotificationsFacade);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly ecosystemJobFiltersService = inject(EcosystemJobFiltersService);
  private readonly ecosystemFilterModalService = inject(EcosystemFilterModalService);
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly companiesFacade = inject(CompaniesFacade);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  activeThemeMode: ThemeMode = 'light';

  filterCompany = '';
  filterState = '';
  filterStack = '';
  filterCode = '';

  readonly isFilterPopupOpen = this.ecosystemFilterModalService.isOpen;

  private notificationModal: TalentNotification | null = null;
  private notificationsOpen = false;
  private confettiPieces: NotificationConfettiPiece[] = [];
  private footerMenuOpen = false;

  private readonly recruiterItems: NavItem[] = [
    { label: 'Minhas Vagas', route: '/home/ecossistema', icon: 'work' },
  ];

  private readonly candidateTreeGroupsValue: CandidateTreeGroup[] = [
    {
      label: 'Radar',
      items: [
        { label: 'Vagas do Ecossistema', icon: 'radar', route: '/usuario/ecossistema' },
        { label: 'Minhas Candidaturas', icon: 'task_alt', route: '/usuario/minhas-candidaturas' },
      ],
    },
    {
      label: 'Meu Perfil',
      items: [
        { label: 'Dados Básicos', icon: 'badge', route: '/usuario/dados-cadastrais' },
        { label: 'Documentos', icon: 'description', route: '/usuario/documentos' },
        { label: 'Minhas Stacks', icon: 'deployed_code', route: '/usuario/stacks' },
        { label: 'Experiências', icon: 'business_center', route: '/usuario/experiencia' },
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

  constructor() {
    this.restoreTheme();
  }

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
    label: '',
    items: [
      { label: 'Ecossistema', icon: 'work', route: '/home/ecossistema', badge: this.recruiterJobsCount },
      ...(canManageDirectory ? [{ label: 'Empresas e Vagas', icon: 'apartment', route: '/empresa', badge: this.companiesCount }] : []),
      ...(canManageDirectory ? [{ label: 'Recrutadores', icon: 'badge', route: '/recruiter/panel', badge: this.recruitersCount }] : []),
      
    ],
  },
  {
    label: '',
    items: [
      { label: 'Treinamento do Algorítimo', icon: 'psychology', route: '/recruiter/core-algoritimo' },
    ],
  },
];
  }

  get recruiterJobsCount(): number {
    return this.jobsFacade.getJobs()
      .filter((job) => job.status === 'ativas')
      .filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job))
      .length;
  }

  get recruitersCount(): number {
    const recruiter = this.jobsFacade.getCurrentRecruiterIdentity();
    return this.recruitersFacade.listRecruiters(recruiter.company).length;
  }

  get companiesCount(): number {
    return this.companiesFacade.listCompanies(true).length;
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

  get isDarkTheme(): boolean {
    return this.activeThemeMode === 'dark';
  }

  get isCollapsed(): boolean {
    return this.collapsedMode() && !this.overlayMode();
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
    const sessionName = this.authService.getSession()?.name?.trim();
    return draft?.profile?.name?.trim() || sessionName || 'Talento';
  }

  get candidateDisplayLocation(): string {
    const draft = this.readCandidateDraft();
    const sessionLocation = this.authService.getSession()?.location?.trim();
    const city = draft?.profile?.city?.trim();
    const state = draft?.profile?.state?.trim();
    const location = draft?.profile?.location?.trim();

    if (city && state) {
      return `${city} ${state} - Brasil`;
    }

    if (location) {
      return `${location} - Brasil`;
    }

    if (sessionLocation) {
      return `${sessionLocation} - Brasil`;
    }

    return 'Brasil';
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
    return '';
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

  // ===== Footer profile =====

  get footerAvatarUrl(): string {
    return this.sidebarAvatarUrl;
  }

  get footerDisplayName(): string {
    return this.sidebarDisplayName;
  }

  get footerDisplayMeta(): string {
    return this.isCandidateMode ? 'Premium version' : this.sidebarDisplayMeta;
  }

  get footerDisplayInitials(): string {
    return this.sidebarDisplayInitials;
  }

  get isFooterMenuOpen(): boolean {
    return this.footerMenuOpen;
  }

  get shouldShowFooterProfile(): boolean {
    return this.isProfileSidebarMode && !this.isCollapsed;
  }

  get isTemplateLanding(): boolean {
    return this.primaryPath === '/home/ecossistema';
  }

  get isCandidateEcosystem(): boolean {
    return this.primaryPath === '/usuario/ecossistema';
  }

  get isAnyEcosystem(): boolean {
    return this.primaryPath === '/home/ecossistema' || this.primaryPath === '/usuario/ecossistema';
  }

  get hasSavedEcosystemFilters(): boolean {
    const filters = this.ecosystemJobFiltersService.filters();
    return !!(filters.code || filters.company || filters.state || filters.stack);
  }

  get ecosystemCompanies(): string[] {
    return this.readEcosystemJobs()
      .map((job) => job.company.trim())
      .filter(Boolean)
      .filter((company, index, list) => list.indexOf(company) === index)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }

  get ecosystemStates(): string[] {
    return this.readEcosystemJobs()
      .map((job) => job.location.split('-').pop()?.trim() ?? '')
      .filter(Boolean)
      .filter((state, index, list) => list.indexOf(state) === index)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }

  get ecosystemStacks(): string[] {
    return this.readEcosystemJobs()
      .flatMap((job) => job.techStack.map((stack) => stack.name.trim()))
      .filter(Boolean)
      .filter((stack, index, list) => list.indexOf(stack) === index)
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }

  get unreadTalentNotifications(): number {
    return this.talentNotificationsFacade.unreadCount();
  }

  get talentNotifications(): TalentNotification[] {
    return this.isCandidateMode ? this.talentNotificationsFacade.notifications() : [];
  }

  get hasTalentNotifications(): boolean {
    return this.talentNotifications.length > 0;
  }

  get isNotificationListOpen(): boolean {
    return this.notificationsOpen;
  }

  get activeTalentNotification(): TalentNotification | null {
    return this.notificationModal;
  }

  get activeTalentNotificationJob(): MockJobRecord | null {
    const notification = this.notificationModal;
    if (!notification) {
      return null;
    }

    return this.jobsFacade.getJobById(notification.jobId) ?? null;
  }

  get activeTalentNotificationStage(): CandidateStage | null {
    const job = this.activeTalentNotificationJob;
    if (!job) {
      return null;
    }

    const candidate = this.jobsFacade.findTalentCandidate(job);
    return this.jobsFacade.getEffectiveCandidateStage(candidate) ?? null;
  }

  get activeTalentNotificationCompanyLine(): string {
    const notification = this.notificationModal;
    const job = this.activeTalentNotificationJob;
    const company = job?.company || notification?.company || '';
    const workModel = (job?.workModel || notification?.workModel || '').trim();

    if (company && workModel) {
      return `${company} - ${workModel}`;
    }

    return company || workModel;
  }

  get activeTalentNotificationLocationLine(): string {
    const notification = this.notificationModal;
    const job = this.activeTalentNotificationJob;
    return job?.location || notification?.location || '';
  }

  get activeTalentNotificationOfferLine(): string {
    const job = this.activeTalentNotificationJob;
    if (!job) {
      return '';
    }

    const rawSalary = job.salaryRange?.trim() || '';
    const salary = rawSalary && !rawSalary.startsWith('R$') ? `R$ ${rawSalary}` : rawSalary;
    const contract = job.contractType?.trim() || '';
    const benefitsSuffix = job.benefits.length > 0 ? ' + Beneficios' : '';
    return [salary, contract].filter(Boolean).join(' ') + benefitsSuffix;
  }

  get notificationConfettiPieces(): NotificationConfettiPiece[] {
    return this.confettiPieces;
  }

  compactGroupLabel(index: number): string {
    if (index === 0) {
      return 'Menu';
    }

    if (index === this.sidebarTreeGroups.length - 1) {
      return 'Conta';
    }

    return 'Grupo';
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
    if (item.icon === 'logout') {
      this.authService.logout();
    }

    this.footerMenuOpen = false;
    this.hideSidebarOnCompactViewport();
  }

  handleFlatItemClick(item: NavItem): void {
    if (item.icon === 'logout') {
      this.authService.logout();
    }

    this.footerMenuOpen = false;
    this.hideSidebarOnCompactViewport();
  }

  hideSidebar(): void {
    if (this.isCollapsed) {
      this.sidebarVisibilityService.show();
      return;
    }

    this.sidebarVisibilityService.hide();
  }

  setTheme(mode: ThemeMode): void {
    if (this.activeThemeMode === mode) {
      return;
    }

    this.activeThemeMode = mode;
    this.applyTheme(mode);
    this.cdr.markForCheck();
  }

  openSidebarAvatarPicker(input: HTMLInputElement): void {
    if (!this.isCandidateMode) {
      this.hideSidebar();
      return;
    }

    input.click();
  }

  onSidebarAvatarSelected(event: Event): void {
    if (!this.isCandidateMode) {
      return;
    }

    const input = event.target as HTMLInputElement | null;
    this.handleCandidatePhotoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  openFooterProfileMenu(): void {
    this.footerMenuOpen = !this.footerMenuOpen;
    this.cdr.markForCheck();
  }

  closeFooterProfileMenu(): void {
    if (!this.footerMenuOpen) {
      return;
    }

    this.footerMenuOpen = false;
    this.cdr.markForCheck();
  }

  goToProfileFromFooter(): void {
    this.footerMenuOpen = false;

    if (this.isCandidateMode) {
      void this.router.navigate(['/usuario/dados-cadastrais']);
      return;
    }

    void this.router.navigate(['/recruiter/panel']);
  }

  logoutFromFooter(): void {
    this.footerMenuOpen = false;
    this.authService.logout();
    void this.router.navigate(['/login']);
  }

  openCreateJob(): void {
    void this.router.navigate(['/vagas/cadastro']);
  }

  openCandidateProfileSetup(): void {
    void this.router.navigate(['/usuario/dados-cadastrais']);
  }

  openEcosystemFilters(): void {
    const filters = this.ecosystemJobFiltersService.filters();
    this.filterCode = filters.code;
    this.filterCompany = filters.company;
    this.filterState = filters.state;
    this.filterStack = filters.stack;
    this.ecosystemFilterModalService.open();
  }

  closeEcosystemFilters(): void {
    this.ecosystemFilterModalService.close();
  }

  clearEcosystemFilters(): void {
    this.filterCode = '';
    this.filterCompany = '';
    this.filterState = '';
    this.filterStack = '';
  }

  confirmEcosystemFilters(): void {
    this.ecosystemJobFiltersService.setFilters({
      code: this.filterCode,
      company: this.filterCompany,
      state: this.filterState,
      stack: this.filterStack,
    });

    this.closeEcosystemFilters();
  }

  openNotifications(): void {
    if (!this.isCandidateMode) {
      return;
    }

    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.notificationModal = null;
      this.footerMenuOpen = false;
    }

    this.cdr.markForCheck();
  }

  closeNotificationModal(): void {
    this.notificationModal = null;
    this.notificationsOpen = false;
    this.confettiPieces = [];
    this.footerMenuOpen = false;
    this.ecosystemFilterModalService.close();
    this.cdr.markForCheck();
  }

  openNotificationPreview(notification: TalentNotification): void {
    this.talentNotificationsFacade.markAsRead(notification.id);
    this.notificationModal = notification;
    this.notificationsOpen = false;
    this.footerMenuOpen = false;
    this.confettiPieces = this.shouldLaunchNotificationConfetti(notification, this.activeTalentNotificationStage)
      ? this.buildNotificationConfetti()
      : [];
    this.cdr.markForCheck();
  }

  openNotificationConversation(): void {
    const notification = this.notificationModal;
    if (!notification) {
      return;
    }

    this.notificationModal = null;
    void this.router.navigate(['/usuario/minhas-candidaturas'], {
      queryParams: {
        job: notification.jobId,
        panel: 'status',
        notice: Date.now(),
      },
    });
  }

  notificationTitle(notification: TalentNotification): string {
    if (notification.type === 'new-vacancy') {
      return 'Nova vaga no radar';
    }

    const time = new Date(notification.createdAt);
    const hh = `${time.getHours()}`.padStart(2, '0');
    const mm = `${time.getMinutes()}`.padStart(2, '0');
    return `Candidatura às ${hh}:${mm}`;
  }

  notificationPreview(notification: TalentNotification): string {
    switch (notification.type) {
      case 'new-vacancy':
        return 'Uma nova vaga ativa entrou no ecossistema e ja pode aparecer no seu radar.';
      case 'process-advanced':
        return 'A empresa avaliou seu perfil e decidiu seguir com sua candidatura.';
      default:
        return 'Você recebeu uma atualização sobre a sua candidatura.';
    }
  }

  notificationIsUnread(notification: TalentNotification): boolean {
    return !notification.readAt;
  }

  @HostListener('window:tailworks:candidate-photo-updated')
  handlePhotoUpdated(): void {
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isFilterPopupOpen()) {
      this.closeEcosystemFilters();
      return;
    }

    if (this.footerMenuOpen) {
      this.closeFooterProfileMenu();
      return;
    }

    if (this.notificationsOpen || this.notificationModal) {
      this.closeNotificationModal();
    }
  }

  @HostListener('document:click')
  handleDocumentClick(): void {
    if (this.footerMenuOpen) {
      this.footerMenuOpen = false;
      this.cdr.markForCheck();
    }
  }

  private readPrimaryPath(url: string): string {
    const [path] = url.split('?');
    return path.split('#')[0];
  }

  private get primaryPath(): string {
    return this.readPrimaryPath(this.currentUrl());
  }

  private restoreTheme(): void {
    const stored = this.browserStorage.getItem(SidebarComponent.themeStorageKey);
    const nextMode: ThemeMode = stored === 'dark' ? 'dark' : 'light';
    this.activeThemeMode = nextMode;
    this.applyTheme(nextMode);
  }

  private applyTheme(mode: ThemeMode): void {
    const body = this.document?.body;
    if (body) {
      body.dataset['theme'] = mode;
    }

    this.browserStorage.setItem(SidebarComponent.themeStorageKey, mode);
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

  private readEcosystemJobs(): MockJobRecord[] {
    const jobs = this.jobsFacade.getJobs().filter((job) => job.status === 'ativas');

    if (this.primaryPath === '/home/ecossistema') {
      return jobs.filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job));
    }

    return jobs;
  }

  private shouldLaunchNotificationConfetti(
    notification: TalentNotification | null,
    stage: CandidateStage | null,
  ): boolean {
    return notification?.type === 'process-advanced' || stage === 'processo' || stage === 'contratado';
  }

  private buildNotificationConfetti(): NotificationConfettiPiece[] {
    const palette = ['#f59e0b', '#f97316', '#fde68a', '#fb7185', '#38bdf8', '#34d399'];

    return Array.from({ length: 350 }, (_, index) => {
      const angle = (Math.PI * 2 * index) / 350;
      const ring = index % 5;
      const radius = 140 + ring * 55 + (index % 7) * 9;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;

      return {
        left: `${50 + ((index % 9) - 4) * 0.35}%`,
        top: `${40 + ((index % 7) - 3) * 0.45}%`,
        delay: `${(index % 10) * 0.025}s`,
        duration: `${1.75 + (index % 6) * 0.12}s`,
        size: `${7 + (index % 3) * 3}px`,
        rotate: `${(index * 29) % 360}deg`,
        color: palette[index % palette.length],
        dx: `${dx.toFixed(1)}px`,
        dy: `${dy.toFixed(1)}px`,
      };
    });
  }

  private handleCandidatePhotoFile(file: File | null): void {
    if (!file) {
      return;
    }

    if (!this.acceptedPhotoMimeTypes.includes(file.type) || file.size > this.maxPhotoSizeBytes) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const photoPreviewUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!photoPreviewUrl) {
        return;
      }

      this.persistCandidatePhotoDraft(photoPreviewUrl, file.name);
      window.dispatchEvent(
        new CustomEvent(SidebarComponent.photoUpdatedEventName, {
          detail: {
            photoPreviewUrl,
            photoFileName: file.name,
          },
        }),
      );
      this.cdr.markForCheck();
    };

    reader.readAsDataURL(file);
  }

  private persistCandidatePhotoDraft(photoPreviewUrl: string, photoFileName: string): void {
    const current = this.readCandidateDraft() ?? {};
    const nextDraft: CandidateBasicDraft = {
      ...current,
      profile: current.profile ? { ...current.profile } : undefined,
      photoPreviewUrl,
      photoFileName,
    };

    this.browserStorage.setItem(SidebarComponent.basicDraftStorageKey, JSON.stringify(nextDraft));
  }

  private hideSidebarOnCompactViewport(): void {
    if (!this.sidebarVisibilityService.isCompactViewport()) {
      return;
    }

    this.sidebarVisibilityService.hide();
  }
}
