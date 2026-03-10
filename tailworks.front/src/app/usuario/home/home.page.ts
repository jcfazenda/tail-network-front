import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { VagasMockService } from '../../vagas/data/vagas-mock.service';
import { MockJobRecord } from '../../vagas/data/vagas.models';

type EcosystemNavItem = {
  label: string;
  icon: string;
  active?: boolean;
};

type EcosystemLevelItem = {
  label: string;
  range: string;
  tone: 'high' | 'mid' | 'potentials' | 'outside';
};

type EcosystemSpotlightItem = {
  label: string;
  score: number;
};

type EcosystemCompanyProfile = {
  name: string;
  followers: string;
  description: string;
  logoLabel: string;
  logoUrl?: string;
};

@Component({
  standalone: true,
  selector: 'app-home-page',
  imports: [CommonModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  constructor(private readonly vagasMockService: VagasMockService) {}

  private readonly companyProfiles: Record<string, EcosystemCompanyProfile> = {
    'Banco Itaú': {
      name: 'Banco Itaú',
      followers: '5.248.921 seguidores',
      description: 'Banco e serviços financeiros',
      logoLabel: 'it',
      logoUrl: '/assets/images/logo-itau.png',
    },
    Nubank: {
      name: 'Nubank',
      followers: '2.304.114 seguidores',
      description: 'Tecnologia financeira e meios de pagamento',
      logoLabel: 'nu',
    },
    Stone: {
      name: 'Stone',
      followers: '1.128.440 seguidores',
      description: 'Serviços financeiros e tecnologia para negocios',
      logoLabel: 'st',
    },
  };

  protected readonly ecosystemItems: EcosystemNavItem[] = [
    { label: 'Radar', icon: 'radar' },
    { label: 'Oportunidades', icon: 'travel_explore', active: true },
    { label: 'Empresas', icon: 'domain' },
    { label: 'Evolução', icon: 'monitoring' },
    { label: 'Cursos', icon: 'school' },
    { label: 'Conquistas', icon: 'workspace_premium' },
  ];

  protected readonly levelItems: EcosystemLevelItem[] = [
    { label: 'Alta', range: '(85-100%)', tone: 'high' },
    { label: 'Boa', range: '(65-84%)', tone: 'mid' },
    { label: 'Potencial', range: '(55-64%)', tone: 'potentials' },
    { label: 'Fora do Radar', range: '(<55%)', tone: 'outside' },
  ];

  protected readonly levelValue = 84;

  protected get latestJob(): MockJobRecord | undefined {
    return this.vagasMockService.getJobs()[0];
  }

  protected get spotlightCompanyProfile(): EcosystemCompanyProfile {
    const companyName = this.latestJob?.company;

    if (companyName && this.companyProfiles[companyName]) {
      return this.companyProfiles[companyName];
    }

    if (companyName) {
      return {
        name: companyName,
        followers: '120.000 seguidores',
        description: 'Empresa em crescimento',
        logoLabel: companyName.slice(0, 2).toLowerCase(),
      };
    }

    return this.companyProfiles['Banco Itaú'];
  }

  protected get spotlightItems(): EcosystemSpotlightItem[] {
    const latestStacks = this.latestJob?.techStack ?? [];

    if (latestStacks.length) {
      return latestStacks.map((item) => ({
        label: item.name,
        score: item.match,
      }));
    }

    return [
      { label: '.NET', score: 95 },
      { label: 'SQL Server', score: 76 },
      { label: 'Azure', score: 90 },
      { label: 'Docker', score: 22 },
    ];
  }

  protected get spotlightJobTitle(): string {
    return this.latestJob?.title || 'Backend .NET Sênior';
  }

  protected get spotlightJobLocation(): string {
    return this.latestJob?.location || 'Rio de Janeiro - RJ';
  }
}
