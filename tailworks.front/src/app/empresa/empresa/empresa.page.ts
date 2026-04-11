import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { CompanyRecord } from '../empresa.models';
import { RecruiterRecord } from '../../recruiter/recruiter.models';
import { MockJobRecord } from '../../vagas/data/vagas.models';

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

type CompanyDetailTab = 'recruiters' | 'jobs';

type CompanyViewModel = {
  company: CompanyRecord;
  formattedLocation: string;
  recruiterCount: number;
  jobCount: number;
  recruiters: RecruiterRecord[];
  jobs: MockJobRecord[];
  canDelete: boolean;
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
  private companyViewModels: CompanyViewModel[] = [];
  private filteredCompaniesSnapshot: CompanyViewModel[] = [];
  private pagedCompaniesSnapshot: CompanyViewModel[] = [];

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
  selectedCompanyId = '';
  activeDetailTab: CompanyDetailTab = 'recruiters';

  constructor() {
    this.subscriptions.add(this.companiesFacade.changes$.subscribe(() => this.refreshViewState()));
    this.subscriptions.add(this.recruitersFacade.changes$.subscribe(() => this.refreshViewState()));
    this.subscriptions.add(this.jobsFacade.jobsChanged$.subscribe(() => this.refreshViewState()));
    this.refreshViewState();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get allCompanies(): CompanyRecord[] {
    return this.companyViewModels.map((entry) => entry.company);
  }

  get filteredCompanies(): CompanyViewModel[] {
    return this.filteredCompaniesSnapshot;
  }

  get companies(): CompanyViewModel[] {
    return this.pagedCompaniesSnapshot;
  }

  get totalCompanies(): number {
    return this.companyViewModels.length;
  }

  get activeCompanies(): number {
    return this.companyViewModels.filter(({ company }) => company.active).length;
  }

  get inactiveCompanies(): number {
    return this.companyViewModels.filter(({ company }) => !company.active).length;
  }

  get linkedRecruiters(): number {
    return this.companyViewModels.reduce((total, entry) => total + entry.recruiters.filter((recruiter) => recruiter.active).length, 0);
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
    return [...new Set(this.companyViewModels.map(({ company }) => company.sector).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  get locationOptions(): string[] {
    return [...new Set(this.companyViewModels.map(({ formattedLocation }) => formattedLocation).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
  }

  get selectedCompany(): CompanyViewModel | undefined {
    return this.companyViewModels.find((entry) => entry.company.id === this.selectedCompanyId)
      ?? this.filteredCompaniesSnapshot[0]
      ?? this.companyViewModels[0];
  }

  get selectedCompanyRecruiters(): RecruiterRecord[] {
    return this.selectedCompany?.recruiters ?? [];
  }

  get selectedCompanyJobs(): MockJobRecord[] {
    return this.selectedCompany?.jobs ?? [];
  }

  get companyResourceSummary(): string {
    const selected = this.selectedCompany;
    if (!selected) {
      return 'Selecione uma empresa para visualizar contexto, recruiters e vagas vinculadas no ecossistema.';
    }

    return selected.company.description?.trim()
      || `${selected.company.name} opera em ${selected.company.sector} com ${selected.recruiterCount} recruiters e ${selected.jobCount} vagas ligadas ao ecossistema.`;
  }

  get companyResourceAvatarBadges(): Array<{ src: string; label: string }> {
    return this.selectedCompanyRecruiters
      .filter((recruiter) => !!recruiter.avatarUrl)
      .slice(0, 4)
      .map((recruiter) => ({ src: recruiter.avatarUrl as string, label: recruiter.name }));
  }

  get companyResourceAvatarExtraCount(): number {
    return Math.max(0, this.selectedCompanyRecruiters.length - this.companyResourceAvatarBadges.length);
  }

  get companyResourcePrimaryJob(): MockJobRecord | undefined {
    return this.selectedCompanyJobs[0];
  }

  get companyResourceHasPreview(): boolean {
    return !!this.companyResourcePrimaryJob?.homeAnnouncementImageUrl;
  }

  get companyResourcePreviewUrl(): string {
    return this.companyResourcePrimaryJob?.homeAnnouncementImageUrl ?? '';
  }

  get companyResourceStacks(): Array<{ name: string; match: number }> {
    const stackMap = new Map<string, { total: number; count: number }>();

    this.selectedCompanyJobs.forEach((job) => {
      job.techStack.forEach((stack) => {
        const current = stackMap.get(stack.name) ?? { total: 0, count: 0 };
        current.total += stack.match;
        current.count += 1;
        stackMap.set(stack.name, current);
      });
    });

    return [...stackMap.entries()]
      .map(([name, value]) => ({
        name,
        match: Math.round(value.total / value.count),
      }))
      .sort((left, right) => right.match - left.match)
      .slice(0, 5);
  }

  get companyResourceAdherence(): number {
    if (!this.selectedCompanyJobs.length) {
      return 0;
    }

    const total = this.selectedCompanyJobs.reduce((sum, job) => sum + job.match, 0);
    return Math.round(total / this.selectedCompanyJobs.length);
  }

  get companyResourceMetricLabel(): string {
    const selected = this.selectedCompany;
    if (!selected) {
      return 'Sem operação ativa';
    }

    const activeJobs = selected.jobs.filter((job) => job.status === 'ativas').length;
    return `${activeJobs} vagas ativas`;
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
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  applyAdvancedFilters(): void {
    this.applyFilters();
    this.closeFilterModal();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = 'all';
    this.recruiterFilter = 'all';
    this.sectorFilter = 'all';
    this.locationFilter = 'all';
    this.sortBy = 'name-asc';
    this.applyFilters();
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
    const existing = this.companyForm.id
      ? this.companiesFacade.getCompanyById(this.companyForm.id)
      : this.companiesFacade.getCompanyByName(this.companyForm.name);

    const payload: CompanyFormModel = {
      ...this.companyForm,
      id: this.companyForm.id || existing?.id || this.generateCompanyId(),
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

    const savedCompany = this.companiesFacade.saveCompany({
      id: payload.id,
      name: payload.name,
      sector: payload.sector,
      location: payload.location,
      description: payload.description,
      logoUrl: payload.logoUrl || undefined,
      logoLabel: payload.logoLabel,
      active: payload.active,
      followers: existing?.followers ?? '120.000 seguidores',
      linkedinCount: existing?.linkedinCount ?? '120.000 no LinkedIn',
      website: existing?.website,
      emailDomain: existing?.emailDomain,
      monthlyHiringCount: existing?.monthlyHiringCount ?? 0,
      notes: existing?.notes,
    });

    this.selectedCompanyId = savedCompany.id;
    this.activeDetailTab = 'recruiters';
    this.closeModal();
    this.refreshViewState();
  }

  toggleCompanyActive(company: CompanyRecord): void {
    this.companiesFacade.toggleCompanyActive(company.id);
    this.refreshViewState();
  }

  deleteCompany(company: CompanyRecord): void {
    if (!this.canDeleteCompany(company)) {
      return;
    }

    this.companiesFacade.deleteCompany(company.id);
    if (this.selectedCompanyId === company.id) {
      this.selectedCompanyId = '';
    }
    this.refreshViewState();
  }

  recruiterCount(companyName: string): number {
    return this.findCompanyViewModelByName(companyName)?.recruiterCount ?? 0;
  }

  jobCount(companyName: string): number {
    return this.findCompanyViewModelByName(companyName)?.jobCount ?? 0;
  }

  canDeleteCompany(company: CompanyRecord): boolean {
    return this.findCompanyViewModelByName(company.name)?.canDelete ?? true;
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

  trackCompanyViewModel(_index: number, entry: CompanyViewModel): string {
    return entry.company.id;
  }

  trackRecruiter(_index: number, recruiter: RecruiterRecord): string {
    return recruiter.id;
  }

  trackJob(_index: number, job: MockJobRecord): string {
    return job.id;
  }

  selectCompany(companyId: string): void {
    if (this.selectedCompanyId === companyId) {
      return;
    }

    this.selectedCompanyId = companyId;
    this.activeDetailTab = 'recruiters';
    this.cdr.markForCheck();
  }

  setDetailTab(tab: CompanyDetailTab): void {
    this.activeDetailTab = tab;
  }

  recruiterInitials(recruiter: RecruiterRecord): string {
    return recruiter.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  totalOpenJobsForSelectedCompany(): number {
    return this.selectedCompanyJobs.filter((job) => job.status === 'ativas').length;
  }

  companyLogoLabel(company: CompanyRecord): string {
    return (company.logoLabel || this.buildLogoLabel(company.name)).slice(0, 2).toUpperCase();
  }

  private ensureValidCurrentPage(): void {
    const adjustedTotalPages = Math.max(1, Math.ceil(this.filteredCompanies.length / this.pageSize));
    if (this.currentPage > adjustedTotalPages) {
      this.currentPage = adjustedTotalPages;
    }
  }

  private refreshViewState(): void {
    this.companyViewModels = this.buildCompanyViewModels();
    this.applyFilters(false);
  }

  private applyFilters(markForCheck = true): void {
    const normalizedSearch = this.searchTerm.trim().toLocaleLowerCase('pt-BR');

    this.filteredCompaniesSnapshot = this.companyViewModels
      .filter((entry) => {
        if (this.statusFilter === 'active' && !entry.company.active) {
          return false;
        }

        if (this.statusFilter === 'inactive' && entry.company.active) {
          return false;
        }

        if (this.sectorFilter !== 'all' && entry.company.sector !== this.sectorFilter) {
          return false;
        }

        if (this.locationFilter !== 'all' && entry.formattedLocation !== this.locationFilter) {
          return false;
        }

        if (this.recruiterFilter === 'withRecruiters' && entry.recruiterCount === 0) {
          return false;
        }

        if (this.recruiterFilter === 'withoutRecruiters' && entry.recruiterCount > 0) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          entry.company.name,
          entry.company.sector,
          entry.company.location,
          entry.company.description,
          entry.company.logoLabel,
        ]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        switch (this.sortBy) {
          case 'name-desc':
            return right.company.name.localeCompare(left.company.name, 'pt-BR');
          case 'jobs-desc':
            return right.jobCount - left.jobCount;
          case 'recruiters-desc':
            return right.recruiterCount - left.recruiterCount;
          case 'name-asc':
          default:
            return left.company.name.localeCompare(right.company.name, 'pt-BR');
        }
      });

    this.ensureValidCurrentPage();

    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedCompaniesSnapshot = this.filteredCompaniesSnapshot.slice(start, start + this.pageSize);

    if (!this.selectedCompanyId || !this.filteredCompaniesSnapshot.some((entry) => entry.company.id === this.selectedCompanyId)) {
      this.selectedCompanyId = this.filteredCompaniesSnapshot[0]?.company.id ?? this.companyViewModels[0]?.company.id ?? '';
    }

    if (markForCheck) {
      this.cdr.markForCheck();
    }
  }

  private buildCompanyViewModels(): CompanyViewModel[] {
    const companies = this.companiesFacade.listCompanies(true);
    const recruiters = this.recruitersFacade.listAllRecruiters();
    const jobs = this.jobsFacade.getJobs();

    const recruitersByCompany = new Map<string, RecruiterRecord[]>();
    const jobsByCompany = new Map<string, MockJobRecord[]>();

    recruiters.forEach((recruiter) => {
      recruiter.managedCompanies.forEach((companyName) => {
        const bucket = recruitersByCompany.get(companyName) ?? [];
        bucket.push(recruiter);
        recruitersByCompany.set(companyName, bucket);
      });
    });

    jobs.forEach((job) => {
      const bucket = jobsByCompany.get(job.company) ?? [];
      bucket.push(job);
      jobsByCompany.set(job.company, bucket);
    });

    return companies.map((company) => {
      const companyRecruiters = recruitersByCompany.get(company.name) ?? [];
      const companyJobs = jobsByCompany.get(company.name) ?? [];

      return {
        company,
        formattedLocation: this.formatCompanyLocation(company.location),
        recruiterCount: companyRecruiters.length,
        jobCount: companyJobs.length,
        recruiters: [...companyRecruiters].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
        jobs: [...companyJobs].sort((left, right) => right.match - left.match),
        canDelete: companyRecruiters.length === 0 && companyJobs.length === 0,
      };
    });
  }

  private findCompanyViewModelByName(companyName: string): CompanyViewModel | undefined {
    return this.companyViewModels.find((entry) => entry.company.name === companyName);
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
