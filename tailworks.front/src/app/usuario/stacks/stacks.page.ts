import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '../../core/facades/auth.facade';
import { TalentProfileStoreService } from '../../talent/talent-profile-store.service';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';
import { STACK_KNOWLEDGE_GUIDES, StackGuideTier, StackKnowledgeGuide } from './stack-knowledge-guides';

type StackChip = {
  id: string;
  name: string;
  short: string;
  tone: 'gold' | 'slate' | 'azure' | 'orange' | 'neutral';
  category: StackCategory;
  knowledge: number;
  description: string;
};

type StackCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'cloud'
  | 'mobile'
  | 'data'
  | 'other';

type StackGroup = 'primary' | 'extra';

type StoredStacksDraft = {
  primary: StackChip[];
  extra: StackChip[];
  certificates?: Record<string, CertificateMeta> | null;
};

type CertificateMeta = {
  name: string;
  type: string;
  size: number;
  updatedAt: string;
};

type StackRepoItem = {
  id: string;
  name: string;
  category: StackCategory;
};

type SeniorityLevel = 'jr' | 'pleno' | 'senior' | 'especialista';

type GuidanceBand = {
  label: string;
  title: string;
  description: string;
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
};

type ExperienceDraft = {
  startMonth?: string;
  startYear?: string;
  endMonth?: string;
  endYear?: string;
  currentlyWorkingHere?: boolean;
  actuation?: number;
  appliedStacks?: Array<{
    repoId?: string;
    name?: string;
    knowledge?: number;
    description?: string;
  }>;
};

