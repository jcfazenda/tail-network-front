import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatStepperModule } from '@angular/material/stepper';
import { JobsFacade } from '../../core/facades/jobs.facade';
import { CandidateStage, MockJobCandidate, MockJobRecord } from '../../vagas/data/vagas.models';
import { ProfitLossCardComponent } from '../../grafics/profit-loss-card/profit-loss-card.component';
import { EcossistemaPage } from '../../home/ecossistema/ecossistema.page';

type TalentJourneyStep = {
  stepNumber: number;
  label: string;
  ownerText: string;
  description: string;
  requiredDocuments?: string[];
  dateLabel: string;
  hourLabel: string;
  completed: boolean;
  active: boolean;
};

type TalentJourneyViewModel = {
  activeIndex: number;
  currentStageLabel: string;
  steps: TalentJourneyStep[];
  statusAlertIcon: string;
  statusAlertMessage: string;
};

@Component({
  standalone: true,
  selector: 'app-usuario-ecossistema-page',
  imports: [CommonModule, ProfitLossCardComponent, MatStepperModule],
  templateUrl: './usuario-ecossistema.page.html',
  styleUrl: './usuario-ecossistema.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioEcossistemaPage extends EcossistemaPage {
  private readonly talentoJobsFacade = inject(JobsFacade);
  talentJourneySelectedIndex: number | null = null;
  private talentJourneySelectionKey = '';

  get ecoGridJobs(): MockJobRecord[] {
    return this.talentCompatibleJobs.map((view) => view.job);
  }

  override get paginatedEcoJobs(): MockJobRecord[] {
    const start = this.ecoJobsPage * this.ecoJobsPageSize;
    return this.ecoGridJobs.slice(start, start + this.ecoJobsPageSize);
  }

  override get ecoJobsPageCount(): number {
    return Math.max(1, Math.ceil(this.ecoGridJobs.length / this.ecoJobsPageSize));
  }

  get focusedTalentJourney(): TalentJourneyViewModel | null {
    const job = this.sideRailRecentJobs[0];
    if (!job) {
      return null;
    }

    const candidate = this.talentoJobsFacade.findTalentCandidate(job);
    if (!candidate) {
      return null;
    }

    const journey = this.buildTalentJourneyView(job, candidate);
    const nextKey = `${job.id}|${journey.currentStageLabel}|${journey.steps.map((item) => `${item.label}:${item.completed}:${item.active}`).join('|')}`;

    if (this.talentJourneySelectionKey !== nextKey) {
      this.talentJourneySelectionKey = nextKey;
      this.talentJourneySelectedIndex = journey.activeIndex;
    }

    return journey;
  }

  get canAdvanceFocusedTalentJourney(): boolean {
    const job = this.sideRailRecentJobs[0];
    const candidate = job ? this.talentoJobsFacade.findTalentCandidate(job) : null;
    const stage = this.talentoJobsFacade.getEffectiveCandidateStage(candidate ?? undefined) ?? 'radar';
    return stage === 'radar' || stage === 'aguardando' || stage === 'aceito' || stage === 'documentacao';
  }

  get advanceFocusedTalentJourneyLabel(): string {
    const job = this.sideRailRecentJobs[0];
    const candidate = job ? this.talentoJobsFacade.findTalentCandidate(job) : null;
    const stage = this.talentoJobsFacade.getEffectiveCandidateStage(candidate ?? undefined) ?? 'radar';

    if (stage === 'radar') {
      return 'Avançar para candidatura';
    }

    if (stage === 'aguardando') {
      return 'Avançar para aceite';
    }

    if (stage === 'aceito' || stage === 'documentacao') {
      return 'Avançar com documentos';
    }

    return 'Avançar';
  }

  resolveTalentJourneySelectedIndex(journey: TalentJourneyViewModel | null): number {
    if (!journey) {
      return 0;
    }

    if (this.talentJourneySelectedIndex === null || this.talentJourneySelectedIndex >= journey.steps.length) {
      this.talentJourneySelectedIndex = journey.activeIndex;
    }

    return this.talentJourneySelectedIndex;
  }

  onTalentJourneySelectionChange(index: number): void {
    this.talentJourneySelectedIndex = index;
  }

  advanceFocusedTalentJourney(): void {
    const job = this.sideRailRecentJobs[0];
    if (!job) {
      return;
    }

    const candidate = this.talentoJobsFacade.findTalentCandidate(job);
    const stage = this.talentoJobsFacade.getEffectiveCandidateStage(candidate ?? undefined) ?? 'radar';

    if (stage === 'radar') {
      this.talentoJobsFacade.applyAsTalent(job.id);
    } else if (stage === 'aguardando') {
      this.talentoJobsFacade.acceptOfferAsTalent(job.id);
    } else if (stage === 'aceito' || stage === 'documentacao') {
      const requiredDocuments = (job.hiringDocuments ?? []).map((item) => item.trim()).filter(Boolean);
      this.talentoJobsFacade.submitTalentDocuments(job.id, requiredDocuments, true);
    } else {
      return;
    }

    (this as unknown as { jobsSnapshot: MockJobRecord[] }).jobsSnapshot = this.talentoJobsFacade.getJobs();
    this.selectSideRailRecentJob(job.id);
  }

  private buildTalentJourneyView(job: MockJobRecord, candidate: MockJobCandidate): TalentJourneyViewModel {
    const stage = this.talentoJobsFacade.getEffectiveCandidateStage(candidate) ?? 'radar';
    const activeIndex = this.getJourneyStageIndex(stage);
    const decisionAccepted = stage === 'aceito';
    const decisionNext = stage === 'proxima' || stage === 'cancelado';
    const hired = stage === 'contratado';
    const reviewingDocuments = stage === 'documentacao' || hired;
    const requiredDocuments = (job.hiringDocuments ?? []).map((item) => item.trim()).filter(Boolean);

    const steps = [
      {
        label: 'Talento no radar',
        description: 'Seu perfil foi encontrado no radar desta vaga, mas a candidatura ainda não começou.',
        ownerText: 'Movido pelo sistema',
      },
      {
        label: 'Candidatura enviada',
        description: 'Você demonstrou interesse e sua candidatura entrou no funil da vaga.',
        ownerText: 'Sua ação',
      },
      {
        label: 'Em processo',
        description: 'Seu perfil já está em análise, conversa ou etapa técnica com o recruiter.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: 'Contratação solicitada',
        description: 'A proposta final foi enviada e agora depende do seu retorno.',
        ownerText: 'Ação do recruiter',
      },
      {
        label: decisionAccepted ? 'Aceito' : decisionNext ? 'Ficou pra próxima' : 'Aceito / Ficou pra próxima',
        description: decisionAccepted
          ? 'Você aceitou a proposta e o fluxo já pode seguir para os documentos.'
          : decisionNext
            ? 'Este ciclo foi encerrado para esta vaga, mas seu perfil pode seguir elegível para novas oportunidades.'
            : 'Aqui você decide se aceita a proposta ou se prefere seguir para uma próxima oportunidade.',
        ownerText: 'Sua ação',
      },
      {
        label: 'Validando documentos',
        description: 'Após o envio dos seus documentos, o recruiter revisa tudo para concluir a contratação.',
        ownerText: 'Ação do recruiter',
        requiredDocuments,
      },
      {
        label: decisionNext ? 'Não foi desta vez / segue no radar' : hired ? 'Contratado' : 'Contratado / encerrado',
        description: decisionNext
          ? 'Este ciclo foi encerrado para esta vaga e você pode continuar elegível para novas oportunidades.'
          : hired
            ? 'Contratação concluída com sucesso.'
            : 'Ao final da validação, o recruiter encerra o fluxo contratando você ou finalizando este ciclo.',
        ownerText: 'Ação do recruiter',
      },
    ].map((item, index) => ({
      ...item,
      ...this.resolveJourneyTimeMeta(index, candidate),
      stepNumber: index + 1,
      completed: this.isJourneyStepCompleted(index, stage, reviewingDocuments),
      active: index === activeIndex,
    }));

    return {
      activeIndex,
      currentStageLabel: this.journeyStageDisplayLabel(stage),
      steps,
      statusAlertIcon: this.journeyAlertIcon(stage),
      statusAlertMessage: this.journeyAlertMessage(stage),
    };
  }

  private resolveJourneyTimeMeta(index: number, candidate: MockJobCandidate): Pick<TalentJourneyStep, 'dateLabel' | 'hourLabel'> {
    if (index === 0 && Number.isFinite(candidate.minutesAgo)) {
      const radarFoundAt = new Date(Date.now() - Math.max(0, candidate.minutesAgo) * 60_000);
      if (!Number.isNaN(radarFoundAt.getTime())) {
        return {
          dateLabel: this.formatJourneyDate(radarFoundAt),
          hourLabel: this.formatJourneyHour(radarFoundAt),
        };
      }
    }

    if ((index === 2 || index === 3) && candidate.recruiterStageCommittedAt) {
      const committedAt = new Date(candidate.recruiterStageCommittedAt);
      if (!Number.isNaN(committedAt.getTime())) {
        return {
          dateLabel: this.formatJourneyDate(committedAt),
          hourLabel: this.formatJourneyHour(committedAt),
        };
      }
    }

    return {
      dateLabel: 'Aguardando',
      hourLabel: '__:__',
    };
  }

  private formatJourneyDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).formatToParts(date);
    const day = parts.find((item) => item.type === 'day')?.value ?? '';
    const month = (parts.find((item) => item.type === 'month')?.value ?? '').replace('.', '').trim().toLocaleLowerCase('pt-BR');
    return `${day} ${month}`.trim();
  }

  private formatJourneyHour(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  private getJourneyStageIndex(stage: CandidateStage): number {
    switch (stage) {
      case 'radar': return 0;
      case 'candidatura': return 1;
      case 'processo':
      case 'tecnica': return 2;
      case 'aguardando': return 3;
      case 'aceito':
      case 'proxima':
      case 'cancelado': return 4;
      case 'documentacao': return 5;
      case 'contratado': return 6;
      default: return 0;
    }
  }

  private isJourneyStepCompleted(index: number, stage: CandidateStage, reviewingDocuments: boolean): boolean {
    if (stage === 'radar') return index === 0;
    if (stage === 'proxima' || stage === 'cancelado') return index <= 4 || index === 6;
    if (stage === 'contratado') return true;
    if (reviewingDocuments) return index <= 5;

    switch (stage) {
      case 'candidatura': return index <= 1;
      case 'processo':
      case 'tecnica': return index <= 2;
      case 'aguardando': return index <= 3;
      case 'aceito': return index <= 4;
      default: return index === 0;
    }
  }

  private journeyStageDisplayLabel(stage: CandidateStage): string {
    switch (stage) {
      case 'radar': return 'No radar';
      case 'candidatura': return 'Candidatura enviada';
      case 'processo':
      case 'tecnica': return 'Em processo';
      case 'aguardando': return 'Aguardando resposta';
      case 'aceito': return 'Aceito';
      case 'documentacao': return 'Documentação';
      case 'contratado': return 'Contratado';
      case 'proxima':
      case 'cancelado': return 'Ficou pra próxima';
      default: return 'No radar';
    }
  }

  private journeyAlertIcon(stage: CandidateStage): string {
    switch (stage) {
      case 'radar': return 'person_search';
      case 'candidatura': return 'touch_app';
      case 'processo':
      case 'tecnica': return 'manage_search';
      case 'aguardando': return 'hourglass_top';
      case 'aceito': return 'verified';
      case 'documentacao': return 'description';
      case 'contratado': return 'celebration';
      case 'proxima':
      case 'cancelado': return 'autorenew';
      default: return 'info';
    }
  }

  private journeyAlertMessage(stage: CandidateStage): string {
    switch (stage) {
      case 'radar':
        return 'Você parece bem aderente a esta vaga, mas ainda precisa clicar em avançar para iniciar sua candidatura.';
      case 'candidatura':
        return 'Sua candidatura já entrou no funil. O próximo passo agora depende do recruiter avançar seu perfil.';
      case 'processo':
      case 'tecnica':
        return 'Você está em avaliação. Vale acompanhar a vaga e manter seus dados e documentos atualizados.';
      case 'aguardando':
        return 'Existe uma solicitação de contratação aguardando sua resposta. Se fizer sentido, avance para aceitar.';
      case 'aceito':
        return 'Você aceitou a proposta. O próximo passo é avançar com o envio dos documentos necessários.';
      case 'documentacao':
        return 'Os documentos desta vaga já podem ser enviados para validação final do recruiter.';
      case 'contratado':
        return 'Fluxo concluído com sucesso. Você já foi contratado para esta vaga.';
      case 'proxima':
      case 'cancelado':
        return 'Este ciclo foi encerrado para esta vaga, mas seu perfil ainda pode voltar ao radar em novas oportunidades.';
      default:
        return 'Acompanhe aqui sua etapa atual e o próximo movimento esperado nesta vaga.';
    }
  }
}
