import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlcanceRadarComponent } from './alcance-radar/alcance-radar.component';
import { VagaPanelDraft } from './vaga-panel/vaga-panel.component';

type WorkModel = 'Presencial' | 'Hibrido' | 'Remoto';
type ContractType = 'CLT' | 'PJ' | 'Freelancer';

interface TechStackItem {
  name: string;
  match: number;
}

type RefinementItem =
  | 'Experiência com Azure ou Aws'
  | 'Trabalho em Equipe'
  | 'Teste Unitário e Integrado'
  | 'Viajar a Trabalho';

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
  readonly previewAderencia = 89;
  readonly previewAvatars = [
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
    '/assets/avatars/avatar-rafael.png',
  ];
  readonly previewAvatarExtraCount = 18;
  readonly benefitOptions = [
    'Plano de Saúde',
    'Plano Odontológico',
    'Day Off Aniversário',
    'Gympass',
    'Vale Alimentação',
    'Vale Refeição',
    'Vale Transporte',
    'Cartão Gasolina',
    'Seguro de Vida',
  ];
  readonly initialSelectedBenefits = [
    'Plano de Saúde',
    'Plano Odontológico',
    'Day Off Aniversário',
    'Gympass',
    'Seguro de Vida',
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
  selectedBenefits = [...this.initialSelectedBenefits];
  selectedRefinementOptions = [...this.initialSelectedRefinementOptions];

  get previewBenefitHighlights(): string[] {
    const benefits = this.selectedBenefits.length ? this.selectedBenefits : this.initialSelectedBenefits;
    return benefits
      .filter((item) => item !== 'Day Off Aniversário')
      .slice(0, 3);
  }

  get previewContractType(): ContractType {
    return this.contractType;
  }

  toggleBenefit(item: string): void {
    if (this.selectedBenefits.includes(item)) {
      this.selectedBenefits = this.selectedBenefits.filter((benefit) => benefit !== item);
      return;
    }

    this.selectedBenefits = [...this.selectedBenefits, item];
  }

  toggleRefinementOption(item: RefinementItem): void {
    if (this.selectedRefinementOptions.includes(item)) {
      this.selectedRefinementOptions = this.selectedRefinementOptions.filter((option) => option !== item);
      return;
    }

    this.selectedRefinementOptions = [...this.selectedRefinementOptions, item];
  }
}
