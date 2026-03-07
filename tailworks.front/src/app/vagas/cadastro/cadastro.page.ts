import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlcanceRadarComponent } from './alcance-radar/alcance-radar.component';
import { VagaPanelDraft, VagaPanelRecruiter } from './vaga-panel/vaga-panel.component';

type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
type Seniority = 'Junior' | 'Pleno' | 'Senior' | 'Especialista';
type CadastroStep = 'basic' | 'profile' | 'benefits';

interface KnowledgeSkill {
  name: string;
  match: number;
}

@Component({
  standalone: true,
  selector: 'app-cadastro-page',
  imports: [CommonModule, FormsModule, AlcanceRadarComponent],
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage {
  readonly configurationProgress = 60;
  readonly previewContractType = 'CLT';
  readonly previewAderencia = 89;
  readonly previewAvatars = [
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
  ];
  readonly previewAvatarExtraCount = 18;
  readonly defaultPreviewBenefits = [
    'Plano Saude',
    'Plano Odontologico',
    'Day Off Aniversario',
  ];
  readonly workModels: WorkModel[] = ['Presencial', 'Hibrido', 'Remoto'];
  readonly seniorities: Seniority[] = ['Junior', 'Pleno', 'Senior', 'Especialista'];
  readonly benefitOptions = [
    'Plano Saude',
    'Plano Odontologico',
    'Vale alimentacao',
    'Vale refeicao',
    'Vale transporte',
  ];
  readonly extraBenefitOptions = [
    'Gympass',
    'Cartao gasolina',
    'Seguro de vida',
  ];
  readonly stepOrder: CadastroStep[] = ['basic', 'benefits', 'profile'];
  readonly stepLabels: Record<CadastroStep, string> = {
    basic: 'Informacoes principais',
    profile: 'Perfil da Vaga',
    benefits: 'Beneficios',
  };

  readonly recruiter: VagaPanelRecruiter = {
    name: 'Rafael Souza',
    role: 'Talent Acquisition',
    avatar: '/assets/avatars/avatar-rafael.png',
  };

  readonly jobDraft: VagaPanelDraft = {
    title: 'Backend .NET Senior',
    company: 'Banco Itau',
    location: 'Rio de Janeiro - RJ',
    workModel: 'Remoto',
    seniority: 'Senior',
    summary:
      'Profissional para evoluir APIs, sustentar arquitetura distribuida e acelerar entregas criticas junto ao time de produtos e plataforma.',
  };
  activeStep: CadastroStep = 'basic';
  roleProfile = {
    mission:
      'Atuar na evolucao de servicos criticos, garantir confiabilidade das APIs e sustentar a tomada de decisao tecnica junto ao time.',
    hardSkills: '.NET, C#, arquitetura distribuida, APIs REST, mensageria, SQL Server e Azure.',
    niceToHave: 'Experiencia com fintech, observabilidade e lideranca tecnica informal.',
  };
  selectedBenefits: string[] = [];
  knowledgeSkillDraft: KnowledgeSkill = {
    name: '',
    match: 78,
  };
  knowledgeSkills: KnowledgeSkill[] = [
    {
      name: '.NET',
      match: 78,
    },
  ];

  get previewJobDraft(): VagaPanelDraft {
    return { ...this.jobDraft };
  }

  get previewBenefitHighlights(): string[] {
    const benefits = this.selectedBenefits.length ? this.selectedBenefits : this.defaultPreviewBenefits;
    return benefits.slice(0, 3);
  }

  get currentStepIndex(): number {
    return this.stepOrder.indexOf(this.activeStep);
  }

  get currentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  get currentStepTitle(): string {
    if (this.activeStep === 'basic') {
      return 'Informacoes principais da vaga';
    }

    if (this.activeStep === 'profile') {
      return 'Perfil tecnico e contexto da vaga';
    }

    return 'Beneficios e proposta de valor';
  }

  get currentStepDescription(): string {
    if (this.activeStep === 'basic') {
      return 'Esses dados ajudam o time a calibrar aderencia, compatibilidade e os primeiros perfis do radar.';
    }

    if (this.activeStep === 'profile') {
      return 'Organize o contexto da posicao e o radar tecnico esperado para orientar a busca com mais precisao.';
    }

    return 'Liste os beneficios que fortalecem a proposta e ajudam a comunicar a vaga para o mercado.';
  }

  get isLastStep(): boolean {
    return this.currentStepIndex === this.stepOrder.length - 1;
  }

  setActiveStep(step: CadastroStep): void {
    this.activeStep = step;
  }

  goNextStep(): void {
    const nextStep = this.stepOrder[this.currentStepIndex + 1];
    if (nextStep) {
      this.activeStep = nextStep;
    }
  }

  goPreviousStep(): void {
    const previousStep = this.stepOrder[this.currentStepIndex - 1];
    if (previousStep) {
      this.activeStep = previousStep;
    }
  }

  toggleBenefit(item: string): void {
    if (this.selectedBenefits.includes(item)) {
      this.selectedBenefits = this.selectedBenefits.filter((benefit) => benefit !== item);
      return;
    }

    this.selectedBenefits = [...this.selectedBenefits, item];
  }

  addKnowledgeSkill(): void {
    const name = this.knowledgeSkillDraft.name.trim();
    const match = this.clampMatch(this.knowledgeSkillDraft.match);

    if (!name) {
      return;
    }

    const existingIndex = this.knowledgeSkills.findIndex(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    if (existingIndex >= 0) {
      this.knowledgeSkills = this.knowledgeSkills.map((item, index) =>
        index === existingIndex ? { ...item, name, match } : item,
      );
    } else {
      this.knowledgeSkills = [...this.knowledgeSkills, { name, match }];
    }

    this.knowledgeSkillDraft = {
      name: '',
      match: 78,
    };
  }

  private clampMatch(value: number): number {
    return Math.min(100, Math.max(1, Number(value) || 78));
  }
}
