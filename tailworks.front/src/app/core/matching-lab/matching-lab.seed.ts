import {
  MatchLabCandidate,
  MatchLabCandidateExperience,
  MatchLabCandidateSeed,
  MatchLabJob,
  MatchLabJobSeed,
  MatchLabSeniority,
  MatchLabStackBand,
  MatchLabStackWeight,
} from './matching-lab.models';

type StackCatalogEntry = { id: string; name: string };
type CandidateArchetype = {
  key: string;
  seniority: MatchLabSeniority;
  summary: string;
  primaryStacks: Array<[string, number]>;
  supportStacks?: Array<[string, number]>;
  experienceTracks: Array<{
    role: string;
    companyName: string;
    months: number;
    stackIds: string[];
  }>;
};

const STACKS: StackCatalogEntry[] = [
  { id: 'dotnet', name: '.NET / C#' },
  { id: 'java', name: 'Java / Spring' },
  { id: 'node', name: 'Node.js' },
  { id: 'angular', name: 'Angular' },
  { id: 'react', name: 'React' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'flutter', name: 'Flutter' },
  { id: 'react-native', name: 'React Native' },
  { id: 'python', name: 'Python' },
  { id: 'data', name: 'SQL / Dados' },
  { id: 'ml', name: 'IA / ML' },
  { id: 'aws', name: 'AWS' },
  { id: 'azure', name: 'Azure' },
  { id: 'gcp', name: 'Google Cloud' },
  { id: 'docker', name: 'Docker' },
  { id: 'kubernetes', name: 'Kubernetes' },
  { id: 'qa', name: 'QA Automação' },
  { id: 'security', name: 'Segurança' },
  { id: 'ux', name: 'UX / UI' },
  { id: 'figma', name: 'Figma' },
];

