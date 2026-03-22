import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '../../core/facades/auth.facade';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { STACK_KNOWLEDGE_GUIDES, StackGuideTier, StackKnowledgeGuide } from '../stacks/stack-knowledge-guides';

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
  appliedStacks: ExperienceStackChip[];
};

type ExperienceStackChip = {
  repoId?: string;
  name: string;
  knowledge: number;
  description: string;
  certificate?: {
    name: string;
    type: string;
    size: number;
    updatedAt: string;
  };
};

type ExperienceStackRepoItem = {
  id: string;
  name: string;
};

type SeniorityLevel = 'jr' | 'pleno' | 'senior' | 'especialista';

@Component({
  standalone: true,
  selector: 'app-experiencia-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './experiencia.page.html',
  styleUrls: [
    './experiencia.page.identity.scss',
    './experiencia.page.editor.scss',
    './experiencia.page.modal.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienciaPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly logoDraftStorageKey = 'tailworks:candidate-experience-logo-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly ecosystemVisibilityStorageKey = 'tailworks:candidate-experience-ecosystem-visibility:v1';
  private static readonly candidacyAvailabilityStorageKey = 'tailworks:candidate-experience-candidacy-availability:v1';
  private static readonly stackDescriptionMaxLength = 920;
  private static readonly monthOrder = new Map<string, number>([
    ['jan', 1],
    ['janeiro', 1],
    ['fev', 2],
    ['fevereiro', 2],
    ['mar', 3],
    ['marco', 3],
    ['abril', 4],
    ['abr', 4],
    ['mai', 5],
    ['maio', 5],
    ['jun', 6],
    ['junho', 6],
    ['jul', 7],
    ['julho', 7],
    ['ago', 8],
    ['agosto', 8],
    ['set', 9],
    ['setembro', 9],
    ['out', 10],
    ['outubro', 10],
    ['nov', 11],
    ['novembro', 11],
    ['dez', 12],
    ['dezembro', 12],
  ]);

  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacade);
  private readonly talentProfileStore = inject(TalentProfileStoreService);

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
  readonly defaultIntroLogoUrl = '/assets/images/formacao-default.png';

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
  isVisibleInEcosystem = true;
  isAvailableForApplications = true;

  experiences: ExperienceEntry[] = [];
  currentExperienceIndex: number | null = null;
  isExperienceModalOpen = false;
  submitAttempted = false;
  experienceModalError = '';
  editingExperienceIndex: number | null = null;
  expandedResponsibilityIndex: number | null = null;
  editingResponsibilityIndex: number | null = null;
  responsibilityDraft = '';
  isExperienceStackModalOpen = false;
  editingExperienceStackIndex: number | null = null;
  expandedExperienceStackDescriptionIndex: number | null = null;
  expandedExperienceGuideIndex: number | null = null;
  experienceStackDraftName = '';
  experienceStackDraftRepoId = '';
  experienceStackDraftDescription = '';
  experienceStackModalError = '';
  @ViewChild('responsibilityInlineEditor') private responsibilityInlineEditor?: ElementRef<HTMLDivElement>;
  @ViewChild('experienceStackDescriptionEditor') private experienceStackDescriptionEditor?: ElementRef<HTMLDivElement>;

  experienceDraft: ExperienceEntry = this.createEmptyExperienceDraft();

  readonly trackByExperience = (_index: number, experience: ExperienceEntry): string => experience.id;
  readonly trackByExperienceStackName = (_index: number, stack: ExperienceStackChip): string => stack.name;
  readonly experienceStackCatalog: ExperienceStackRepoItem[] = [
    { id: 'repo:dotnet', name: '.NET / C#' },
    { id: 'repo:csharp', name: 'C#' },
    { id: 'repo:aspnet-core', name: 'ASP.NET Core' },
    { id: 'repo:entity-framework', name: 'Entity Framework' },
    { id: 'repo:rest-api', name: 'REST API' },
    { id: 'repo:microservices', name: 'Microservices' },
    { id: 'repo:rabbitmq', name: 'RabbitMQ' },
    { id: 'repo:kafka', name: 'Kafka' },
    { id: 'repo:java', name: 'Java / Spring' },
    { id: 'repo:nodejs', name: 'Node.js' },
    { id: 'repo:angular', name: 'Angular' },
    { id: 'repo:react', name: 'React' },
    { id: 'repo:typescript', name: 'TypeScript' },
    { id: 'repo:javascript', name: 'JavaScript' },
    { id: 'repo:html', name: 'HTML' },
    { id: 'repo:css', name: 'CSS' },
    { id: 'repo:sql-server', name: 'SQL Server' },
    { id: 'repo:postgresql', name: 'PostgreSQL' },
    { id: 'repo:mysql', name: 'MySQL' },
    { id: 'repo:mongodb', name: 'MongoDB' },
    { id: 'repo:redis', name: 'Redis' },
    { id: 'repo:elasticsearch', name: 'Elasticsearch' },
    { id: 'repo:aws', name: 'AWS' },
    { id: 'repo:azure', name: 'Azure' },
    { id: 'repo:gcp', name: 'Google Cloud' },
    { id: 'repo:cloudwatch', name: 'Cloud Monitoring' },
    { id: 'repo:serverless', name: 'Serverless' },
    { id: 'repo:docker', name: 'Docker' },
    { id: 'repo:kubernetes', name: 'Kubernetes' },
    { id: 'repo:terraform', name: 'Terraform' },
    { id: 'repo:github-actions', name: 'GitHub Actions' },
    { id: 'repo:gitlab-ci', name: 'GitLab CI' },
    { id: 'repo:linux', name: 'Linux' },
    { id: 'repo:nginx', name: 'Nginx' },
    { id: 'repo:flutter', name: 'Flutter' },
    { id: 'repo:react-native', name: 'React Native' },
    { id: 'repo:kotlin', name: 'Kotlin' },
    { id: 'repo:swift', name: 'Swift' },
    { id: 'repo:android', name: 'Android' },
    { id: 'repo:ios', name: 'iOS' },
    { id: 'repo:python', name: 'Python' },
    { id: 'repo:python-ml', name: 'IA / ML' },
    { id: 'repo:qa-automation', name: 'QA Automação' },
    { id: 'repo:security', name: 'Segurança' },
    { id: 'repo:ux', name: 'UX / UI' },
    { id: 'repo:figma', name: 'Figma' },
  ];
  private readonly acceptedCertificateMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  private readonly maxCertificateSizeBytes = 8 * 1024 * 1024;
  private readonly stackPurposeCopy: Record<string, { summary: string; levels: Record<SeniorityLevel, string[]> }> = {
    'repo:dotnet': {
      summary: 'Capacidade de construir APIs, serviços e sustentação backend com qualidade, segurança e performance.',
      levels: {
        jr: ['Implementa rotinas simples, entende controllers, serviços e consultas com orientação.'],
        pleno: ['Modela camadas, validações e integrações com autonomia e cuidado com qualidade.'],
        senior: ['Desenha soluções, melhora performance e define padrões consistentes para o time.'],
        especialista: ['Define arquitetura, resolve gargalos complexos e eleva a plataforma técnica.'],
      },
    },
    'repo:angular': {
      summary: 'Construção de interfaces, componentes e fluxos com foco em organização, performance e UX.',
      levels: {
        jr: ['Cria componentes e mantém telas existentes com apoio do time.'],
        pleno: ['Estrutura módulos, estados e componentes reutilizáveis com autonomia.'],
        senior: ['Orquestra arquitetura front, performance e boas práticas de design system.'],
        especialista: ['Define padrões escaláveis de frontend e eleva a experiência do produto.'],
      },
    },
    'repo:azure': {
      summary: 'Uso prático de serviços cloud com governança, segurança, deploy e operação.',
      levels: {
        jr: ['Navega em recursos básicos e executa rotinas guiadas em cloud.'],
        pleno: ['Configura ambientes, monitora recursos e automatiza fluxos recorrentes.'],
        senior: ['Desenha arquitetura cloud e responde por observabilidade e segurança.'],
        especialista: ['Resolve desenho de plataforma, custo, segurança e escala em alto nível.'],
      },
    },
  };

  get displayName(): string {
    return this.profile.name.trim() || 'Julio Fazenda';
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

  get currentExperience(): ExperienceEntry | null {
    if (!this.experiences.length) {
      return null;
    }

    const safeIndex = this.currentExperienceIndex ?? 0;
    return this.experiences[safeIndex] ?? this.experiences[0];
  }

  get currentExperiencePageNumber(): number {
    if (!this.currentExperience) {
      return 0;
    }

    return (this.currentExperienceIndex ?? 0) + 1;
  }

  get canGoToPreviousExperience(): boolean {
    return (this.currentExperienceIndex ?? 0) > 0;
  }

  get canGoToNextExperience(): boolean {
    return (this.currentExperienceIndex ?? 0) < this.experiences.length - 1;
  }

  get currentExperienceStacks(): ExperienceStackChip[] {
    if (!this.currentExperience) {
      return [];
    }

    return this.currentExperience.appliedStacks ?? [];
  }

  get isEditingExperience(): boolean {
    return this.editingExperienceIndex !== null;
  }

  get experienceStackModalTitle(): string {
    return this.editingExperienceStackIndex === null ? 'Adicionar Stack' : 'Editar Stack aplicada';
  }

  get experienceStackModalSubmitLabel(): string {
    return this.editingExperienceStackIndex === null ? 'Adicionar' : 'Salvar';
  }

  get experienceStackDescriptionCharacters(): number {
    return this.getRichContentPlainText(this.experienceStackDraftDescription).length;
  }

  get isExperienceStackDescriptionOverLimit(): boolean {
    return this.experienceStackDescriptionCharacters > ExperienciaPage.stackDescriptionMaxLength;
  }

  get canSaveExperienceStack(): boolean {
    if (this.isExperienceStackDescriptionOverLimit) {
      return false;
    }

    return this.editingExperienceStackIndex !== null || this.experienceStackDraftRepoId.trim().length > 0;
  }

  get activeExperienceGuide(): StackKnowledgeGuide | null {
    const stack = this.expandedExperienceGuideIndex !== null ? this.currentExperienceStacks[this.expandedExperienceGuideIndex] : null;
    const repoId = stack?.repoId ?? this.findExperienceStackOptionByName(stack?.name ?? '')?.id;
    return repoId ? (STACK_KNOWLEDGE_GUIDES[repoId] ?? null) : null;
  }

  get availableExperienceStackOptions(): ExperienceStackRepoItem[] {
    const used = new Set(
      this.currentExperienceStacks
        .filter((_stack, index) => index !== this.editingExperienceStackIndex)
        .map((stack) => stack.repoId ?? this.findExperienceStackOptionByName(stack.name)?.id)
        .filter((value): value is string => !!value),
    );

    return this.experienceStackCatalog.filter((item) => !used.has(item.id));
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

  percentLevelLabel(percent: number): string {
    if (percent >= 95) return 'Especialista';
    if (percent >= 80) return 'Senior';
    if (percent >= 60) return 'Avançado';
    if (percent >= 45) return 'Intermediário';
    if (percent >= 20) return 'Básico';
    if (percent > 0) return 'Iniciante';
    return 'Não marcado';
  }

  ngOnInit(): void {
    this.restoreBasicDraft();
    this.restoreExperiences();
    this.restoreIntroLogo();
    this.restoreFormationCopy();
    this.restoreExperienceToggles();
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

  openCreateExperienceStackModal(): void {
    if (!this.currentExperience) {
      return;
    }

    this.editingExperienceStackIndex = null;
    this.experienceStackDraftName = '';
    this.experienceStackDraftRepoId = '';
    this.experienceStackDraftDescription = '';
    this.experienceStackModalError = '';
    this.isExperienceStackModalOpen = true;
    this.scheduleExperienceStackEditorSync();
  }

  openEditExperienceStackModal(index: number): void {
    const current = this.currentExperienceStacks[index];

    if (!current) {
      return;
    }

    this.editingExperienceStackIndex = index;
    this.experienceStackDraftName = current.name;
    this.experienceStackDraftRepoId = current.repoId ?? this.findExperienceStackOptionByName(current.name)?.id ?? '';
    this.experienceStackDraftDescription = current.description;
    this.experienceStackModalError = '';
    this.isExperienceStackModalOpen = true;
    this.scheduleExperienceStackEditorSync();
  }

  closeExperienceModal(): void {
    this.isExperienceModalOpen = false;
    this.editingExperienceIndex = null;
    this.submitAttempted = false;
    this.experienceModalError = '';
  }

  closeExperienceStackModal(): void {
    this.isExperienceStackModalOpen = false;
    this.editingExperienceStackIndex = null;
    this.experienceStackDraftName = '';
    this.experienceStackDraftRepoId = '';
    this.experienceStackDraftDescription = '';
    this.experienceStackModalError = '';
  }

  saveExperience(form: NgForm): void {
    this.submitAttempted = true;
    this.experienceModalError = '';

    if (form.invalid) {
      return;
    }

    const normalizedDraft = this.normalizeExperience(this.experienceDraft);
    let focusExperienceId = normalizedDraft.id;

    if (this.editingExperienceIndex !== null) {
      const current = this.experiences[this.editingExperienceIndex];

      if (!current) {
        return;
      }

      focusExperienceId = current.id;
      this.experiences = this.experiences.map((item, index) =>
        index === this.editingExperienceIndex
          ? {
              ...item,
              ...normalizedDraft,
              responsibilities: normalizedDraft.responsibilities.trim(),
              id: current.id,
            }
          : item,
      );
    } else {
      this.experiences = [...this.experiences, normalizedDraft];
    }

    this.experiences = this.sortExperiencesByDateDesc(this.experiences);
    this.currentExperienceIndex = this.findExperienceIndexById(focusExperienceId);
    this.persistExperiences();
    this.activateCurrentResponsibilityEditor();
    this.closeExperienceModal();
  }

  saveExperienceStack(): void {
    const currentExperience = this.currentExperience;

    if (!currentExperience) {
      return;
    }

    const selectedOption = this.experienceStackCatalog.find((item) => item.id === this.experienceStackDraftRepoId);
    const trimmedName = (selectedOption?.name ?? this.experienceStackDraftName).trim();
    const description = this.experienceStackDraftDescription.trim();
    this.experienceStackModalError = '';

    if (this.isExperienceStackDescriptionOverLimit) {
      this.experienceStackModalError = 'A descrição excedeu o limite de caracteres.';
      return;
    }

    if (this.editingExperienceStackIndex !== null) {
      const current = this.currentExperienceStacks[this.editingExperienceStackIndex];

      if (!current) {
        return;
      }

      this.updateCurrentExperience((experience) => ({
        ...experience,
        appliedStacks: experience.appliedStacks.map((item, index) =>
          index === this.editingExperienceStackIndex
            ? {
                ...item,
                description,
              }
            : item,
        ),
      }));
      this.closeExperienceStackModal();
      return;
    }

    if (!trimmedName) {
      this.experienceStackModalError = 'Selecione uma stack para adicionar.';
      return;
    }

    const duplicated = currentExperience.appliedStacks.some(
      (item) => item.name.toLocaleLowerCase('pt-BR') === trimmedName.toLocaleLowerCase('pt-BR'),
    );

    if (duplicated) {
      this.experienceStackModalError = 'Essa stack já foi adicionada nesta experiência.';
      return;
    }

    this.updateCurrentExperience((experience) => ({
      ...experience,
      appliedStacks: [
        ...experience.appliedStacks,
        this.createExperienceStackChip(trimmedName, undefined, description, selectedOption?.id),
      ],
    }));
    this.closeExperienceStackModal();
  }

  removeExperience(index: number): void {
    if (!this.experiences[index]) {
      return;
    }

    this.experiences = this.experiences.filter((_, itemIndex) => itemIndex !== index);
    this.expandedExperienceStackDescriptionIndex = null;
    this.expandedExperienceGuideIndex = null;

    if (this.expandedResponsibilityIndex === index) {
      this.expandedResponsibilityIndex = null;
      this.editingResponsibilityIndex = null;
    } else if (this.expandedResponsibilityIndex !== null && this.expandedResponsibilityIndex > index) {
      this.expandedResponsibilityIndex -= 1;
    }

    if (this.editingResponsibilityIndex === index) {
      this.editingResponsibilityIndex = null;
      this.responsibilityDraft = '';
    } else if (this.editingResponsibilityIndex !== null && this.editingResponsibilityIndex > index) {
      this.editingResponsibilityIndex -= 1;
    }

    if (this.currentExperienceIndex === index) {
      this.currentExperienceIndex = this.experiences.length ? Math.max(0, index - 1) : null;
    } else if (this.currentExperienceIndex !== null && this.currentExperienceIndex > index) {
      this.currentExperienceIndex -= 1;
    }

    this.persistExperiences();
    this.activateCurrentResponsibilityEditor();
  }

  deleteEditingExperience(): void {
    if (this.editingExperienceIndex === null) {
      return;
    }

    this.removeExperience(this.editingExperienceIndex);
    this.closeExperienceModal();
  }

  toggleExperienceStackDescription(index: number): void {
    const current = this.currentExperienceStacks[index];

    if (!current?.description.trim()) {
      return;
    }

    this.expandedExperienceStackDescriptionIndex =
      this.expandedExperienceStackDescriptionIndex === index ? null : index;
  }

  toggleExperienceStackGuide(index: number): void {
    this.expandedExperienceGuideIndex = this.expandedExperienceGuideIndex === index ? null : index;
  }

  removeExperienceStack(index: number): void {
    if (!this.currentExperienceStacks[index]) {
      return;
    }

    this.updateCurrentExperience((experience) => ({
      ...experience,
      appliedStacks: experience.appliedStacks.filter((_, itemIndex) => itemIndex !== index),
    }));

    if (this.expandedExperienceStackDescriptionIndex === index) {
      this.expandedExperienceStackDescriptionIndex = null;
    } else if (
      this.expandedExperienceStackDescriptionIndex !== null &&
      this.expandedExperienceStackDescriptionIndex > index
    ) {
      this.expandedExperienceStackDescriptionIndex -= 1;
    }

    if (this.expandedExperienceGuideIndex === index) {
      this.expandedExperienceGuideIndex = null;
    } else if (
      this.expandedExperienceGuideIndex !== null &&
      this.expandedExperienceGuideIndex > index
    ) {
      this.expandedExperienceGuideIndex -= 1;
    }
  }

  toggleResponsibilities(index: number): void {
    const current = this.experiences[index];

    if (!current) {
      return;
    }

    this.expandedResponsibilityIndex = index;
    this.editingResponsibilityIndex = index;
    this.responsibilityDraft = current.responsibilities;
    this.scheduleResponsibilityEditorSync();
  }

  onExperienceStackDescriptionInput(event: Event): void {
    this.experienceStackDraftDescription = (event.target as HTMLDivElement).innerHTML;

    if (!this.isExperienceStackDescriptionOverLimit && this.experienceStackModalError === 'A descrição excedeu o limite de caracteres.') {
      this.experienceStackModalError = '';
    }
  }

  applyExperienceStackDescriptionFormat(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'): void {
    const editor = this.experienceStackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(command, false);
    this.experienceStackDraftDescription = editor.innerHTML;
  }

  clearExperienceStackDescriptionFormat(): void {
    const editor = this.experienceStackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    this.experienceStackDraftDescription = editor.innerHTML;
  }

  showPreviousExperience(): void {
    if (!this.canGoToPreviousExperience) {
      return;
    }

    this.currentExperienceIndex = (this.currentExperienceIndex ?? 0) - 1;
    this.expandedExperienceStackDescriptionIndex = null;
    this.activateCurrentResponsibilityEditor();
  }

  showNextExperience(): void {
    if (!this.canGoToNextExperience) {
      return;
    }

    this.currentExperienceIndex = (this.currentExperienceIndex ?? 0) + 1;
    this.expandedExperienceStackDescriptionIndex = null;
    this.activateCurrentResponsibilityEditor();
  }

  saveResponsibilitiesInline(index: number): void {
    const current = this.experiences[index];

    if (!current) {
      return;
    }

    const nextResponsibilities = this.responsibilityDraft.trim();
    const hasResponsibilities = this.hasRichContent(nextResponsibilities);

    this.experiences = this.experiences.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            responsibilities: nextResponsibilities,
          }
        : item,
    );

    this.persistExperiences();
    this.expandedResponsibilityIndex = index;
    this.editingResponsibilityIndex = index;
    this.responsibilityDraft = hasResponsibilities ? nextResponsibilities : '';
    this.scheduleResponsibilityEditorSync();
  }

  cancelResponsibilitiesInline(index: number): void {
    const current = this.experiences[index];
    this.responsibilityDraft = current?.responsibilities ?? '';
    this.editingResponsibilityIndex = index;
    this.expandedResponsibilityIndex = index;
    this.scheduleResponsibilityEditorSync();
  }

  onResponsibilityInput(event: Event): void {
    this.responsibilityDraft = (event.target as HTMLDivElement).innerHTML;
  }

  applyResponsibilityFormat(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'): void {
    const editor = this.responsibilityInlineEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(command, false);
    this.responsibilityDraft = editor.innerHTML;
  }

  clearResponsibilityFormat(): void {
    const editor = this.responsibilityInlineEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    this.responsibilityDraft = editor.innerHTML;
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

  updateExperienceStackKnowledge(index: number, nextValue: number | string): void {
    const current = this.currentExperienceStacks[index];

    if (!current) {
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const knowledge = Math.max(0, Math.min(100, Math.round(parsedValue)));

    this.updateCurrentExperience((experience) => ({
      ...experience,
      appliedStacks: experience.appliedStacks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              knowledge,
            }
          : item,
      ),
    }));
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
    const target = document.getElementById('usuario-formacao');

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    void this.router.navigate(['/usuario/dados-cadastrais'], {
      queryParams: { modal: 'formacao' },
    });
  }

  updateVisibleInEcosystem(nextValue: boolean): void {
    this.isVisibleInEcosystem = nextValue;
    this.persistExperienceToggles();
  }

  updateAvailableForApplications(nextValue: boolean): void {
    this.isAvailableForApplications = nextValue;
    this.persistExperienceToggles();
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


  private scrollToSection(sectionId: string, fallbackRoute: string): void {
    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    void this.router.navigate([fallbackRoute]);
  }

  private restoreExperiences(): void {
    const rawDraft = localStorage.getItem(ExperienciaPage.storageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Array<Partial<ExperienceEntry>>;
      this.experiences = Array.isArray(draft)
        ? this.sortExperiencesByDateDesc(draft.map((item) => this.normalizeExperience(item)))
        : [];
      this.currentExperienceIndex = this.experiences.length ? 0 : null;
      this.activateCurrentResponsibilityEditor();
    } catch {
      localStorage.removeItem(ExperienciaPage.storageKey);
    }
  }

  private persistExperiences(): void {
    localStorage.setItem(ExperienciaPage.storageKey, JSON.stringify(this.experiences));
    this.syncSeededTalentProfile();
  }

  private updateCurrentExperience(updater: (experience: ExperienceEntry) => ExperienceEntry): void {
    const index = this.currentExperienceIndex ?? 0;
    const current = this.experiences[index];

    if (!current) {
      return;
    }

    this.experiences = this.experiences.map((item, itemIndex) =>
      itemIndex === index ? updater(item) : item,
    );
    this.persistExperiences();
  }

  private scheduleResponsibilityEditorSync(): void {
    setTimeout(() => {
      const editor = this.responsibilityInlineEditor?.nativeElement;

      if (!editor) {
        return;
      }

      editor.innerHTML = this.responsibilityDraft || '';
    });
  }

  private activateCurrentResponsibilityEditor(): void {
    const index = this.currentExperienceIndex;
    const current = index !== null ? this.experiences[index] : null;

    if (!current || index === null) {
      this.expandedResponsibilityIndex = null;
      this.editingResponsibilityIndex = null;
      this.responsibilityDraft = '';
      return;
    }

    this.expandedResponsibilityIndex = index;
    this.editingResponsibilityIndex = index;
    this.responsibilityDraft = current.responsibilities ?? '';
    this.scheduleResponsibilityEditorSync();
  }

  private scheduleExperienceStackEditorSync(): void {
    setTimeout(() => {
      const editor = this.experienceStackDescriptionEditor?.nativeElement;

      if (!editor) {
        return;
      }

      editor.innerHTML = this.experienceStackDraftDescription || '';
    });
  }

  private restoreIntroLogo(): void {
    const savedLogo = localStorage.getItem(ExperienciaPage.logoDraftStorageKey);

    if (!savedLogo?.trim()) {
      this.introLogoUrl = this.defaultIntroLogoUrl;
      return;
    }

    this.introLogoUrl = savedLogo.trim();
  }

  private persistIntroLogo(): void {
    localStorage.setItem(ExperienciaPage.logoDraftStorageKey, this.introLogoUrl?.trim() || this.defaultIntroLogoUrl);
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
    this.syncSeededTalentProfile();
  }

  private restoreExperienceToggles(): void {
    const ecosystemVisibility = localStorage.getItem(ExperienciaPage.ecosystemVisibilityStorageKey);
    const candidacyAvailability = localStorage.getItem(ExperienciaPage.candidacyAvailabilityStorageKey);

    if (ecosystemVisibility !== null) {
      this.isVisibleInEcosystem = ecosystemVisibility === 'true';
    }

    if (candidacyAvailability !== null) {
      this.isAvailableForApplications = candidacyAvailability === 'true';
    }
  }

  private persistExperienceToggles(): void {
    localStorage.setItem(ExperienciaPage.ecosystemVisibilityStorageKey, String(this.isVisibleInEcosystem));
    localStorage.setItem(ExperienciaPage.candidacyAvailabilityStorageKey, String(this.isAvailableForApplications));
    this.syncSeededTalentProfile();
  }

  private syncSeededTalentProfile(): void {
    const email = this.authFacade.getSession()?.email?.trim();
    if (!email) {
      return;
    }

    void this.talentProfileStore.syncCurrentWorkspace(email);
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
      appliedStacks: [],
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
      appliedStacks: this.normalizeExperienceStacks(item.appliedStacks, item.role?.trim() ?? draft.role, item.companySegment?.trim() ?? draft.companySegment),
    };
  }

  private createExperienceId(): string {
    return `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private findExperienceIndexById(experienceId: string): number | null {
    const nextIndex = this.experiences.findIndex((item) => item.id === experienceId);
    return nextIndex >= 0 ? nextIndex : (this.experiences.length ? 0 : null);
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

  private hasRichContent(value: string): boolean {
    return this.getRichContentPlainText(value).length > 0;
  }

  private sortExperiencesByDateDesc(experiences: ExperienceEntry[]): ExperienceEntry[] {
    return [...experiences].sort((left, right) => this.compareExperiencesByDateDesc(left, right));
  }

  private compareExperiencesByDateDesc(left: ExperienceEntry, right: ExperienceEntry): number {
    const endComparison = this.getExperienceSortValue(right) - this.getExperienceSortValue(left);
    if (endComparison !== 0) {
      return endComparison;
    }

    const startComparison = this.getExperienceStartSortValue(right) - this.getExperienceStartSortValue(left);
    if (startComparison !== 0) {
      return startComparison;
    }

    return left.company.localeCompare(right.company, 'pt-BR');
  }

  private getExperienceSortValue(experience: ExperienceEntry): number {
    if (experience.currentlyWorkingHere) {
      return 999912;
    }

    return this.composeSortValue(experience.endYear, experience.endMonth);
  }

  private getExperienceStartSortValue(experience: ExperienceEntry): number {
    return this.composeSortValue(experience.startYear, experience.startMonth);
  }

  private composeSortValue(year: string, month: string): number {
    const parsedYear = Number.parseInt(year, 10);
    const monthOrder = this.getMonthOrder(month);
    return (Number.isFinite(parsedYear) ? parsedYear : 0) * 100 + monthOrder;
  }

  private getMonthOrder(month: string): number {
    const normalizedMonth = month
      .trim()
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return ExperienciaPage.monthOrder.get(normalizedMonth) ?? 0;
  }

  private getRichContentPlainText(value: string): string {
    if (!value.trim()) {
      return '';
    }

    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeExperienceStacks(
    appliedStacks: ExperienceEntry['appliedStacks'] | undefined,
    role: string,
    companySegment: string,
  ): ExperienceStackChip[] {
    if (!Array.isArray(appliedStacks) || !appliedStacks.length) {
      return this.buildDefaultExperienceStacks(role, companySegment);
    }

    return appliedStacks.map((item) =>
      this.createExperienceStackChip(item.name, item.knowledge, item.description, item.repoId, item.certificate),
    );
  }

  private buildDefaultExperienceStacks(role: string, companySegment: string): ExperienceStackChip[] {
    const normalizedRole = role.toLocaleLowerCase('pt-BR');
    const normalizedSegment = companySegment.toLocaleLowerCase('pt-BR');

    if (normalizedRole.includes('.net') || normalizedRole.includes('backend')) {
      return [
        this.createExperienceStackChip('.NET / C#', 92, '', 'repo:dotnet'),
        this.createExperienceStackChip('Entity Framework', 65, '', 'repo:entity-framework'),
        this.createExperienceStackChip('REST API', 75, '', 'repo:rest-api'),
        this.createExperienceStackChip('SQL Server', 70, '', 'repo:sql-server'),
        this.createExperienceStackChip('Azure', 40, '', 'repo:azure'),
      ];
    }

    if (normalizedRole.includes('lead') || normalizedRole.includes('tech lead')) {
      return [
        this.createExperienceStackChip('Arquitetura', 90),
        this.createExperienceStackChip('Liderança técnica', 86),
        this.createExperienceStackChip('Code Review', 79),
        this.createExperienceStackChip('DevOps', 68),
        this.createExperienceStackChip('Observabilidade', 61),
      ];
    }

    if (normalizedRole.includes('full stack')) {
      return [
        this.createExperienceStackChip('Angular', 89, '', 'repo:angular'),
        this.createExperienceStackChip('React', 82, '', 'repo:react'),
        this.createExperienceStackChip('Node.js', 78, '', 'repo:nodejs'),
        this.createExperienceStackChip('REST API', 74, '', 'repo:rest-api'),
        this.createExperienceStackChip('SQL Server', 58, '', 'repo:sql-server'),
      ];
    }

    if (normalizedSegment.includes('banco') || normalizedSegment.includes('fintech')) {
      return [
        this.createExperienceStackChip('Integrações', 84),
        this.createExperienceStackChip('Segurança', 76),
        this.createExperienceStackChip('Dados', 73),
        this.createExperienceStackChip('Automação', 67),
        this.createExperienceStackChip('Compliance', 55),
      ];
    }

    return [
      this.createExperienceStackChip('Produto digital', 80),
      this.createExperienceStackChip('Entrega contínua', 74),
      this.createExperienceStackChip('Colaboração', 70),
      this.createExperienceStackChip('Documentação', 62),
      this.createExperienceStackChip('Qualidade', 57),
    ];
  }

  private createExperienceStackChip(
    name: string,
    knowledge?: number,
    description?: string,
    repoId?: string,
    certificate?: ExperienceStackChip['certificate'],
  ): ExperienceStackChip {
    return {
      repoId: repoId?.trim() || this.findExperienceStackOptionByName(name)?.id,
      name: name.trim(),
      knowledge: typeof knowledge === 'number' ? Math.max(0, Math.min(100, Math.round(knowledge))) : 70,
      description: description?.trim() ?? '',
      certificate,
    };
  }

  private findExperienceStackOptionByName(name: string): ExperienceStackRepoItem | undefined {
    const normalized = name.trim().toLocaleLowerCase('pt-BR');
    return this.experienceStackCatalog.find((item) => item.name.toLocaleLowerCase('pt-BR') === normalized);
  }

  getExperienceGuideTagline(stack: ExperienceStackChip): string {
    const repoId = stack.repoId ?? this.findExperienceStackOptionByName(stack.name)?.id ?? '';
    return STACK_KNOWLEDGE_GUIDES[repoId]?.tagline ?? '';
  }

  getExperienceGuideExpectations(stack: ExperienceStackChip): string[] {
    const repoId = stack.repoId ?? this.findExperienceStackOptionByName(stack.name)?.id ?? '';
    const guide = STACK_KNOWLEDGE_GUIDES[repoId];
    const tier = this.getExpectationTierFromPercent(stack.knowledge);
    const custom = guide?.expectationsByTier?.[tier];
    if (custom?.length) {
      return custom;
    }
    return this.stackPurposeCopy[repoId]?.levels[this.mapTierToFallbackLevel(tier)] ?? [];
  }

  getExperienceGuideSignals(stack: ExperienceStackChip): { inTier: string[]; notYet: string[] } | null {
    const repoId = stack.repoId ?? this.findExperienceStackOptionByName(stack.name)?.id ?? '';
    const guide = STACK_KNOWLEDGE_GUIDES[repoId];
    const tier = this.getExpectationTierFromPercent(stack.knowledge);
    const signals = guide?.signalsByTier?.[tier];
    if (signals?.inTier?.length || signals?.notYet?.length) {
      return { inTier: signals?.inTier ?? [], notYet: signals?.notYet ?? [] };
    }
    return null;
  }

  getExperienceStructuredGuide(stack: ExperienceStackChip): StackKnowledgeGuide | null {
    const repoId = stack.repoId ?? this.findExperienceStackOptionByName(stack.name)?.id ?? '';
    return STACK_KNOWLEDGE_GUIDES[repoId] ?? null;
  }

  getExperienceCertificate(stack: ExperienceStackChip): ExperienceStackChip['certificate'] | null {
    return stack.certificate ?? null;
  }

  onExperienceStackCertificateSelected(index: number, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!this.acceptedCertificateMimeTypes.includes(file.type)) {
      this.experienceStackModalError = 'Use PDF, JPG, PNG ou WEBP para o certificado.';
      return;
    }

    if (file.size > this.maxCertificateSizeBytes) {
      this.experienceStackModalError = 'O certificado deve ter no máximo 8MB.';
      return;
    }

    this.updateCurrentExperience((experience) => ({
      ...experience,
      appliedStacks: experience.appliedStacks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              certificate: {
                name: file.name,
                type: file.type,
                size: file.size,
                updatedAt: new Date().toISOString(),
              },
            }
          : item,
      ),
    }));

    if (input) {
      input.value = '';
    }
  }

  clearExperienceStackCertificate(index: number): void {
    this.updateCurrentExperience((experience) => ({
      ...experience,
      appliedStacks: experience.appliedStacks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              certificate: undefined,
            }
          : item,
      ),
    }));
  }

  private getExpectationTierFromPercent(percent: number): StackGuideTier {
    if (percent >= 95) return 'especialista';
    if (percent >= 80) return 'senior';
    if (percent >= 60) return 'avancado';
    if (percent >= 45) return 'intermediario';
    if (percent >= 20) return 'basico';
    return 'iniciante';
  }

  private mapTierToFallbackLevel(tier: StackGuideTier): SeniorityLevel {
    switch (tier) {
      case 'iniciante':
      case 'basico':
        return 'jr';
      case 'intermediario':
        return 'pleno';
      case 'avancado':
      case 'senior':
        return 'senior';
      case 'especialista':
        return 'especialista';
    }
  }
}
