import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlcanceRadarComponent } from './alcance-radar/alcance-radar.component';
import { ContractType, JobBenefitItem, MockJobDraft, TechStackItem, VagaPanelDraft, WorkModel } from '../data/vagas.models';
import { VagasMockService } from '../data/vagas-mock.service';

type RefinementItem = string;
type SummaryPageId = 'front' | 'back';
type ResponsibilitySection = {
  id: string;
  pageId: SummaryPageId;
  title: string;
  items: string[];
};

type CompanySummaryProfile = {
  name: string;
  followers: string;
  description: string;
  linkedinCount: string;
  logoLabel: string;
};

@Component({
  standalone: true,
  selector: 'app-cadastro-page',
  imports: [CommonModule, FormsModule, AlcanceRadarComponent],
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage {
  private readonly router = inject(Router);
  private readonly vagasMockService = inject(VagasMockService);
  private summarySectionCounter = 3;
  private readonly brlNumberFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  readonly configurationProgress = 60;
  readonly previewAderencia = 89;
  readonly previewAvatars = [
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
  ];
  readonly previewAvatarExtraCount = 18;
  readonly documentOptions = [
    'Copia do Certificado de conclusão',
    'Copia da Identidade e CPF',
    'Comprovante de Residencia',
  ];
  readonly initialSelectedBenefits: JobBenefitItem[] = [
    {
      title: 'Plano de Saúde',
      sideLabel: 'Cobre 50%',
      description: 'Sulamerica Seguros + Leito e Internação',
    },
    {
      title: 'Plano Odontológico',
      sideLabel: '100%',
      description: 'Cobertura nacional com reembolso e rede credenciada',
    },
    {
      title: 'Day Off Aniversário',
      sideLabel: 'Abonado',
      description: 'Folga remunerada no mês do aniversario',
    },
  ];
  readonly companyOptions = [
    'Banco Itaú',
    'Nubank',
    'Stone',
  ];
  readonly locationOptions = [
    'Rio de Janeiro - RJ',
    'São Paulo - SP',
    'Remoto - Brasil',
  ];
  readonly workModels: WorkModel[] = ['Remoto', 'Hibrido', 'Presencial'];
  readonly contractTypes: ContractType[] = ['CLT', 'PJ', 'Freelancer'];
  readonly techStackItems: TechStackItem[] = [
    { name: '.NET / C#', match: 80 },
    { name: 'Entity Framework', match: 65 },
    { name: 'REST API', match: 75 },
    { name: 'SQL Server', match: 70 },
    { name: 'Azure', match: 40 },
  ];
  readonly refinementOptions: RefinementItem[] = [
    'Experiência com Azure ou Aws',
    'Trabalho em Equipe',
    'Teste Unitário e Integrado',
    'Viajar a Trabalho',
  ];
  readonly companyProfiles: Record<string, CompanySummaryProfile> = {
    'Banco Itaú': {
      name: 'Banco Itaú',
      followers: '5.248.921 seguidores',
      description: 'Banco e serviços financeiros',
      linkedinCount: '5.248.921 no LinkedIn',
      logoLabel: 'it',
    },
    Nubank: {
      name: 'Nubank',
      followers: '2.304.114 seguidores',
      description: 'Tecnologia financeira e meios de pagamento',
      linkedinCount: '2.304.114 no LinkedIn',
      logoLabel: 'nu',
    },
    Stone: {
      name: 'Stone',
      followers: '1.128.440 seguidores',
      description: 'Serviços financeiros e tecnologia para negocios',
      linkedinCount: '1.128.440 no LinkedIn',
      logoLabel: 'st',
    },
  };
  responsibilitySections: ResponsibilitySection[] = [
    {
      id: 'summary-section-1',
      pageId: 'front',
      title: 'Requisitos e habilidades que buscamos:',
      items: [
        'Graduação em Ciência da Computação, Tecnologia da Informação ou área relacionada;',
        'Experiência sólida em desenvolvimento com Frontend nas tecnologias Angular ou React;',
        'Experiência em desenvolvimento backend Java, Spring ou Quarkus, NodeJS, Express.js, Python Flask/Django;',
        'Desenvolvimento de APIs Rest: habilidade em criar e manter APIs Restful;',
        'Compreensão profunda dos conceitos e práticas de backend;',
        'Proficiência no uso de Git para controle de versões;',
        'Experiência na configuração e manutenção de pipelines de CI/CD utilizando Jenkins e Argo;',
        'Conhecimento em desenvolvimento de back-end utilizando arquitetura de microsserviços e tecnologias de cloud;',
        'Experiência em práticas DevOps, incluindo o uso de Kubernetes e Docker.;',
        'Habilidade em criar e executar testes de integração e unitários;',
        'Banco de Dados relacional com utilização de linguagem SQL;',
        'HTML5, CSS3, Angular ou React.js, TypeScript, next.js, Javascript, Java, SQL, Spring ou Quarkus. Ferramentas de versionamento de código.',
      ],
    },
    {
      id: 'summary-section-2',
      pageId: 'front',
      title: 'Desejável:',
      items: [
        'Pós-graduação em tecnologia ou gestão;',
        'Experiencia com Java com Quarkus.',
      ],
    },
  ];
  readonly initialSelectedRefinementOptions: RefinementItem[] = [...this.refinementOptions];

  readonly jobDraft: VagaPanelDraft = {
    title: 'Backend .NET Sênior',
    company: 'Banco Itaú',
    location: 'Rio de Janeiro - RJ',
    workModel: 'Remoto',
    seniority: 'Senior',
    summary:
      'Profissional para evoluir APIs, sustentar arquitetura distribuida e acelerar entregas criticas junto ao time de produtos e plataforma.',
  };
  contractType: ContractType = 'CLT';
  contractSummary = '';
  salaryRange = '';
  hybridOnsiteDaysDescription = '2 dias presenciais por semana';
  showSalaryRangeInCard = true;
  selectedBenefits = this.initialSelectedBenefits.map((item) => ({ ...item }));
  selectedRefinementOptions = [...this.initialSelectedRefinementOptions];
  followingCompanies: Record<string, boolean> = {
    'Banco Itaú': true,
    Nubank: false,
    Stone: false,
  };
  isSummaryBackVisible = false;
  editingSummaryDescriptionPageId: SummaryPageId | null = null;
  isBenefitModalOpen = false;
  isResponsibilityModalOpen = false;
  editingResponsibilitySectionId: string | null = null;
  responsibilityDraftPageId: SummaryPageId = 'front';
  benefitDraftTitle = '';
  benefitDraftSideLabel = '';
  benefitDraftDescription = '';
  jobSummaryDraft = '';
  responsibilityDraftTitle = '';
  responsibilityDraftItem = '';
  responsibilityDraftItems: string[] = [];

  get previewContractType(): ContractType {
    return this.contractType;
  }

  get previewCardOfferLine(): string {
    const segments: string[] = [this.previewContractType];

    if (this.showSalaryRangeInCard && this.hasSalaryRangeValue) {
      segments.push(this.contractSalaryDisplay);
    }

    const hasBenefits = this.selectedBenefits.length > 0;
    let line = segments.join(' - ');

    if (hasBenefits) {
      line = `${line} + Beneficios`;
    }

    return line;
  }

  get activeSummaryPageId(): SummaryPageId {
    return this.isSummaryBackVisible ? 'back' : 'front';
  }

  get frontResponsibilitySections(): ResponsibilitySection[] {
    return this.responsibilitySections.filter((section) => section.pageId === 'front');
  }

  get backResponsibilitySections(): ResponsibilitySection[] {
    return this.responsibilitySections.filter((section) => section.pageId === 'back');
  }

  get isJobSummaryModalOpen(): boolean {
    return this.editingSummaryDescriptionPageId !== null;
  }

  get canSaveBenefit(): boolean {
    return this.benefitDraftTitle.trim().length > 0;
  }

  get summaryPanelDescription(): string {
    const value = this.jobDraft.summary?.trim();
    return value || 'Nao ha descricao';
  }

  get contractPanelDescription(): string {
    const value = this.contractSummary.trim();
    return value || 'Nao ha descricao';
  }

  get hasSalaryRangeValue(): boolean {
    return this.salaryRange.trim().length > 0;
  }

  get contractSalaryDisplay(): string {
    const value = this.salaryRange.trim();
    if (!value) {
      return 'Não informado';
    }

    return value.startsWith('R$') ? value : `R$ ${value}`;
  }

  get hybridWorkModelDetail(): string | null {
    if (this.jobDraft.workModel !== 'Hibrido') {
      return null;
    }

    return `Hibrido · ${this.hybridOnsiteDaysDescription}`;
  }

  get summaryDescriptionModalTitle(): string {
    return this.editingSummaryDescriptionPageId === 'back' ? 'Editar contratacao' : 'Editar resumo da vaga';
  }

  get summaryDescriptionModalLabel(): string {
    return this.editingSummaryDescriptionPageId === 'back' ? 'Sobre a contratacao' : 'Sobre a vaga';
  }

  get summaryDescriptionModalPlaceholder(): string {
    return this.editingSummaryDescriptionPageId === 'back'
      ? 'Descreva as condicoes e combinados da contratacao'
      : 'Descreva a vaga para o candidato';
  }

  get currentCompanyProfile(): CompanySummaryProfile {
    return this.companyProfiles[this.jobDraft.company] ?? {
      name: this.jobDraft.company,
      followers: '120.000 seguidores',
      description: 'Empresa em crescimento',
      linkedinCount: '120.000 no LinkedIn',
      logoLabel: this.jobDraft.company.slice(0, 2).toLowerCase(),
    };
  }

  get isFollowingCurrentCompany(): boolean {
    return this.followingCompanies[this.currentCompanyProfile.name] ?? false;
  }

  onSalaryRangeBeforeInput(event: InputEvent): void {
    if (
      event.inputType.startsWith('delete') ||
      event.inputType === 'historyUndo' ||
      event.inputType === 'historyRedo'
    ) {
      return;
    }

    const data = event.data ?? '';
    if (!data || /^\d+$/.test(data)) {
      return;
    }

    event.preventDefault();
  }

  onSalaryRangeChange(value: string): void {
    this.salaryRange = this.formatSalaryRange(value);
  }

  openBenefitModal(): void {
    this.benefitDraftTitle = '';
    this.benefitDraftSideLabel = '';
    this.benefitDraftDescription = '';
    this.isBenefitModalOpen = true;
  }

  closeBenefitModal(): void {
    this.isBenefitModalOpen = false;
    this.benefitDraftTitle = '';
    this.benefitDraftSideLabel = '';
    this.benefitDraftDescription = '';
  }

  saveBenefit(): void {
    const title = this.benefitDraftTitle.trim();
    if (!title) {
      return;
    }

    this.selectedBenefits = [
      ...this.selectedBenefits,
      {
        title,
        sideLabel: this.benefitDraftSideLabel.trim() || undefined,
        description: this.benefitDraftDescription.trim() || undefined,
      },
    ];

    this.closeBenefitModal();
  }

  toggleRefinementOption(item: RefinementItem): void {
    if (this.selectedRefinementOptions.includes(item)) {
      this.selectedRefinementOptions = this.selectedRefinementOptions.filter((option) => option !== item);
      return;
    }

    this.selectedRefinementOptions = [...this.selectedRefinementOptions, item];
  }

  toggleCompanyFollow(): void {
    const companyName = this.currentCompanyProfile.name;
    this.followingCompanies = {
      ...this.followingCompanies,
      [companyName]: !this.isFollowingCurrentCompany,
    };
  }

  toggleSummaryPanelFace(): void {
    this.isSummaryBackVisible = !this.isSummaryBackVisible;
  }

  openJobSummaryModal(pageId: SummaryPageId): void {
    this.editingSummaryDescriptionPageId = pageId;
    this.jobSummaryDraft = pageId === 'back' ? this.contractSummary.trim() : this.jobDraft.summary?.trim() ?? '';
  }

  closeJobSummaryModal(): void {
    this.editingSummaryDescriptionPageId = null;
    this.jobSummaryDraft = '';
  }

  saveJobSummary(): void {
    if (this.editingSummaryDescriptionPageId === 'back') {
      this.contractSummary = this.jobSummaryDraft.trim();
    } else {
      this.jobDraft.summary = this.jobSummaryDraft.trim();
    }
    this.closeJobSummaryModal();
  }

  openResponsibilityModal(): void {
    this.editingResponsibilitySectionId = null;
    this.responsibilityDraftPageId = this.activeSummaryPageId;
    this.isResponsibilityModalOpen = true;
  }

  closeResponsibilityModal(): void {
    this.isResponsibilityModalOpen = false;
    this.editingResponsibilitySectionId = null;
    this.responsibilityDraftPageId = this.activeSummaryPageId;
    this.responsibilityDraftTitle = '';
    this.responsibilityDraftItem = '';
    this.responsibilityDraftItems = [];
  }

  editResponsibilitySection(sectionId: string): void {
    const section = this.responsibilitySections.find((item) => item.id === sectionId);
    if (!section) {
      return;
    }

    this.editingResponsibilitySectionId = section.id;
    this.responsibilityDraftPageId = section.pageId;
    this.responsibilityDraftTitle = section.title;
    this.responsibilityDraftItem = '';
    this.responsibilityDraftItems = [...section.items];
    this.isResponsibilityModalOpen = true;
  }

  addResponsibilityDraftItem(): void {
    const value = this.responsibilityDraftItem.trim();
    if (!value) {
      return;
    }

    this.responsibilityDraftItems = [...this.responsibilityDraftItems, value];
    this.responsibilityDraftItem = '';
  }

  removeResponsibilityDraftItem(index: number): void {
    this.responsibilityDraftItems = this.responsibilityDraftItems.filter((_, itemIndex) => itemIndex !== index);
  }

  saveResponsibilitySection(): void {
    const title = this.responsibilityDraftTitle.trim();
    if (!title || !this.responsibilityDraftItems.length) {
      return;
    }

    if (this.editingResponsibilitySectionId !== null) {
      this.responsibilitySections = this.responsibilitySections.map((section) =>
        section.id === this.editingResponsibilitySectionId
          ? {
              ...section,
              title,
              items: [...this.responsibilityDraftItems],
            }
          : section,
      );
      this.closeResponsibilityModal();
      return;
    }

    this.responsibilitySections = [
      ...this.responsibilitySections,
      {
        id: this.createSummarySectionId(),
        pageId: this.responsibilityDraftPageId,
        title,
        items: [...this.responsibilityDraftItems],
      },
    ];
    this.closeResponsibilityModal();
  }

  get canSaveResponsibilitySection(): boolean {
    return !!this.responsibilityDraftTitle.trim() && this.responsibilityDraftItems.length > 0;
  }

  get responsibilityModalTitle(): string {
    return this.editingResponsibilitySectionId === null ? 'Novo bloco' : 'Editar bloco';
  }

  get responsibilityModalSubmitLabel(): string {
    return this.editingResponsibilitySectionId === null ? 'Salvar bloco' : 'Salvar alterações';
  }

  saveAsDraft(): void {
    const savedJob = this.vagasMockService.saveJob({
      draft: this.buildDraftPayload(),
      status: 'rascunhos',
      previewAderencia: this.previewAderencia,
      previewAvatars: this.previewAvatars,
      previewAvatarExtraCount: this.previewAvatarExtraCount,
    });

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: 'rascunhos', created: savedJob.id },
    });
  }

  publishJob(): void {
    const savedJob = this.vagasMockService.saveJob({
      draft: this.buildDraftPayload(),
      status: 'ativas',
      previewAderencia: this.previewAderencia,
      previewAvatars: this.previewAvatars,
      previewAvatarExtraCount: this.previewAvatarExtraCount,
    });

    void this.router.navigate(['/vagas'], {
      queryParams: { tab: 'ativas', created: savedJob.id },
    });
  }

  private buildDraftPayload(): MockJobDraft {
    return {
      ...this.jobDraft,
      contractType: this.contractType,
      salaryRange: this.salaryRange.trim(),
      showSalaryRangeInCard: this.showSalaryRangeInCard,
      hybridOnsiteDaysDescription: this.hybridOnsiteDaysDescription.trim(),
      benefits: this.selectedBenefits.map((item) => ({ ...item })),
      techStack: this.techStackItems.map((item) => ({ ...item })),
      differentials: [...this.selectedRefinementOptions],
    };
  }

  private formatSalaryRange(value: string): string {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
      return '';
    }

    const amount = Number.parseInt(digits, 10) / 100;
    return this.brlNumberFormatter.format(amount);
  }

  private createSummarySectionId(): string {
    const nextId = this.summarySectionCounter;
    this.summarySectionCounter += 1;
    return `summary-section-${nextId}`;
  }
}
