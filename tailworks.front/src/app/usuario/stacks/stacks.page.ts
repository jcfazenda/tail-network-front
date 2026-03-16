import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlcanceRadarComponent, RadarLegendItem } from '../../vagas/cadastro/alcance-radar/alcance-radar.component';

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
  seniority?: SeniorityLevel;
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

type StructuredStackGuide = {
  tagline: string;
  masteryChecklist: string[];
  commonTools: string[];
  usedByCompanies: string[];
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

@Component({
  standalone: true,
  selector: 'app-stacks-page',
  imports: [CommonModule, FormsModule, AlcanceRadarComponent],
  templateUrl: './stacks.page.html',
  styleUrls: ['./stacks.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StacksPage implements OnInit {
  private static readonly storageKey = 'tailworks:candidate-stacks-draft:v5';
  private static readonly legacyV4StorageKey = 'tailworks:candidate-stacks-draft:v4';
  private static readonly legacyV3StorageKey = 'tailworks:candidate-stacks-draft:v3';
  private static readonly legacyStorageKey = 'tailworks:candidate-stacks-draft:v2';
  private static readonly basicDraftStorageKey = 'tailworks:candidate-basic-draft:v1';
  private static readonly formationCopyStorageKey = 'tailworks:candidate-experience-formation-copy:v1';
  private static readonly stackDescriptionMaxLength = 920;

  private readonly router = inject(Router);

  readonly radarPreviewScore = 89;
  readonly radarPreviewItems: RadarLegendItem[] = [
    { label: 'Alta compatibilidade', tone: 'high', percent: 76 },
    { label: 'Media de Compatibilidade', tone: 'medium', detail: '(60-85%)' },
    { label: 'Potenciais', tone: 'potential', count: 97 },
  ];

  stackError = '';
  primaryStacks: StackChip[] = [];
  extraStacks: StackChip[] = [];
  isStackModalOpen = false;
  isStrategyHelpModalOpen = false;
  activeGuidanceStack: StackRepoItem | null = null;
  activeGuidancePercent = 0;
  expandedGuideRepoId: string | null = null;
  profileSeniorityLevel: SeniorityLevel = 'pleno';
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

  readonly seniorityOptions: Array<{ value: SeniorityLevel; label: string }> = [
    { value: 'jr', label: 'Jr' },
    { value: 'pleno', label: 'Pleno' },
    { value: 'senior', label: 'Senior' },
    { value: 'especialista', label: 'Especialista' },
  ];

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

  private readonly structuredGuides: Record<string, StructuredStackGuide> = {
    'repo:kafka': {
      tagline: 'Event Streaming Platform',
      masteryChecklist: [
        'Produzir e consumir eventos',
        'Entender tópicos e partições',
        'Trabalhar com consumer groups',
        'Integrar com microservices',
      ],
      commonTools: [
        'Kafka CLI',
        'Confluent',
        'Spring Kafka',
        'Kafka Streams',
      ],
      usedByCompanies: [
        'Netflix',
        'Uber',
        'LinkedIn',
        'Amazon',
      ],
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

    return this.stackPurposeCopy[stack.id]?.levels[this.profileSeniorityLevel]
      ?? fallback[this.profileSeniorityLevel];
  }

  get activeStructuredGuide(): StructuredStackGuide | null {
    const stack = this.activeGuidanceStack;
    if (!stack) {
      return null;
    }

    return this.structuredGuides[stack.id] ?? null;
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

    const stored = localStorage.getItem(StacksPage.storageKey);

    if (stored) {
      try {
        const parsedDraft = JSON.parse(stored) as Partial<StoredStacksDraft>;
        const primary = Array.isArray(parsedDraft.primary) ? parsedDraft.primary : [];
        const extra = Array.isArray(parsedDraft.extra) ? parsedDraft.extra : [];
        this.restoreSeniority(parsedDraft.seniority);
        const restoredPrimary = primary
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const restoredExtra = extra
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const sanitized = this.sanitizeRestoredStacks(restoredPrimary, restoredExtra);
        this.primaryStacks = sanitized.primary;
        this.extraStacks = sanitized.extra;
        this.persistStacks();
        return;
      } catch {
        localStorage.removeItem(StacksPage.storageKey);
      }
    }

    const legacyV4 = localStorage.getItem(StacksPage.legacyV4StorageKey);

    if (legacyV4) {
      try {
        const parsedDraft = JSON.parse(legacyV4) as Partial<StoredStacksDraft>;
        const primary = Array.isArray(parsedDraft.primary) ? parsedDraft.primary : [];
        const extra = Array.isArray(parsedDraft.extra) ? parsedDraft.extra : [];
        this.restoreSeniority(parsedDraft.seniority);

        // Versões anteriores semeavam automaticamente stacks em 10%. Se parecer seed, zera.
        if (this.looksLikeLegacySeedDraft(primary, extra)) {
          this.primaryStacks = [];
          this.extraStacks = [];
          this.persistStacks();
          return;
        }

        const restoredPrimary = primary
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const restoredExtra = extra
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const sanitized = this.sanitizeRestoredStacks(restoredPrimary, restoredExtra);
        this.primaryStacks = sanitized.primary;
        this.extraStacks = sanitized.extra;
        this.persistStacks();
        return;
      } catch {
        localStorage.removeItem(StacksPage.legacyV4StorageKey);
      }
    }

    const legacyV3 = localStorage.getItem(StacksPage.legacyV3StorageKey);

    if (legacyV3) {
      try {
        const parsedDraft = JSON.parse(legacyV3) as Partial<StoredStacksDraft>;
        const primary = Array.isArray(parsedDraft.primary) ? parsedDraft.primary : [];
        const extra = Array.isArray(parsedDraft.extra) ? parsedDraft.extra : [];
        this.restoreSeniority(parsedDraft.seniority);
        const restoredPrimary = primary
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const restoredExtra = extra
          .filter((item): item is StackChip => Boolean(item?.name))
          .map((item) => this.normalizeStackChip(item));
        const sanitized = this.sanitizeRestoredStacks(restoredPrimary, restoredExtra);
        this.primaryStacks = sanitized.primary;
        this.extraStacks = sanitized.extra;
        this.persistStacks();
        return;
      } catch {
        localStorage.removeItem(StacksPage.legacyV3StorageKey);
      }
    }

    const legacy = localStorage.getItem(StacksPage.legacyStorageKey);

    if (legacy) {
      try {
        const parsedStacks = JSON.parse(legacy) as Array<Partial<StackChip> & { name: string }>;
        const restoredPrimary = parsedStacks.map((item) => this.normalizeStackChip(item));
        const sanitized = this.sanitizeRestoredStacks(restoredPrimary, []);
        this.primaryStacks = sanitized.primary;
        this.extraStacks = sanitized.extra;
        this.persistStacks();
        return;
      } catch {
        localStorage.removeItem(StacksPage.legacyStorageKey);
      }
    }

    // Início "zerado": o usuário escolhe a categoria e marca o percentual a partir do repositório.
    this.primaryStacks = [];
    this.extraStacks = [];
    this.persistStacks();
  }

  private restoreSeniority(value: unknown): void {
    if (value === 'jr' || value === 'pleno' || value === 'senior' || value === 'especialista') {
      this.profileSeniorityLevel = value;
    }
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

  getStructuredGuide(repoId: string): StructuredStackGuide | null {
    return this.structuredGuides[repoId] ?? null;
  }

  getGuideTagline(repoId: string): string {
    return this.structuredGuides[repoId]?.tagline ?? '';
  }

  getInfoSummary(repoId: string): string {
    return this.stackPurposeCopy[repoId]?.summary
      ?? 'Essa stack representa um conjunto de habilidades e responsabilidades que variam com o contexto da vaga.';
  }

  getInfoBullets(repoId: string): string[] {
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

    return this.stackPurposeCopy[repoId]?.levels[this.profileSeniorityLevel]
      ?? fallback[this.profileSeniorityLevel];
  }

  percentLevelLabel(percent: number): string {
    return this.getPercentLevelLabel(percent);
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
      seniority: this.profileSeniorityLevel,
    };
    localStorage.setItem(StacksPage.storageKey, JSON.stringify(draft));
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
