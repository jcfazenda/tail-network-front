import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { TalentNotification, TalentNotificationService } from '../../../usuario/talent-notification.service';
import { MockJobRecord } from '../../../vagas/data/vagas.models';
import { VagasMockService } from '../../../vagas/data/vagas-mock.service';
import { EcosystemEntryService } from '../../../usuario/home/ecosystem-entry.service';
import { SidebarVisibilityService } from '../sidebar/sidebar-visibility.service';

@Component({
  standalone: true,
  selector: 'app-topbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly vagasMockService = inject(VagasMockService);
  private readonly talentNotificationService = inject(TalentNotificationService);
  private readonly ecosystemEntryService = inject(EcosystemEntryService);
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

  clearPublishedJobsForTesting(): void {
    this.vagasMockService.clearJobs();
  }

  openCandidateEcosystem(event: Event): void {
    event.preventDefault();
    this.ecosystemEntryService.setMode('talent');
    void this.router.navigateByUrl('/usuario/ecossistema');
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
  }

  openNotificationPreview(notification: TalentNotification): void {
    this.talentNotificationService.markAsRead(notification.id);
    this.notificationModal = notification;
    this.notificationsOpen = false;
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
}