const JOB_SEEDS: MatchLabJobSeed[] = [
  job('job-01', 'VG-0001', 'Backend .NET Senior', 'Itaú Unibanco', 'Rio de Janeiro - RJ', 'Hibrido', 'Senior', 'Profissional para evoluir APIs, sustentar arquitetura distribuída e acelerar entregas críticas junto ao time de produtos e plataforma.', 14000, 18500, { dotnet: 94, azure: 78, docker: 72, kubernetes: 54, data: 32 }),
  job('job-02', 'VG-0002', 'Backend Java Pleno', 'Mercado Livre', 'São Paulo - SP', 'Hibrido', 'Pleno', 'Profissional para evoluir serviços de pagamentos, sustentar arquitetura distribuída e acelerar entregas críticas com produto e plataforma.', 10000, 13800, { java: 92, aws: 76, docker: 64, kubernetes: 48, data: 30 }),
  job('job-03', 'VG-0003', 'Frontend Angular Senior', 'CI&T', 'Rio de Janeiro - RJ', 'Remoto', 'Senior', 'Profissional para evoluir interfaces, sustentar arquitetura de componentes e acelerar entregas críticas junto ao time de produto.', 11000, 15200, { angular: 95, typescript: 88, ux: 46, react: 28, figma: 26 }),
  job('job-04', 'VG-0004', 'Frontend React Pleno', 'Nubank', 'Curitiba - PR', 'Remoto', 'Pleno', 'Profissional para evoluir jornadas web, sustentar arquitetura de frontend e acelerar entregas críticas junto ao time de produto.', 9500, 13200, { react: 95, typescript: 84, ux: 38, node: 30, figma: 28 }),
  job('job-05', 'VG-0005', 'Fullstack .NET + React', 'Accenture', 'Belo Horizonte - MG', 'Hibrido', 'Senior', 'Profissional para evoluir APIs e interfaces, sustentar arquitetura distribuída e acelerar entregas críticas com produto e plataforma.', 12500, 16800, { dotnet: 88, react: 82, typescript: 66, azure: 42, data: 30 }),
  job('job-06', 'VG-0006', 'Fullstack Java + Angular', 'Stefanini', 'Brasília - DF', 'Presencial', 'Senior', 'Profissional para evoluir serviços e interfaces, sustentar arquitetura distribuída e acelerar entregas críticas junto ao time interno.', 11800, 16000, { java: 90, angular: 82, typescript: 58, aws: 34, qa: 26 }),
  job('job-07', 'VG-0007', 'Mobile Flutter Pleno', 'PicPay', 'Recife - PE', 'Remoto', 'Pleno', 'Profissional para evoluir fluxos mobile, sustentar arquitetura do app e acelerar entregas críticas junto ao time de produto.', 9000, 12600, { flutter: 94, typescript: 34, aws: 28, ux: 26, qa: 25 }),
  job('job-08', 'VG-0008', 'Mobile React Native Senior', 'iFood', 'São Paulo - SP', 'Hibrido', 'Senior', 'Profissional para evoluir aplicativos móveis, sustentar arquitetura escalável e acelerar entregas críticas com produto e plataforma.', 11500, 15000, { 'react-native': 94, react: 72, typescript: 68, node: 34, aws: 26 }),
  job('job-09', 'VG-0009', 'DevOps Cloud Senior', 'TIVIT', 'Campinas - SP', 'Remoto', 'Senior', 'Profissional para evoluir esteiras, sustentar arquitetura de plataforma e acelerar entregas críticas junto ao time de engenharia.', 13500, 18200, { aws: 90, docker: 86, kubernetes: 80, security: 36, python: 28 }),
  job('job-10', 'VG-0010', 'Data Engineer Senior', 'Globo', 'São Paulo - SP', 'Hibrido', 'Senior', 'Profissional para evoluir pipelines, sustentar arquitetura de dados e acelerar entregas críticas junto ao time de analytics.', 13800, 18800, { python: 90, data: 88, aws: 52, gcp: 46, ml: 26 }),
  job('job-11', 'VG-0011', 'Machine Learning Engineer', 'VTEX', 'Florianópolis - SC', 'Remoto', 'Especialista', 'Profissional para evoluir modelos, sustentar arquitetura de inferência e acelerar entregas críticas junto ao time de produto.', 16000, 22000, { python: 92, ml: 90, data: 66, gcp: 46, aws: 28 }),
  job('job-12', 'VG-0012', 'QA Automação Pleno', 'Capgemini', 'Fortaleza - CE', 'Hibrido', 'Pleno', 'Profissional para evoluir automações, sustentar arquitetura de testes e acelerar entregas críticas junto ao time de engenharia.', 8200, 11200, { qa: 94, typescript: 54, node: 36, react: 26, data: 25 }),
  job('job-13', 'VG-0013', 'Cloud Security Analyst', 'Stone', 'São Paulo - SP', 'Remoto', 'Senior', 'Profissional para evoluir controles, sustentar arquitetura segura e acelerar entregas críticas junto ao time de cloud e plataforma.', 12800, 17100, { security: 92, aws: 74, azure: 56, kubernetes: 34, docker: 28 }),
  job('job-14', 'VG-0014', 'UX/UI Product Designer', 'OLX Brasil', 'Rio de Janeiro - RJ', 'Remoto', 'Pleno', 'Profissional para evoluir jornadas, sustentar arquitetura de interface e acelerar entregas críticas junto ao time de produto.', 8500, 11800, { ux: 92, figma: 86, react: 28, angular: 26, qa: 25 }),
  job('job-15', 'VG-0015', 'Backend Node Pleno', 'Magalu', 'Porto Alegre - RS', 'Hibrido', 'Pleno', 'Profissional para evoluir APIs, sustentar arquitetura distribuída e acelerar entregas críticas junto ao time de produtos.', 9300, 12800, { node: 92, typescript: 68, aws: 44, data: 36, qa: 26 }),
  job('job-16', 'VG-0016', 'Platform Engineer', 'BRQ Digital Solutions', 'São Paulo - SP', 'Remoto', 'Especialista', 'Profissional para evoluir plataforma interna, sustentar arquitetura distribuída e acelerar entregas críticas para engenharia.', 16500, 22800, { kubernetes: 92, docker: 84, aws: 70, security: 42, python: 36 }),
  job('job-17', 'VG-0017', 'Analytics Engineer', 'XP Inc.', 'Rio de Janeiro - RJ', 'Hibrido', 'Senior', 'Profissional para evoluir camada analítica, sustentar arquitetura de dados e acelerar entregas críticas com produto e analytics.', 12200, 16400, { data: 92, python: 74, aws: 36, qa: 30, ml: 28 }),
  job('job-18', 'VG-0018', 'Frontend Angular Junior', 'B3', 'Salvador - BA', 'Presencial', 'Junior', 'Profissional para evoluir interfaces, sustentar arquitetura de componentes e acelerar entregas críticas junto ao time interno.', 4200, 6200, { angular: 88, typescript: 68, ux: 28, figma: 26, qa: 25 }),
  job('job-19', 'VG-0019', 'Java Specialist Payments', 'C6 Bank', 'São Paulo - SP', 'Hibrido', 'Especialista', 'Profissional para evoluir serviços financeiros, sustentar arquitetura distribuída e acelerar entregas críticas com produto.', 17000, 23500, { java: 96, aws: 62, kubernetes: 58, security: 32, data: 28 }),
  job('job-20', 'VG-0020', 'AI Product Engineer', 'Claro', 'Rio de Janeiro - RJ', 'Remoto', 'Senior', 'Profissional para evoluir aplicações com IA, sustentar arquitetura distribuída e acelerar entregas críticas com produto.', 14500, 19800, { ml: 88, python: 82, react: 42, data: 36, aws: 30 }),
];

