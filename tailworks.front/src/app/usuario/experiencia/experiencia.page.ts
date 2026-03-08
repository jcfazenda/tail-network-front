import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

type RegistrationStep = {
  label: string;
  index: number | string;
  route?: string;
  active?: boolean;
};

type CandidateBasicProfile = {
  name: string;
  formation: string;
};

type CandidateBasicDraft = {
  profile?: Partial<CandidateBasicProfile>;
  photoPreviewUrl?: string;
};

type FormationCopyDraft = {
  graduation: string;
  specialization: string;
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  graduated: boolean;
  educationStatus: string;
};

type ExperienceEntry = {
  id: string;
  company: string;
  role: string;
  workModel: 'Presencial' | 'Híbrido' | 'Remoto';
  startMonth: string;
  startYear: string;
  endMonth: string;
  endYear: string;
  currentlyWorkingHere: boolean;
  responsibilities: string;
  positionLevel: 'Júnior' | 'Pleno' | 'Sênior' | 'Tech Lead';
  companySize: 'Startup' | 'Média' | 'Grande';
  companySegment: string;
  sector: string;
  actuation: number;
};

@Component({
  standalone: true,
  selector: 'app-experiencia-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './experiencia.page.html',
  styleUrls: ['./experiencia.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienciaPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly logoDraftStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly radarAvailabilityStorageKey = 'tailworks:candidate-experience-radar-availability:v1';

  private readonly router = inject(Router);

  readonly steps: RegistrationStep[] = [
    { index: 1, label: 'Dados Básicos', route: '/usuario/dados-cadastrais' },
    { index: 2, label: 'Suas Stacks', route: '/usuario/dados-cadastrais/stacks' },
    { index: 3, label: 'Experiência', route: '/usuario/dados-cadastrais/experiencia', active: true },
    { index: 4, label: 'Formação', route: '/usuario/dados-cadastrais/formacao' },
    { index: 5, label: 'Geral' },
  ];

  readonly workModelOptions: ExperienceEntry['workModel'][] = ['Presencial', 'Híbrido', 'Remoto'];
  readonly positionLevelOptions: ExperienceEntry['positionLevel'][] = ['Júnior', 'Pleno', 'Sênior', 'Tech Lead'];
  readonly companySizeOptions: ExperienceEntry['companySize'][] = ['Startup', 'Média', 'Grande'];
  readonly companyOptions = ['Banco Itaú - SA', 'NTT Data', 'Accenture', 'Stefanini', 'Compass UOL', 'CI&T', 'Avanade'];
  readonly roleOptions = ['Desenvolvedor .Sr.', 'Backend .NET Developer', 'Lead Engineer Tecnologia', 'Analista de Requisitos', 'Desenvolvedor Full Stack', 'Tech Lead', 'QA Engineer'];
  readonly companySegmentOptions = ['Banco', 'Fintech', 'Consultoria', 'SaaS', 'Varejo', 'Indústria'];
  readonly sectorOptions = ['Tecnologia', 'Produto', 'Dados', 'Operações', 'Comercial', 'Administrativo'];
  readonly monthOptions = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  readonly yearOptions = Array.from({ length: 21 }, (_value, index) => String(2026 - index));
  readonly acceptedLogoMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  readonly maxLogoSizeBytes = 5 * 1024 * 1024;
  readonly defaultIntroLogoUrl = '/assets/images/logo-estacio.png';

  profile: CandidateBasicProfile = {
    name: '',
    formation: '',
  };
  photoPreviewUrl = '';
  introLogoUrl = this.defaultIntroLogoUrl;
  introLogoError = '';
  isFormationModalOpen = false;
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
    startMonth: 'Jan',
    startYear: '2021',
    endMonth: 'Dez',
    endYear: '2025',
    graduated: true,
    educationStatus: 'Concluído',
  };
  formationDraft: FormationCopyDraft = { ...this.formationCopy };
  isAvailableInRadar = true;

  experiences: ExperienceEntry[] = [];
  isExperienceModalOpen = false;
  submitAttempted = false;
  experienceModalError = '';
  editingExperienceIndex: number | null = null;
  expandedResponsibilityIndex: number | null = null;

  experienceDraft: ExperienceEntry = this.createEmptyExperienceDraft();

  readonly trackByExperience = (_index: number, experience: ExperienceEntry): string => experience.id;

  get displayName(): string {
    return this.profile.name.trim() || 'Seu nome';
  }

  get displayFormation(): string {
    return this.profile.formation.trim() || 'Sua formação';
  }

  get displayGraduation(): string {
    return this.formationCopy.graduation;
  }

  get displaySpecialization(): string {
    return this.formationCopy.specialization;
  }

  get displayEducationStatus(): string {
    return this.formationCopy.educationStatus;
  }

  get displayFormationHeading(): string {
    return this.formationCopy.graduated
      ? `Formado em ${this.formationCopy.endMonth} ${this.formationCopy.endYear}`
      : 'Cursando';
  }

  get displayExperienceHeading(): string {
    return this.experiences.some((experience) => experience.currentlyWorkingHere)
      ? 'Atualmente trabalhando'
      : 'Procurando oportunidade';
  }

  get availableCompanyOptions(): string[] {
    return this.getDraftAwareOptions(this.companyOptions, this.experienceDraft.company);
  }

  get availableRoleOptions(): string[] {
    return this.getDraftAwareOptions(this.roleOptions, this.experienceDraft.role);
  }

  get experienceModalTitle(): string {
    return this.editingExperienceIndex === null ? 'Adicionar Experiência' : 'Editar Atuação';
  }

  get experienceModalSubmitLabel(): string {
    return this.editingExperienceIndex === null ? 'Adicionar' : 'Salvar';
  }

  get isEditingExperience(): boolean {
    return this.editingExperienceIndex !== null;
  }

  get experienceDraftTimeline(): string {
    const endLabel = this.experienceDraft.currentlyWorkingHere
      ? 'Atual'
      : `${this.experienceDraft.endMonth} ${this.experienceDraft.endYear}`;

    return `${this.experienceDraft.startMonth} ${this.experienceDraft.startYear} • ${endLabel}`;
  }

  get experienceDraftStartDateValue(): string {
    return this.composeDateInputValue(this.experienceDraft.startYear, this.experienceDraft.startMonth);
  }

  get experienceDraftEndDateValue(): string {
    return this.composeDateInputValue(this.experienceDraft.endYear, this.experienceDraft.endMonth);
  }

  ngOnInit(): void {
    this.restoreBasicDraft();
    this.restoreExperiences();
    this.restoreIntroLogo();
    this.restoreFormationCopy();
    this.restoreRadarAvailability();
  }

  openFormationModal(): void {
    this.formationDraft = { ...this.formationCopy };
    this.isFormationModalOpen = true;
  }

  closeFormationModal(): void {
    this.isFormationModalOpen = false;
  }

  saveFormationCopy(form: NgForm): void {
    if (form.invalid) {
      return;
    }

    this.formationCopy = {
      graduation: this.formationDraft.graduation.trim(),
      specialization: this.formationDraft.specialization.trim(),
      startMonth: this.formationDraft.startMonth,
      startYear: this.formationDraft.startYear,
      endMonth: this.formationDraft.endMonth,
      endYear: this.formationDraft.endYear,
      graduated: this.formationDraft.graduated,
      educationStatus: this.formationDraft.graduated ? 'Concluído' : `${this.formationDraft.startMonth}/${this.formationDraft.startYear}`,
    };
    this.persistFormationCopy();
    this.closeFormationModal();
  }

  openIntroLogoPicker(input: HTMLInputElement): void {
    input.click();
  }

  onIntroLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.handleIntroLogoFile(input?.files?.[0] ?? null);

    if (input) {
      input.value = '';
    }
  }

  onIntroLogoKeydown(event: KeyboardEvent, input: HTMLInputElement): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openIntroLogoPicker(input);
  }

  openExperienceModal(): void {
    this.experienceDraft = this.createEmptyExperienceDraft();
    this.editingExperienceIndex = null;
    this.submitAttempted = false;
    this.experienceModalError = '';
    this.isExperienceModalOpen = true;
  }

  openEditExperienceModal(index: number): void {
    const current = this.experiences[index];

    if (!current) {
      return;
    }

    this.experienceDraft = { ...current };
    this.editingExperienceIndex = index;
    this.submitAttempted = false;
    this.experienceModalError = '';
    this.isExperienceModalOpen = true;
  }

  closeExperienceModal(): void {
    this.isExperienceModalOpen = false;
    this.editingExperienceIndex = null;
    this.submitAttempted = false;
    this.experienceModalError = '';
  }

  saveExperience(form: NgForm): void {
    this.submitAttempted = true;
    this.experienceModalError = '';

    if (form.invalid) {
      return;
    }

    if (this.editingExperienceIndex !== null) {
      const current = this.experiences[this.editingExperienceIndex];

      if (!current) {
        return;
      }

      this.experiences = this.experiences.map((item, index) =>
        index === this.editingExperienceIndex
          ? {
              ...item,
              responsibilities: this.experienceDraft.responsibilities.trim(),
              id: current.id,
            }
          : item,
      );
    } else {
      this.experiences = [...this.experiences, { ...this.experienceDraft }];
    }

    this.persistExperiences();
    this.closeExperienceModal();
  }

  removeExperience(index: number): void {
    if (!this.experiences[index]) {
      return;
    }

    this.experiences = this.experiences.filter((_, itemIndex) => itemIndex !== index);

    if (this.expandedResponsibilityIndex === index) {
      this.expandedResponsibilityIndex = null;
    } else if (this.expandedResponsibilityIndex !== null && this.expandedResponsibilityIndex > index) {
      this.expandedResponsibilityIndex -= 1;
    }

    this.persistExperiences();
  }

  deleteEditingExperience(): void {
    if (this.editingExperienceIndex === null) {
      return;
    }

    this.removeExperience(this.editingExperienceIndex);
    this.closeExperienceModal();
  }

  toggleResponsibilities(index: number): void {
    const current = this.experiences[index];

    if (!current?.responsibilities.trim()) {
      return;
    }

    this.expandedResponsibilityIndex = this.expandedResponsibilityIndex === index ? null : index;
  }

  updateExperienceActuation(index: number, nextValue: number | string): void {
    const current = this.experiences[index];

    if (!current) {
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    current.actuation = Math.max(0, Math.min(100, Math.round(parsedValue)));
    this.persistExperiences();
  }

  updateExperienceDraftDate(kind: 'start' | 'end', value: string): void {
    if (!value) {
      return;
    }

    const [year, month] = value.split('-');
    const parsedMonth = Number(month);
    const monthLabel = this.monthOptions[parsedMonth - 1];

    if (!year || !monthLabel) {
      return;
    }

    if (kind === 'start') {
      this.experienceDraft.startYear = year;
      this.experienceDraft.startMonth = monthLabel;
      return;
    }

    this.experienceDraft.endYear = year;
    this.experienceDraft.endMonth = monthLabel;
  }

  showFieldError(form: NgForm, fieldName: keyof ExperienceEntry): boolean {
    const control = form.controls[fieldName];
    return Boolean(control && control.invalid && (control.touched || this.submitAttempted));
  }

  continueToFormation(): void {
    void this.router.navigate(['/usuario/dados-cadastrais/formacao']);
  }

  updateRadarAvailability(nextValue: boolean): void {
    this.isAvailableInRadar = nextValue;
    this.persistRadarAvailability();
  }

  private restoreBasicDraft(): void {
    const rawDraft = localStorage.getItem(ExperienciaPage.basicDraftStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as CandidateBasicDraft;
      this.profile = {
        ...this.profile,
        ...draft.profile,
      };
      this.photoPreviewUrl = draft.photoPreviewUrl ?? '';
    } catch {
      localStorage.removeItem(ExperienciaPage.basicDraftStorageKey);
    }
  }

  private restoreExperiences(): void {
    const rawDraft = localStorage.getItem(ExperienciaPage.storageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Array<Partial<ExperienceEntry>>;
      this.experiences = Array.isArray(draft) ? draft.map((item) => this.normalizeExperience(item)) : [];
    } catch {
      localStorage.removeItem(ExperienciaPage.storageKey);
    }
  }

  private persistExperiences(): void {
    localStorage.setItem(ExperienciaPage.storageKey, JSON.stringify(this.experiences));
  }

  private restoreIntroLogo(): void {
    const savedLogo = localStorage.getItem(ExperienciaPage.logoDraftStorageKey);

    if (!savedLogo) {
      return;
    }

    this.introLogoUrl = savedLogo;
  }

  private persistIntroLogo(): void {
    localStorage.setItem(ExperienciaPage.logoDraftStorageKey, this.introLogoUrl);
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(ExperienciaPage.formationCopyStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<FormationCopyDraft>;
      this.formationCopy = {
        graduation: draft.graduation?.trim() || this.formationCopy.graduation,
        specialization: draft.specialization?.trim() || this.formationCopy.specialization,
        startMonth: draft.startMonth || this.formationCopy.startMonth,
        startYear: draft.startYear || this.formationCopy.startYear,
        endMonth: draft.endMonth || this.formationCopy.endMonth,
        endYear: draft.endYear || this.formationCopy.endYear,
        graduated: typeof draft.graduated === 'boolean' ? draft.graduated : this.formationCopy.graduated,
        educationStatus: draft.educationStatus?.trim() || this.formationCopy.educationStatus,
      };
    } catch {
      localStorage.removeItem(ExperienciaPage.formationCopyStorageKey);
    }
  }

  private persistFormationCopy(): void {
    localStorage.setItem(ExperienciaPage.formationCopyStorageKey, JSON.stringify(this.formationCopy));
  }

  private restoreRadarAvailability(): void {
    const rawDraft = localStorage.getItem(ExperienciaPage.radarAvailabilityStorageKey);

    if (rawDraft === null) {
      return;
    }

    this.isAvailableInRadar = rawDraft === 'true';
  }

  private persistRadarAvailability(): void {
    localStorage.setItem(ExperienciaPage.radarAvailabilityStorageKey, String(this.isAvailableInRadar));
  }

  private handleIntroLogoFile(file: File | null): void {
    this.introLogoError = '';

    if (!file) {
      return;
    }

    if (!this.acceptedLogoMimeTypes.includes(file.type)) {
      this.introLogoError = 'Use JPG, PNG, GIF ou WEBP.';
      return;
    }

    if (file.size > this.maxLogoSizeBytes) {
      this.introLogoError = 'A imagem deve ter no máximo 5MB.';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      this.introLogoUrl = typeof reader.result === 'string' ? reader.result : this.defaultIntroLogoUrl;
      this.persistIntroLogo();
    };

    reader.readAsDataURL(file);
  }

  private createEmptyExperienceDraft(): ExperienceEntry {
    return {
      id: this.createExperienceId(),
      company: '',
      role: '',
      workModel: 'Híbrido',
      startMonth: 'Jan',
      startYear: '2026',
      endMonth: 'Jan',
      endYear: '2026',
      currentlyWorkingHere: false,
      responsibilities: '',
      positionLevel: 'Sênior',
      companySize: 'Média',
      companySegment: 'Banco',
      sector: 'Tecnologia',
      actuation: 70,
    };
  }

  private normalizeExperience(item: Partial<ExperienceEntry>): ExperienceEntry {
    const draft = this.createEmptyExperienceDraft();

    return {
      ...draft,
      ...item,
      id: item.id ?? this.createExperienceId(),
      company: item.company?.trim() ?? '',
      role: item.role?.trim() ?? '',
      responsibilities: item.responsibilities?.trim() ?? '',
      actuation: typeof item.actuation === 'number' ? item.actuation : draft.actuation,
    };
  }

  private createExperienceId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private composeDateInputValue(year: string, monthLabel: string): string {
    const monthIndex = this.monthOptions.indexOf(monthLabel);

    if (!year || monthIndex < 0) {
      return '';
    }

    return `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  }

  private getDraftAwareOptions(options: string[], currentValue: string): string[] {
    const trimmed = currentValue.trim();

    if (!trimmed || options.includes(trimmed)) {
      return options;
    }

    return [trimmed, ...options];
  }
}
