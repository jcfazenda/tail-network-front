import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VagaPanelDraft, VagaPanelRecruiter } from './vaga-panel/vaga-panel.component';

type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
type Seniority = 'Junior' | 'Pleno' | 'Senior' | 'Especialista';
type CadastroStep = 'profile' | 'benefits';

@Component({
  standalone: true,
  selector: 'app-cadastro-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './cadastro.page.html',
  styleUrls: ['./cadastro.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastroPage {
  readonly workModels: WorkModel[] = ['Presencial', 'Hibrido', 'Remoto'];
  readonly seniorities: Seniority[] = ['Junior', 'Pleno', 'Senior', 'Especialista'];
  readonly benefitOptions = [
    'Plano de saude',
    'Plano odontologico',
    'Vale refeicao',
    'Auxilio home office',
    'PLR',
    'Wellhub',
  ];
  readonly stepOrder: CadastroStep[] = ['benefits', 'profile'];
  readonly stepLabels: Record<CadastroStep, string> = {
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
  activeStep: CadastroStep = 'benefits';
  roleProfile = {
    mission:
      'Atuar na evolucao de servicos criticos, garantir confiabilidade das APIs e sustentar a tomada de decisao tecnica junto ao time.',
    hardSkills: '.NET, C#, arquitetura distribuida, APIs REST, mensageria, SQL Server e Azure.',
    niceToHave: 'Experiencia com fintech, observabilidade e lideranca tecnica informal.',
  };
  selectedBenefits: string[] = ['Plano de saude', 'Vale refeicao', 'Auxilio home office'];

  get previewJobDraft(): VagaPanelDraft {
    return { ...this.jobDraft };
  }

  get currentStepIndex(): number {
    return this.stepOrder.indexOf(this.activeStep);
  }

  get currentStepNumber(): number {
    return this.currentStepIndex + 1;
  }

  get currentStepTitle(): string {
    if (this.activeStep === 'profile') {
      return 'Perfil tecnico e contexto da vaga';
    }

    return 'Beneficios e proposta de valor';
  }

  get currentStepDescription(): string {
    if (this.activeStep === 'profile') {
      return 'Defina escopo, stack e os sinais que melhor descrevem a aderencia esperada para o cargo.';
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
}