@Component({
  standalone: true,
  selector: 'app-stacks-page',
  imports: [CommonModule, FormsModule, AlcanceRadarComponent],
  templateUrl: './stacks.page.html',
  styleUrls: [
    './stacks.page.shell.scss',
    './stacks.page.repo.scss',
    './stacks.page.detail.scss',
    './stacks.page.modal.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StacksPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-stacks-draft:v5';
  private static readonly experiencesStorageKey = 'tailworks:candidate-experiences-draft:v1';
  private static readonly legacyV4StorageKey = 'tailworks:candidate-stacks-draft:v4';
  private static readonly legacyV3StorageKey = 'tailworks:candidate-stacks-draft:v3';
  private static readonly legacyStorageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly stackDescriptionMaxLength = 920;

  private readonly router = inject(Router);
  private readonly authFacade = inject(AuthFacade);
  private readonly talentProfileStore = inject(TalentProfileStoreService);

  readonly radarPreviewScore = 89;
  readonly radarPreviewItems: RadarLegendItem[] = [
    { label: 'Alta compatibilidade', tone: 'high', percent: 76 },
    { label: 'Media de Compatibilidade', tone: 'medium', detail: '(60-85%)' },
    { label: 'Potenciais', tone: 'potential', count: 97 },
  ];

  stackError = '';
  primaryStacks: StackChip[] = [];
  extraStacks: StackChip[] = [];
  certificates: Record<string, CertificateMeta> = {};
  isStackModalOpen = false;
  isStrategyHelpModalOpen = false;
  activeGuidanceStack: StackRepoItem | null = null;
  activeGuidancePercent = 0;
  expandedGuideRepoId: string | null = null;
  editingStackGroup: StackGroup = 'primary';
  editingStackIndex: number | null = null;
  stackDraftName = '';
  stackDraftCategory: StackCategory = 'other';
  stackDraftDescription = '';
  stackModalError = '';
  expandedDescriptionGroup: StackGroup = 'primary';
  expandedDescriptionIndex: number | null = null;
  @ViewChild('stackDescriptionEditor') private stackDescriptionEditor?: ElementRef<HTMLDivElement>;
  profile: CandidateBasicProfile = {
    name: '',
    formation: '',
  };
  photoPreviewUrl = '';
  formationCopy: FormationCopyDraft = {
    graduation: 'Bacharelado em Sistemas de Informação',
    specialization: 'Especialização em Arquitetura de Software',
  };

  readonly trackByStackId = (_index: number, stack: StackChip): string => stack.id;
  readonly trackByStackEntryId = (_index: number, entry: { item: StackChip; index: number }): string => entry.item.id;
  readonly uiCategories: StackCategory[] = ['backend', 'frontend', 'database', 'cloud', 'devops', 'mobile'];
  readonly categoryLabels: Record<StackCategory, string> = {
    frontend: 'Front-End',
    backend: 'BackEnd .NET',
    database: 'Banco de Dados',
    devops: 'Devops',
    cloud: 'Cloud',
    mobile: 'Mobile',
    data: 'Dados',
    other: 'Outros',
  };

  selectedPrimaryCategory: StackCategory | null = null;
  selectedExtraCategory: StackCategory | null = null;
  showPrimaryCategoryPanel = false;
  showExtraCategoryPanel = false;

  readonly stackRepository: Partial<Record<StackCategory, StackRepoItem[]>> = {
    backend: [
      { id: 'repo:dotnet', name: '.NET', category: 'backend' },
      { id: 'repo:csharp', name: 'C#', category: 'backend' },
      { id: 'repo:aspnet-core', name: 'ASP.NET Core', category: 'backend' },
      { id: 'repo:entity-framework', name: 'Entity Framework', category: 'backend' },
      { id: 'repo:rest-api', name: 'REST APIs', category: 'backend' },
      { id: 'repo:microservices', name: 'Microservices', category: 'backend' },
      { id: 'repo:rabbitmq', name: 'RabbitMQ', category: 'backend' },
      { id: 'repo:kafka', name: 'Kafka', category: 'backend' },
    ],
    frontend: [
      { id: 'repo:typescript', name: 'TypeScript', category: 'frontend' },
      { id: 'repo:javascript', name: 'JavaScript', category: 'frontend' },
      { id: 'repo:angular', name: 'Angular', category: 'frontend' },
      { id: 'repo:react', name: 'React', category: 'frontend' },
      { id: 'repo:vue', name: 'Vue', category: 'frontend' },
      { id: 'repo:nextjs', name: 'Next.js', category: 'frontend' },
      { id: 'repo:html', name: 'HTML', category: 'frontend' },
      { id: 'repo:css', name: 'CSS', category: 'frontend' },
    ],
    database: [
      { id: 'repo:sql-server', name: 'SQL Server', category: 'database' },
      { id: 'repo:postgresql', name: 'PostgreSQL', category: 'database' },
      { id: 'repo:mysql', name: 'MySQL', category: 'database' },
      { id: 'repo:mongodb', name: 'MongoDB', category: 'database' },
      { id: 'repo:redis', name: 'Redis', category: 'database' },
      { id: 'repo:elasticsearch', name: 'Elasticsearch', category: 'database' },
    ],
    cloud: [
      { id: 'repo:aws', name: 'AWS', category: 'cloud' },
      { id: 'repo:azure', name: 'Azure', category: 'cloud' },
      { id: 'repo:gcp', name: 'GCP', category: 'cloud' },
      { id: 'repo:cloudwatch', name: 'Cloud Monitoring', category: 'cloud' },
      { id: 'repo:serverless', name: 'Serverless', category: 'cloud' },
    ],
    devops: [
      { id: 'repo:docker', name: 'Docker', category: 'devops' },
      { id: 'repo:kubernetes', name: 'Kubernetes', category: 'devops' },
      { id: 'repo:terraform', name: 'Terraform', category: 'devops' },
      { id: 'repo:github-actions', name: 'GitHub Actions', category: 'devops' },
      { id: 'repo:gitlab-ci', name: 'GitLab CI', category: 'devops' },
      { id: 'repo:linux', name: 'Linux', category: 'devops' },
      { id: 'repo:nginx', name: 'Nginx', category: 'devops' },
    ],
    mobile: [
      { id: 'repo:react-native', name: 'React Native', category: 'mobile' },
      { id: 'repo:flutter', name: 'Flutter', category: 'mobile' },
      { id: 'repo:kotlin', name: 'Kotlin', category: 'mobile' },
      { id: 'repo:swift', name: 'Swift', category: 'mobile' },
      { id: 'repo:android', name: 'Android', category: 'mobile' },
      { id: 'repo:ios', name: 'iOS', category: 'mobile' },
    ],
  };

  private cachedKnownRepoIds: Set<string> | null = null;

  private readonly stackPurposeCopy: Record<string, { summary: string; levels: Record<SeniorityLevel, string[]> }> = {
    'repo:dotnet': {
      summary: 'Capacidade de construir e manter APIs e serviços em .NET, com foco em qualidade, performance e boas práticas.',
      levels: {
        jr: [
          'Implementa endpoints simples e corrige bugs com orientação.',
          'Segue padrões do projeto e aprende por exemplos.',
        ],
        pleno: [
          'Modela camadas e aplica padrões comuns (DI, validação, controllers).',
          'Escreve testes e faz refactors seguros.',
          'Entende tradeoffs básicos de performance.',
        ],
        senior: [
          'Desenha soluções e define padrões técnicos do time.',
          'Melhora observabilidade, resiliência e performance.',
          'Previne problemas de escala e orienta decisões.',
        ],
        especialista: [
          'Aprofunda em runtime, tuning e arquitetura corporativa.',
          'Cria padrões reutilizáveis e eleva a barra técnica da organização.',
        ],
      },
    },
    'repo:csharp': {
      summary: 'Domínio da linguagem C# e do ecossistema para escrever código claro, seguro e performático.',
      levels: {
        jr: [
          'Conhece sintaxe, tipos, coleções e o básico de async/await.',
          'Consegue implementar tarefas seguindo padrões do time.',
        ],
        pleno: [
          'Domina async/await, LINQ, exceptions e DI.',
          'Escreve testes e código mais idiomático e limpo.',
        ],
        senior: [
          'Evita armadilhas de concorrência e orienta o time em decisões.',
          'Revisa PRs e melhora padrões de qualidade.',
        ],
        especialista: [
          'Profundo em GC, allocations e performance.',
          'Define padrões e resolve problemas de alto impacto.',
        ],
      },
    },
    'repo:microservices': {
      summary: 'Entendimento de sistemas distribuídos: comunicação entre serviços, resiliência, observabilidade e consistência.',
      levels: {
        jr: [
          'Entende o conceito e segue contratos (APIs/eventos) com orientação.',
          'Contribui em serviços existentes com tarefas bem definidas.',
        ],
        pleno: [
          'Aplica versionamento, retry/timeout e padrões de logs/tracing.',
          'Evita acoplamentos e entende responsabilidades de cada serviço.',
        ],
        senior: [
          'Define limites de domínio e padrões de integração.',
          'Opera o sistema com foco em confiabilidade (SLOs, alertas, incidentes).',
        ],
        especialista: [
          'Aprofunda em consistência eventual, saga e idempotência.',
          'Modela plataformas e escala distribuída com maturidade.',
        ],
      },
    },
    'repo:aws': {
      summary: 'Uso prático de serviços AWS para rodar aplicações com segurança, custo-controlado e observável.',
      levels: {
        jr: [
          'Usa serviços básicos seguindo templates e padrões do time.',
          'Entende permissões no básico e navega no console com segurança.',
        ],
        pleno: [
          'Configura ambientes e IAM com cuidado.',
          'Monitora, automatiza deploy e entende custo por componente.',
        ],
        senior: [
          'Define arquitetura cloud e boas práticas de segurança.',
          'Implementa observabilidade e governança (tags, políticas, conta).',
        ],
        especialista: [
          'Profundo em redes, segurança e finops.',
          'Otimiza e escala com precisão; define padrões de plataforma.',
        ],
      },
    },
    'repo:serverless': {
      summary: 'Criação de funções e integrações sem servidor, pensando em cold start, custos, limites e observabilidade.',
      levels: {
        jr: [
          'Implementa funções simples e integrações básicas seguindo padrões.',
          'Consegue testar e depurar fluxos simples.',
        ],
        pleno: [
          'Projeta handlers, valida eventos e trata erros com consistência.',
          'Monitora e entende custo por invocação.',
        ],
        senior: [
          'Desenha arquitetura orientada a eventos.',
          'Define padrões, governança e confiabilidade.',
        ],
        especialista: [
          'Otimiza performance/custo e modela plataformas serverless.',
          'Aprofunda em limites, escalabilidade e operação.',
        ],
      },
    },
    'repo:kafka': {
      summary: 'Mensageria e streaming para integração entre serviços com alta escala e confiabilidade.',
      levels: {
        jr: [
          'Consome eventos.',
          'Usa Kafka via framework.',
        ],
        pleno: [
          'Configura producers e consumers.',
          'Entende partições e offset.',
        ],
        senior: [
          'Define arquitetura de eventos.',
          'Resolve problemas de throughput.',
          'Escala clusters Kafka.',
        ],
        especialista: [
          'Design de event-driven systems.',
          'Kafka Streams.',
          'Multi cluster replication.',
        ],
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

  get visualStacks(): StackChip[] {
    return this.primaryStacks;
  }

  get stackModalTitle(): string {
    return this.editingStackIndex === null ? 'Adicionar Stack' : 'Editar Descrição';
  }

  get stackModalSubmitLabel(): string {
    return this.editingStackIndex === null ? 'Adicionar' : 'Salvar';
  }

  get stackDescriptionCharacters(): number {
    return this.getDescriptionPlainText(this.stackDraftDescription).length;
  }

  get stackDescriptionMaxLength(): number {
    return StacksPage.stackDescriptionMaxLength;
  }

  get activeInfoSummary(): string {
    const stack = this.activeGuidanceStack;
    if (!stack) {
      return '';
    }

    return this.stackPurposeCopy[stack.id]?.summary
      ?? 'Essa stack representa um conjunto de habilidades e responsabilidades que variam com o contexto da vaga.';
  }

  get activeInfoBullets(): string[] {
    const stack = this.activeGuidanceStack;
    if (!stack) {
      return [];
    }
    const tier = this.getExpectationTierFromPercent(this.activeGuidancePercent);
    return this.getInfoBulletsForLevel(stack.id, this.mapTierToFallbackLevel(tier));
  }

  get activeStructuredGuide(): StackKnowledgeGuide | null {
    const stack = this.activeGuidanceStack;
    if (!stack) {
      return null;
    }

    return STACK_KNOWLEDGE_GUIDES[stack.id] ?? null;
  }

  get activeGuideTagline(): string {
    const guide = this.activeStructuredGuide;
    if (guide) {
      return guide.tagline;
    }

    return '';
  }

  get activePercentLevelLabel(): string {
    return this.getPercentLevelLabel(this.activeGuidancePercent);
  }

  get guidanceBand(): GuidanceBand {
    return this.getGuidanceBand(this.activeGuidancePercent);
  }

  get isStackDescriptionOverLimit(): boolean {
    return this.stackDescriptionCharacters > this.stackDescriptionMaxLength;
  }

  get canSaveStack(): boolean {
    if (this.isStackDescriptionOverLimit) {
      return false;
    }

    return this.editingStackIndex !== null || this.stackDraftName.trim().length > 0;
  }

  get primarySelectedEntries(): Array<{ item: StackChip; index: number }> {
    if (!this.selectedPrimaryCategory) {
      return [];
    }

    return this.getEntriesForCategory(this.primaryStacks, this.selectedPrimaryCategory);
  }

  get extraSelectedEntries(): Array<{ item: StackChip; index: number }> {
    if (!this.selectedExtraCategory) {
      return [];
    }

    return this.getEntriesForCategory(this.extraStacks, this.selectedExtraCategory);
  }

  get primaryRepoOptions(): StackRepoItem[] {
    if (!this.selectedPrimaryCategory) {
      return [];
    }

    return this.stackRepository[this.selectedPrimaryCategory] ?? [];
  }

  get extraRepoOptions(): StackRepoItem[] {
    if (!this.selectedExtraCategory) {
      return [];
    }

    return this.stackRepository[this.selectedExtraCategory] ?? [];
  }

  private getKnownRepoIds(): Set<string> {
    if (this.cachedKnownRepoIds) {
      return this.cachedKnownRepoIds;
    }

    const ids = new Set<string>();
    Object.values(this.stackRepository)
      .flatMap((items) => items ?? [])
      .forEach((item) => ids.add(item.id));
    this.cachedKnownRepoIds = ids;
    return ids;
  }

  private sanitizeRestoredStacks(primary: StackChip[], extra: StackChip[]): StoredStacksDraft {
    const knownRepoIds = this.getKnownRepoIds();
    const sanitize = (items: StackChip[]): StackChip[] =>
      items
        .filter((item) => knownRepoIds.has(item.id))
        .map((item) => this.normalizeStackChip(item))
        .filter((item) => item.knowledge > 0);

    return {
      primary: sanitize(primary),
      extra: sanitize(extra),
    };
  }

  private looksLikeLegacySeedDraft(primary: unknown[], extra: unknown[]): boolean {
    if (extra.length > 0) {
      return false;
    }

    if (primary.length === 0 || primary.length > 10) {
      return false;
    }

    const seedIds = new Set([
      'repo:nodejs',
      'repo:react',
      'repo:postgresql',
      'repo:aws',
      'repo:docker',
      'repo:react-native',
    ]);

    const items = primary as Array<Partial<StackChip> & { name?: string }>;

    // Heurística: todos ids repo:* do seed, knowledge 10, sem descrição.
    return items.every((item) => {
      const id = typeof item.id === 'string' ? item.id : '';
      const knowledge = typeof item.knowledge === 'number' ? item.knowledge : NaN;
      const description = typeof item.description === 'string' ? item.description.trim() : '';
      return seedIds.has(id) && knowledge === 10 && description.length === 0;
    });
  }

  ngOnInit(): void {
    this.restoreBasicDraft();
    this.restoreFormationCopy();
    this.restoreVisualStacksFromExperiences();
  }

  openVisualGuide(stack: StackChip): void {
    const repoItem = this.findGuideItem(stack);
    if (!repoItem) {
      return;
    }

    this.activeGuidanceStack = repoItem;
    this.activeGuidancePercent = stack.knowledge;
  }

  toggleVisualGuide(stack: StackChip): void {
    const repoItem = this.findGuideItem(stack);
    if (!repoItem) {
      return;
    }

    if (this.expandedGuideRepoId === repoItem.id) {
      this.expandedGuideRepoId = null;
      return;
    }

    this.openVisualGuide(stack);
    this.expandedGuideRepoId = repoItem.id;
  }

  private restoreVisualStacksFromExperiences(): void {
    const storedDraft = localStorage.getItem(StacksPage.storageKey);
    const storedCertificates = storedDraft
      ? this.normalizeCertificates((JSON.parse(storedDraft) as Partial<StoredStacksDraft>).certificates)
      : {};
    const rawExperiences = localStorage.getItem(StacksPage.experiencesStorageKey);
    const experiences = rawExperiences ? (JSON.parse(rawExperiences) as ExperienceDraft[]) : [];

    this.certificates = storedCertificates;
    this.primaryStacks = this.buildAverageStacksFromExperiences(experiences);
    this.extraStacks = [];
    this.persistStacks();
  }

  private buildAverageStacksFromExperiences(experiences: ExperienceDraft[]): StackChip[] {
    const grouped = new Map<string, { totalWeight: number; weightedScore: number; item: StackRepoItem }>();

    for (const experience of experiences) {
      const experienceWeight = this.getExperienceWeight(experience);
      for (const stack of experience.appliedStacks ?? []) {
        const item = this.resolveExperienceStackRepoItem(stack.repoId, stack.name);
        if (!item) {
          continue;
        }

        const current = grouped.get(item.id) ?? { totalWeight: 0, weightedScore: 0, item };
        const knowledge = Math.max(0, Math.min(100, Math.round(Number(stack.knowledge ?? 0))));
        current.totalWeight += experienceWeight;
        current.weightedScore += knowledge * experienceWeight;
        grouped.set(item.id, current);
      }
    }

    return Array.from(grouped.values())
      .map(({ weightedScore, totalWeight, item }) =>
        this.createStackChip(item.name, Math.round(weightedScore / Math.max(totalWeight, 1)), '', item.category, item.id),
      )
      .sort((left, right) => right.knowledge - left.knowledge);
  }

  private getExperienceWeight(experience: ExperienceDraft): number {
    const months = this.getExperienceMonths(experience);
    const actuation = Math.max(10, Math.min(100, Number(experience.actuation ?? 70)));
    return months * (actuation / 100);
  }

  private getExperienceMonths(experience: ExperienceDraft): number {
    const start = this.toComparableMonth(experience.startYear, experience.startMonth);
    const end = experience.currentlyWorkingHere
      ? this.toComparableMonth('2026', 'Mar')
      : this.toComparableMonth(experience.endYear, experience.endMonth);

    if (!start || !end) {
      return 1;
    }

    return Math.max(1, end - start + 1);
  }

  private toComparableMonth(year?: string, month?: string): number {
    const monthMap: Record<string, number> = {
      Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
      Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12,
    };
    const parsedYear = Number(year ?? '');
    const parsedMonth = month ? monthMap[month] : 0;
    if (!Number.isFinite(parsedYear) || !parsedMonth) {
      return 0;
    }
    return (parsedYear * 12) + parsedMonth;
  }

  private resolveExperienceStackRepoItem(repoId?: string, stackName?: string): StackRepoItem | null {
    const knownItems = Object.values(this.stackRepository).flatMap((items) => items ?? []);
    const repoMatch = repoId?.trim()
      ? knownItems.find((item) => item.id === repoId.trim())
      : null;

    if (repoMatch) {
      return this.normalizeVisualRepoItem(repoMatch);
    }

    const normalizedName = stackName?.trim().toLocaleLowerCase('pt-BR') ?? '';
    const byName = knownItems.find((item) => item.name.toLocaleLowerCase('pt-BR') === normalizedName);
    if (byName) {
      return this.normalizeVisualRepoItem(byName);
    }

    return null;
  }

  private normalizeVisualRepoItem(item: StackRepoItem): StackRepoItem {
    if (['repo:csharp', 'repo:aspnet-core', 'repo:entity-framework', 'repo:rest-api', 'repo:microservices', 'repo:rabbitmq'].includes(item.id)) {
      return { id: 'repo:dotnet', name: '.NET / C#', category: 'backend' };
    }

    if (['repo:sql-server', 'repo:postgresql', 'repo:mysql', 'repo:mongodb', 'repo:redis', 'repo:elasticsearch'].includes(item.id)) {
      return { id: 'repo:sql-server', name: 'SQL', category: 'database' };
    }

    return item;
  }

  private findGuideItem(stack: StackChip): StackRepoItem | null {
    return this.resolveExperienceStackRepoItem(stack.id, stack.name);
  }

  getStackCertificate(repoId: string): CertificateMeta | null {
    return this.certificates[repoId] ?? null;
  }

  onStackCertificateSelected(repoId: string, event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    this.certificates = {
      ...this.certificates,
      [repoId]: {
        name: file.name,
        type: file.type,
        size: file.size,
        updatedAt: new Date().toISOString(),
      },
    };
    this.persistStacks();

    if (input) {
      input.value = '';
    }
  }

  clearStackCertificate(repoId: string): void {
    if (!this.certificates[repoId]) {
      return;
    }

    const next = { ...this.certificates };
    delete next[repoId];
    this.certificates = next;
    this.persistStacks();
  }

  private normalizeCertificates(value: unknown): Record<string, CertificateMeta> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const obj = value as Record<string, unknown>;
    const normalized: Record<string, CertificateMeta> = {};

    for (const [key, raw] of Object.entries(obj)) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }
      const meta = raw as Partial<CertificateMeta>;
      const name = typeof meta.name === 'string' ? meta.name.trim() : '';
      if (!name) {
        continue;
      }

      normalized[key] = {
        name,
        type: typeof meta.type === 'string' ? meta.type : '',
        size: typeof meta.size === 'number' ? meta.size : 0,
        updatedAt: typeof meta.updatedAt === 'string' ? meta.updatedAt : '',
      };
    }

    return normalized;
  }

  getRepoKnowledge(group: StackGroup, repoId: string): number {
    const list = this.getStacksList(group);
    const found = list.find((item) => item.id === repoId);
    return found?.knowledge ?? 0;
  }

  getCategoryCount(group: StackGroup, category: StackCategory): number {
    const list = this.getStacksList(group);
    return list.reduce((acc, item) => acc + (item.category === category && item.knowledge >= 10 ? 1 : 0), 0);
  }

  getCategoryAverage(group: StackGroup, category: StackCategory): number {
    const list = this.getStacksList(group).filter((item) => item.category === category && item.knowledge >= 10);
    if (!list.length) {
      return 0;
    }

    const total = list.reduce((acc, item) => acc + item.knowledge, 0);
    return Math.round(total / list.length);
  }

  getCategoryMax(group: StackGroup, category: StackCategory): number {
    const list = this.getStacksList(group).filter((item) => item.category === category && item.knowledge >= 10);
    if (!list.length) {
      return 0;
    }

    return list.reduce((acc, item) => Math.max(acc, item.knowledge), 0);
  }

  updateRepoKnowledge(group: StackGroup, repoItem: StackRepoItem, rawValue: unknown): void {
    this.stackError = '';
    const nextValue = Math.max(0, Math.min(100, Math.round(Number(rawValue))));

    const list = this.getStacksList(group);
    const existingIndex = list.findIndex((item) => item.id === repoItem.id);

    if (nextValue <= 0) {
      if (existingIndex >= 0) {
        list.splice(existingIndex, 1);
        this.persistStacks();
      }
      return;
    }

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      existing.name = repoItem.name;
      existing.short = repoItem.name;
      existing.category = repoItem.category;
      existing.knowledge = nextValue;
    } else {
      list.push(this.createStackChip(repoItem.name, nextValue, '', repoItem.category, repoItem.id));
    }

    this.persistStacks();
  }

  openRepoStackDescription(group: StackGroup, repoItem: StackRepoItem): void {
    const list = this.getStacksList(group);
    const index = list.findIndex((item) => item.id === repoItem.id);

    if (index < 0) {
      this.stackError = 'Defina um percentual acima de 0% para editar a descrição.';
      return;
    }

    this.openEditStackModal(group, index);
  }

  openCreateStackModal(group: StackGroup, category?: StackCategory): void {
    this.stackError = '';

    this.editingStackGroup = group;
    this.editingStackIndex = null;
    this.stackDraftName = '';
    this.stackDraftCategory = category ?? 'other';
    this.stackDraftDescription = '';
    this.stackModalError = '';
    this.isStackModalOpen = true;
    this.scheduleEditorSync();

    if (group === 'primary') {
      this.showPrimaryCategoryPanel = true;
    } else {
      this.showExtraCategoryPanel = true;
    }
  }

  openEditStackModal(group: StackGroup, index: number): void {
    const list = this.getStacksList(group);
    const current = list[index];

    if (!current) {
      return;
    }

    this.editingStackGroup = group;
    this.editingStackIndex = index;
    this.stackDraftName = current.name;
    this.stackDraftCategory = current.category;
    this.stackDraftDescription = current.description;
    this.stackModalError = '';
    this.isStackModalOpen = true;
    this.scheduleEditorSync();
  }

  closeStackModal(): void {
    this.isStackModalOpen = false;
    this.editingStackGroup = 'primary';
    this.editingStackIndex = null;
    this.stackDraftName = '';
    this.stackDraftCategory = 'other';
    this.stackDraftDescription = '';
    this.stackModalError = '';
  }

  openStrategyHelpModal(): void {
    this.isStrategyHelpModalOpen = true;
  }

  closeStrategyHelpModal(): void {
    this.isStrategyHelpModalOpen = false;
  }

  setActiveGuidance(item: StackRepoItem): void {
    this.activeGuidanceStack = item;
    this.activeGuidancePercent = this.getRepoKnowledge('primary', item.id);
  }

  activateStackInfo(item: StackRepoItem): void {
    this.setActiveGuidance(item);
  }

  toggleInlineGuide(item: StackRepoItem): void {
    if (this.expandedGuideRepoId === item.id) {
      this.expandedGuideRepoId = null;
      return;
    }

    this.expandedGuideRepoId = item.id;
    this.setActiveGuidance(item);
  }

  getStructuredGuide(repoId: string): StackKnowledgeGuide | null {
    return STACK_KNOWLEDGE_GUIDES[repoId] ?? null;
  }

  getGuideTagline(repoId: string): string {
    return STACK_KNOWLEDGE_GUIDES[repoId]?.tagline ?? '';
  }

  getInfoSummary(repoId: string): string {
    return this.stackPurposeCopy[repoId]?.summary
      ?? 'Essa stack representa um conjunto de habilidades e responsabilidades que variam com o contexto da vaga.';
  }

  getInfoBullets(repoId: string): string[] {
    return this.getInfoBulletsForLevel(repoId, 'pleno');
  }

  private getInfoBulletsForLevel(repoId: string, level: SeniorityLevel): string[] {
    const fallback: Record<SeniorityLevel, string[]> = {
      jr: [
        'Consegue executar tarefas com orientação e evolui rápido seguindo padrões do time.',
      ],
      pleno: [
        'Entrega com autonomia, entende tradeoffs e mantém qualidade com consistência.',
      ],
      senior: [
        'Guia decisões técnicas, melhora a qualidade do sistema e influencia o time.',
      ],
      especialista: [
        'Aprofunda no tema, define padrões e resolve problemas complexos com alta precisão.',
      ],
    };

    return this.stackPurposeCopy[repoId]?.levels[level]
      ?? fallback[level];
  }

  percentLevelLabel(percent: number): string {
    return this.getPercentLevelLabel(percent);
  }

  getGuideExpectations(repoId: string, percent: number): string[] {
    const guide = STACK_KNOWLEDGE_GUIDES[repoId];
    const tier = this.getExpectationTierFromPercent(percent);
    const custom = guide?.expectationsByTier?.[tier];
    if (custom?.length) {
      return custom;
    }

    return this.getInfoBulletsForLevel(repoId, this.mapTierToFallbackLevel(tier));
  }

  getGuideSignals(repoId: string, percent: number): { inTier: string[]; notYet: string[] } | null {
    const guide = STACK_KNOWLEDGE_GUIDES[repoId];
    const tier = this.getExpectationTierFromPercent(percent);
    const signals = guide?.signalsByTier?.[tier];
    const hasSpecific = Boolean(signals?.inTier?.length || signals?.notYet?.length);

    if (hasSpecific) {
      return {
        inTier: signals?.inTier ?? [],
        notYet: signals?.notYet ?? [],
      };
    }

    return this.getGenericSignalsForTier(tier);
  }

  private getGenericSignalsForTier(tier: StackGuideTier): { inTier: string[]; notYet: string[] } | null {
    // Fallback simples para não deixar o bloco "vazio" em stacks sem conteúdo específico.
    const generic: Record<StackGuideTier, { inTier: string[]; notYet: string[] }> = {
      iniciante: {
        inTier: [
          'Você consegue executar tarefas pequenas com orientação e aprender rápido com exemplos do time.',
          'Você consegue debugar erros comuns e não trava ao encontrar algo novo.',
        ],
        notYet: [
          'Você costuma ficar preso sem conseguir avançar sem alguém “pegar na mão”.',
          'Você não consegue explicar o básico do que está fazendo (conceitos e porquê).',
        ],
      },
      basico: {
        inTier: [
          'Você entrega tarefas comuns com consistência e entende os conceitos principais.',
          'Você começa a antecipar erros e consegue manter padrão de qualidade do time.',
        ],
        notYet: [
          'Você entrega, mas com muita fragilidade: quebra fácil, sem testes e sem cuidado com erros.',
          'Você ainda não consegue diagnosticar problemas simples sem tentativa e erro.',
        ],
      },
      intermediario: {
        inTier: [
          'Você entrega com autonomia e entende tradeoffs do dia a dia.',
          'Você consegue manter qualidade com consistência (refactors seguros, testes, logs).',
        ],
        notYet: [
          'Você ainda depende de “receitas prontas” e se perde quando o cenário muda.',
          'Você evita áreas importantes (observabilidade, erros, performance) por falta de segurança.',
        ],
      },
      avancado: {
        inTier: [
          'Você resolve problemas difíceis com método (dados, diagnóstico) e melhora o sistema depois.',
          'Você começa a influenciar padrão do time (reviews, boas práticas, decisões técnicas).',
          'Você previne incidentes com observabilidade, testes e desenho mais robusto.',
        ],
        notYet: [
          'Você até entrega, mas não consegue explicar os tradeoffs nem justificar decisões.',
          'Você ainda não tem histórico de resolver problemas difíceis em produção com segurança.',
        ],
      },
      senior: {
        inTier: [
          'Você guia decisões técnicas e ajuda o time a entregar melhor (mentoria, reviews, padrões).',
          'Você lidera melhorias de confiabilidade/performance e resposta a incidentes.',
          'Você desenha soluções pensando em evolução, operação e impacto no negócio.',
        ],
        notYet: [
          'Você faz “coisas avançadas”, mas não consegue elevar o time nem sustentar decisões.',
          'Você evita responsabilidade de operação/produção e não conduz melhoria contínua.',
        ],
      },
      especialista: {
        inTier: [
          'Você define padrões/plataforma que escalam para vários times (guardrails, tooling, templates).',
          'Você resolve problemas raros e complexos com profundidade e dados (não por tentativa e erro).',
          'Você influencia arquitetura e governança em nível organizacional.',
        ],
        notYet: [
          'Você ainda não tem evidência de impacto em escala (além de um time/um serviço).',
          'Você toma decisões de alto risco sem medir e sem validar impacto real.',
        ],
      },
    };

    return generic[tier] ?? null;
  }

  private getExpectationTierFromPercent(percent: number): StackGuideTier {
    // Mantem alinhado com os rótulos exibidos na UI (percentLevelLabel).
    if (percent >= 95) {
      return 'especialista';
    }
    if (percent >= 80) {
      return 'senior';
    }
    if (percent >= 60) {
      return 'avancado';
    }
    if (percent >= 45) {
      return 'intermediario';
    }
    if (percent >= 20) {
      return 'basico';
    }
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

  private getGuidanceBand(percent: number): GuidanceBand {
    if (percent >= 95) {
      return {
        label: '95%',
        title: 'Especialista',
        description: 'Define padrões, resolve problemas raros e complexos, e eleva o nível técnico do time.',
      };
    }

    if (percent >= 80) {
      return {
        label: '80%',
        title: 'Sênior',
        description: 'Projeta soluções, revisa código, orienta pessoas e resolve problemas complexos com autonomia.',
      };
    }

    if (percent >= 60) {
      return {
        label: '60%',
        title: 'Pleno',
        description: 'Entrega features, corrige bugs com consistência e entende arquitetura e tradeoffs do dia a dia.',
      };
    }

    if (percent >= 40) {
      return {
        label: '40%',
        title: 'Base',
        description: 'Já trabalhou com isso, entende os conceitos e consegue desenvolver com consulta e apoio.',
      };
    }

    if (percent >= 20) {
      return {
        label: '20%',
        title: 'Introdução',
        description: 'Já estudou, fez cursos ou projetos pessoais. Ainda precisa de prática real para consolidar.',
      };
    }

    if (percent >= 10) {
      return {
        label: '10%',
        title: 'Contato inicial',
        description: 'Conhece o básico e está começando a ganhar confiança. Use para mapear aprendizado ativo.',
      };
    }

    return {
      label: '0%',
      title: 'Não marcado',
      description: 'Marque acima de 0% para indicar contato com a tecnologia.',
    };
  }

  private getPercentLevelLabel(percent: number): string {
    if (percent >= 95) {
      return 'Especialista';
    }

    if (percent >= 80) {
      return 'Sênior';
    }

    if (percent >= 60) {
      return 'Avançado';
    }

    if (percent >= 45) {
      return 'Intermediário';
    }

    if (percent >= 20) {
      return 'Básico';
    }

    if (percent > 0) {
      return 'Iniciante';
    }

    return 'Não marcado';
  }

  onStackDescriptionInput(event: Event): void {
    this.stackDraftDescription = (event.target as HTMLDivElement).innerHTML;

    if (!this.isStackDescriptionOverLimit && this.stackModalError === 'A descrição excedeu o limite de caracteres.') {
      this.stackModalError = '';
    }
  }

  applyDescriptionFormat(command: 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList'): void {
    const editor = this.stackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand(command, false);
    this.stackDraftDescription = editor.innerHTML;
  }

  clearDescriptionFormat(): void {
    const editor = this.stackDescriptionEditor?.nativeElement;

    if (!editor) {
      return;
    }

    editor.focus();
    document.execCommand('removeFormat', false);
    document.execCommand('unlink', false);
    this.stackDraftDescription = editor.innerHTML;
  }

  saveStack(): void {
    const trimmed = this.stackDraftName.trim();
    const description = this.stackDraftDescription.trim();
    this.stackModalError = '';

    if (this.isStackDescriptionOverLimit) {
      this.stackModalError = 'A descrição excedeu o limite de caracteres.';
      return;
    }

    if (this.editingStackIndex !== null) {
      const list = this.getStacksList(this.editingStackGroup);
      const current = list[this.editingStackIndex];

      if (!current) {
        return;
      }

      current.category = this.stackDraftCategory;
      current.description = description;
      this.persistStacks();
      this.closeStackModal();
      return;
    }

    if (!trimmed) {
      this.stackModalError = 'Digite uma stack para adicionar.';
      return;
    }

    const duplicated = this.getAllStacks().some((item) => item.name.toLowerCase() === trimmed.toLowerCase());

    if (duplicated) {
      this.stackModalError = 'Essa stack já foi adicionada.';
      return;
    }

    const inferredCategory = this.stackDraftCategory === 'other'
      ? this.guessCategory(trimmed)
      : this.stackDraftCategory;
    const nextItem = this.createStackChip(trimmed, undefined, description, inferredCategory, this.createStackId(trimmed));

    const list = this.getStacksList(this.editingStackGroup);
    if (this.editingStackGroup === 'primary') {
      this.primaryStacks = [...list, nextItem];
    } else {
      this.extraStacks = [...list, nextItem];
    }
    this.persistStacks();
    this.closeStackModal();
  }

  removeStack(group: StackGroup, index: number): void {
    const list = this.getStacksList(group);

    if (!list[index]) {
      return;
    }

    if (group === 'primary') {
      this.primaryStacks = list.filter((_, itemIndex) => itemIndex !== index);
    } else {
      this.extraStacks = list.filter((_, itemIndex) => itemIndex !== index);
    }

    if (this.expandedDescriptionGroup === group && this.expandedDescriptionIndex === index) {
      this.expandedDescriptionIndex = null;
    } else if (this.expandedDescriptionGroup === group && this.expandedDescriptionIndex !== null && this.expandedDescriptionIndex > index) {
      this.expandedDescriptionIndex -= 1;
    }

    this.persistStacks();
  }

  toggleStackDescription(group: StackGroup, index: number): void {
    const list = this.getStacksList(group);
    const current = list[index];

    if (!current?.description.trim()) {
      return;
    }

    if (this.expandedDescriptionGroup !== group) {
      this.expandedDescriptionGroup = group;
      this.expandedDescriptionIndex = index;
      return;
    }

    this.expandedDescriptionIndex = this.expandedDescriptionIndex === index ? null : index;
  }

  updateStackKnowledge(group: StackGroup, index: number, nextValue: number | string): void {
    const list = this.getStacksList(group);
    const current = list[index];

    if (!current) {
      return;
    }

    const parsedValue = Number(nextValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    const knowledge = Math.max(0, Math.min(100, Math.round(parsedValue)));
    current.knowledge = knowledge;
    this.persistStacks();
  }

  continueToExperience(): void {
    this.stackError = '';

    if (this.getAllStacks().length < 3) {
      this.stackError = 'Adicione pelo menos 3 stacks para continuar.';
      return;
    }

    this.persistStacks();
    this.scrollToSection('usuario-experiencia', '/usuario/experiencia');
  }

  private persistStacks(): void {
    const draft: StoredStacksDraft = {
      primary: this.primaryStacks,
      extra: this.extraStacks,
      certificates: this.certificates,
    };
    localStorage.setItem(StacksPage.storageKey, JSON.stringify(draft));
    this.syncSeededTalentProfile();
  }

  private syncSeededTalentProfile(): void {
    const email = this.authFacade.getSession()?.email?.trim();
    if (!email) {
      return;
    }

    void this.talentProfileStore.syncCurrentWorkspace(email);
  }

  private scrollToSection(sectionId: string, fallbackRoute: string): void {
    const target = document.getElementById(sectionId);

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    void this.router.navigate([fallbackRoute]);
  }

  private scheduleEditorSync(): void {
    setTimeout(() => {
      const editor = this.stackDescriptionEditor?.nativeElement;

      if (!editor) {
        return;
      }

      editor.innerHTML = this.stackDraftDescription || '';
    });
  }

  private restoreBasicDraft(): void {
    const rawDraft = localStorage.getItem(StacksPage.basicDraftStorageKey);

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
      localStorage.removeItem(StacksPage.basicDraftStorageKey);
    }
  }

  private restoreFormationCopy(): void {
    const rawDraft = localStorage.getItem(StacksPage.formationCopyStorageKey);

    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as Partial<FormationCopyDraft>;
      this.formationCopy = {
        graduation: draft.graduation?.trim() || this.formationCopy.graduation,
        specialization: draft.specialization?.trim() || this.formationCopy.specialization,
      };
    } catch {
      localStorage.removeItem(StacksPage.formationCopyStorageKey);
    }
  }

  private createStackChip(
    name: string,
    knowledge?: number,
    description?: string,
    category?: StackCategory,
    id?: string,
  ): StackChip {
    const normalized = name.trim();
    const lower = normalized.toLowerCase();
    const resolvedKnowledge = knowledge ?? this.getDefaultKnowledge(lower);
    const resolvedDescription = (description ?? '').trim();
    const resolvedCategory = category ?? this.guessCategory(normalized);
    const resolvedId = id?.trim() || this.createStackId(normalized);

    if (lower === '.net / c#' || lower === '.net' || lower === 'c#') {
      return { id: resolvedId, name: '.NET / C#', short: '.N', tone: 'gold', category: resolvedCategory, knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'entity framework') {
      return { id: resolvedId, name: 'Entity Framework', short: 'EF', tone: 'slate', category: resolvedCategory, knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'rest api') {
      return { id: resolvedId, name: 'REST API', short: 'API', tone: 'azure', category: resolvedCategory, knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'sql server') {
      return { id: resolvedId, name: 'SQL Server', short: 'SQL', tone: 'orange', category: resolvedCategory, knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    if (lower === 'azure') {
      return { id: resolvedId, name: 'Azure', short: 'Az', tone: 'azure', category: resolvedCategory, knowledge: resolvedKnowledge, description: resolvedDescription };
    }

    return {
      id: resolvedId,
      name: normalized,
      short: this.getShortLabel(normalized),
      tone: 'neutral',
      category: resolvedCategory,
      knowledge: resolvedKnowledge,
      description: resolvedDescription,
    };
  }

  private getDefaultKnowledge(value: string): number {
    switch (value) {
      case '.net / c#':
      case '.net':
      case 'c#':
        return 80;
      case 'entity framework':
        return 65;
      case 'rest api':
        return 75;
      case 'sql server':
        return 70;
      case 'azure':
        return 40;
      default:
        return 65;
    }
  }

  private getShortLabel(value: string): string {
    const parts = value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (parts.length === 0) {
      return '+';
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2);
    }

    return `${parts[0][0]}${parts[1][0]}`;
  }

  private guessCategory(value: string): StackCategory {
    const lower = value.toLowerCase();

    const hasAny = (tokens: string[]): boolean => tokens.some((token) => lower.includes(token));

    if (hasAny(['react', 'angular', 'vue', 'next', 'nuxt', 'svelte', 'typescript', 'javascript', 'html', 'css', 'sass', 'tailwind'])) {
      return 'frontend';
    }

    if (hasAny(['.net', 'c#', 'java', 'kotlin', 'node', 'nestjs', 'express', 'spring', 'python', 'django', 'flask', 'go', 'golang', 'rust', 'php', 'laravel', 'rails', 'ruby', 'api', 'rest'])) {
      return 'backend';
    }

    if (hasAny(['sql', 'postgres', 'postgresql', 'mysql', 'mariadb', 'oracle', 'mongodb', 'redis', 'dynamodb', 'cosmos', 'elasticsearch', 'cassandra', 'sqlite'])) {
      return 'database';
    }

    if (hasAny(['docker', 'kubernetes', 'k8s', 'helm', 'terraform', 'ansible', 'ci', 'cd', 'jenkins', 'github actions', 'gitlab', 'devops'])) {
      return 'devops';
    }

    if (hasAny(['aws', 'azure', 'gcp', 'google cloud', 'cloud', 'lambda', 's3', 'ec2', 'aks', 'eks'])) {
      return 'cloud';
    }

    if (hasAny(['android', 'ios', 'swift', 'react native', 'flutter', 'dart', 'xamarin', 'mobile'])) {
      return 'mobile';
    }

    if (hasAny(['data', 'etl', 'spark', 'hadoop', 'airflow', 'pandas', 'numpy', 'ml', 'machine learning', 'bi', 'power bi', 'tableau'])) {
      return 'data';
    }

    return 'other';
  }

  private createStackId(label: string): string {
    const slug = label
      .toLocaleLowerCase('pt-BR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return `user:${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  private normalizeStackChip(item: Partial<StackChip> & { name: string }): StackChip {
    const inferredCategory = item.category ?? this.guessCategory(item.name);
    const next = this.createStackChip(
      item.name,
      item.knowledge,
      item.description,
      inferredCategory,
      item.id,
    );

    // Preserva knowledge salvo se vier válido.
    if (typeof item.knowledge === 'number' && !Number.isNaN(item.knowledge)) {
      next.knowledge = Math.max(0, Math.min(100, Math.round(item.knowledge)));
    }

    return next;
  }

  private getDescriptionPlainText(value: string): string {
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

  private getStacksList(group: StackGroup): StackChip[] {
    return group === 'primary' ? this.primaryStacks : this.extraStacks;
  }

  private getAllStacks(): StackChip[] {
    return [...this.primaryStacks, ...this.extraStacks];
  }

  selectPrimaryCategory(category: StackCategory): void {
    this.selectedPrimaryCategory = category;
    this.showPrimaryCategoryPanel = true;
  }

  selectExtraCategory(category: StackCategory): void {
    this.selectedExtraCategory = category;
    this.showExtraCategoryPanel = true;
  }

  private getEntriesForCategory(items: StackChip[], category: StackCategory): Array<{ item: StackChip; index: number }> {
    return items
      .map((item, index) => {
        if (!item.category) {
          item.category = this.guessCategory(item.name);
        }
        return { item, index };
      })
      .filter((entry) => entry.item.category === category);
  }
}
