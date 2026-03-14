import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TalentNotification, TalentNotificationService } from '../../../usuario/talent-notification.service';
import { CandidateStage, MockJobRecord } from '../../../vagas/data/vagas.models';
import { VagasMockService } from '../../../vagas/data/vagas-mock.service';
import { EcosystemEntryService } from '../../../usuario/home/ecosystem-entry.service';
import { EcosystemPanelService } from '../../../usuario/ecosystem-panel.service';
import { SidebarVisibilityService } from '../sidebar/sidebar-visibility.service';

type FormationCopyDraft = {
  endMonth?: string;
  endYear?: string;
  graduation?: string;
  specialization?: string;
  graduated?: boolean;
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
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly formationLogoStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private readonly vagasMockService = inject(VagasMockService);
  private readonly talentNotificationService = inject(TalentNotificationService);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
  private readonly ecosystemPanelService = inject(EcosystemPanelService);
  private readonly sidebarVisibilityService = inject(SidebarVisibilityService);
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
      const url = this.currentUrl();

      if (url === '/home' || url === '/login' || url === '/usuario/ecossistema') {
        return;
      }

      if (url.startsWith('/usuario')) {
        this.ecosystemEntryService.setMode('talent');
        return;
      }

      this.ecosystemEntryService.setMode('recruiter');
    });
  }

  get isSelectionMode(): boolean {
    const url = this.currentUrl();
    return url === '/home' || url === '/login';
  }

  get isCandidateMode(): boolean {
    return this.currentUrl().startsWith('/usuario');
  }

  get isCandidateEcosystem(): boolean {
    return this.currentUrl() === '/usuario/ecossistema';
  }

  get isRecruiterEcosystem(): boolean {
    return this.isCandidateEcosystem && this.ecosystemEntryService.mode() === 'recruiter';
  }

  get canToggleSidebar(): boolean {
    return !this.isSelectionMode && !this.isCandidateEcosystem;
  }

  get topbarFormationLogoUrl(): string {
    if (typeof window === 'undefined') {
      return '/assets/images/logo-estacio.png';
    }

    return window.localStorage.getItem(TopbarComponent.formationLogoStorageKey) || '/assets/images/logo-estacio.png';
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
    return this.readFormationDraft()?.graduation?.trim() || 'Bacharelado em Sistemas de Informação';
  }

  get topbarFormationSpecialization(): string {
    return this.readFormationDraft()?.specialization?.trim() || 'Especialização em Arquitetura de Software';
  }

  get isSidebarOpen(): boolean {
    return this.sidebarVisibilityService.isOpen();
  }

  get unreadTalentNotifications(): number {
    return this.talentNotificationService.unreadCount();
  }

  get talentNotifications(): TalentNotification[] {
    return this.isCandidateMode ? this.talentNotificationService.notifications() : [];
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

    return this.vagasMockService.getJobById(notification.jobId) ?? null;
  }

  get activeTalentNotificationStage(): CandidateStage | null {
    const job = this.activeTalentNotificationJob;
    if (!job) {
      return null;
    }

    const candidate = this.vagasMockService.findTalentCandidate(job);
    return this.vagasMockService.getEffectiveCandidateStage(candidate) ?? null;
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

  clearPublishedJobsForTesting(): void {
    this.vagasMockService.clearJobs();
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
    this.talentNotificationService.markAsRead(notification.id);
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
    if (typeof window === 'undefined') {
      return null;
    }

    const rawDraft = window.localStorage.getItem(TopbarComponent.formationCopyStorageKey);
    if (!rawDraft) {
      return null;
    }

    try {
      return JSON.parse(rawDraft) as FormationCopyDraft;
    } catch {
      window.localStorage.removeItem(TopbarComponent.formationCopyStorageKey);
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