const CANDIDATE_NAMES = [
  'Janaina Talento', 'Thais Talento', 'Lucas Ventura', 'Marina Prado', 'Felipe Barros',
  'Renata Salles', 'Gustavo Leal', 'Camila Moura', 'Diego Matos', 'Bianca Pires',
  'Rafael Nogueira', 'Priscila Faria', 'Joao Vilar', 'Patricia Coelho', 'Vinicius Rocha',
  'Aline Freitas', 'Matheus Teles', 'Daniela Paixao', 'Caio Araujo', 'Larissa Mota',
  'Bruno Rezende', 'Amanda Silveira', 'Eduardo Braga', 'Vanessa Nunes', 'Thiago Porto',
  'Carla Medeiros', 'Leonardo Brito', 'Fernanda Luz', 'Igor Santana', 'Juliana Neves',
  'Andre Dantas', 'Sabrina Peixoto', 'Henrique Lins', 'Natalia Torres', 'Pedro Lemos',
  'Monique Duarte', 'Vitor Aguiar', 'Tatiane Melo', 'Cesar Campos', 'Raquel Pinho',
  'Murilo Bastos', 'Livia Teixeira', 'Arthur Vieira', 'Gabriela Dias', 'Enzo Tavares',
  'Paula Rios', 'Vinicius Marins', 'Beatriz Mello', 'Ramon Xavier', 'Nicole Antunes',
  'Otavio Lima', 'Clara Azevedo', 'Yuri Castro', 'Mirela Goulart', 'Davi Ribeiro',
  'Luana Barreto', 'Samuel Pacheco', 'Evelyn Soares', 'Nicolas Furtado', 'Isabela Pacheco',
  'Guilherme Tenorio', 'Helena Macedo', 'Alan Costa', 'Marcela Reis', 'Danilo Amaral',
  'Milena Rosa', 'Rodrigo Cezar', 'Flavia Bittencourt', 'Tiago Cunha', 'Nina Ferraz',
  'Icaro Gomes', 'Elaine Gomes', 'Pietro Pacheco', 'Malu Bernardes', 'Wesley Moura',
  'Alice Tavares', 'Heitor Lobo', 'Lorena Cardoso', 'Luan Bessa', 'Jade Montenegro',
  'Augusto Paiva', 'Yasmin Falcao', 'Breno Vieira', 'Nathalia Pena', 'Fernando Chaves',
  'Elisa Queiroz', 'Ruan Sales', 'Rita Carvalho', 'Douglas Freire', 'Mariana Gama',
  'Caua Torres', 'Vivian Soares', 'Diego Rangel', 'Taina Lopes', 'Marcos Veiga',
  'Stella Mendes', 'Ciro Valente', 'Leticia Braga', 'Fabio Maciel', 'Karen Assis',
];

const LOCATIONS = [
  'Rio de Janeiro - RJ', 'São Paulo - SP', 'Curitiba - PR', 'Belo Horizonte - MG', 'Brasília - DF',
  'Recife - PE', 'Florianópolis - SC', 'Fortaleza - CE', 'Salvador - BA', 'Porto Alegre - RS',
];

