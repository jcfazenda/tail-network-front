export type ExperienceStackCategory =
  | 'backend'
  | 'frontend'
  | 'database'
  | 'cloud'
  | 'devops'
  | 'mobile'
  | 'data'
  | 'other';

export type ExperienceStackRepoItem = {
  id: string;
  name: string;
  category: ExperienceStackCategory;
};

export const EXPERIENCE_STACK_CATEGORY_ORDER: ExperienceStackCategory[] = [
  'backend',
  'frontend',
  'database',
  'cloud',
  'devops',
  'mobile',
  'data',
  'other',
];

export const EXPERIENCE_STACK_CATEGORY_LABELS: Record<ExperienceStackCategory, string> = {
  backend: 'Back-end',
  frontend: 'Front-end',
  database: 'Banco de Dados',
  cloud: 'Cloud',
  devops: 'DevOps',
  mobile: 'Mobile',
  data: 'Dados e IA',
  other: 'Outros',
};

const rawCatalog: ExperienceStackRepoItem[] = [
  { id: 'repo:dotnet', name: '.NET / C#', category: 'backend' },
  { id: 'repo:csharp', name: 'C#', category: 'backend' },
  { id: 'repo:aspnet-core', name: 'ASP.NET Core', category: 'backend' },
  { id: 'repo:entity-framework', name: 'Entity Framework', category: 'backend' },
  { id: 'repo:rest-api', name: 'REST API', category: 'backend' },
  { id: 'repo:microservices', name: 'Microservices', category: 'backend' },
  { id: 'repo:rabbitmq', name: 'RabbitMQ', category: 'backend' },
  { id: 'repo:kafka', name: 'Kafka', category: 'backend' },
  { id: 'repo:java', name: 'Java / Spring', category: 'backend' },
  { id: 'repo:nodejs', name: 'Node.js', category: 'backend' },
  { id: 'repo:angular', name: 'Angular', category: 'frontend' },
  { id: 'repo:react', name: 'React', category: 'frontend' },
  { id: 'repo:typescript', name: 'TypeScript', category: 'frontend' },
  { id: 'repo:javascript', name: 'JavaScript', category: 'frontend' },
  { id: 'repo:html', name: 'HTML', category: 'frontend' },
  { id: 'repo:css', name: 'CSS', category: 'frontend' },
  { id: 'repo:sql-server', name: 'SQL Server', category: 'database' },
  { id: 'repo:postgresql', name: 'PostgreSQL', category: 'database' },
  { id: 'repo:mysql', name: 'MySQL', category: 'database' },
  { id: 'repo:mongodb', name: 'MongoDB', category: 'database' },
  { id: 'repo:redis', name: 'Redis', category: 'database' },
  { id: 'repo:elasticsearch', name: 'Elasticsearch', category: 'database' },
  { id: 'repo:aws', name: 'AWS', category: 'cloud' },
  { id: 'repo:azure', name: 'Azure', category: 'cloud' },
  { id: 'repo:gcp', name: 'Google Cloud', category: 'cloud' },
  { id: 'repo:cloudwatch', name: 'Cloud Monitoring', category: 'cloud' },
  { id: 'repo:serverless', name: 'Serverless', category: 'cloud' },
  { id: 'repo:docker', name: 'Docker', category: 'devops' },
  { id: 'repo:kubernetes', name: 'Kubernetes', category: 'devops' },
  { id: 'repo:terraform', name: 'Terraform', category: 'devops' },
  { id: 'repo:github-actions', name: 'GitHub Actions', category: 'devops' },
  { id: 'repo:gitlab-ci', name: 'GitLab CI', category: 'devops' },
  { id: 'repo:linux', name: 'Linux', category: 'devops' },
  { id: 'repo:nginx', name: 'Nginx', category: 'devops' },
  { id: 'repo:flutter', name: 'Flutter', category: 'mobile' },
  { id: 'repo:react-native', name: 'React Native', category: 'mobile' },
  { id: 'repo:kotlin', name: 'Kotlin', category: 'mobile' },
  { id: 'repo:swift', name: 'Swift', category: 'mobile' },
  { id: 'repo:android', name: 'Android', category: 'mobile' },
  { id: 'repo:ios', name: 'iOS', category: 'mobile' },
  { id: 'repo:python', name: 'Python', category: 'data' },
  { id: 'repo:python-ml', name: 'IA / ML', category: 'data' },
  { id: 'repo:qa-automation', name: 'QA Automação', category: 'other' },
  { id: 'repo:security', name: 'Segurança', category: 'other' },
  { id: 'repo:ux', name: 'UX / UI', category: 'frontend' },
  { id: 'repo:figma', name: 'Figma', category: 'frontend' },
];

export const EXPERIENCE_STACK_CATALOG: ExperienceStackRepoItem[] = rawCatalog
  .slice()
  .sort((left, right) => {
    const categoryDelta =
      EXPERIENCE_STACK_CATEGORY_ORDER.indexOf(left.category) -
      EXPERIENCE_STACK_CATEGORY_ORDER.indexOf(right.category);

    if (categoryDelta !== 0) {
      return categoryDelta;
    }

    return left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
  });
