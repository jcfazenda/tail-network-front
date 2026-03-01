export type RecruiterJobStatus = 'aberta' | 'pausada' | 'fechada';

export type RecruiterPipelineStage =
  | 'novos'
  | 'triagem'
  | 'contato'
  | 'entrevista'
  | 'oferta'
  | 'contratado'
  | 'reprovado';

export type RecruiterTrend = 'up' | 'down' | 'flat';

export type RecruiterSkillRequirement = {
  nome: string;
  peso: number;
  minimoPercentual: number;
};

export type RecruiterCandidateCard = {
  id: string;
  nome: string;
  aderenciaPercentual: number;
  tendencia: RecruiterTrend;
  ultimaAtualizacao: string;
  statusPipeline: RecruiterPipelineStage;
};

export type RecruiterJob = {
  id: string;
  titulo: string;
  empresa: string;
  trilha?: string;
  tipo?: string;
  local: string;
  modelo: string;
  departamento: string;
  metaMinimaPercentual: number;
  descricao: string;
  sobreVaga?: string;
  diaADia?: string;
  esperamosDeVoce?: string;
  beneficiosDetalhados?: string;
  sobreVagaItens?: string[];
  diaADiaItens?: string[];
  esperamosItens?: string[];
  valorSalario?: string;
  diasDeposito?: string;
  planoSaude?: string;
  ticketRefeicao?: string;
  beneficios?: string[];
  status: RecruiterJobStatus;
  skills: RecruiterSkillRequirement[];
  candidatos: RecruiterCandidateCard[];
  createdAt: string;
  // Compatibilidade com componentes legados já existentes
  title?: string;
  location?: string;
  type?: string;
  department?: string;
  talents?: RecruiterTalent[];
};

export type RecruiterTalent = {
  id: string;
  nome: string;
  name: string;
  local: string;
  cargoAtual: string;
  skills: Array<{ nome: string; nivel: number }>;
  stacks: Array<{ name: string; level: number }>;
  crescimento30Dias: number;
  crescimento60Dias: number;
  aderenciaMedia: number;
  tendencia: RecruiterTrend;
  ultimaAtualizacao: string;
  appliedAt?: string;
  avatarUrl?: string;
  address?: string;
  phone?: string;
  education?: string;
  age?: number;
  salaryExpectation?: string;
  notes?: string;
  lastSeen: string;
  lastMessage: string;
  unreadCount: number;
  messages: ChatMsg[];
};

export type RecruiterAlertType = 'candidato-quente' | 'vaga-critica' | 'pipeline-parado' | 'solicitacao-contratacao';

export type RecruiterAlert = {
  id: string;
  tipo: RecruiterAlertType;
  mensagem: string;
  jobId?: string;
  talentId?: string;
  createdAt: string;
};

export type RecruiterDashboardMetrics = {
  talentosProntos: number;
  talentosAscensao: number;
  vagasCriticas: number;
  alertas: number;
  vagasAbertas: number;
};

export type RecruiterDashboardData = {
  metrics: RecruiterDashboardMetrics;
  vagasCriticas: RecruiterJob[];
  alertas: RecruiterAlert[];
};

export type ChatMsg = {
  id: string;
  from: 'me' | 'candidate';
  text: string;
  time: string;
  createdAt?: string;
};

export type RecruiterDb = {
  jobs: RecruiterJob[];
  talents: RecruiterTalent[];
  alerts: RecruiterAlert[];
  updatedAt: string;
};

export type RecruiterJobDraft = {
  id?: string;
  titulo: string;
  empresa: string;
  trilha?: string;
  tipo?: string;
  local: string;
  modelo: string;
  departamento: string;
  metaMinimaPercentual: number;
  descricao: string;
  sobreVaga?: string;
  diaADia?: string;
  esperamosDeVoce?: string;
  beneficiosDetalhados?: string;
  sobreVagaItens?: string[];
  diaADiaItens?: string[];
  esperamosItens?: string[];
  valorSalario?: string;
  diasDeposito?: string;
  planoSaude?: string;
  ticketRefeicao?: string;
  beneficios?: string[];
  status: RecruiterJobStatus;
  skills: RecruiterSkillRequirement[];
};