const ARCHETYPES: CandidateArchetype[] = [
  archetype('backend-dotnet', 'Senior', 'Especialista em APIs e integração corporativa.', [['dotnet', 92], ['azure', 78], ['docker', 70], ['data', 48], ['kubernetes', 44]], [['java', 18]], [{ role: 'Backend .NET Senior', companyName: 'Itaú Unibanco', months: 26, stackIds: ['dotnet', 'azure', 'docker'] }, { role: 'Software Engineer', companyName: 'Accenture', months: 18, stackIds: ['dotnet', 'data'] }]),
  archetype('backend-java', 'Senior', 'Microsserviços, mensageria e esteiras Java.', [['java', 94], ['aws', 76], ['docker', 68], ['kubernetes', 58], ['data', 42]], [['dotnet', 14]], [{ role: 'Java Engineer', companyName: 'Mercado Livre', months: 24, stackIds: ['java', 'aws', 'docker'] }, { role: 'Backend Engineer', companyName: 'Stefanini', months: 20, stackIds: ['java', 'kubernetes', 'data'] }]),
  archetype('frontend-angular', 'Pleno', 'Frontend orientado a componentes e design system.', [['angular', 92], ['typescript', 84], ['ux', 58], ['figma', 42], ['qa', 34]], [['react', 26]], [{ role: 'Frontend Angular', companyName: 'CI&T', months: 20, stackIds: ['angular', 'typescript', 'ux'] }, { role: 'UI Engineer', companyName: 'Globo', months: 14, stackIds: ['angular', 'figma'] }]),
  archetype('frontend-react', 'Pleno', 'React com foco em performance e analytics de produto.', [['react', 94], ['typescript', 82], ['ux', 52], ['node', 34], ['figma', 28]], [['angular', 20]], [{ role: 'Frontend React', companyName: 'Nubank', months: 18, stackIds: ['react', 'typescript', 'ux'] }, { role: 'Product Frontend', companyName: 'VTEX', months: 16, stackIds: ['react', 'node'] }]),
  archetype('fullstack-dotnet-react', 'Senior', 'Fullstack com forte backend e boa visão de front.', [['dotnet', 88], ['react', 76], ['typescript', 64], ['azure', 48], ['data', 34]], [['docker', 24]], [{ role: 'Fullstack Engineer', companyName: 'BRQ Digital Solutions', months: 22, stackIds: ['dotnet', 'react', 'typescript'] }, { role: 'Software Engineer', companyName: 'Capgemini', months: 16, stackIds: ['dotnet', 'azure'] }]),
  archetype('mobile-flutter', 'Pleno', 'Apps Flutter com foco em fluxo crítico e usabilidade.', [['flutter', 94], ['ux', 44], ['aws', 30], ['qa', 28], ['typescript', 24]], [['react-native', 20]], [{ role: 'Flutter Developer', companyName: 'PicPay', months: 18, stackIds: ['flutter', 'ux'] }, { role: 'Mobile Engineer', companyName: 'Stone', months: 12, stackIds: ['flutter', 'qa'] }]),
  archetype('mobile-rn', 'Senior', 'React Native com APIs e operação mobile.', [['react-native', 92], ['react', 72], ['typescript', 66], ['node', 42], ['aws', 28]], [['flutter', 18]], [{ role: 'React Native Senior', companyName: 'iFood', months: 22, stackIds: ['react-native', 'react', 'typescript'] }, { role: 'Mobile Platform', companyName: 'OLX Brasil', months: 14, stackIds: ['react-native', 'node'] }]),
  archetype('devops-cloud', 'Senior', 'Infra, automação e confiabilidade de plataforma.', [['aws', 88], ['docker', 86], ['kubernetes', 82], ['security', 42], ['python', 36]], [['azure', 26]], [{ role: 'DevOps Engineer', companyName: 'TIVIT', months: 24, stackIds: ['aws', 'docker', 'kubernetes'] }, { role: 'Platform Engineer', companyName: 'Accenture', months: 18, stackIds: ['aws', 'security', 'python'] }]),
  archetype('data-engineer', 'Senior', 'Dados e pipelines para produto e analytics.', [['python', 84], ['data', 88], ['aws', 46], ['gcp', 38], ['ml', 28]], [['qa', 18]], [{ role: 'Data Engineer', companyName: 'Globo', months: 24, stackIds: ['python', 'data', 'aws'] }, { role: 'Analytics Engineer', companyName: 'XP Inc.', months: 18, stackIds: ['data', 'gcp'] }]),
  archetype('ml-engineer', 'Especialista', 'Modelagem, inferência e produto com IA.', [['python', 90], ['ml', 92], ['data', 58], ['gcp', 46], ['aws', 28]], [['react', 20]], [{ role: 'ML Engineer', companyName: 'CI&T', months: 26, stackIds: ['python', 'ml', 'data'] }, { role: 'AI Engineer', companyName: 'Claro', months: 16, stackIds: ['python', 'ml', 'gcp'] }]),
];

export function buildMatchingLabJobs(): MatchLabJob[] {
  return JOB_SEEDS.map((seed) => ({
    ...seed,
    stacks: normalizeStacks(seed.stackWeights),
    topStacks: normalizeStacks(seed.stackWeights).filter((stack) => stack.band === 'primary'),
    secondaryStacks: normalizeStacks(seed.stackWeights).filter((stack) => stack.band === 'secondary'),
  }));
}

