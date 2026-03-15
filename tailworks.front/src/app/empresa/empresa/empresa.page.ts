import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecruiterDirectoryService } from '../../recruiter/recruiter-directory.service';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import { EmpresaDirectoryService } from '../empresa-directory.service';
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
  private readonly companyDirectoryService = inject(EmpresaDirectoryService);
  private readonly recruiterDirectoryService = inject(RecruiterDirectoryService);
  private readonly vagasMockService = inject(VagasMockService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  searchTerm = '';
  statusFilter: CompanyStatusFilter = 'all';

  constructor() {
    this.subscriptions.add(this.companyDirectoryService.changes$.subscribe(() => this.cdr.markForCheck()));
    this.subscriptions.add(this.recruiterDirectoryService.changes$.subscribe(() => this.cdr.markForCheck()));
    this.subscriptions.add(this.vagasMockService.jobsChanged$.subscribe(() => this.cdr.markForCheck()));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get companies(): CompanyRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');

    return this.companyDirectoryService.listCompanies(true).filter((company) => {
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
    return this.companyDirectoryService.listCompanies(true).length;
  }

  get activeCompanies(): number {
    return this.companyDirectoryService.listCompanies(true).filter((company) => company.active).length;
  }

  get inactiveCompanies(): number {
    return this.companyDirectoryService.listCompanies(true).filter((company) => !company.active).length;
  }

  get linkedRecruiters(): number {
    return this.recruiterDirectoryService.listAllRecruiters().filter((recruiter) => recruiter.active).length;
  }

  setStatusFilter(filter: CompanyStatusFilter): void {
    this.statusFilter = filter;
  }

  toggleCompanyActive(company: CompanyRecord): void {
    this.companyDirectoryService.toggleCompanyActive(company.id);
  }

  deleteCompany(company: CompanyRecord): void {
    if (!this.canDeleteCompany(company)) {
      return;
    }

    this.companyDirectoryService.deleteCompany(company.id);
  }

  recruiterCount(companyName: string): number {
    return this.recruiterDirectoryService.listAllRecruiters().filter((recruiter) => recruiter.managedCompanies.includes(companyName)).length;
  }

  jobCount(companyName: string): number {
    return this.vagasMockService.getJobs().filter((job) => job.company === companyName).length;
  }

  canDeleteCompany(company: CompanyRecord): boolean {
    return this.recruiterCount(company.name) === 0 && this.jobCount(company.name) === 0;
  }

  trackCompany(_index: number, company: CompanyRecord): string {
    return company.id;
  }
}
