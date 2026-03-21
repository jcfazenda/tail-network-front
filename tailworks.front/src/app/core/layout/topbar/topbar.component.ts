import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TalentNotification } from '../../../usuario/talent-notification.service';
import { JobsFacade } from '../../facades/jobs.facade';
import { TalentNotificationsFacade } from '../../facades/talent-notifications.facade';
import { CandidateStage, MockJobRecord } from '../../../vagas/data/vagas.models';
import { EcosystemEntryService } from '../../../usuario/home/ecosystem-entry.service';
import { EcosystemPanelService } from '../../../usuario/ecosystem-panel.service';
import { SidebarVisibilityService } from '../sidebar/sidebar-visibility.service';
import { EcosystemSearchService } from '../ecosystem-search.service';
import { BrowserStorageService } from '../../storage/browser-storage.service';

type FormationCopyDraft = {
  endMonth?: string;
  endYear?: string;
  graduation?: string;
  specialization?: string;
  graduated?: boolean;
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
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.component.html',
  styleUrls: [
    './topbar.component.shell.scss',
    './topbar.component.overlay.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly recruiterAvatarAsset = '/assets/avatars/avatar-default.svg';
  private static readonly recruiterFormationLogoAsset = '/assets/images/formacao-default.png';
  readonly topbarNewVacanciesCount = 43;
  readonly topbarNewHiresCount = 17;
  private readonly jobsFacade = inject(JobsFacade);
  private readonly talentNotificationsFacade = inject(TalentNotificationsFacade);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly ecosystemPanelService = inject(EcosystemPanelService);
  private readonly ecosystemSearchService = inject(EcosystemSearchService);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
  private readonly browserStorage = inject(BrowserStorageService);
  private readonly router = inject(Router);
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
      this.ecosystemEntryService.syncModeFromUrl(this.primaryPath);
    });
  }

  get isSelectionMode(): boolean {
    const url = this.primaryPath;
    return url === '/home' || url === '/login';
  }

  get isTemplateLanding(): boolean {
    return this.primaryPath === '/home/ecossistema';
  }

  get isCadastroPage(): boolean {
    return this.primaryPath === '/vagas/cadastro';
  }

  get isCandidateMode(): boolean {
    return this.primaryPath.startsWith('/usuario');
  }

  get isRecruiterMode(): boolean {
    return !this.isSelectionMode && !this.isCandidateMode;
  }

  get isCandidateEcosystem(): boolean {
    return this.primaryPath === '/usuario/ecossistema';
  }

  get isRecruiterEcosystem(): boolean {
    return this.isCandidateEcosystem && this.ecosystemEntryService.mode() === 'recruiter';
  }

  get canToggleSidebar(): boolean {
    return !this.isSelectionMode && !this.isCandidateEcosystem;
  }

  get showSidebarProfileInPrimary(): boolean {
    // Keep the avatar/profile block visible even when the sidebar is open.
    return !this.isSelectionMode && !this.isCandidateEcosystem;
  }

  get shouldShowTopbarAvatar(): boolean {
    return true;
  }

  get canToggleSidebarFromTopbarAvatar(): boolean {
    return this.canToggleSidebar && (!this.isCandidateMode || !this.isSidebarOpen);
  }

  get templateSearchQuery(): string {
    return this.ecosystemSearchService.query();
  }

  set templateSearchQuery(value: string) {
    this.ecosystemSearchService.setQuery(value);
  }

  get hasTemplateSearchQuery(): boolean {
    return this.templateSearchQuery.trim().length > 0;
  }

  get topbarAvatarUrl(): string {
    if (!this.isCandidateMode) {
      return '';
    }

    const rawDraft = this.browserStorage.getItem(TopbarComponent.basicDraftStorageKey);
    if (!rawDraft) {
      return '';
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      return draft.photoPreviewUrl?.trim() || '';
    } catch {
      this.browserStorage.removeItem(TopbarComponent.basicDraftStorageKey);
      return '';
    }
  }

  get recruiterTopbarAvatarUrl(): string {
    return TopbarComponent.recruiterAvatarAsset;
  }

  get topbarAvatarInitials(): string {
    if (!this.isCandidateMode) {
      return '';
    }

    const name = this.readCandidateDraft()?.profile?.name?.trim() || 'Julio Fazenda';
    const parts = name
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'JF';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get recruiterTopbarAvatarInitials(): string {
    const parts = this.recruiterTopbarDisplayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) {
      return 'JF';
    }

    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  }

  get topbarCandidateDisplayName(): string {
    return this.readCandidateDraft()?.profile?.name?.trim() || 'Julio Fazenda';
  }

  get recruiterTopbarDisplayName(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().name;
  }

  get topbarCandidateDisplayLocation(): string {
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

  get recruiterTopbarDisplayMeta(): string {
    return this.jobsFacade.getCurrentRecruiterIdentity().role;
  }

  get topbarProfileAvatarUrl(): string {
    return this.isCandidateMode ? this.topbarAvatarUrl : this.recruiterTopbarAvatarUrl;
  }

  get topbarProfileAvatarInitials(): string {
    return this.isCandidateMode ? this.topbarAvatarInitials : this.recruiterTopbarAvatarInitials;
  }

  get topbarProfileDisplayName(): string {
    return this.isCandidateMode ? this.topbarCandidateDisplayName : this.recruiterTopbarDisplayName;
  }

  get topbarProfileDisplayMeta(): string {
    return this.isCandidateMode ? this.topbarCandidateDisplayLocation : this.recruiterTopbarDisplayMeta;
  }

  get topbarGreetingName(): string {
    const fullName = this.topbarProfileDisplayName.trim();
    if (!fullName) {
      return 'Henry';
    }

    return fullName.split(' ')[0] || fullName;
  }

  get topbarFormationLogoUrl(): string {
    if (!this.isCandidateMode) {
      return TopbarComponent.recruiterFormationLogoAsset;
    }

    return this.browserStorage.getItem(TopbarComponent.formationLogoStorageKey)?.trim() || '/assets/images/formacao-default.png';
  }

  handleTopbarFormationLogoError(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image) {
      return;
    }

    image.src = TopbarComponent.recruiterFormationLogoAsset;
  }

  get topbarFormationHeading(): string {
    const draft = this.readFormationDraft();

    if (draft?.graduated === false) {
      return 'Em andamento';
    }

    if (draft?.endMonth?.trim() && draft?.endYear?.trim()) {
      return `Formado em ${draft.endMonth.trim()} ${draft.endYear.trim()}`;
    }

    return 'Formado em Dez 2025';
  }

  get topbarFormationGraduation(): string {
    if (!this.isCandidateMode) {
      return 'Bacharelado';
    }

    return this.readFormationDraft()?.graduation?.trim() || 'Bacharelado em Sistemas de Informação';
  }

  get topbarFormationSpecialization(): string {
    if (!this.isCandidateMode) {
      return 'Especialização em Arquitetura de Software';
    }

    return this.readFormationDraft()?.specialization?.trim() || 'Especialização em Arquitetura de Software';
  }

  get isSidebarOpen(): boolean {
    return this.sidebarVisibilityService.isOpen();
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

  private get primaryPath(): string {
    return this.currentUrl().split('?')[0]?.split('#')[0] || this.currentUrl();
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

  get isNotificationListOpen(): boolean {
    return this.notificationsOpen;
  }

  get notificationConfettiPieces(): NotificationConfettiPiece[] {
    return this.confettiPieces;
  }

  notificationTitle(notification: TalentNotification): string {
    const time = new Date(notification.createdAt);
    const hh = `${time.getHours()}`.padStart(2, '0');
    const mm = `${time.getMinutes()}`.padStart(2, '0');
    return `Candidatura às ${hh}:${mm}`;
  }

  notificationPreview(notification: TalentNotification): string {
    switch (notification.type) {
      case 'process-advanced':
        return 'A empresa avaliou seu perfil e decidiu seguir com sua candidatura.';
      default:
        return 'Você recebeu uma atualização sobre a sua candidatura.';
    }
  }

  notificationIsUnread(notification: TalentNotification): boolean {
    return !notification.readAt;
  }

  private notificationModal: TalentNotification | null = null;
  private notificationsOpen = false;
  private confettiPieces: NotificationConfettiPiece[] = [];

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.notificationsOpen || this.notificationModal) {
      this.closeNotificationModal();
    }
  }

  clearPublishedJobsForTesting(): void {
    this.jobsFacade.clearJobs();
  }

  openCandidateEcosystem(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode('talent');

    if (this.currentUrl().startsWith('/usuario/minhas-candidaturas')) {
      this.ecosystemPanelService.requestOpen();
      return;
    }

    void this.router.navigate(['/usuario/minhas-candidaturas'], {
      queryParams: {
        ecosystem: 'open',
        notice: Date.now(),
      },
    });
  }

  toggleSidebar(): void {
    this.sidebarVisibilityService.toggle();
  }

  openCreateJob(): void {
    void this.router.navigate(['/vagas/cadastro']);
  }

  clearTemplateSearch(): void {
    this.templateSearchQuery = '';
  }

  openNotifications(): void {
    if (!this.isCandidateMode) {
      return;
    }

    this.notificationsOpen = !this.notificationsOpen;
    if (this.notificationsOpen) {
      this.notificationModal = null;
    }
  }

  closeNotificationModal(): void {
    this.notificationModal = null;
    this.notificationsOpen = false;
    this.confettiPieces = [];
  }

  openNotificationPreview(notification: TalentNotification): void {
    this.talentNotificationsFacade.markAsRead(notification.id);
    this.notificationModal = notification;
    this.notificationsOpen = false;
    this.confettiPieces = this.shouldLaunchNotificationConfetti(notification, this.activeTalentNotificationStage)
      ? this.buildNotificationConfetti()
      : [];
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

  openNotificationDetails(): void {
    const notification = this.notificationModal;
    if (!notification) {
      return;
    }

    this.notificationModal = null;
    void this.router.navigate(['/usuario/minhas-candidaturas'], {
      queryParams: {
        job: notification.jobId,
        panel: 'details',
        notice: Date.now(),
      },
    });
  }

  private readFormationDraft(): FormationCopyDraft | null {
    const rawDraft = this.browserStorage.getItem(TopbarComponent.formationCopyStorageKey);
    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as FormationCopyDraft;
    } catch {
      this.browserStorage.removeItem(TopbarComponent.formationCopyStorageKey);
      return null;
    }
  }

  private readCandidateDraft(): CandidateBasicDraft | null {
    const rawDraft = this.browserStorage.getItem(TopbarComponent.basicDraftStorageKey);
    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as CandidateBasicDraft;
    } catch {
      this.browserStorage.removeItem(TopbarComponent.basicDraftStorageKey);
      return null;
    }
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
}
