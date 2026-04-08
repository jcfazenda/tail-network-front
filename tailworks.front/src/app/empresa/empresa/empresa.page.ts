import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { CompanyRecord } from '../empresa.models';

type CompanyStatusFilter = 'all' | 'active' | 'inactive';
type RecruiterFilter = 'all' | 'withRecruiters' | 'withoutRecruiters';
type SortOption = 'name-asc' | 'name-desc' | 'jobs-desc' | 'recruiters-desc';

type CompanyFormModel = {
  id: string;
  name: string;
  sector: string;
  location: string;
  description: string;
  logoUrl: string;
  logoLabel: string;
  active: boolean;
};

@Component({
  standalone: true,
  selector: 'app-empresa-page',
  imports: [CommonModule, FormsModule],
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
  recruiterFilter: RecruiterFilter = 'all';
  sectorFilter = 'all';
  locationFilter = 'all';
  sortBy: SortOption = 'name-asc';

  currentPage = 1;
  readonly pageSize = 6;

  isModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  modalError = '';

  isFilterModalOpen = false;

  companyForm: CompanyFormModel = this.createEmptyForm();

  constructor() {
    this.subscriptions.add(this.companiesFacade.changes$.subscribe(() => {
      this.ensureValidCurrentPage();
      this.cdr.markForCheck();
    }));

    this.subscriptions.add(this.recruitersFacade.changes$.subscribe(() => {
      this.ensureValidCurrentPage();
      this.cdr.markForCheck();
    }));

    this.subscriptions.add(this.jobsFacade.jobsChanged$.subscribe(() => {
      this.ensureValidCurrentPage();
      this.cdr.markForCheck();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get allCompanies(): CompanyRecord[] {
    return this.companiesFacade.listCompanies(true);
  }

  get filteredCompanies(): CompanyRecord[] {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');

    const filtered = this.allCompanies.filter((company) => {
      if (this.statusFilter === 'active' && !company.active) {
        return false;
      }

      if (this.statusFilter === 'inactive' && company.active) {
        return false;
      }

      if (this.sectorFilter !== 'all' && company.sector !== this.sectorFilter) {
        return false;
      }

      const formattedLocation = this.formatCompanyLocation(company.location);
      if (this.locationFilter !== 'all' && formattedLocation !== this.locationFilter) {
        return false;
      }

      const recruiterCount = this.recruiterCount(company.name);
      if (this.recruiterFilter === 'withRecruiters' && recruiterCount === 0) {
        return false;
      }

      if (this.recruiterFilter === 'withoutRecruiters' && recruiterCount > 0) {
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
        company.logoLabel,
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(normalizedSearch);
    });

    return filtered.sort((companyA, companyB) => {
      switch (this.sortBy) {
        case 'name-desc':
          return companyB.name.localeCompare(companyA.name, 'pt-BR');
        case 'jobs-desc':
          return this.jobCount(companyB.name) - this.jobCount(companyA.name);
        case 'recruiters-desc':
          return this.recruiterCount(companyB.name) - this.recruiterCount(companyA.name);
        case 'name-asc':
        default:
          return companyA.name.localeCompare(companyB.name, 'pt-BR');
      }
    });
  }

  get companies(): CompanyRecord[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredCompanies.slice(start, start + this.pageSize);
  }

  get totalCompanies(): number {
    return this.allCompanies.length;
  }

  get activeCompanies(): number {
    return this.allCompanies.filter((company) => company.active).length;
  }

  get inactiveCompanies(): number {
    return this.allCompanies.filter((company) => !company.active).length;
  }

  get linkedRecruiters(): number {
    return this.recruitersFacade.listAllRecruiters().filter((recruiter) => recruiter.active).length;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredCompanies.length / this.pageSize));
  }

  get visiblePages(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 4) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    if (current <= 2) {
      return [1, 2, 3, 4];
    }

    if (current >= total - 1) {
      return [total - 3, total - 2, total - 1, total];
    }

    return [current - 1, current, current + 1, current + 2];
  }

  get sectorOptions(): string[] {
    return [...new Set(this.allCompanies.map((company) => company.sector).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  get locationOptions(): string[] {
    return [...new Set(this.allCompanies.map((company) => this.formatCompanyLocation(company.location)).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  get hasActiveFilters(): boolean {
    return !!this.searchTerm.trim()
      || this.statusFilter !== 'all'
      || this.recruiterFilter !== 'all'
      || this.sectorFilter !== 'all'
      || this.locationFilter !== 'all'
      || this.sortBy !== 'name-asc';
  }

  get activeFiltersCount(): number {
    let total = 0;

    if (this.statusFilter !== 'all') total++;
    if (this.recruiterFilter !== 'all') total++;
    if (this.sectorFilter !== 'all') total++;
    if (this.locationFilter !== 'all') total++;
    if (this.sortBy !== 'name-asc') total++;

    return total;
  }

  setStatusFilter(filter: CompanyStatusFilter): void {
    this.statusFilter = filter;
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  applyAdvancedFilters(): void {
    this.currentPage = 1;
    this.closeFilterModal();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.recruiterFilter = 'all';
    this.sectorFilter = 'all';
    this.locationFilter = 'all';
    this.sortBy = 'name-asc';
    this.currentPage = 1;
  }

  clearFiltersFromModal(): void {
    this.clearFilters();
    this.closeFilterModal();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    this.currentPage = page;
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  openCreateModal(): void {
    this.modalMode = 'create';
    this.modalError = '';
    this.companyForm = this.createEmptyForm();
    this.isModalOpen = true;
  }

  openEditModal(company: CompanyRecord): void {
    this.modalMode = 'edit';
    this.modalError = '';
    this.companyForm = {
      id: company.id,
      name: company.name ?? '',
      sector: company.sector ?? '',
      location: company.location ?? '',
      description: company.description ?? '',
      logoUrl: company.logoUrl ?? '',
      logoLabel: company.logoLabel ?? '',
      active: !!company.active,
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalError = '';
  }

  saveCompany(): void {
    const payload: CompanyFormModel = {
      ...this.companyForm,
      id: this.companyForm.id || this.generateCompanyId(),
      name: this.companyForm.name.trim(),
      sector: this.companyForm.sector.trim(),
      location: this.companyForm.location.trim(),
      description: this.companyForm.description.trim(),
      logoUrl: this.companyForm.logoUrl.trim(),
      logoLabel: (this.companyForm.logoLabel.trim() || this.buildLogoLabel(this.companyForm.name)).slice(0, 2).toUpperCase(),
      active: this.companyForm.active,
    };

    if (!payload.name || !payload.sector || !payload.location) {
      this.modalError = 'Preencha nome, setor e localização.';
      return;
    }

    const facade = this.companiesFacade as unknown as {
      createCompany?: (company: CompanyRecord) => void;
      updateCompany?: (company: CompanyRecord) => void;
    };

    if (this.modalMode === 'create') {
      if (!facade.createCompany) {
        this.modalError = 'Não encontrei createCompany no facade. Ajuste o nome do método no save.';
        return;
      }

      facade.createCompany(payload as CompanyRecord);
    } else {
      if (!facade.updateCompany) {
        this.modalError = 'Não encontrei updateCompany no facade. Ajuste o nome do método no save.';
        return;
      }

      facade.updateCompany(payload as CompanyRecord);
    }

    this.closeModal();
    this.ensureValidCurrentPage();
    this.cdr.markForCheck();
  }

  toggleCompanyActive(company: CompanyRecord): void {
    this.companiesFacade.toggleCompanyActive(company.id);
    this.ensureValidCurrentPage();
  }

  deleteCompany(company: CompanyRecord): void {
    if (!this.canDeleteCompany(company)) {
      return;
    }

    this.companiesFacade.deleteCompany(company.id);
    this.ensureValidCurrentPage();
  }

  recruiterCount(companyName: string): number {
    return this.recruitersFacade
      .listAllRecruiters()
      .filter((recruiter) => recruiter.managedCompanies.includes(companyName)).length;
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

  private ensureValidCurrentPage(): void {
    const adjustedTotalPages = Math.max(1, Math.ceil(this.filteredCompanies.length / this.pageSize));
    if (this.currentPage > adjustedTotalPages) {
      this.currentPage = adjustedTotalPages;
    }
  }

  private createEmptyForm(): CompanyFormModel {
    return {
      id: '',
      name: '',
      sector: '',
      location: '',
      description: '',
      logoUrl: '',
      logoLabel: '',
      active: true,
    };
  }

  private generateCompanyId(): string {
    return `company-${Date.now()}`;
  }

  private buildLogoLabel(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}