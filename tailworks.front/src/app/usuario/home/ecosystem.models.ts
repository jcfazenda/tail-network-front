import { MockJobRecord } from '../../vagas/data/vagas.models';

export interface EcosystemViewportState {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  panX: number;
  panY: number;
}

export interface EcosystemNodeCoordinates {
  x: number;
  y: number;
  accent: string;
}

export interface EcosystemCompanyProfile {
  name: string;
  followers: string;
  description: string;
  logoLabel: string;
  logoUrl?: string;
}

export interface EcosystemSpotlightItem {
  label: string;
  score: number;
}

export interface EcosystemMapJobNode {
  id: string;
  x: number;
  y: number;
  accent: string;
  record: MockJobRecord;
  previewStacks: EcosystemSpotlightItem[];
}

export interface EcosystemTalentCore {
  x: number;
  y: number;
  name: string;
  graduation: string;
  specialization: string;
  avatarUrl?: string;
  visibleInEcosystem: boolean;
  availableForApplications: boolean;
  stacks: string[];
}

export interface EcosystemCompatibleJobSeed {
  company: string;
  title: string;
  location: string;
  match: number;
  workModel: string;
  contractType: string;
  benefitsLabel: string;
  techStack: EcosystemSpotlightItem[];
}

export const ECOSYSTEM_WORLD_WIDTH = 2200;
export const ECOSYSTEM_WORLD_HEIGHT = 1400;

export const ECOSYSTEM_TALENT_CORE_POSITION = {
  x: 1100,
  y: 700,
};

export const ECOSYSTEM_JOB_COORDINATE_PRESETS: EcosystemNodeCoordinates[] = [
  { x: 620, y: 360, accent: '#f59e0b' },
  { x: 1580, y: 340, accent: '#fb923c' },
  { x: 540, y: 1020, accent: '#facc15' },
  { x: 1640, y: 1040, accent: '#fbbf24' },
  { x: 950, y: 240, accent: '#f97316' },
  { x: 1360, y: 920, accent: '#f59e0b' },
  { x: 430, y: 720, accent: '#f59e0b' },
  { x: 1770, y: 720, accent: '#fcd34d' },
];

export const ECOSYSTEM_FALLBACK_COMPATIBLE_JOBS: EcosystemCompatibleJobSeed[] = [
  {
    company: 'Banco Itaú',
    title: 'Backend .NET Sênior',
    location: 'Rio de Janeiro - RJ',
    match: 91,
    workModel: 'Remoto',
    contractType: 'CLT',
    benefitsLabel: 'Beneficios',
    techStack: [
      { label: '.NET / C#', score: 80 },
      { label: 'Entity Framework', score: 65 },
      { label: 'REST API', score: 75 },
      { label: 'SQL Server', score: 70 },
    ],
  },
  {
    company: 'Nubank',
    title: 'Tech Lead Backend',
    location: 'São Paulo - SP',
    match: 87,
    workModel: 'Hibrido',
    contractType: 'CLT',
    benefitsLabel: 'Beneficios',
    techStack: [
      { label: 'Node.js', score: 78 },
      { label: 'AWS', score: 82 },
      { label: 'PostgreSQL', score: 71 },
    ],
  },
  {
    company: 'Stone',
    title: 'Engenheiro de Plataforma',
    location: 'Belo Horizonte - MG',
    match: 84,
    workModel: 'Remoto',
    contractType: 'PJ',
    benefitsLabel: 'Beneficios',
    techStack: [
      { label: 'Azure', score: 88 },
      { label: 'Docker', score: 67 },
      { label: 'Kubernetes', score: 59 },
    ],
  },
];
