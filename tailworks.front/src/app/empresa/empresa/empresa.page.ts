import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { CompanyRecord } from '../empresa.models';

type CompanyStatusFilter = 'all' | 'active' | 'inactive';

@Component({
  standalone: true,
  selector: 'app-empresa-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './empresa.page.html',
  styleUrls: ['./empresa.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmpresaPage implements OnDestroy {
  private readonly companiesFacade = inject(CompaniesFacade);
  private readonly recruitersFacade = inject(RecruitersFacade);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  searchTerm = '';
  statusFilter: CompanyStatusFilter = 'all';

  constructor() {
    this.subscriptions.add(this.companiesFacade.changes$.subscribe(() => this.cdr.markForCheck()));
    this.subscriptions.add(this.recruitersFacade.changes$.subscribe(() => this.cdr.markForCheck()));
    this.subscriptions.add(this.jobsFacade.jobsChanged$.subscribe(() => this.cdr.markForCheck()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get companies(): CompanyRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');

    return this.companiesFacade.listCompanies(true).filter((company) => {
      if (this.statusFilter === 'active' && !company.active) {
        return false;
      }

      if (this.statusFilter === 'inactive' && company.active) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        company.name,
        company.sector,
        company.location,
        company.description,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });
  }

  get totalCompanies(): number {
    return this.companiesFacade.listCompanies(true).length;
  }

  get activeCompanies(): number {
    return this.companiesFacade.listCompanies(true).filter((company) => company.active).length;
  }

  get inactiveCompanies(): number {
    return this.companiesFacade.listCompanies(true).filter((company) => !company.active).length;
  }

  get linkedRecruiters(): number {
    return this.recruitersFacade.listAllRecruiters().filter((recruiter) => recruiter.active).length;
  }

  setStatusFilter(filter: CompanyStatusFilter): void {
    this.statusFilter = filter;
  }

  toggleCompanyActive(company: CompanyRecord): void {
    this.companiesFacade.toggleCompanyActive(company.id);
  }

  deleteCompany(company: CompanyRecord): void {
    if (!this.canDeleteCompany(company)) {
      return;
    }

    this.companiesFacade.deleteCompany(company.id);
  }

  recruiterCount(companyName: string): number {
    return this.recruitersFacade.listAllRecruiters().filter((recruiter) => recruiter.managedCompanies.includes(companyName)).length;
  }

  jobCount(companyName: string): number {
    return this.jobsFacade.getJobs().filter((job) => job.company === companyName).length;
  }

  canDeleteCompany(company: CompanyRecord): boolean {
    return this.recruiterCount(company.name) === 0 && this.jobCount(company.name) === 0;
  }

  trackCompany(_index: number, company: CompanyRecord): string {
    return company.id;
  }
}
