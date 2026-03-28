import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { CandidateStage, MockJobCandidate } from '../../vagas/data/vagas.models';
import { SeededExperienceDraft, SeededTalentProfile, TalentProfileStoreService } from '../talent-profile-store.service';

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
  activeIndex: number;
  currentStageLabel: string;
  steps: CurriculumJourneyStep[];
  statusAlertIcon: string;
  statusAlertMessage: string;
}

type CurriculumSkillItem = {
  label: string;
  score: number;
};

type CurriculumEducationItem = {
  title: string;
  meta: string;
  description: string;
};

type CurriculumExperienceItem = {
  title: string;
  meta: string;
  description: string;
  highlights: string[];
};

type CurriculumProfileViewModel = {
  avatarUrl: string;
  name: string;
  roleTitle: string;
  profileCopy: string;
  contactItems: Array<{ icon: string; label: string }>;
  socialLinks: Array<{ icon: string; label: string }>;
  personalSkills: Array<{ label: string; score: number }>;
  education: CurriculumEducationItem[];
  professionalSkills: CurriculumSkillItem[];
  proficiencies: CurriculumSkillItem[];
  experiences: CurriculumExperienceItem[];
};

@Component({
  standalone: true,
  selector: 'app-curriculum-page',
  imports: [CommonModule, MatStepperModule],
  templateUrl: './curriculum.page.html',
  styleUrl: './curriculum.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CurriculumPage {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsFacade = inject(JobsFacade);
  private readonly talentProfileStore = inject(TalentProfileStoreService);
  private journeySelectionKey = '';
  journeySelectedIndex: number | null = null;

  readonly candidateName$ = this.route.queryParamMap.pipe(
    map((params) => params.get('name')?.trim() || 'Candidato em análise'),
  );

  readonly curriculumProfile$ = this.route.queryParamMap.pipe(
    map((params) => {
      const candidateName = params.get('name')?.trim() || '';
      const profile = candidateName ? this.talentProfileStore.findProfileByName(candidateName) : null;
      return this.buildCurriculumProfileView(profile, candidateName);
    }),
  );

  readonly candidateJourney$ = this.route.queryParamMap.pipe(
    map((params) => {
      const jobId = params.get('jobId')?.trim() || '';
      const candidateId = params.get('candidate')?.trim() || '';
      const candidateName = params.get('name')?.trim() || '';
      const journey = this.buildCandidateJourneyView(jobId, candidateId, candidateName);
      if (journey) {
        const nextKey = `${journey.currentStageLabel}|${journey.steps.map((item) => `${item.label}:${item.completed}:${item.active}`).join('|')}`;
        if (this.journeySelectionKey !== nextKey) {
          this.journeySelectionKey = nextKey;
          this.journeySelectedIndex = journey.activeIndex;
        }
      }
      return journey;
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

  resolveJourneySelectedIndex(journey: CurriculumJourneyViewModel | null): number {
    if (!journey) {
      return 0;
    }

    if (this.journeySelectedIndex === null || this.journeySelectedIndex >= journey.steps.length) {
      this.journeySelectedIndex = journey.activeIndex;
    }

    return this.journeySelectedIndex;
  }

  onJourneySelectionChange(index: number): void {
    this.journeySelectedIndex = index;
  }

  curriculumAvatarLabel(name: string): string {
    const initial = name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .find(Boolean);

    return (initial || name.slice(0, 1) || 'C').toUpperCase();
  }

  private buildCurriculumProfileView(profile: SeededTalentProfile | null, candidateName: string): CurriculumProfileViewModel {
    if (!profile) {
      return this.buildFallbackCurriculumProfile(candidateName);
    }

    const basic = profile.basicDraft.profile ?? {};
    const latestExperience = profile.experiencesDraft[0];
    const aggregatedStacks = this.talentProfileStore.aggregateStacksFromExperiences(profile.experiencesDraft);
    const professionalSkills = aggregatedStacks.slice(0, 8).map((item) => ({
      label: item.name,
      score: item.knowledge,
    }));
    const proficiencies = [...(profile.stacksDraft.primary ?? []), ...(profile.stacksDraft.extra ?? [])]
      .map((item) => ({
        label: item.name,
        score: Math.max(0, Math.min(100, Math.round(Number(item.knowledge ?? 0)))),
      }))
      .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label, 'pt-BR'))
      .slice(0, 8);

    return {
      avatarUrl: profile.basicDraft.photoPreviewUrl?.trim() || '/assets/avatars/john-doe.jpeg',
      name: basic.name?.trim() || candidateName || 'Candidato em análise',
      roleTitle: latestExperience?.role?.trim() || 'Profissional em análise',
      profileCopy: latestExperience?.responsibilities?.trim()
        || `Perfil construído a partir das experiências e stacks cadastradas por ${basic.name?.trim() || 'este candidato'}.`,
      contactItems: this.buildContactItems(profile),
      socialLinks: this.buildSocialLinks(profile),
      personalSkills: this.buildPersonalSkills(profile),
      education: this.buildEducation(profile),
      professionalSkills: professionalSkills.length ? professionalSkills : proficiencies,
      proficiencies,
      experiences: profile.experiencesDraft
        .slice()
        .sort((left, right) => this.experienceSortValue(right) - this.experienceSortValue(left))
        .slice(0, 5)
        .map((experience) => this.toCurriculumExperienceItem(experience)),
    };
  }

  private buildFallbackCurriculumProfile(candidateName: string): CurriculumProfileViewModel {
    return {
      avatarUrl: '/assets/avatars/john-doe.jpeg',
      name: candidateName || 'Candidato em análise',
      roleTitle: 'Profissional em análise',
      profileCopy: 'Os dados reais deste currículo ainda não foram encontrados no cadastro do candidato.',
      contactItems: [],
      socialLinks: [],
      personalSkills: [],
      education: [],
      professionalSkills: [],
      proficiencies: [],
      experiences: [],
    };
  }

  private buildContactItems(profile: SeededTalentProfile): Array<{ icon: string; label: string }> {
    const basic = profile.basicDraft.profile ?? {};
    return [
      { icon: 'call', label: basic.phone?.trim() || '' },
      { icon: 'mail', label: basic.email?.trim() || profile.email || '' },
      { icon: 'location_on', label: basic.location?.trim() || [basic.city?.trim(), basic.state?.trim()].filter(Boolean).join(' - ') },
      { icon: 'language', label: basic.portfolio?.trim() || '' },
    ].filter((item) => !!item.label);
  }

  private buildSocialLinks(profile: SeededTalentProfile): Array<{ icon: string; label: string }> {
    const basic = profile.basicDraft.profile ?? {};
    return [
      { icon: 'work', label: basic.linkedin?.trim() || '' },
      { icon: 'language', label: basic.portfolio?.trim() || '' },
    ].filter((item) => !!item.label);
  }

  private buildPersonalSkills(profile: SeededTalentProfile): Array<{ label: string; score: number }> {
    const experiences = profile.experiencesDraft;
    const averageActuation = experiences.length
      ? Math.round(experiences.reduce((sum, item) => sum + Math.max(10, Math.min(100, Number(item.actuation ?? 70))), 0) / experiences.length)
      : 0;
    const totalMonths = experiences.reduce((sum, item) => sum + this.getExperienceMonths(item), 0);
    const normalizedMonths = Math.max(45, Math.min(98, Math.round(Math.min(totalMonths, 144) / 144 * 100)));
    const seniorityBoost = experiences.some((item) => item.positionLevel === 'Tech Lead')
      ? 92
      : experiences.some((item) => item.positionLevel === 'Sênior')
        ? 84
        : experiences.some((item) => item.positionLevel === 'Pleno')
          ? 74
          : 62;

    return [
      { label: 'Atuação', score: averageActuation || 70 },
      { label: 'Consistência', score: normalizedMonths },
      { label: 'Senioridade', score: seniorityBoost },
    ];
  }

  private buildEducation(profile: SeededTalentProfile): CurriculumEducationItem[] {
    const formation = profile.formationCopy;
    if (!formation) {
      return [];
    }

    const items: CurriculumEducationItem[] = [];

    if (formation.graduation?.trim()) {
      items.push({
        title: formation.graduation.trim(),
        meta: this.buildFormationMeta(formation.startMonth, formation.startYear, formation.endMonth, formation.endYear, formation.graduated),
        description: formation.educationStatus?.trim() || 'Formação registrada no cadastro do candidato.',
      });
    }

    if (formation.specialization?.trim()) {
      items.push({
        title: formation.specialization.trim(),
        meta: formation.graduated === false ? 'Em andamento' : 'Especialização',
        description: 'Especialização informada pelo candidato durante o cadastro.',
      });
    }

    return items;
  }

  private buildFormationMeta(
    startMonth?: string,
    startYear?: string,
    endMonth?: string,
    endYear?: string,
    graduated?: boolean,
  ): string {
    const start = [startMonth?.trim(), startYear?.trim()].filter(Boolean).join(' ');
    const end = graduated === false ? 'Em andamento' : [endMonth?.trim(), endYear?.trim()].filter(Boolean).join(' ');
    return [start, end].filter(Boolean).join(' - ') || 'Formação';
  }

  private toCurriculumExperienceItem(experience: SeededExperienceDraft): CurriculumExperienceItem {
    const companyLine = [experience.company?.trim(), experience.workModel?.trim()].filter(Boolean).join(' / ');
    const dateLine = `${experience.startMonth} ${experience.startYear} - ${experience.currentlyWorkingHere ? 'Atual' : `${experience.endMonth} ${experience.endYear}`}`;
    const appliedStacks = (experience.appliedStacks ?? [])
      .slice()
      .sort((left, right) => Number(right.knowledge ?? 0) - Number(left.knowledge ?? 0))
      .slice(0, 3)
      .map((item) => `${item.name} ${Math.round(Number(item.knowledge ?? 0))}%`);

    return {
      title: experience.role?.trim() || 'Experiência registrada',
      meta: [companyLine, dateLine].filter(Boolean).join(' | '),
      description: experience.responsibilities?.trim() || 'Sem descrição detalhada.',
      highlights: appliedStacks.length ? appliedStacks : ['Sem stacks detalhadas nesta experiência.'],
    };
  }

  private experienceSortValue(experience: SeededExperienceDraft): number {
    const currentFlag = experience.currentlyWorkingHere ? 10_000_000 : 0;
    const endYear = Number(experience.currentlyWorkingHere ? '2026' : experience.endYear || '0');
    const endMonth = this.monthOrder(experience.currentlyWorkingHere ? 'Mar' : experience.endMonth);
    return currentFlag + (endYear * 100) + endMonth;
  }

  private getExperienceMonths(experience: SeededExperienceDraft): number {
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
    const parsedYear = Number(year ?? '');
    const parsedMonth = this.monthOrder(month);
    if (!Number.isFinite(parsedYear) || !parsedMonth) {
      return 0;
    }
    return (parsedYear * 12) + parsedMonth;
  }

  private monthOrder(month?: string): number {
    const map: Record<string, number> = {
      Jan: 1, Fev: 2, Mar: 3, Abr: 4, Mai: 5, Jun: 6,
      Jul: 7, Ago: 8, Set: 9, Out: 10, Nov: 11, Dez: 12, Atual: 3,
    };
    return map[month ?? ''] ?? 0;
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
      activeIndex,
      currentStageLabel: this.journeyStageDisplayLabel(stage),
      steps,
      statusAlertIcon: this.journeyAlertIcon(stage),
      statusAlertMessage: this.journeyAlertMessage(stage),
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

  private journeyAlertIcon(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'person_search';
      case 'candidatura':
        return 'touch_app';
      case 'processo':
      case 'tecnica':
        return 'manage_search';
      case 'aguardando':
        return 'hourglass_top';
      case 'aceito':
        return 'verified';
      case 'documentacao':
        return 'description';
      case 'contratado':
        return 'celebration';
      case 'proxima':
      case 'cancelado':
        return 'autorenew';
      default:
        return 'info';
    }
  }

  private journeyAlertMessage(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'Este candidato parece promissor, mas ainda precisa clicar em Candidatar-se para entrar no funil da vaga.';
      case 'candidatura':
        return 'O candidato ja demonstrou interesse. O proximo passo e o recruiter avancar o perfil para processo.';
      case 'processo':
      case 'tecnica':
        return 'O candidato esta em avaliacao. Vale aprofundar entrevistas, teste tecnico e sinais de aderencia.';
      case 'aguardando':
        return 'A contratacao foi solicitada e agora o fluxo depende da resposta final do candidato.';
      case 'aceito':
        return 'O candidato aceitou a proposta. O proximo passo e seguir com documentos e validacoes.';
      case 'documentacao':
        return 'Os documentos estao em validacao. Se estiver tudo certo, o fluxo pode seguir para contratacao.';
      case 'contratado':
        return 'Fluxo concluido com sucesso. Este candidato ja foi contratado para a vaga.';
      case 'proxima':
      case 'cancelado':
        return 'Este ciclo foi encerrado para esta vaga, mas o perfil ainda pode voltar ao radar em novas oportunidades.';
      default:
        return 'Acompanhe aqui a etapa atual do candidato e o proximo movimento esperado no fluxo.';
    }
  }
}
