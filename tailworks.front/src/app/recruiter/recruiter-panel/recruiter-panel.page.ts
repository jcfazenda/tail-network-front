import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { RecruiterRecord, RecruiterViewScope } from '../recruiter.models';

type RecruiterStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-recruiter-panel-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recruiter-panel.page.html',
  styleUrls: ['./recruiter-panel.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecruiterPanelPage implements OnDestroy {
  readonly defaultRecruiterAvatarUrl = '/assets/avatars/avatar-default.svg';
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  statusFilter: RecruiterStatusFilter = 'all';
  searchTerm = '';

  constructor() {
    this.subscriptions.add(
      this.recruitersFacade.changes$.subscribe(() => {
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get currentRecruiter(): RecruiterRecord {
    return this.recruitersFacade.getCurrentRecruiter();
  }

  get canManageDirectory(): boolean {
    return this.currentRecruiter.isMaster;
  }

  get companyRecruiters(): RecruiterRecord[] {
    return this.recruitersFacade.listRecruiters(this.currentRecruiter.company);
  }

  get filteredRecruiters(): RecruiterRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');

    return this.companyRecruiters.filter((recruiter) => {
      if (this.statusFilter === 'active' && !recruiter.active) {
        return false;
      }

      if (this.statusFilter === 'inactive' && recruiter.active) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        recruiter.name,
        recruiter.role,
        recruiter.email,
        recruiter.company,
        recruiter.managedCompanies.join(' '),
        recruiter.areas.join(' '),
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });
  }

  get totalRecruiters(): number {
    return this.companyRecruiters.length;
  }

  get activeRecruiters(): number {
    return this.companyRecruiters.filter((recruiter) => recruiter.active).length;
  }

  get inactiveRecruiters(): number {
    return this.companyRecruiters.filter((recruiter) => !recruiter.active).length;
  }

  get masterRecruiters(): number {
    return this.companyRecruiters.filter((recruiter) => recruiter.isMaster).length;
  }

  get recruiterCoverageLabel(): string {
    const scopes = new Set(this.companyRecruiters.map((recruiter) => recruiter.viewScope));

    if (scopes.has('company')) {
      return 'Cobertura total da empresa';
    }

    if (scopes.has('following')) {
      return 'Operação compartilhada entre squads';
    }

    return 'Operação focada por recruiter';
  }

  get emptyStateHint(): string {
    if (this.searchTerm.trim()) {
      return 'Tente buscar por outro nome, e-mail, área ou cargo. Você também pode limpar a busca para voltar ao time completo.';
    }

    if (this.statusFilter !== 'all') {
      return 'Volte para "Todos" para reabrir a visão completa do time desta empresa.';
    }

    return 'Cadastre um novo recruiter para começar a distribuir a operação do time.';
  }

  get shouldShowEmptyResetAction(): boolean {
    return this.searchTerm.trim().length > 0 || this.statusFilter !== 'all';
  }

  get hasActiveFilters(): boolean {
    return this.shouldShowEmptyResetAction;
  }

  setStatusFilter(filter: RecruiterStatusFilter): void {
    this.statusFilter = filter;
  }

  resetFilters(): void {
    this.statusFilter = 'all';
    this.searchTerm = '';
    this.cdr.markForCheck();
  }

  toggleRecruiterActive(recruiter: RecruiterRecord): void {
    if (!this.canManageDirectory || recruiter.id === this.currentRecruiter.id) {
      return;
    }

    this.recruitersFacade.toggleRecruiterActive(recruiter.id, recruiter.company);
    this.cdr.markForCheck();
  }

  viewScopeLabel(scope: RecruiterViewScope): string {
    switch (scope) {
      case 'company':
        return 'Ve toda a empresa';
      case 'following':
        return 'Ve vagas acompanhadas';
      default:
        return 'Vê vagas próprias';
    }
  }

  permissionBadges(recruiter: RecruiterRecord): string[] {
    const badges: string[] = [];

    if (recruiter.canCreateJobs) {
      badges.push('Cria vagas');
    }

    if (recruiter.canAdvanceCandidates) {
      badges.push('Move candidatos');
    }

    if (recruiter.canManageSubordinates) {
      badges.push('Gerencia time');
    }

    if (recruiter.canExportData) {
      badges.push('Exporta dados');
    }

    if (recruiter.canViewTalentRadar) {
      badges.push('Ve radar');
    }

    return badges.slice(0, 4);
  }

  trackRecruiter(_index: number, recruiter: RecruiterRecord): string {
    return recruiter.id;
  }
}
