import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { CandidateStage, MockJobCandidate } from '../../vagas/data/vagas.models';

interface CurriculumJourneyStep {
  stepNumber: number;
  label: string;
  ownerText: string;
  description: string;
  dateLabel: string;
  hourLabel: string;
  timeLabel?: string;
  completed: boolean;
  active: boolean;
}

interface CurriculumJourneyViewModel {
  currentStageLabel: string;
  steps: CurriculumJourneyStep[];
}

@Component({
  standalone: true,
  selector: 'app-curriculum-page',
  imports: [CommonModule],
  templateUrl: './curriculum.page.html',
  styleUrl: './curriculum.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurriculumPage {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsFacade = inject(JobsFacade);

  readonly candidateName$ = this.route.queryParamMap.pipe(
    map((params) => params.get('name')?.trim() || 'Candidato em análise'),
  );

  readonly candidateJourney$ = this.route.queryParamMap.pipe(
    map((params) => {
      const jobId = params.get('jobId')?.trim() || '';
      const candidateId = params.get('candidate')?.trim() || '';
      const candidateName = params.get('name')?.trim() || '';
      return this.buildCandidateJourneyView(jobId, candidateId, candidateName);
    }),
  );

  readonly focusedJob$ = this.route.queryParamMap.pipe(
    map((params) => {
      const id = params.get('jobId')?.trim() || '';
      const title = params.get('jobTitle')?.trim() || '';
      const company = params.get('jobCompany')?.trim() || '';

      if (!id && !title && !company) {
        return null;
      }

      return {
        id,
        title,
        company,
        location: params.get('jobLocation')?.trim() || '',
        workModel: params.get('jobWorkModel')?.trim() || '',
        salary: params.get('jobSalary')?.trim() || '',
        contractType: params.get('jobContractType')?.trim() || '',
        logo: params.get('jobLogo')?.trim() || '',
      };
    }),
  );

  readonly roleTitle = 'Senior Full Stack Engineer';
  readonly profileCopy =
    'Profissional com trajetória sólida em produtos digitais, arquitetura de aplicações e evolução contínua de times de tecnologia orientados a performance.';

  readonly contactItems = [
    { icon: 'call', label: '+55 21 99999-4321' },
    { icon: 'mail', label: 'cesar.campos@talent.dev' },
    { icon: 'language', label: 'portfolio.cesarcampos.dev' },
    { icon: 'location_on', label: 'Rio de Janeiro, Brasil' },
  ];

  readonly personalSkills = [
    { label: 'Comunicação', score: 92 },
    { label: 'Ownership', score: 88 },
    { label: 'Mentoria', score: 84 },
    { label: 'Negociação', score: 79 },
  ];

  readonly socialLinks = [
    { icon: 'work', label: 'linkedin.com/in/cesarcampos' },
    { icon: 'public', label: 'github.com/cesarcampos' },
    { icon: 'draw', label: 'behance.net/cesarcampos' },
    { icon: 'alternate_email', label: 'x.com/cesarcampos' },
  ];

  readonly experiences = [
    {
      title: 'Lead .NET Engineer',
      meta: 'Tail Labs | São Paulo | 2023 - atual',
      description:
        'Conduziu a evolução de serviços críticos em .NET, alinhando arquitetura, escalabilidade e integração com plataformas de matching e workflow.',
      highlights: [
        'Arquitetura orientada a domínio para módulos de vagas e radar.',
        'Governança técnica de APIs, filas e integrações internas.',
      ],
    },
    {
      title: 'Senior Angular Engineer',
      meta: 'Studio Orbit | Remoto | 2020 - 2023',
      description:
        'Atuou na construção de experiências complexas de front-end, com foco em performance, componentização e design systems orientados a produto.',
      highlights: [
        'Estruturou componentes reutilizáveis e padrões de UI.',
        'Reduziu retrabalho visual com design tokens e guidelines claros.',
      ],
    },
    {
      title: 'Software Engineer',
      meta: 'Core Systems | Rio de Janeiro | 2017 - 2020',
      description:
        'Participou da modernização de produtos legados e da criação de jornadas digitais com foco em estabilidade operacional e clareza de negócio.',
      highlights: [
        'Refatoração de módulos legados para arquitetura modular.',
        'Entrega contínua com suporte a times de produto e operação.',
      ],
    },
    {
      title: 'Systems Analyst',
      meta: 'Nova Grid | Híbrido | 2015 - 2017',
      description:
        'Atuou na ponte entre tecnologia e operação, detalhando requisitos, organizando entregas e sustentando melhorias em produtos internos.',
      highlights: [
        'Mapeamento de fluxos críticos de negócio e integração.',
        'Acompanhamento funcional de entregas e homologações.',
      ],
    },
    {
      title: 'Junior Developer',
      meta: 'Axis Digital | Rio de Janeiro | 2013 - 2015',
      description:
        'Início da trajetória em desenvolvimento web com foco em manutenção evolutiva, correções orientadas por negócio e apoio a times multidisciplinares.',
      highlights: [
        'Sustentação de aplicações internas e portais institucionais.',
        'Apoio na evolução de interfaces e integrações básicas.',
      ],
    },
  ];

  readonly professionalSkills = [
    { label: '.NET / C#', score: 91 },
    { label: 'Angular', score: 88 },
    { label: 'Node.js', score: 76 },
    { label: 'Arquitetura', score: 84 },
    { label: 'TypeScript', score: 87 },
    { label: 'Design System', score: 73 },
  ];

  readonly education = [
    {
      title: 'MBA em Arquitetura de Software',
      meta: 'FIAP | 2021 - 2022',
      description: 'Especialização voltada à modelagem de sistemas escaláveis, governança técnica e práticas avançadas de engenharia.',
    },
    {
      title: 'Bacharelado em Sistemas de Informação',
      meta: 'Universidade Estácio | 2012 - 2016',
      description: 'Base em desenvolvimento, banco de dados, análise de sistemas e desenho de soluções de negócio.',
    },
  ];

  readonly proficiencies = [
    { label: 'HTML', score: 90 },
    { label: 'CSS', score: 88 },
    { label: 'JavaScript', score: 86 },
    { label: 'SQL', score: 74 },
    { label: 'Azure', score: 82 },
    { label: 'AWS', score: 71 },
  ];

  get sortedProfessionalSkills(): Array<{ label: string; score: number }> {
    return this.sortSkillsByScore(this.professionalSkills);
  }

  get sortedProficiencies(): Array<{ label: string; score: number }> {
    return this.sortSkillsByScore(this.proficiencies);
  }

  get visibleExperiences() {
    return this.experiences.slice(0, 5);
  }

  experienceCompanyLine(meta: string): string {
    const parts = meta.split('|').map((part) => part.trim()).filter(Boolean);
    return parts.slice(0, -1).join(' / ') || meta;
  }

  experienceDateLine(meta: string): string {
    const parts = meta.split('|').map((part) => part.trim()).filter(Boolean);
    return parts.at(-1) ?? meta;
  }

  skillVisualTone(score: number): 'high' | 'medium' | 'soft' | 'muted' {
    if (score >= 88) {
      return 'high';
    }

    if (score >= 74) {
      return 'medium';
    }

    if (score >= 60) {
      return 'soft';
    }

    return 'muted';
  }

  private sortSkillsByScore(items: Array<{ label: string; score: number }>): Array<{ label: string; score: number }> {
    return items.slice().sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'pt-BR'));
  }

  personalSkillDots(score: number): boolean[] {
    const filled = Math.max(1, Math.min(5, Math.round(score / 20)));
    return Array.from({ length: 5 }, (_, index) => index < filled);
  }

  focusedJobLogoLabel(title: string): string {
    const initial = title
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || title.slice(0, 1) || 'V').toUpperCase();
  }

  private buildCandidateJourneyView(
    jobId: string,
    candidateId: string,
    candidateName: string,
  ): CurriculumJourneyViewModel | null {
    if (!jobId) {
      return null;
    }

    const job = this.jobsFacade.getJobById(jobId);
    if (!job) {
      return null;
    }

    const candidate = this.findJourneyCandidate(job.candidates ?? [], candidateId, candidateName);
    if (!candidate) {
      return null;
    }

    const stage = this.jobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar';
    const activeIndex = this.getJourneyStageIndex(stage);
    const decisionAccepted = stage === 'aceito';
    const decisionNext = stage === 'proxima' || stage === 'cancelado';
    const hired = stage === 'contratado';
    const reviewingDocuments = stage === 'documentacao' || hired;

    const steps = [
      {
        label: 'Talento no radar',
        dateLabel: '18 mar',
        hourLabel: '09:12',
        timeLabel: 'Semana passada',
        description: 'O sistema encontrou esse talento no radar da vaga e ele ainda não iniciou candidatura.',
        ownerText: 'Movido pelo sistema',
      },
      {
        label: 'Candidatura enviada',
        dateLabel: '19 mar',
        hourLabel: '11:40',
        timeLabel: 'Agora',
        description: 'O talento demonstrou interesse e a candidatura já entrou no seu funil.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Em processo',
        dateLabel: '20 mar',
        hourLabel: '14:25',
        timeLabel: 'Em atualização',
        description: 'Você avançou o perfil para análise, conversa e próximas etapas do processo.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: 'Contratação solicitada',
        dateLabel: '21 mar',
        hourLabel: '16:08',
        timeLabel: 'Em atualização',
        description: 'A proposta ou solicitação final foi enviada e agora depende do retorno do talento.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionAccepted ? 'Aceito' : decisionNext ? 'Ficou pra próxima' : 'Aceito / Ficou pra próxima',
        dateLabel: '22 mar',
        hourLabel: '10:14',
        timeLabel: 'Em atualização',
        description: decisionAccepted
          ? 'O talento aceitou a proposta e agora pode enviar os documentos da contratação.'
          : decisionNext
            ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
            : 'Aqui o talento responde se aceita a proposta ou se prefere ficar para uma próxima oportunidade.',
        ownerText: 'Ação do talento',
      },
      {
        label: 'Validando documentos',
        dateLabel: '23 mar',
        hourLabel: '13:32',
        timeLabel: 'Em atualização',
        description: 'Depois do envio dos documentos pelo talento, o recruiter revisa tudo e dá o ok para seguir.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionNext ? 'Não foi desta vez / segue no radar' : hired ? 'Contratado' : 'Contratado / encerrado',
        dateLabel: '24 mar',
        hourLabel: '17:46',
        timeLabel: 'Em atualização',
        description: decisionNext
          ? 'Esse ciclo foi encerrado para esta vaga e o talento pode continuar elegível para novas oportunidades.'
          : hired
            ? 'Contratação concluída e fluxo encerrado com sucesso.'
            : 'Ao final da validação, você encerra o ciclo contratando o talento ou mantendo o perfil elegível para futuras vagas.',
        ownerText: 'Ação do recruiter',
      },
    ].map((item, index) => ({
      ...item,
      stepNumber: index + 1,
      completed: this.isJourneyStepCompleted(index, stage, reviewingDocuments),
      active: index === activeIndex,
      timeLabel: this.isJourneyStepCompleted(index, stage, reviewingDocuments) ? item.timeLabel : undefined,
    }));

    return {
      currentStageLabel: this.journeyStageDisplayLabel(stage),
      steps,
    };
  }

  private findJourneyCandidate(
    candidates: MockJobCandidate[],
    candidateId: string,
    candidateName: string,
  ): MockJobCandidate | undefined {
    const normalizedName = candidateName.trim().toLocaleLowerCase('pt-BR');

    return candidates.find((item) => !!candidateId && item.id === candidateId)
      ?? candidates.find((item) => item.name.trim().toLocaleLowerCase('pt-BR') === normalizedName);
  }

  private getJourneyStageIndex(stage: CandidateStage): number {
    switch (stage) {
      case 'radar':
        return 0;
      case 'candidatura':
        return 1;
      case 'processo':
      case 'tecnica':
        return 2;
      case 'aguardando':
        return 3;
      case 'aceito':
      case 'proxima':
      case 'cancelado':
        return 4;
      case 'documentacao':
        return 5;
      case 'contratado':
        return 6;
      default:
        return 0;
    }
  }

  private isJourneyStepCompleted(index: number, stage: CandidateStage, reviewingDocuments: boolean): boolean {
    if (stage === 'radar') {
      return index === 0;
    }

    if (stage === 'proxima' || stage === 'cancelado') {
      return index <= 4 || index === 6;
    }

    if (stage === 'contratado') {
      return true;
    }

    if (reviewingDocuments) {
      return index <= 5;
    }

    switch (stage) {
      case 'candidatura':
        return index <= 1;
      case 'processo':
      case 'tecnica':
        return index <= 2;
      case 'aguardando':
        return index <= 3;
      case 'aceito':
        return index <= 4;
      default:
        return index === 0;
    }
  }

  private journeyStageDisplayLabel(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'No radar';
      case 'candidatura':
        return 'Candidatura enviada';
      case 'processo':
      case 'tecnica':
        return 'Em processo';
      case 'aguardando':
        return 'Aguardando resposta';
      case 'aceito':
        return 'Aceito';
      case 'documentacao':
        return 'Documentação';
      case 'contratado':
        return 'Contratado';
      case 'proxima':
      case 'cancelado':
        return 'Ficou pra próxima';
      default:
        return 'No radar';
    }
  }
}
