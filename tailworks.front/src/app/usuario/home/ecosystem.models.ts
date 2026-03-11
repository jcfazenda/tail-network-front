import { MockJobRecord } from '../../vagas/data/vagas.models';

export type GalaxyOrbitBandKey = 'high' | 'good' | 'potential' | 'outside';

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

export interface GalaxyNebula {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  colors: [string, string];
  opacity: number;
  blur: number;
}

export interface GalaxyOrbitBandMeta {
  key: GalaxyOrbitBandKey;
  label: string;
  range: string;
  minMatch: number;
  maxMatch: number;
  radiusX: number;
  radiusY: number;
  accent: string;
  glow: string;
}

export interface GalaxyJobNode {
  id: string;
  x: number;
  y: number;
  size: number;
  orbitBand: GalaxyOrbitBandKey;
  accent: string;
  glow: string;
  logoLabel: string;
  logoUrl?: string;
  record: MockJobRecord;
}

export interface GalaxyClusterNode {
  id: string;
  x: number;
  y: number;
  size: number;
  orbitBand: GalaxyOrbitBandKey;
  accent: string;
  glow: string;
}

export interface GalaxyTalentCore {
  x: number;
  y: number;
  name: string;
  role: string;
  radarScore: number;
}

export const GALAXY_WORLD_WIDTH = 3200;
export const GALAXY_WORLD_HEIGHT = 2200;

export const GALAXY_TALENT_CORE: GalaxyTalentCore = {
  x: 1600,
  y: 1100,
  name: 'Julio Fazenda',
  role: 'Radar Core',
  radarScore: 84,
};

export const GALAXY_ORBIT_BANDS: GalaxyOrbitBandMeta[] = [
  {
    key: 'high',
    label: 'Alta compatibilidade',
    range: '85% - 100%',
    minMatch: 85,
    maxMatch: 100,
    radiusX: 340,
    radiusY: 250,
    accent: 'var(--orbit-high)',
    glow: 'rgba(var(--primary-rgb), 0.18)',
  },
  {
    key: 'good',
    label: 'Boa compatibilidade',
    range: '65% - 84%',
    minMatch: 65,
    maxMatch: 84,
    radiusX: 560,
    radiusY: 410,
    accent: 'var(--orbit-good)',
    glow: 'rgba(var(--primary-rgb), 0.14)',
  },
  {
    key: 'potential',
    label: 'Potencial',
    range: '55% - 64%',
    minMatch: 55,
    maxMatch: 64,
    radiusX: 780,
    radiusY: 560,
    accent: 'var(--orbit-potential)',
    glow: 'rgba(var(--primary-rgb), 0.1)',
  },
  {
    key: 'outside',
    label: 'Fora do radar',
    range: '< 55%',
    minMatch: 0,
    maxMatch: 54,
    radiusX: 980,
    radiusY: 710,
    accent: 'var(--orbit-outside)',
    glow: 'rgba(208, 213, 219, 0.16)',
  },
];

export const GALAXY_NEBULAE: GalaxyNebula[] = [
  {
    id: 'cloud',
    x: 620,
    y: 1600,
    width: 760,
    height: 460,
    rotation: -10,
    colors: ['rgba(var(--primary-rgb), 0.14)', 'rgba(199, 205, 214, 0.04)'],
    opacity: 0.9,
    blur: 6,
  },
  {
    id: 'data',
    x: 2520,
    y: 1560,
    width: 900,
    height: 520,
    rotation: 8,
    colors: ['rgba(187, 197, 208, 0.18)', 'rgba(154, 165, 178, 0.06)'],
    opacity: 0.92,
    blur: 6,
  },
  {
    id: 'backend',
    x: 690,
    y: 500,
    width: 840,
    height: 460,
    rotation: -12,
    colors: ['rgba(176, 186, 198, 0.16)', 'rgba(143, 154, 168, 0.05)'],
    opacity: 0.84,
    blur: 8,
  },
  {
    id: 'ai',
    x: 2520,
    y: 540,
    width: 760,
    height: 420,
    rotation: 12,
    colors: ['rgba(201, 207, 216, 0.14)', 'rgba(var(--primary-rgb), 0.04)'],
    opacity: 0.78,
    blur: 10,
  },
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
  {
    company: 'NTT Data',
    title: '.NET Senior',
    location: 'Recife - PE',
    match: 79,
    workModel: 'Hibrido',
    contractType: 'CLT',
    benefitsLabel: 'Beneficios',
    techStack: [
      { label: '.NET', score: 92 },
      { label: 'Azure', score: 72 },
      { label: 'Microservices', score: 69 },
    ],
  },
];