export function buildMatchingLabCandidates(): MatchLabCandidate[] {
  return CANDIDATE_NAMES.map((name, index) => {
    const archetype = ARCHETYPES[index % ARCHETYPES.length];
    const location = LOCATIONS[index % LOCATIONS.length];
    const seniority = rotateSeniority(archetype.seniority, index);
    const stackWeights = mutateStacks(archetype.primaryStacks, archetype.supportStacks ?? [], index);
    const experiences = buildExperiences(archetype, index);

    const seed: MatchLabCandidateSeed = {
      id: `candidate-${String(index + 1).padStart(3, '0')}`,
      name,
      location,
      seniority,
      summary: `${archetype.summary} Perfil ${index + 1} criado para testar coerência de ranking e desempate.`,
      stackWeights,
      experiences,
    };

    return {
      id: seed.id,
      name: seed.name,
      location: seed.location,
      seniority: seed.seniority,
      summary: seed.summary,
      stacks: normalizeStacks(seed.stackWeights),
      experiences: seed.experiences,
    };
  });
}

function normalizeStacks(weights: Record<string, number>): MatchLabStackWeight[] {
  const sorted = Object.entries(weights)
    .filter(([, percent]) => percent > 0)
    .sort((left, right) => right[1] - left[1]);

  return sorted.map(([stackId, percent], index) => ({
    stackId,
    stackName: stackName(stackId),
    percent,
    band: resolveBand(percent, index),
  }));
}

function resolveBand(percent: number, index: number): MatchLabStackBand {
  if (index < 3) {
    return 'primary';
  }
  if (percent > 25) {
    return 'secondary';
  }
  return 'support';
}

function stackName(stackId: string): string {
  return STACKS.find((item) => item.id === stackId)?.name ?? stackId;
}

function job(
  id: string,
  code: string,
  title: string,
  company: string,
  location: string,
  workModel: MatchLabJobSeed['workModel'],
  seniority: MatchLabJobSeed['seniority'],
  summary: string,
  salaryMin: number,
  salaryMax: number,
  stackWeights: Record<string, number>,
): MatchLabJobSeed {
  return { id, code, title, company, location, workModel, seniority, summary, salaryMin, salaryMax, stackWeights };
}

function archetype(
  key: string,
  seniority: MatchLabSeniority,
  summary: string,
  primaryStacks: Array<[string, number]>,
  supportStacks: Array<[string, number]>,
  experienceTracks: CandidateArchetype['experienceTracks'],
): CandidateArchetype {
  return { key, seniority, summary, primaryStacks, supportStacks, experienceTracks };
}

function mutateStacks(
  primaryStacks: Array<[string, number]>,
  supportStacks: Array<[string, number]>,
  index: number,
): Record<string, number> {
  const spread = (index % 5) - 2;
  const weights: Record<string, number> = {};

  for (const [stackId, base] of [...primaryStacks, ...supportStacks]) {
    const modifier = ((index + stackId.length) % 4) - 1;
    weights[stackId] = Math.max(8, Math.min(96, base + spread + modifier));
  }

  return weights;
}

function buildExperiences(archetype: CandidateArchetype, index: number): MatchLabCandidateExperience[] {
  const desiredCount = (index % 5) + 1;

  return Array.from({ length: desiredCount }, (_value, trackIndex) => {
    const baseTrack = archetype.experienceTracks[trackIndex % archetype.experienceTracks.length];
    const endYear = 2026 - (trackIndex + 1);
    const startYear = endYear - Math.max(1, Math.floor((baseTrack.months + ((index + trackIndex) % 10)) / 12));
    const stackIds = [
      ...baseTrack.stackIds,
      ...(trackIndex % 2 === 0 ? archetype.primaryStacks.slice(0, 2).map(([stackId]) => stackId) : []),
    ].filter((stackId, position, array) => array.indexOf(stackId) === position);

    return {
      id: `${archetype.key}-exp-${index}-${trackIndex}`,
      company: baseTrack.companyName,
      role: baseTrack.role,
      start: `${startYear}-01-01`,
      end: trackIndex === 0 && index % 3 === 0 ? undefined : `${endYear}-01-01`,
      stackIds,
      summary: `${baseTrack.role} usando ${stackIds.map((stackId) => stackName(stackId)).join(', ')} em contexto real.`,
    };
  });
}

function rotateSeniority(base: MatchLabSeniority, index: number): MatchLabSeniority {
  const ladder: MatchLabSeniority[] = ['Junior', 'Pleno', 'Senior', 'Especialista'];
  const baseIndex = ladder.indexOf(base);
  const movement = index % 6 === 0 ? -1 : index % 8 === 0 ? 1 : 0;
  const nextIndex = Math.max(0, Math.min(ladder.length - 1, baseIndex + movement));
  return ladder[nextIndex];
}
