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
  private readonly brazilStateAbbreviations: Record<string, string> = {
    Acre: 'AC',
    Alagoas: 'AL',
    Amapa: 'AP',
    Amazonas: 'AM',
    Bahia: 'BA',
    Ceara: 'CE',
    'Distrito Federal': 'DF',
    'Espirito Santo': 'ES',
    Goias: 'GO',
    Maranhao: 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    Para: 'PA',
    Paraiba: 'PB',
    Parana: 'PR',
    Pernambuco: 'PE',
    Piaui: 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    Rondonia: 'RO',
    Roraima: 'RR',
    'Santa Catarina': 'SC',
    'Sao Paulo': 'SP',
    Sergipe: 'SE',
    Tocantins: 'TO',
  };

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

  formatCompanyLocation(location: string): string {
    const normalizedLocation = location.trim();
    if (!normalizedLocation) {
      return '';
    }

    const [firstPart = '', secondPart = ''] = normalizedLocation.split(' - ').map((item) => item.trim());
    const isCountryLast = secondPart === 'Brasil' || secondPart === 'Portugal';

    if (isCountryLast) {
      const stateCode = secondPart === 'Brasil' ? this.brazilStateAbbreviations[firstPart] : '';
      const formattedRegion = [firstPart, stateCode].filter(Boolean).join(' ');
      return [secondPart, formattedRegion].filter(Boolean).join(' - ');
    }

    return normalizedLocation;
  }

  trackCompany(_index: number, company: CompanyRecord): string {
    return company.id;
  }
}
