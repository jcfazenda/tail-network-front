import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CompaniesFacade } from '../../core/facades/companies.facade';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { RecruitersFacade } from '../../core/facades/recruiters.facade';
import { MatchDomainService } from '../../core/matching/match-domain.service';
import { LocalMediaStorageService } from '../../core/storage/local-media-storage.service';
import { CompanyRecord } from '../empresa.models';
import { RecruiterRecord } from '../../recruiter/recruiter.models';
import { MockJobCandidate, MockJobRecord } from '../../vagas/data/vagas.models';
import { SeededTalentProfile, TalentProfileStoreService } from '../../talent/talent-profile-store.service';

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
  panelImageUrl: string;
  logoLabel: string;
  active: boolean;
};

type CompanyDetailTab = 'recruiters' | 'jobs';
type EmpresaCenterView = 'identity' | 'job';

type ResourcePanelJobVm = {
  id: string;
  code?: string;
  title: string;
  company: string;
  companyLogoUrl?: string;
  homeAnnouncementImageUrl?: string;
  recruiterVideoUrl?: string;
  recruiterVideoPosterUrl?: string;
  location: string;
  workModel: string;
  contractType: string;
  salaryRange?: string;
  radarAdherenceThreshold?: number;
  techStack: Array<{ name: string; match: number }>;
};

type SideJobCardVm = {
  id: string;
  title: string;
  location: string;
  summary: string;
  salary: string;
  workModel: string;
  contractType: string;
  companyLogoUrl?: string;
  companyLogoLabel: string;
  avatarBadges: Array<{ src: string; label: string }>;
  avatarExtraCount: number;
};

type CompanyCandidateVm = {
  id: string;
  name: string;
  role: string;
  location: string;
  avatarUrl: string;
  educationLabel?: string;
  educationStatus?: string;
  videoUrl?: string;
  videoPosterUrl?: string;
  topStacks: Array<{ label: string; match: number; isAdherence: boolean }>;
};

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
  readonly fallbackAvatarUrl = 'assets/avatars/john-doe.png';

  readonly recruiterShowcasePhotos = [
    'assets/images/polaroid/daniela-costa.png',
    'assets/images/polaroid/lucas-pereira.png',
    'assets/images/polaroid/juliana-oliveira.png',
    'assets/images/polaroid/marcos-oliveira.png',
  ];

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
  private readonly matchDomainService = inject(MatchDomainService);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private readonly localMediaStorage = inject(LocalMediaStorageService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();
  private companyViewModels: CompanyViewModel[] = [];
  private recruiterAccessibleActiveJobsSnapshot: MockJobRecord[] = [];
  private companyJobCandidatesCache = new Map<string, MockJobCandidate[]>();
  private filteredCompaniesSnapshot: CompanyViewModel[] = [];
  private pagedCompaniesSnapshot: CompanyViewModel[] = [];
  private totalPagesSnapshot = 1;
  private visiblePagesSnapshot: number[] = [1];
  private sectorOptionsSnapshot: string[] = [];
  private locationOptionsSnapshot: string[] = [];
  private activeCompaniesSnapshot = 0;
  private inactiveCompaniesSnapshot = 0;
  private linkedRecruitersSnapshot = 0;
  private companySelectionOptionsSnapshot: CompanyViewModel[] = [];
  private selectedCompanySnapshot?: CompanyViewModel;
  private selectedCompanyJobsSnapshot: MockJobRecord[] = [];
  private selectedCompanyRecruitersSnapshot: RecruiterRecord[] = [];
  private selectedCompanySideJobCardsSnapshot: SideJobCardVm[] = [];
  private selectedCompanyCandidatesSnapshot: CompanyCandidateVm[] = [];
  private selectedCompanyCandidateSnapshot?: CompanyCandidateVm;
  private pagedSelectedCompanyCandidatesSnapshot: CompanyCandidateVm[] = [];
  private candidateTotalPagesSnapshot = 1;
  private candidateVisiblePagesSnapshot: number[] = [1];
  private companyResourcePrimaryJobSnapshot?: MockJobRecord;
  private companyResourceSummarySnapshot =
    'Selecione uma empresa para visualizar contexto, recruiters e vagas vinculadas no ecossistema.';
  private companyResourceAvatarBadgesSnapshot: Array<{ src: string; label: string }> = [];
  private companyResourceAvatarExtraCountSnapshot = 0;
  private companyResourceStacksSnapshot: Array<{ name: string; match: number }> = [];
  private companyResourceAdherenceSnapshot = 0;
  private companyResourceMetricLabelSnapshot = 'Sem operação ativa';
  private resourcePanelJobSnapshot: ResourcePanelJobVm = {
    id: 'vaga-demo',
    title: 'Analista de Sistemas',
    company: 'Tail Works',
    location: 'Sao Paulo - SP',
    workModel: 'Hibrido',
    contractType: 'CLT',
    salaryRange: 'R$ 9.500 - R$ 12.000',
    radarAdherenceThreshold: 85,
    techStack: [
      { name: 'Angular', match: 94 },
      { name: 'TypeScript', match: 91 },
      { name: 'Node.js', match: 86 },
      { name: 'Design System', match: 82 },
      { name: 'UX Strategy', match: 78 },
    ],
  };
  private resourcePanelStacksSnapshot: Array<{ name: string; match: number }> = [
    { name: 'Angular', match: 94 },
    { name: 'TypeScript', match: 91 },
    { name: 'Node.js', match: 86 },
    { name: 'Design System', match: 82 },
    { name: 'UX Strategy', match: 78 },
  ];
  private resourcePanelAdherenceSnapshot = 91;
  private resourcePanelSalarySnapshot = 'R$ 9.500 - R$ 12.000';
  private selectedCompanyRecruiterVideoResolvedUrl = 'assets/videos/VG-0001-Recruiter.mp4';
  private recruiterVideoResolveToken = 0;
  private selectedCompanyCandidateVideoResolvedUrl = 'assets/videos/VG-0001.mp4';
  private candidateVideoResolveToken = 0;
  private selectedCompanyRecruiterPosterResolvedUrl = 'assets/images/image-video.png';
  private recruiterPosterResolveToken = 0;
  private selectedCompanyCandidatePosterResolvedUrl = 'assets/images/image-video.png';
  private candidatePosterResolveToken = 0;

  searchTerm = '';
  statusFilter: CompanyStatusFilter = 'all';
  recruiterFilter: RecruiterFilter = 'all';
  sectorFilter = 'all';
  locationFilter = 'all';
  sortBy: SortOption = 'name-asc';

  currentPage = 1;
  readonly pageSize = 6;
  candidateCurrentPage = 1;
  readonly candidatePageSize = 8;

  isModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  modalError = '';

  isFilterModalOpen = false;
  isCompanyFilterOpen = false;

  companyForm: CompanyFormModel = this.createEmptyForm();
  selectedCompanyId = '';
  selectedCompanyJobId = '';
  selectedCandidateId = '';
  activeDetailTab: CompanyDetailTab = 'recruiters';
  centerView: EmpresaCenterView = 'identity';

  private readonly fallbackResourcePanelJob: ResourcePanelJobVm = {
    id: 'vaga-demo',
    title: 'Analista de Sistemas',
    company: 'Tail Works',
    location: 'Sao Paulo - SP',
    workModel: 'Hibrido',
    contractType: 'CLT',
    salaryRange: 'R$ 9.500 - R$ 12.000',
    techStack: [
      { name: 'Angular', match: 94 },
      { name: 'TypeScript', match: 91 },
      { name: 'Node.js', match: 86 },
      { name: 'Design System', match: 82 },
      { name: 'UX Strategy', match: 78 },
    ],
  };

  constructor() {
    this.subscriptions.add(this.companiesFacade.changes$.subscribe(() => this.refreshViewState()));
    this.subscriptions.add(this.recruitersFacade.changes$.subscribe(() => this.refreshViewState()));
    this.subscriptions.add(this.jobsFacade.jobsChanged$.subscribe(() => this.refreshViewState()));
    this.refreshViewState();
  }

  ngOnDestroy(): void {
    this.revokeSelectedCompanyRecruiterVideoResolvedUrl();
    this.revokeSelectedCompanyCandidateVideoResolvedUrl();
    this.revokeSelectedCompanyRecruiterPosterResolvedUrl();
    this.revokeSelectedCompanyCandidatePosterResolvedUrl();
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
    return this.activeCompaniesSnapshot;
  }

  get inactiveCompanies(): number {
    return this.inactiveCompaniesSnapshot;
  }

  get linkedRecruiters(): number {
    return this.linkedRecruitersSnapshot;
  }

  get totalPages(): number {
    return this.totalPagesSnapshot;
  }

  get visiblePages(): number[] {
    return this.visiblePagesSnapshot;
  }

  get sectorOptions(): string[] {
    return this.sectorOptionsSnapshot;
  }

  get locationOptions(): string[] {
    return this.locationOptionsSnapshot;
  }

  get selectedCompany(): CompanyViewModel | undefined {
    return this.selectedCompanySnapshot;
  }

  get selectedCompanyRecruiters(): RecruiterRecord[] {
    return this.selectedCompanyRecruitersSnapshot;
  }

  get selectedCompanyJobs(): MockJobRecord[] {
    return this.selectedCompanyJobsSnapshot;
  }

  get companySelectionOptions(): CompanyViewModel[] {
    return this.companySelectionOptionsSnapshot;
  }

  get selectedCompanySelectionOption(): CompanyViewModel | undefined {
    return this.companySelectionOptions.find((option) => option.company.id === this.selectedCompanyId)
      ?? this.selectedCompany;
  }

  get selectedCompanyRecord(): CompanyRecord | null {
    return this.selectedCompany?.company ?? null;
  }

  get selectedCompanyName(): string {
    return this.selectedCompanyRecord?.name ?? 'Empresa';
  }

  get selectedCompanyLocation(): string {
    return this.selectedCompany
      ? this.selectedCompany.formattedLocation
      : 'Brasil';
  }

  get selectedCompanyLogoUrl(): string {
    return this.selectedCompanyRecord?.logoUrl?.trim() ?? '';
  }

  get selectedCompanyDescription(): string {
    return this.selectedCompanyRecord?.description?.trim()
      || 'Empresa em crescimento no ecossistema TailWorks.';
  }

  get selectedCompanyWebsite(): string {
    return this.selectedCompanyRecord?.website?.trim() || 'Site não informado';
  }

  get selectedCompanyEmail(): string {
    const company = this.selectedCompanyRecord;
    return company ? this.companyContactEmail(company) : 'contato@empresa.com.br';
  }

  get selectedCompanyMonthlyHiringLabel(): string {
    const monthlyHiringCount = this.selectedCompanyRecord?.monthlyHiringCount ?? 0;
    return `${monthlyHiringCount} contratações/mês`;
  }

  get selectedCompanyPanelImageUrl(): string {
    return this.selectedCompanyRecord?.panelImageUrl?.trim() || 'assets/images/image-yourlogo.png';
  }

  get companyFormLogoPreviewUrl(): string {
    return this.companyForm.logoUrl.trim();
  }

  get hasSelectedCompanyLogo(): boolean {
    return !!this.selectedCompanyLogoUrl;
  }

  get hasCompanyFormLogo(): boolean {
    return !!this.companyFormLogoPreviewUrl;
  }

  get companyFormPreviewName(): string {
    return this.companyForm.name.trim() || 'Empresa';
  }

  get companyFormPreviewLocation(): string {
    return this.companyForm.location.trim() || 'Brasil';
  }

  hasJobLogo(job: ResourcePanelJobVm): boolean {
    return !!this.jobCompanyLogoUrl(job);
  }

  hasSideJobCardLogo(card: SideJobCardVm): boolean {
    return !!card.companyLogoUrl?.trim();
  }

  get selectedCompanySideJobCards(): SideJobCardVm[] {
    return this.selectedCompanySideJobCardsSnapshot;
  }

  get selectedCompanyCandidates(): CompanyCandidateVm[] {
    return this.selectedCompanyCandidatesSnapshot;
  }

  get pagedSelectedCompanyCandidates(): CompanyCandidateVm[] {
    return this.pagedSelectedCompanyCandidatesSnapshot;
  }

  get selectedCompanyCandidate(): CompanyCandidateVm | undefined {
    return this.selectedCompanyCandidateSnapshot;
  }

  get selectedCompanyCandidateEducationLabel(): string {
    return this.selectedCompanyCandidate?.educationLabel?.trim() || 'Formação não informada';
  }

  get selectedCompanyCandidateEducationStatus(): string {
    return this.selectedCompanyCandidate?.educationStatus?.trim() || 'Não informado';
  }

  get selectedCompanyCandidateVideoUrl(): string {
    return this.selectedCompanyCandidateVideoResolvedUrl;
  }

  get selectedCompanyCandidatePosterUrl(): string {
    return this.selectedCompanyCandidatePosterResolvedUrl;
  }

  get selectedCompanyRecruiterVideoUrl(): string {
    return this.selectedCompanyRecruiterVideoResolvedUrl;
  }

  get selectedCompanyRecruiterPosterUrl(): string {
    return this.selectedCompanyRecruiterPosterResolvedUrl;
  }

  get candidateTotalPages(): number {
    return this.candidateTotalPagesSnapshot;
  }

  get candidateVisiblePages(): number[] {
    return this.candidateVisiblePagesSnapshot;
  }

  get companyResourceSummary(): string {
    return this.companyResourceSummarySnapshot;
  }

  get companyResourceAvatarBadges(): Array<{ src: string; label: string }> {
    return this.companyResourceAvatarBadgesSnapshot;
  }

  get companyResourceAvatarExtraCount(): number {
    return this.companyResourceAvatarExtraCountSnapshot;
  }

  get companyHeaderAvatarBadges(): Array<{ src: string; label: string }> {
    const primaryJob = this.companyResourcePrimaryJob;
    return primaryJob ? this.jobCandidateAvatarBadges(primaryJob) : [];
  }

  get companyHeaderAvatarExtraCount(): number {
    const primaryJob = this.companyResourcePrimaryJob;
    return primaryJob ? this.jobCandidateAvatarExtraCount(primaryJob) : 0;
  }

  get companyResourcePrimaryJob(): MockJobRecord | undefined {
    return this.companyResourcePrimaryJobSnapshot;
  }

  get companyResourceHasPreview(): boolean {
    return !!this.companyResourcePrimaryJob?.homeAnnouncementImageUrl;
  }

  get companyResourcePreviewUrl(): string {
    return this.companyResourcePrimaryJob?.homeAnnouncementImageUrl ?? '';
  }

  get companyResourceStacks(): Array<{ name: string; match: number }> {
    return this.companyResourceStacksSnapshot;
  }

  get companyResourceAdherence(): number {
    return this.companyResourceAdherenceSnapshot;
  }

  get companyResourceMetricLabel(): string {
    return this.companyResourceMetricLabelSnapshot;
  }

  get resourcePanelSummary(): string {
    return this.companyResourceSummary;
  }

  get resourcePanelAvatarBadges(): Array<{ src: string; label: string }> {
    return this.companyResourceAvatarBadges;
  }

  get resourcePanelAvatarExtraCount(): number {
    return this.companyResourceAvatarExtraCount;
  }

  get resourcePanelJob(): ResourcePanelJobVm {
    return this.resourcePanelJobSnapshot;
  }

  get resourcePanelHasVideoPreview(): boolean {
    return !!this.resourcePanelJob.homeAnnouncementImageUrl?.trim();
  }

  get resourcePanelVideoThumbnailUrl(): string {
    return this.resourcePanelJob.homeAnnouncementImageUrl?.trim() ?? '';
  }

  get resourcePanelStacks(): Array<{ name: string; match: number }> {
    return this.resourcePanelStacksSnapshot;
  }

  get resourcePanelAdherence(): number {
    return this.resourcePanelJob.radarAdherenceThreshold ?? this.resourcePanelAdherenceSnapshot;
  }

  get resourcePanelSalary(): string {
    return this.resourcePanelSalarySnapshot;
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
    this.applyFilters();
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyFilters();
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.applyFilters();
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
      panelImageUrl: company.panelImageUrl ?? '',
      logoLabel: company.logoLabel ?? '',
      active: !!company.active,
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.modalError = '';
  }

  onCompanyLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.modalError = 'Selecione um arquivo de imagem válido para o logo.';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        this.modalError = 'Não foi possível carregar o logo selecionado.';
        this.cdr.markForCheck();
        return;
      }

      this.companyForm.logoUrl = result;
      this.modalError = '';
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.modalError = 'Não foi possível carregar o logo selecionado.';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  clearCompanyLogo(): void {
    this.companyForm.logoUrl = '';
    this.modalError = '';
  }

  onCompanyPanelImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    const company = this.selectedCompanyRecord;

    if (!file || !company) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        this.cdr.markForCheck();
        return;
      }

      this.companiesFacade.saveCompany({
        id: company.id,
        name: company.name,
        sector: company.sector,
        location: company.location,
        description: company.description,
        followers: company.followers,
        linkedinCount: company.linkedinCount,
        logoLabel: company.logoLabel,
        logoUrl: company.logoUrl,
        panelImageUrl: result,
        website: company.website,
        emailDomain: company.emailDomain,
        monthlyHiringCount: company.monthlyHiringCount,
        active: company.active,
        notes: company.notes,
      });

      input.value = '';
      this.refreshViewState();
    };
    reader.onerror = () => {
      input.value = '';
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  saveCompany(): void {
    const existing = this.companyForm.id
      ? this.companiesFacade.getCompanyById(this.companyForm.id)
      : this.companiesFacade.getCompanyByName(this.companyForm.name);
    const previousCompanyName = existing?.name?.trim() ?? '';

    const payload: CompanyFormModel = {
      ...this.companyForm,
      id: this.companyForm.id || existing?.id || this.generateCompanyId(),
      name: this.companyForm.name.trim(),
      sector: this.companyForm.sector.trim(),
      location: this.companyForm.location.trim(),
      description: this.companyForm.description.trim(),
      logoUrl: this.companyForm.logoUrl.trim(),
      panelImageUrl: this.companyForm.panelImageUrl.trim(),
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
      panelImageUrl: payload.panelImageUrl || existing?.panelImageUrl,
      logoLabel: payload.logoLabel,
      active: payload.active,
      followers: existing?.followers ?? '120.000 seguidores',
      linkedinCount: existing?.linkedinCount ?? '120.000 no LinkedIn',
      website: existing?.website,
      emailDomain: existing?.emailDomain,
      monthlyHiringCount: existing?.monthlyHiringCount ?? 0,
      notes: existing?.notes,
    });

    if (previousCompanyName && previousCompanyName !== savedCompany.name) {
      this.recruitersFacade.replaceCompanyName(previousCompanyName, savedCompany.name);
      this.jobsFacade.renameCompany(previousCompanyName, savedCompany.name);
    }

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

  trackCandidate(_index: number, candidate: CompanyCandidateVm): string {
    return candidate.id;
  }

  trackCandidateStack(_index: number, stack: { label: string; match: number }): string {
    return `${stack.label}:${stack.match}`;
  }

  trackPage(_index: number, page: number): number {
    return page;
  }

  trackCompanyOption(_index: number, option: CompanyViewModel): string {
    return option.company.id;
  }

  toggleCompanyFilter(): void {
    this.isCompanyFilterOpen = !this.isCompanyFilterOpen;
    this.cdr.markForCheck();
  }

  closeCompanyFilter(): void {
    if (!this.isCompanyFilterOpen) {
      return;
    }

    this.isCompanyFilterOpen = false;
    this.cdr.markForCheck();
  }

  selectCompany(companyId: string): void {
    if (this.selectedCompanyId === companyId) {
      this.closeCompanyFilter();
      return;
    }

    this.selectedCompanyId = companyId;
    this.selectedCompanyJobId = '';
    this.candidateCurrentPage = 1;
    this.activeDetailTab = 'recruiters';
    this.isCompanyFilterOpen = false;
    this.rebuildSelectedCompanySnapshot();
    this.cdr.markForCheck();
  }

  onSelectedCompanyChange(companyId: string): void {
    this.selectCompany(companyId);
    this.centerView = 'identity';
  }

  selectCompanyJob(jobId: string): void {
    if (!jobId.trim() || this.selectedCompanyJobId === jobId) {
      return;
    }

    this.selectedCompanyJobId = jobId;
    this.candidateCurrentPage = 1;
    this.rebuildSelectedCompanyJobSnapshot();
    this.cdr.markForCheck();
  }

  selectCandidate(candidateId: string): void {
    if (!candidateId.trim() || this.selectedCandidateId === candidateId) {
      return;
    }

    this.selectedCandidateId = candidateId;
    this.rebuildSelectedCompanyJobSnapshot();
    this.cdr.markForCheck();
  }

  goToCandidatePage(page: number): void {
    if (page < 1 || page > this.candidateTotalPages || page === this.candidateCurrentPage) {
      return;
    }

    this.candidateCurrentPage = page;
    this.rebuildSelectedCompanyJobSnapshot();
    this.cdr.markForCheck();
  }

  goToPreviousCandidatePage(): void {
    if (this.candidateCurrentPage > 1) {
      this.candidateCurrentPage -= 1;
      this.rebuildSelectedCompanyJobSnapshot();
      this.cdr.markForCheck();
    }
  }

  goToNextCandidatePage(): void {
    if (this.candidateCurrentPage < this.candidateTotalPages) {
      this.candidateCurrentPage += 1;
      this.rebuildSelectedCompanyJobSnapshot();
      this.cdr.markForCheck();
    }
  }

  showIdentityCenter(): void {
    if (this.centerView === 'identity') {
      return;
    }

    this.centerView = 'identity';
    this.cdr.markForCheck();
  }

  showJobCenter(): void {
    if (this.centerView === 'job') {
      return;
    }

    this.centerView = 'job';
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

  companyContactEmail(company: CompanyRecord): string {
    const domain = company.emailDomain?.trim();
    return domain ? `contato@${domain}` : 'contato@empresa.com.br';
  }

  jobCompanyLogoUrl(job: ResourcePanelJobVm): string {
    return this.selectedCompanyLogoUrl || job.companyLogoUrl?.trim() || '';
  }

  jobCompanyLogoLabel(job: ResourcePanelJobVm): string {
    return this.buildLogoLabel(job.company);
  }

  jobCardLocation(job: ResourcePanelJobVm): string {
    return this.formatCompanyLocation(job.location);
  }

  jobCardWorkModel(job: ResourcePanelJobVm): string {
    return job.workModel || 'Hibrido';
  }

  private get recruiterAccessibleActiveJobs(): MockJobRecord[] {
    return this.recruiterAccessibleActiveJobsSnapshot;
  }

  openEditJob(jobId: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (!jobId.trim()) {
      void this.router.navigateByUrl('/vagas/cadastro');
      return;
    }

    void this.router.navigate(['/vagas/cadastro'], {
      queryParams: { edit: jobId },
    });
  }

  openCreateJob(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    void this.router.navigateByUrl('/vagas/cadastro');
  }

  private resolveAvatar(avatar: string | undefined): string {
    const value = avatar?.trim() ?? '';
    return value && !value.endsWith('/assets/avatars/avatar-default.svg')
      ? value
      : this.fallbackAvatarUrl;
  }

  private jobCandidateAvatarBadges(job: MockJobRecord): Array<{ src: string; label: string }> {
    const radarCandidates = this.companyJobCandidates(job);
    const candidateBadges = radarCandidates
      .slice(0, 4)
      .map((candidate) => ({
        src: this.resolveAvatar(candidate.avatar),
        label: candidate.name,
      }));

    if (candidateBadges.length) {
      return candidateBadges;
    }

    return (job.avatars ?? [])
      .map((avatar) => this.resolveAvatar(avatar))
      .slice(0, 4)
      .map((src) => ({ src, label: 'TailWorks' }));
  }

  private jobCandidateAvatarExtraCount(job: MockJobRecord): number {
    const radarCandidates = this.companyJobCandidates(job);

    if (radarCandidates.length) {
      return Math.max(0, radarCandidates.length - Math.min(radarCandidates.length, 4));
    }

    const fallbackCount = Math.min(job.avatars?.length ?? 0, 4);
    const totalCandidates = Math.max(job.radarCount ?? 0, job.talents ?? 0, job.avatars?.length ?? 0);
    return Math.max(0, totalCandidates - fallbackCount);
  }

  private buildCandidateTopStacks(
    candidate: Pick<MockJobCandidate, 'name' | 'match'>,
    job: Pick<ResourcePanelJobVm, 'techStack'>,
  ): Array<{ label: string; match: number; isAdherence: boolean }> {
    const candidateProfile = this.findTalentProfileByName(candidate.name);
    const fallbackStacks = [...job.techStack]
      .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, 3)
      .map((stack) => ({
        label: stack.name,
        match: this.matchDomainService.clampScore(candidate.match || stack.match),
        isAdherence: true,
      }));

    if (!candidateProfile) {
      return fallbackStacks;
    }

    const stackScores = this.buildTalentProfileStackScores(candidateProfile);
    const jobRepoIds = this.matchDomainService.mapTechLabelsToRepoIds(job.techStack.map((stack) => stack.name));
    const adherenceSignals = job.techStack
      .map((stack, index) => {
        const repoId = jobRepoIds[index];
        const candidateKnowledge = repoId ? (stackScores[repoId] ?? 0) : 0;
        const requiredKnowledge = Math.max(1, stack.match || 0);
        const match = candidateKnowledge > 0
          ? this.matchDomainService.clampScore(
              Math.round((Math.min(candidateKnowledge, requiredKnowledge) / requiredKnowledge) * 100),
            )
          : 0;

        return {
          label: stack.name.trim(),
          match,
          weight: stack.match || 0,
          candidateKnowledge,
          repoId,
          isAdherence: true,
        };
      })
      .filter((stack) => stack.label && stack.match > 0)
      .sort((left, right) =>
        right.weight - left.weight
        || right.match - left.match
        || right.candidateKnowledge - left.candidateKnowledge
        || left.label.localeCompare(right.label, 'pt-BR'),
      )
      .slice(0, 3);

    if (adherenceSignals.length >= 3) {
      return adherenceSignals.map(({ label, match, isAdherence }) => ({ label, match, isAdherence }));
    }

    const usedRepoIds = new Set(adherenceSignals.map((stack) => stack.repoId).filter((repoId): repoId is string => Boolean(repoId)));
    const extraSignals = [...(candidateProfile.stacksDraft.primary ?? []), ...(candidateProfile.stacksDraft.extra ?? [])]
      .map((stack) => {
        const repoId = stack.id?.trim() || this.matchDomainService.mapTechLabelsToRepoIds([stack.name])[0];
        const label = stack.name?.trim() || '';
        const knowledge = Math.max(0, Math.min(100, Math.round(Number(stack.knowledge ?? 0))));

        return {
          label,
          match: this.matchDomainService.clampScore(knowledge),
          repoId,
          isAdherence: false,
        };
      })
      .filter((stack) => stack.label && stack.match > 0 && (!stack.repoId || !usedRepoIds.has(stack.repoId)))
      .sort((left, right) =>
        right.match - left.match
        || left.label.localeCompare(right.label, 'pt-BR'),
      );

    const combinedStacks = [
      ...adherenceSignals.map(({ label, match, isAdherence }) => ({ label, match, isAdherence })),
      ...extraSignals,
    ].slice(0, 3);

    return combinedStacks.length ? combinedStacks : fallbackStacks;
  }

  private findTalentProfileByName(name: string): SeededTalentProfile | undefined {
    const normalizedName = this.normalizeCompanyKey(name);
    return this.talentProfileStore.listProfiles().find((profile) => {
      const profileName = profile.basicDraft.profile?.name?.trim() || profile.email;
      return this.normalizeCompanyKey(profileName) === normalizedName;
    });
  }

  private buildCandidateEducationLabel(profile: SeededTalentProfile | undefined): string | undefined {
    if (!profile) {
      return undefined;
    }

    return profile.formationCopy?.graduation?.trim()
      || profile.formationCopy?.specialization?.trim()
      || profile.basicDraft.profile?.formation?.trim()
      || undefined;
  }

  private buildCandidateEducationStatus(profile: SeededTalentProfile | undefined): string | undefined {
    if (!profile) {
      return undefined;
    }

    return profile.formationCopy?.educationStatus?.trim()
      || (profile.formationCopy?.graduated === false ? 'Em andamento' : undefined)
      || (this.buildCandidateEducationLabel(profile) ? 'Concluído' : undefined);
  }

  private buildTalentProfileStackScores(profile: SeededTalentProfile): Record<string, number> {
    const stackScores: Record<string, number> = {};

    for (const stack of [...(profile.stacksDraft.primary ?? []), ...(profile.stacksDraft.extra ?? [])]) {
      const repoId = stack.id?.trim() || this.matchDomainService.mapTechLabelsToRepoIds([stack.name])[0];
      if (!repoId) {
        continue;
      }

      const knowledge = Math.max(0, Math.min(100, Math.round(Number(stack.knowledge ?? 0))));
      stackScores[repoId] = Math.max(stackScores[repoId] ?? 0, knowledge);
    }

    return stackScores;
  }

  private companyJobCandidates(job: MockJobRecord) {
    const cached = this.companyJobCandidatesCache.get(job.id);
    if (cached) {
      return cached;
    }

    const radarCandidates = this.jobsFacade.getRadarCandidates(job);
    const resolvedCandidates = radarCandidates.length ? radarCandidates : [...(job.candidates ?? [])];
    this.companyJobCandidatesCache.set(job.id, resolvedCandidates);
    return resolvedCandidates;
  }

  private ensureValidCurrentPage(): void {
    const adjustedTotalPages = Math.max(1, Math.ceil(this.filteredCompanies.length / this.pageSize));
    if (this.currentPage > adjustedTotalPages) {
      this.currentPage = adjustedTotalPages;
    }
  }

  private refreshViewState(markForCheck = true): void {
    this.recruiterAccessibleActiveJobsSnapshot = this.jobsFacade.getJobs()
      .filter((job) => job.status === 'ativas')
      .filter((job) => this.jobsFacade.canCurrentRecruiterAccessJob(job));
    this.companyJobCandidatesCache.clear();
    this.companyViewModels = this.buildCompanyViewModels();
    this.activeCompaniesSnapshot = this.companyViewModels.filter(({ company }) => company.active).length;
    this.inactiveCompaniesSnapshot = this.companyViewModels.length - this.activeCompaniesSnapshot;
    this.linkedRecruitersSnapshot = this.companyViewModels.reduce(
      (total, entry) => total + entry.recruiters.filter((recruiter) => recruiter.active).length,
      0,
    );
    this.sectorOptionsSnapshot = [...new Set(this.companyViewModels.map(({ company }) => company.sector).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
    this.locationOptionsSnapshot = [...new Set(this.companyViewModels.map(({ formattedLocation }) => formattedLocation).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, 'pt-BR'));
    this.applyFilters(markForCheck);
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
    this.totalPagesSnapshot = Math.max(1, Math.ceil(this.filteredCompaniesSnapshot.length / this.pageSize));
    this.visiblePagesSnapshot = this.buildVisiblePages(this.totalPagesSnapshot, this.currentPage);
    this.companySelectionOptionsSnapshot = [...this.filteredCompaniesSnapshot].sort((left, right) =>
      right.jobCount - left.jobCount
      || right.recruiterCount - left.recruiterCount
      || left.company.name.localeCompare(right.company.name, 'pt-BR'),
    );

    if (!this.selectedCompanyId || !this.filteredCompaniesSnapshot.some((entry) => entry.company.id === this.selectedCompanyId)) {
      this.selectedCompanyId = this.resolveDefaultSelectedCompanyId();
      this.selectedCompanyJobId = '';
      this.candidateCurrentPage = 1;
      this.selectedCandidateId = '';
    }

    this.rebuildSelectedCompanySnapshot();

    if (markForCheck) {
      this.cdr.markForCheck();
    }
  }

  private buildCompanyViewModels(): CompanyViewModel[] {
    const companies = this.companiesFacade.listCompanies(true);
    const recruiters = this.recruitersFacade.listAllRecruiters();
    const jobs = this.recruiterAccessibleActiveJobs;

    const recruitersByCompany = new Map<string, RecruiterRecord[]>();
    const jobsByCompany = new Map<string, MockJobRecord[]>();
    const companyMap = new Map<string, CompanyRecord>();

    companies.forEach((company) => {
      companyMap.set(this.normalizeCompanyKey(company.name), company);
    });

    recruiters.forEach((recruiter) => {
      recruiter.managedCompanies.forEach((companyName) => {
        const companyKey = this.normalizeCompanyKey(companyName);
        const bucket = recruitersByCompany.get(companyKey) ?? [];
        bucket.push(recruiter);
        recruitersByCompany.set(companyKey, bucket);
      });
    });

    jobs.forEach((job) => {
      const companyKey = this.normalizeCompanyKey(job.company);
      const bucket = jobsByCompany.get(companyKey) ?? [];
      bucket.push(job);
      jobsByCompany.set(companyKey, bucket);

      if (!companyMap.has(companyKey)) {
        companyMap.set(companyKey, this.createSyntheticCompanyFromJob(job));
      }
    });

    return [...companyMap.values()].map((company) => {
      const companyKey = this.normalizeCompanyKey(company.name);
      const companyRecruiters = recruitersByCompany.get(companyKey) ?? [];
      const companyJobs = jobsByCompany.get(companyKey) ?? [];

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

  private rebuildSelectedCompanySnapshot(): void {
    this.selectedCompanySnapshot = this.companyViewModels.find((entry) => entry.company.id === this.selectedCompanyId)
      ?? this.filteredCompaniesSnapshot[0]
      ?? this.companyViewModels[0];

    this.selectedCompanyRecruitersSnapshot = this.selectedCompanySnapshot?.recruiters ?? [];

    const companyName = this.selectedCompanySnapshot?.company.name?.trim();
    if (!companyName) {
      this.selectedCompanyJobsSnapshot = [];
      this.selectedCompanySideJobCardsSnapshot = [];
      this.selectedCandidateId = '';
      this.rebuildSelectedCompanyJobSnapshot();
      return;
    }

    const normalizedCompanyKey = this.normalizeCompanyKey(companyName);
    this.selectedCompanyJobsSnapshot = this.recruiterAccessibleActiveJobsSnapshot
      .filter((job) => this.normalizeCompanyKey(job.company) === normalizedCompanyKey)
      .sort((left, right) => {
        const rightTime = Date.parse(right.createdAt || right.updatedAt || '') || 0;
        const leftTime = Date.parse(left.createdAt || left.updatedAt || '') || 0;
        return rightTime - leftTime || (right.match ?? 0) - (left.match ?? 0);
      });

    const selectedCompanyLogoUrl = this.selectedCompanySnapshot?.company.logoUrl?.trim() ?? '';
    this.selectedCompanySideJobCardsSnapshot = this.selectedCompanyJobsSnapshot.map((job) => ({
      id: job.id,
      title: job.title,
      location: this.formatCompanyLocation(job.location),
      summary: job.summary?.trim() || 'Vaga vinculada à empresa no ecossistema.',
      salary: job.salaryRange?.trim() || 'Faixa sob consulta',
      workModel: job.workModel,
      contractType: job.contractType,
      companyLogoUrl: selectedCompanyLogoUrl || job.companyLogoUrl?.trim() || undefined,
      companyLogoLabel: this.buildLogoLabel(job.company),
      avatarBadges: this.jobCandidateAvatarBadges(job),
      avatarExtraCount: this.jobCandidateAvatarExtraCount(job),
    }));

    this.rebuildSelectedCompanyJobSnapshot();
  }

  private rebuildSelectedCompanyJobSnapshot(): void {
    this.companyResourcePrimaryJobSnapshot = this.selectedCompanyJobsSnapshot.find((job) => job.id === this.selectedCompanyJobId)
      ?? this.selectedCompanyJobsSnapshot[0];

    const selectedCompany = this.selectedCompanySnapshot;
    this.companyResourceSummarySnapshot = selectedCompany
      ? selectedCompany.company.description?.trim()
        || `${selectedCompany.company.name} opera em ${selectedCompany.company.sector} com ${selectedCompany.recruiterCount} recruiters e ${selectedCompany.jobCount} vagas ligadas ao ecossistema.`
      : 'Selecione uma empresa para visualizar contexto, recruiters e vagas vinculadas no ecossistema.';
    this.companyResourceMetricLabelSnapshot = selectedCompany
      ? `${selectedCompany.jobCount} vagas ativas`
      : 'Sem operação ativa';

    const primaryJob = this.companyResourcePrimaryJobSnapshot;
    this.companyResourceAvatarBadgesSnapshot = primaryJob ? this.jobCandidateAvatarBadges(primaryJob) : [];
    this.companyResourceAvatarExtraCountSnapshot = primaryJob ? this.jobCandidateAvatarExtraCount(primaryJob) : 0;
    this.companyResourceStacksSnapshot = this.buildPrimaryJobStacks(primaryJob);
    this.companyResourceAdherenceSnapshot = this.selectedCompanyJobsSnapshot.length
      ? Math.round(this.selectedCompanyJobsSnapshot.reduce((sum, job) => sum + job.match, 0) / this.selectedCompanyJobsSnapshot.length)
      : 0;

    this.resourcePanelJobSnapshot = primaryJob
      ? {
          id: primaryJob.id,
          code: primaryJob.code,
          title: primaryJob.title,
          company: primaryJob.company,
          companyLogoUrl: primaryJob.companyLogoUrl,
          homeAnnouncementImageUrl: primaryJob.homeAnnouncementImageUrl,
          recruiterVideoUrl: primaryJob.recruiterVideoUrl,
          recruiterVideoPosterUrl: primaryJob.recruiterVideoPosterUrl,
          location: primaryJob.location,
          workModel: primaryJob.workModel,
          contractType: primaryJob.contractType,
          salaryRange: primaryJob.salaryRange,
          radarAdherenceThreshold: primaryJob.radarAdherenceThreshold,
          techStack: primaryJob.techStack,
        }
      : this.fallbackResourcePanelJob;
    this.resourcePanelStacksSnapshot = this.companyResourceStacksSnapshot.length
      ? this.companyResourceStacksSnapshot
      : this.buildPrimaryJobStacks(this.companyResourcePrimaryJobSnapshot);
    this.resourcePanelAdherenceSnapshot = this.companyResourceAdherenceSnapshot || 91;
    this.resourcePanelSalarySnapshot = this.resourcePanelJobSnapshot.salaryRange?.trim() || 'R$ 9.500 - R$ 12.000';
    void this.refreshSelectedCompanyRecruiterVideoUrl();
    void this.refreshSelectedCompanyRecruiterPosterUrl();

    this.selectedCompanyCandidatesSnapshot = primaryJob
      ? this.companyJobCandidates(primaryJob)
          .slice()
          .sort((left, right) => right.match - left.match || left.name.localeCompare(right.name, 'pt-BR'))
          .map((candidate, index) => {
            const candidateProfile = this.findTalentProfileByName(candidate.name);

            return {
              id: candidate.id?.trim() || `${primaryJob.id}:${candidate.name}:${index}`,
              name: candidate.name,
              role: candidate.role?.trim() || this.resourcePanelJobSnapshot.title,
              location: candidate.location?.trim() || this.resourcePanelJobSnapshot.location,
              avatarUrl: this.resolveAvatar(candidate.avatar),
              educationLabel: this.buildCandidateEducationLabel(candidateProfile),
              educationStatus: this.buildCandidateEducationStatus(candidateProfile),
              videoUrl: candidateProfile?.basicDraft.candidateVideoUrl?.trim() || undefined,
              videoPosterUrl: candidateProfile?.basicDraft.candidateVideoPosterUrl?.trim() || undefined,
              topStacks: this.buildCandidateTopStacks(candidate, this.resourcePanelJobSnapshot).slice(0, 3),
            };
          })
      : [];

    if (!this.selectedCompanyCandidatesSnapshot.some((candidate) => candidate.id === this.selectedCandidateId)) {
      this.selectedCandidateId = this.selectedCompanyCandidatesSnapshot[0]?.id ?? '';
    }
    this.selectedCompanyCandidateSnapshot = this.selectedCompanyCandidatesSnapshot.find((candidate) => candidate.id === this.selectedCandidateId);
    void this.refreshSelectedCompanyCandidateVideoUrl();
    void this.refreshSelectedCompanyCandidatePosterUrl();

    this.candidateTotalPagesSnapshot = Math.max(1, Math.ceil(this.selectedCompanyCandidatesSnapshot.length / this.candidatePageSize));
    if (this.candidateCurrentPage > this.candidateTotalPagesSnapshot) {
      this.candidateCurrentPage = this.candidateTotalPagesSnapshot;
    }
    const start = (this.candidateCurrentPage - 1) * this.candidatePageSize;
    this.pagedSelectedCompanyCandidatesSnapshot = this.selectedCompanyCandidatesSnapshot.slice(start, start + this.candidatePageSize);
    this.candidateVisiblePagesSnapshot = this.buildVisiblePages(this.candidateTotalPagesSnapshot, this.candidateCurrentPage);
  }

  private buildPrimaryJobStacks(job: MockJobRecord | undefined): Array<{ name: string; match: number }> {
    if (!job) {
      return [];
    }

    return [...job.techStack]
      .sort((left, right) => right.match - left.match)
      .slice(0, 3)
      .map((stack) => ({
        name: stack.name,
        match: stack.match,
      }));
  }

  private buildVisiblePages(total: number, current: number): number[] {
    if (total <= 4) {
      return Array.from({ length: total }, (_value, index) => index + 1);
    }

    if (current <= 2) {
      return [1, 2, 3, 4];
    }

    if (current >= total - 1) {
      return [total - 3, total - 2, total - 1, total];
    }

    return [current - 1, current, current + 1, current + 2];
  }

  private resolveDefaultSelectedCompanyId(): string {
    const filteredWithJobs = this.filteredCompaniesSnapshot.find((entry) => entry.jobCount > 0)?.company.id;
    if (filteredWithJobs) {
      return filteredWithJobs;
    }

    const allWithJobs = this.companyViewModels.find((entry) => entry.jobCount > 0)?.company.id;
    if (allWithJobs) {
      return allWithJobs;
    }

    return this.filteredCompaniesSnapshot[0]?.company.id ?? this.companyViewModels[0]?.company.id ?? '';
  }

  private createEmptyForm(): CompanyFormModel {
    return {
      id: '',
      name: '',
      sector: '',
      location: '',
      description: '',
      logoUrl: '',
      panelImageUrl: '',
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

  private normalizeCompanyKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLocaleLowerCase('pt-BR');
  }

  private createSyntheticCompanyFromJob(job: MockJobRecord): CompanyRecord {
    const now = new Date().toISOString();

    return {
      id: `synthetic-company-${job.company.toLocaleLowerCase('pt-BR').replace(/[^a-z0-9]+/g, '-')}`,
      name: job.company,
      sector: 'Tecnologia',
      location: job.location || 'Brasil',
      description: job.summary?.trim() || `Empresa vinculada pela massa de vagas em ${job.title}.`,
      followers: '0 seguidores',
      linkedinCount: '0 no LinkedIn',
      logoLabel: this.buildLogoLabel(job.company).toLowerCase(),
      logoUrl: job.companyLogoUrl?.trim() || undefined,
      panelImageUrl: undefined,
      website: undefined,
      emailDomain: undefined,
      monthlyHiringCount: Math.max(1, job.talents || job.candidates?.length || 0),
      active: true,
      notes: 'Empresa derivada automaticamente das vagas do ecossistema.',
      createdAt: now,
      updatedAt: now,
    };
  }

  private async refreshSelectedCompanyRecruiterVideoUrl(): Promise<void> {
    const recruiterVideoRef = this.resourcePanelJobSnapshot.recruiterVideoUrl?.trim() || '';
    const resolveToken = ++this.recruiterVideoResolveToken;
    this.revokeSelectedCompanyRecruiterVideoResolvedUrl();

    if (!recruiterVideoRef) {
      if (resolveToken !== this.recruiterVideoResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterVideoResolvedUrl = 'assets/videos/VG-0001-Recruiter.mp4';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(recruiterVideoRef)) {
      if (resolveToken !== this.recruiterVideoResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterVideoResolvedUrl = recruiterVideoRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(recruiterVideoRef);
      if (
        resolveToken !== this.recruiterVideoResolveToken
        || recruiterVideoRef !== (this.resourcePanelJobSnapshot.recruiterVideoUrl?.trim() || '')
      ) {
        return;
      }
      this.selectedCompanyRecruiterVideoResolvedUrl = blob
        ? URL.createObjectURL(blob)
        : 'assets/videos/VG-0001-Recruiter.mp4';
    } catch {
      if (resolveToken !== this.recruiterVideoResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterVideoResolvedUrl = 'assets/videos/VG-0001-Recruiter.mp4';
    }

    this.cdr.markForCheck();
  }

  private revokeSelectedCompanyRecruiterVideoResolvedUrl(): void {
    if (!this.selectedCompanyRecruiterVideoResolvedUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.selectedCompanyRecruiterVideoResolvedUrl);
    this.selectedCompanyRecruiterVideoResolvedUrl = 'assets/videos/VG-0001-Recruiter.mp4';
  }

  private async refreshSelectedCompanyRecruiterPosterUrl(): Promise<void> {
    const recruiterPosterRef = this.resourcePanelJobSnapshot.recruiterVideoPosterUrl?.trim() || '';
    const resolveToken = ++this.recruiterPosterResolveToken;
    this.revokeSelectedCompanyRecruiterPosterResolvedUrl();

    if (!recruiterPosterRef) {
      if (resolveToken !== this.recruiterPosterResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterPosterResolvedUrl = this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(recruiterPosterRef)) {
      if (resolveToken !== this.recruiterPosterResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterPosterResolvedUrl = recruiterPosterRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(recruiterPosterRef);
      if (
        resolveToken !== this.recruiterPosterResolveToken
        || recruiterPosterRef !== (this.resourcePanelJobSnapshot.recruiterVideoPosterUrl?.trim() || '')
      ) {
        return;
      }
      this.selectedCompanyRecruiterPosterResolvedUrl = blob
        ? URL.createObjectURL(blob)
        : (this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png');
    } catch {
      if (resolveToken !== this.recruiterPosterResolveToken) {
        return;
      }
      this.selectedCompanyRecruiterPosterResolvedUrl = this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png';
    }

    this.cdr.markForCheck();
  }

  private revokeSelectedCompanyRecruiterPosterResolvedUrl(): void {
    if (!this.selectedCompanyRecruiterPosterResolvedUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.selectedCompanyRecruiterPosterResolvedUrl);
    this.selectedCompanyRecruiterPosterResolvedUrl = 'assets/images/image-video.png';
  }

  private async refreshSelectedCompanyCandidateVideoUrl(): Promise<void> {
    const candidateVideoRef = this.selectedCompanyCandidateSnapshot?.videoUrl?.trim() || '';
    const resolveToken = ++this.candidateVideoResolveToken;
    this.revokeSelectedCompanyCandidateVideoResolvedUrl();

    if (!candidateVideoRef) {
      if (resolveToken !== this.candidateVideoResolveToken) {
        return;
      }
      this.selectedCompanyCandidateVideoResolvedUrl = 'assets/videos/VG-0001.mp4';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(candidateVideoRef)) {
      if (resolveToken !== this.candidateVideoResolveToken) {
        return;
      }
      this.selectedCompanyCandidateVideoResolvedUrl = candidateVideoRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(candidateVideoRef);
      if (
        resolveToken !== this.candidateVideoResolveToken
        || candidateVideoRef !== (this.selectedCompanyCandidateSnapshot?.videoUrl?.trim() || '')
      ) {
        return;
      }
      this.selectedCompanyCandidateVideoResolvedUrl = blob
        ? URL.createObjectURL(blob)
        : 'assets/videos/VG-0001.mp4';
    } catch {
      if (resolveToken !== this.candidateVideoResolveToken) {
        return;
      }
      this.selectedCompanyCandidateVideoResolvedUrl = 'assets/videos/VG-0001.mp4';
    }

    this.cdr.markForCheck();
  }

  private revokeSelectedCompanyCandidateVideoResolvedUrl(): void {
    if (!this.selectedCompanyCandidateVideoResolvedUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.selectedCompanyCandidateVideoResolvedUrl);
    this.selectedCompanyCandidateVideoResolvedUrl = 'assets/videos/VG-0001.mp4';
  }

  private async refreshSelectedCompanyCandidatePosterUrl(): Promise<void> {
    const candidatePosterRef = this.selectedCompanyCandidateSnapshot?.videoPosterUrl?.trim() || '';
    const resolveToken = ++this.candidatePosterResolveToken;
    this.revokeSelectedCompanyCandidatePosterResolvedUrl();

    if (!candidatePosterRef) {
      if (resolveToken !== this.candidatePosterResolveToken) {
        return;
      }
      this.selectedCompanyCandidatePosterResolvedUrl = this.selectedCompanyCandidateSnapshot?.avatarUrl || this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png';
      this.cdr.markForCheck();
      return;
    }

    if (!this.localMediaStorage.isLocalMediaRef(candidatePosterRef)) {
      if (resolveToken !== this.candidatePosterResolveToken) {
        return;
      }
      this.selectedCompanyCandidatePosterResolvedUrl = candidatePosterRef;
      this.cdr.markForCheck();
      return;
    }

    try {
      const blob = await this.localMediaStorage.readBlob(candidatePosterRef);
      if (
        resolveToken !== this.candidatePosterResolveToken
        || candidatePosterRef !== (this.selectedCompanyCandidateSnapshot?.videoPosterUrl?.trim() || '')
      ) {
        return;
      }
      this.selectedCompanyCandidatePosterResolvedUrl = blob
        ? URL.createObjectURL(blob)
        : (this.selectedCompanyCandidateSnapshot?.avatarUrl || this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png');
    } catch {
      if (resolveToken !== this.candidatePosterResolveToken) {
        return;
      }
      this.selectedCompanyCandidatePosterResolvedUrl = this.selectedCompanyCandidateSnapshot?.avatarUrl || this.resourcePanelVideoThumbnailUrl || 'assets/images/image-video.png';
    }

    this.cdr.markForCheck();
  }

  private revokeSelectedCompanyCandidatePosterResolvedUrl(): void {
    if (!this.selectedCompanyCandidatePosterResolvedUrl.startsWith('blob:')) {
      return;
    }

    URL.revokeObjectURL(this.selectedCompanyCandidatePosterResolvedUrl);
    this.selectedCompanyCandidatePosterResolvedUrl = 'assets/images/image-video.png';
  }
}
