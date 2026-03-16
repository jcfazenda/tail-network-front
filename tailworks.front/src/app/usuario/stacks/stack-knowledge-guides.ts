export type StackGuideTier = 'iniciante' | 'basico' | 'intermediario' | 'avancado' | 'senior' | 'especialista';

export type StackKnowledgeGuide = {
  tagline: string;
  meaningChecklist: string[];
  expectationsByTier?: Partial<Record<StackGuideTier, string[]>>;
  signalsByTier?: Partial<Record<StackGuideTier, { inTier: string[]; notYet: string[] }>>;
  commonTools?: string[];
  usedByCompanies?: string[];
};

// Base de conhecimento (mock) para orientar o talento a marcar percentuais com mais honestidade.
// Chave = repoId (ex: "repo:kafka"). Futuramente pode vir do backend/repositório.
export const STACK_KNOWLEDGE_GUIDES: Record<string, StackKnowledgeGuide> = {
  // Backend
  'repo:dotnet': {
    tagline: 'Backend Application Platform',
    meaningChecklist: [
      'Construir APIs e servicos com boas praticas',
      'Organizar camadas, validacao e seguranca',
      'Ter cuidado com performance e manutencao',
    ],
    expectationsByTier: {
      iniciante: [
        'Implementar endpoints simples e corrigir bugs com orientacao.',
        'Seguir o padrao do projeto (camadas, validacao, naming).',
        'Entender o fluxo de requisicao/response e tratar erros basicos.',
        'Escrever testes simples quando o time ja tem base pronta.',
      ],
      intermediario: [
        'Entregar features com autonomia e qualidade (tests e refactors seguros).',
        'Entender tradeoffs basicos de performance e arquitetura.',
        'Aplicar DI, validacao, mapeamento e padrões do time com consistencia.',
        'Trabalhar com logs/metricas e diagnosticar problemas comuns.',
        'Evitar bugs de concorrencia e uso incorreto de async/await.',
      ],
      especialista: [
        'Definir padroes reutilizaveis e resolver problemas complexos de escala.',
        'Aprofundar em runtime, tuning, GC/allocations e arquitetura corporativa.',
        'Criar bibliotecas internas e padroes de plataforma (DX, guardrails).',
        'Atuar em performance/custo com dados, profiling e testes controlados.',
        'Garantir governanca tecnica (observabilidade, seguranca, resiliencia).',
        'Mentorar tecnicamente e elevar a barra do ecossistema de engenharia.',
      ],
      avancado: [
        'Desenhar solucoes (camadas, contratos, validacao) pensando em manutencao.',
        'Melhorar observabilidade (logs/metrics/traces) e diagnosticar problemas dificeis.',
        'Definir padrões e guiar revisoes de codigo com foco em qualidade.',
        'Identificar gargalos e propor melhorias de arquitetura sem over-engineering.',
        'Prevenir bugs de concorrencia e problemas de performance mais comuns.',
      ],
      senior: [
        'Definir direcionamento tecnico e padroes do time para evolucao consistente.',
        'Tomar decisoes arquiteturais e liderar melhorias de resiliencia/performance.',
        'Tratar incidentes complexos e evoluir o sistema com foco em confiabilidade.',
        'Ajudar outros devs a entregarem melhor (mentoria, reviews, pareamento).',
      ],
    },
    signalsByTier: {
      avancado: {
        inTier: [
          'Voce pega um requisito e propoe uma solucao (camadas, contratos, validacao) sem precisarem desenhar por voce.',
          'Voce ja diagnosticou bug chato em producao usando logs/metrics/traces e deixou o sistema melhor depois.',
        ],
        notYet: [
          'Voce ainda depende de copiar padroes sem entender o porquê e quebra comportamento sem perceber.',
          'Voce evita mexer em concorrencia/performance porque nao sabe como diagnosticar com seguranca.',
        ],
      },
      especialista: {
        inTier: [
          'Voce define padroes de plataforma (templates, libs internas, guardrails) que melhoram o trabalho de varios times.',
          'Voce resolve problemas raros de escala/performance com dados (profiling, testes controlados) e reduz recorrencia.',
          'Voce guia decisoes corporativas de arquitetura e eleva a barra tecnica por onde passa.',
        ],
        notYet: [
          'Voce ainda toma decisoes de performance sem medir e sem validar impacto real.',
          'Voce ainda nao tem historico de melhorias que escalam para varios times (nao só um servico).',
        ],
      },
    },
    commonTools: ['Visual Studio / Rider', 'NuGet', 'xUnit / NUnit'],
    usedByCompanies: ['Microsoft', 'Stack Overflow', 'Itaú', 'Nubank'],
  },
  'repo:csharp': {
    tagline: 'General-purpose Language',
    meaningChecklist: [
      'Escrever codigo limpo, seguro e testavel',
      'Dominar async/await e colecoes',
      'Evitar armadilhas de concorrencia e performance',
    ],
    expectationsByTier: {
      iniciante: [
        'Conhecer sintaxe, tipos e colecoes para implementar tarefas simples.',
        'Conseguir debugar e corrigir bugs comuns com ajuda.',
      ],
      basico: [
        'Usar async/await no basico e tratar exceptions com cuidado.',
        'Escrever codigo legivel seguindo o padrao do time.',
      ],
      intermediario: [
        'Dominar LINQ, generics, exceptions e DI com consistencia.',
        'Escrever testes e manter qualidade (clean code, refactor seguro).',
        'Evitar pitfalls comuns de concorrencia e async.',
      ],
      avancado: [
        'Projetar componentes e APIs internas com boa ergonomia.',
        'Tratar performance na pratica (allocations, hot paths, profiling).',
        'Definir padrões de qualidade e guiar code reviews.',
        'Resolver problemas dificeis (deadlocks, thread-safety, async bugs).',
      ],
      senior: [
        'Tomar decisoes de arquitetura e orientar o time em tradeoffs.',
        'Melhorar a qualidade do sistema via padrões, testes e revisão tecnica.',
        'Prevenir regressões e incidentes com observabilidade e boas praticas.',
      ],
      especialista: [
        'Aprofundar em runtime, GC, JIT e tuning de performance.',
        'Criar bibliotecas/padrões reutilizaveis e elevar o nivel do ecossistema.',
        'Resolver problemas raros e complexos com impacto alto.',
        'Mentorar tecnicamente e definir diretrizes de engenharia.',
      ],
    },
    commonTools: ['LINQ', 'Roslyn analyzers', 'xUnit / NUnit'],
    usedByCompanies: ['Microsoft', 'Amazon', 'Uber', 'Stack Overflow'],
  },
  'repo:aspnet-core': {
    tagline: 'Web APIs and Services',
    meaningChecklist: [
      'Criar APIs REST com roteamento, auth e validacao',
      'Tratar erros, versionar endpoints e documentar',
      'Aplicar middlewares e boas praticas de observabilidade',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar endpoints simples e integrar com servicos internos.',
        'Entender request/response e validar entradas basicas.',
      ],
      basico: [
        'Aplicar auth basica e tratar erros de forma consistente.',
        'Documentar endpoints e testar manualmente com ferramentas comuns.',
      ],
      intermediario: [
        'Modelar controllers/handlers, validacao e padroes do time com autonomia.',
        'Versionar APIs, padronizar erros e manter contratos estaveis.',
        'Adicionar logs/metricas e diagnosticar falhas comuns.',
      ],
      avancado: [
        'Desenhar APIs com idempotencia, paginacao, cache e rate limiting quando necessario.',
        'Definir middlewares, filtros e pipelines de forma consistente.',
        'Tratar performance (serializacao, pooling, hot paths) e confiabilidade.',
        'Endurecer seguranca (authz, headers, input validation) sem atrapalhar DX.',
      ],
      senior: [
        'Definir padroes de API do time (contratos, versionamento, erros, docs).',
        'Garantir observabilidade e operacao (dashboards, alertas, tracing).',
        'Ajudar o time a evitar bugs e regressões via revisoes e boas praticas.',
      ],
      especialista: [
        'Tunar apps de alta escala (Kestrel, threadpool, allocs, IO) com dados.',
        'Definir governanca de APIs (guidelines, linting, compatibilidade retroativa).',
        'Resolver incidentes complexos e orientar arquitetura de plataforma.',
        'Criar componentes reutilizaveis e elevar a barra tecnica da org.',
      ],
    },
    commonTools: ['Swagger / OpenAPI', 'Serilog', 'JWT / OAuth'],
    usedByCompanies: ['Microsoft', 'Ifood', 'Mercado Livre', 'Stone'],
  },
  'repo:entity-framework': {
    tagline: 'ORM for Data Access',
    meaningChecklist: [
      'Modelar entidades e relacionamentos',
      'Entender tracking, migrations e performance',
      'Evitar N+1 e mapear consultas corretamente',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar entidades simples e executar CRUD basico.',
        'Usar migrations com cuidado e seguir o padrao do projeto.',
      ],
      basico: [
        'Entender tracking vs no-tracking e evitar consultas desnecessarias.',
        'Escrever queries simples em LINQ e validar resultados.',
      ],
      intermediario: [
        'Otimizar queries (includes, projections) e evitar N+1.',
        'Modelar relacionamentos e constraints com clareza.',
        'Trabalhar com transacoes e concorrencia no basico.',
      ],
      avancado: [
        'Interpretar SQL gerado, planos e gargalos para otimizar de verdade.',
        'Definir estrategias de migrations (zero-downtime quando aplicavel).',
        'Tratar concorrencia, locks e timeouts com maturidade.',
        'Criar padroes de acesso a dados para o time (repos, unit of work quando fizer sentido).',
      ],
      senior: [
        'Definir arquitetura de dados do servico (modelagem, limites, integracao).',
        'Ajudar o time a manter performance e consistencia do banco.',
        'Criar guardrails para evitar regressões (linters, reviews, guidelines).',
      ],
      especialista: [
        'Aprofundar em comportamento do ORM e casos extremos (tracking, cache, compiled queries).',
        'Definir padroes de plataforma para dados e migracoes em larga escala.',
        'Resolver incidentes de dados com impacto alto (corrupcao logica, performance severa).',
        'Mentorar tecnicamente e elevar maturidade do ecossistema de dados.',
      ],
    },
    commonTools: ['Migrations', 'LINQ', 'SQL profiling'],
    usedByCompanies: ['Itaú', 'Stone', 'Totvs', 'B2W'],
  },
  'repo:rest-api': {
    tagline: 'API Design and Integration',
    meaningChecklist: [
      'Definir contratos claros (status codes, payloads)',
      'Versionar e documentar APIs',
      'Pensar em idempotencia e seguranca',
    ],
    expectationsByTier: {
      iniciante: [
        'Consumir e criar endpoints simples seguindo exemplos do time.',
        'Entender status codes e contratos basicos.',
      ],
      basico: [
        'Padronizar erros e validar inputs corretamente.',
        'Documentar e testar endpoints com ferramentas comuns.',
      ],
      intermediario: [
        'Desenhar contratos consistentes (paginacao, filtros, sorting) e manter compatibilidade.',
        'Aplicar idempotencia e seguranca basica (authz, validação).',
        'Pensar em observabilidade e operacao (logs, tracing).',
      ],
      avancado: [
        'Definir guidelines de contrato (naming, versionamento, erros) e aplicar em times.',
        'Trabalhar com rate limiting, cache, timeouts e resiliencia de integracoes.',
        'Evitar breaking changes e planejar migracoes de contrato.',
        'Desenhar integrações B2B com clareza (SLAs, retries, idempotencia).',
      ],
      senior: [
        'Tomar decisoes de governanca de APIs e orientar outras squads.',
        'Ajudar o time a operar APIs com confiabilidade (SLOs, alertas, incidentes).',
        'Revisar contratos com foco no consumidor e na manutencao.',
      ],
      especialista: [
        'Definir estrategia corporativa de API (standards, tooling, compatibility).',
        'Resolver problemas complexos de integracao e escala com dados.',
        'Criar plataformas/SDKs e elevar a experiencia do desenvolvedor.',
        'Mentorar tecnicamente e elevar o nivel do ecossistema.',
      ],
    },
    commonTools: ['OpenAPI', 'Postman', 'API Gateway'],
    usedByCompanies: ['Stripe', 'PayPal', 'Shopify', 'Mercado Pago'],
  },
  'repo:microservices': {
    tagline: 'Distributed Systems',
    meaningChecklist: [
      'Separar responsabilidades e limites de dominio',
      'Garantir resiliencia (timeouts, retries, circuit breaker)',
      'Ter observabilidade (logs, metrics, tracing)',
    ],
    expectationsByTier: {
      iniciante: [
        'Entender o que e um servico e como ele conversa com outros.',
        'Implementar tarefas pequenas sem quebrar contratos existentes.',
      ],
      basico: [
        'Seguir padrões do time (DTOs, contracts, retries) com cuidado.',
        'Adicionar logs basicos e diagnosticar problemas simples.',
      ],
      intermediario: [
        'Aplicar timeouts, retries e padroes de resiliencia com bom senso.',
        'Evitar acoplamento e respeitar limites de responsabilidade.',
        'Trabalhar com tracing/logs/metrics para operar no dia a dia.',
      ],
      avancado: [
        'Definir limites de dominio e padroes de integracao (sync/async) corretamente.',
        'Trabalhar com consistencia eventual, idempotencia e reprocessamento.',
        'Operar com SLOs: criar alertas e reduzir MTTR com runbooks.',
        'Evitar armadilhas: cascata de falhas, acoplamento, chatty calls.',
      ],
      senior: [
        'Desenhar arquitetura de servicos com foco em confiabilidade e evolucao.',
        'Guiar times em decisões (tradeoffs, padrões, governanca).',
        'Liderar resposta a incidentes e melhoria continua do sistema.',
      ],
      especialista: [
        'Definir plataforma/padroes (service templates, observability, deployment) para a org.',
        'Resolver problemas raros e complexos de escala e consistencia.',
        'Guiar estratégia de engenharia (SLOs, qualidade, governanca técnica).',
        'Mentorar tecnicamente e elevar a maturidade de times multiplos.',
      ],
    },
    commonTools: ['OpenTelemetry', 'Service mesh', 'API gateway'],
    usedByCompanies: ['Netflix', 'Uber', 'Amazon', 'Spotify'],
  },
  'repo:rabbitmq': {
    tagline: 'Message Broker',
    meaningChecklist: [
      'Publicar e consumir mensagens com confiabilidade',
      'Trabalhar com filas, exchanges e routing keys',
      'Evitar duplicidade e tratar reprocessamento',
    ],
    expectationsByTier: {
      iniciante: [
        'Publicar/consumir mensagens com configuracao basica.',
        'Entender ack/retry no basico e evitar perder mensagens.',
      ],
      basico: [
        'Trabalhar com filas e exchanges simples (direct/topic) corretamente.',
        'Configurar DLQ e tratar reprocessamento simples.',
      ],
      intermediario: [
        'Ajustar prefetch/concurrency e entender ordenacao quando aplicavel.',
        'Aplicar idempotencia e lidar com duplicidade de mensagens.',
        'Monitorar filas e diagnosticar gargalos comuns.',
      ],
      avancado: [
        'Desenhar topologias (exchanges, routing) alinhadas ao dominio e escalabilidade.',
        'Planejar retries com backoff e evitar poison messages.',
        'Garantir observabilidade e operacao (alertas, runbooks) para filas criticas.',
        'Resolver throughput/latencia com tuning e desenho correto.',
      ],
      senior: [
        'Definir padroes de mensageria para o time (contratos, DLQ, retries, idempotencia).',
        'Orientar outras squads e garantir confiabilidade do ecossistema.',
        'Liderar incidentes e melhorias de arquitetura envolvendo mensageria.',
      ],
      especialista: [
        'Projetar HA/cluster e estrategias de resiliencia para mensageria em larga escala.',
        'Resolver casos extremos (burst, congestion, backpressure, storage).',
        'Criar plataforma/padroes de eventos e elevar maturidade de varios times.',
        'Mentorar tecnicamente e definir governanca de mensageria.',
      ],
    },
    commonTools: ['Management UI', 'DLQ', 'Spring AMQP / MassTransit'],
    usedByCompanies: ['Discord', 'Booking', 'Stack Overflow', 'Globo'],
  },
  'repo:kafka': {
    tagline: 'Event Streaming Platform',
    meaningChecklist: [
      'Produzir e consumir eventos',
      'Entender topicos e particoes',
      'Trabalhar com consumer groups',
      'Integrar com microservices',
    ],
    expectationsByTier: {
      iniciante: [
        'Consumir eventos e entender o fluxo ponta a ponta.',
        'Usar Kafka via framework com configuracao basica.',
        'Entender garantias basicas (at-least-once) e evitar perder mensagens.',
        'Logar e monitorar falhas simples no consumo.',
      ],
      intermediario: [
        'Configurar producers e consumers com seguranca.',
        'Entender particoes, offset, retries e DLQ.',
        'Trabalhar com idempotencia e reprocessamento com segurança.',
        'Escolher chaves (key) e paralelismo sem quebrar ordenacao necessária.',
        'Interpretar lag e ajustar configuracoes comuns.',
      ],
      especialista: [
        'Projetar sistemas event-driven em larga escala.',
        'Kafka Streams e replicacao multi-cluster.',
        'Definir estrategias multi-regiao, DR e consistencia operacional.',
        'Atuar em tuning avancado, confiabilidade do cluster e capacity planning.',
        'Definir governanca de schemas (compatibilidade, versionamento, tooling).',
        'Criar plataforma/padroes de eventos para varios times (self-service).',
        'Resolver casos extremos (hot partitions, rebalancing, quotas, throttling).',
      ],
      avancado: [
        'Definir arquitetura de eventos e padroes de integracao (pub/sub, fanout, saga).',
        'Resolver throughput/latencia e planejar capacidade (particoes, retencao, lag).',
        'Definir contratos de eventos (schema, versionamento, idempotencia).',
        'Garantir observabilidade e operacao (alertas, runbooks, incidentes).',
        'Evitar armadilhas: ordering, duplicidade, reprocessamento e poison messages.',
      ],
      senior: [
        'Tomar decisoes de particionamento/retencao com foco no negocio e confiabilidade.',
        'Orientar times em boas praticas (contratos, DLQ, idempotencia, retries).',
        'Desenhar governanca e operar com qualidade (SLOs, incident response).',
      ],
    },
    signalsByTier: {
      avancado: {
        inTier: [
          'Voce ja resolveu lag/throughput na pratica (particoes, batch, parallelism) sem quebrar ordering necessario.',
          'Voce define contratos de eventos (schema/versionamento) e consegue operar com alertas e runbooks.',
        ],
        notYet: [
          'Voce ainda confunde offset/consumer group e depende de alguem para corrigir reprocessamento.',
          'Voce nao sabe explicar quando e por que ocorre duplicidade e como tornar consumo idempotente.',
        ],
      },
      especialista: {
        inTier: [
          'Voce ja desenhou governanca de schemas e padroes de plataforma de eventos para varios times (self-service).',
          'Voce resolve casos extremos (hot partitions, rebalances, quotas/throttling) com metodo e dados.',
          'Voce pensa em DR/multi-regiao e confiabilidade do cluster como produto.',
        ],
        notYet: [
          'Voce ainda depende de tentativa-e-erro para tuning e nao consegue prever impacto de mudancas.',
          'Voce ainda nao operou Kafka em escala ou nao participou de incidentes relevantes envolvendo o cluster.',
        ],
      },
    },
    commonTools: ['Kafka CLI', 'Confluent', 'Spring Kafka', 'Kafka Streams'],
    usedByCompanies: ['Netflix', 'Uber', 'LinkedIn', 'Amazon'],
  },

  // Frontend
  'repo:typescript': {
    tagline: 'Typed JavaScript',
    meaningChecklist: [
      'Modelar tipos, interfaces e contratos',
      'Evitar any e reduzir bugs via types',
      'Trabalhar bem com generics e toolchain',
    ],
    expectationsByTier: {
      iniciante: [
        'Tipar variaveis e funcoes simples sem travar o desenvolvimento.',
        'Evitar any quando possivel e entender erros basicos do compilador.',
      ],
      basico: [
        'Modelar interfaces/types e usar narrowing de tipos corretamente.',
        'Configurar imports e entender como o build/transpile funciona no projeto.',
      ],
      intermediario: [
        'Usar generics com criterio e manter tipos legiveis.',
        'Modelar contratos de APIs e dados (DTOs) com consistencia.',
        'Manter toolchain (eslint/tsconfig) sem criar friccao no time.',
      ],
      avancado: [
        'Projetar tipos para reduzir bugs e aumentar DX (helpers, util types).',
        'Tratar casos complexos (discriminated unions, inference) com clareza.',
        'Definir padrões de tipagem para o time e guiar code reviews.',
        'Evitar tipos impossiveis e manter complexidade sob controle.',
      ],
      senior: [
        'Definir arquitetura de tipos e contratos em apps grandes/monorepos.',
        'Ajudar o time a refatorar com segurança usando types como guardrails.',
        'Garantir consistencia entre front/back (contracts, schemas, tooling).',
      ],
      especialista: [
        'Projetar bibliotecas/SDKs tipadas e elevar o padrao de DX.',
        'Criar tooling interno (lint rules, generators) e padroes de plataforma.',
        'Resolver problemas raros de toolchain/build e tipagem complexa.',
        'Mentorar tecnicamente e elevar maturidade do ecossistema.',
      ],
    },
    commonTools: ['TSConfig', 'ESLint', 'Type narrowing'],
    usedByCompanies: ['Google', 'Microsoft', 'Airbnb', 'Uber'],
  },
  'repo:javascript': {
    tagline: 'Web Language Runtime',
    meaningChecklist: [
      'Entender async (promises, event loop) com clareza',
      'Dominar fundamentos (scope, closures, modules)',
      'Escrever codigo legivel e performatico no browser',
    ],
    expectationsByTier: {
      iniciante: [
        'Entender variaveis, funcoes, objetos e arrays para construir features simples.',
        'Conseguir debugar e entender erros comuns no console.',
      ],
      basico: [
        'Usar promises/async/await no basico sem criar race conditions.',
        'Entender modules e organizar codigo de forma legivel.',
      ],
      intermediario: [
        'Dominar event loop no suficiente para evitar bugs de async.',
        'Trabalhar com fetch, erro/retry e tratar edge cases comuns.',
        'Escrever codigo testavel e manter padrao do time.',
      ],
      avancado: [
        'Resolver problemas de performance (render, loops, memory leaks) com dados.',
        'Evitar bugs sutis (closures, mutation, this binding) em bases grandes.',
        'Definir padrões de qualidade e guiar code reviews.',
        'Trabalhar com bundling e otimização sem quebrar a app.',
      ],
      senior: [
        'Definir arquitetura de front e guiar padrões de estado, efeitos e performance.',
        'Ajudar o time a escrever codigo mais confiavel e facil de manter.',
        'Liderar incidentes e melhorias em runtime/performance no browser.',
      ],
      especialista: [
        'Aprofundar em runtime (V8), memoria e profiling em casos complexos.',
        'Criar padrões, libs internas e tooling para elevar o ecossistema.',
        'Resolver problemas raros de performance/compatibilidade em larga escala.',
        'Mentorar tecnicamente e elevar a barra de engenharia.',
      ],
    },
    commonTools: ['NPM', 'Bundlers', 'ESLint / Prettier'],
    usedByCompanies: ['Meta', 'Google', 'Netflix', 'Airbnb'],
  },
  'repo:angular': {
    tagline: 'Frontend Framework',
    meaningChecklist: [
      'Criar componentes, rotas e formularios com qualidade',
      'Dominar RxJS no fluxo de dados',
      'Gerir estado e performance de telas',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar componentes simples e navegar rotas com orientacao.',
        'Usar bindings e inputs/outputs sem quebrar a tela.',
      ],
      basico: [
        'Trabalhar com forms e validacao basica.',
        'Consumir APIs e lidar com loading/erro de forma consistente.',
      ],
      intermediario: [
        'Usar RxJS para fluxo de dados com consistencia (subscribe, pipes, operators comuns).',
        'Organizar modulos, rotas e componentes para manutencao.',
        'Escrever testes basicos e evitar regressões.',
      ],
      avancado: [
        'Desenhar arquitetura de estado (signals/store) e efeitos sem vazamentos.',
        'Resolver performance (change detection, trackBy, lazy loading) com dados.',
        'Padronizar componentes e elevar consistencia (design system).',
        'Garantir acessibilidade e UX fluida em telas complexas.',
      ],
      senior: [
        'Definir padroes de arquitetura e governanca de front para o time.',
        'Guiar revisoes, refactors e evolucao segura do app.',
        'Liderar iniciativas de performance, qualidade e DX.',
      ],
      especialista: [
        'Resolver casos complexos de performance/compilacao e modularizacao em larga escala.',
        'Criar libs internas e tooling para padronizar times.',
        'Definir arquitetura de plataforma front (monorepo, microfront, build).',
        'Mentorar tecnicamente e elevar maturidade do ecossistema.',
      ],
    },
    commonTools: ['RxJS', 'Angular Router', 'Angular Forms'],
    usedByCompanies: ['Google', 'Santander', 'Itaú', 'Globo'],
  },
  'repo:react': {
    tagline: 'UI Library',
    meaningChecklist: [
      'Construir componentes e composicao de UI',
      'Gerir estado e renderizacao com eficiencia',
      'Evitar re-renders e bugs de efeitos',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar componentes simples e entender props/state no basico.',
        'Consumir APIs e lidar com loading/erro de forma simples.',
      ],
      basico: [
        'Organizar componentes e hooks sem duplicar logica.',
        'Entender effects no basico e evitar loops.',
      ],
      intermediario: [
        'Gerir estado (local/async) com consistencia e separar responsabilidades.',
        'Escrever componentes reutilizaveis e testaveis.',
        'Tratar performance basica (memo quando necessario, key, renders).',
      ],
      avancado: [
        'Resolver performance (profiling, renders, suspense/async) com dados.',
        'Definir padrões de estado e side-effects para o time.',
        'Criar componentes de design system com alta qualidade.',
        'Evitar bugs sutis (stale closures, deps de effect) em bases grandes.',
      ],
      senior: [
        'Definir arquitetura de front (state, data fetching, routing) para evolucao segura.',
        'Guiar refactors e revisoes para manter qualidade e consistencia.',
        'Liderar melhorias de DX, performance e qualidade em escala.',
      ],
      especialista: [
        'Criar padrões/infra de front (monorepo, microfront, tooling) em larga escala.',
        'Resolver problemas raros de performance/SSR/hidratacao com impacto alto.',
        'Construir bibliotecas internas e elevar o ecossistema de UI.',
        'Mentorar tecnicamente e elevar a maturidade de times multiplos.',
      ],
    },
    commonTools: ['React Router', 'TanStack Query', 'Testing Library'],
    usedByCompanies: ['Meta', 'Netflix', 'Airbnb', 'Uber'],
  },
  'repo:vue': {
    tagline: 'Progressive Framework',
    meaningChecklist: [
      'Criar componentes e composicao de UI',
      'Trabalhar com reatividade sem efeitos colaterais',
      'Organizar rotas, estado e testes',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar componentes simples e usar props/emit no basico.',
        'Consumir APIs e renderizar estados com clareza.',
      ],
      basico: [
        'Organizar composables e evitar logica duplicada.',
        'Trabalhar com reatividade e computed/watch com cuidado.',
      ],
      intermediario: [
        'Gerir estado e rotas com consistencia (Pinia/Vue Router).',
        'Escrever componentes reutilizaveis e testaveis.',
        'Evitar bugs de reatividade e efeitos colaterais.',
      ],
      avancado: [
        'Resolver performance com dados (renders, watchers, memo, virtualization).',
        'Definir padrões de arquitetura e governanca para o time.',
        'Criar design system e componentes de alto nivel com qualidade.',
        'Garantir acessibilidade e UX em telas complexas.',
      ],
      senior: [
        'Definir arquitetura de front e guiar revisoes/refactors.',
        'Liderar iniciativas de performance, qualidade e DX.',
        'Garantir consistencia do ecossistema de componentes.',
      ],
      especialista: [
        'Resolver problemas complexos de build, modularizacao e performance em larga escala.',
        'Criar tooling interno e libs para padronizar varios times.',
        'Definir estrategia de plataforma front (monorepo, microfront).',
        'Mentorar tecnicamente e elevar a maturidade do ecossistema.',
      ],
    },
    commonTools: ['Pinia', 'Vue Router', 'Vite'],
    usedByCompanies: ['Alibaba', 'Xiaomi', 'GitLab', 'Nintendo'],
  },
  'repo:nextjs': {
    tagline: 'Fullstack React Framework',
    meaningChecklist: [
      'Trabalhar com rotas e data fetching',
      'Pensar em performance (SSR/SSG) e cache',
      'Organizar projetos e deploy com consistencia',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar paginas/rotas simples e consumir dados no basico.',
        'Entender diferenca entre client/server components no basico (quando aplicavel).',
      ],
      basico: [
        'Trabalhar com layouts, navegacao e estados de carregamento.',
        'Configurar SEO basico e metadata sem quebrar a app.',
      ],
      intermediario: [
        'Escolher estrategia de render (SSR/SSG/ISR) e cache com bom senso.',
        'Integrar com APIs e tratar erros/retries corretamente.',
        'Evitar problemas de hidratacao e inconsistencias.',
      ],
      avancado: [
        'Resolver performance de SSR/hidratacao com dados (profiling, bundles, cache).',
        'Desenhar arquitetura de rotas e data fetching para apps grandes.',
        'Garantir seguranca (auth, headers) e observabilidade no edge/server.',
        'Planejar deploys e rollbacks com confiabilidade.',
      ],
      senior: [
        'Definir padroes de plataforma (render, cache, auth, observability) para o time.',
        'Liderar refactors e evolucao do app sem regressões.',
        'Orientar decisões de arquitetura e DX.',
      ],
      especialista: [
        'Resolver casos complexos de performance/edge/streaming em larga escala.',
        'Criar padrões e tooling interno para acelerar varios times.',
        'Definir estrategia de plataforma fullstack e governanca de deploy.',
        'Mentorar tecnicamente e elevar a maturidade do ecossistema.',
      ],
    },
    commonTools: ['App Router', 'Edge functions', 'Vercel'],
    usedByCompanies: ['TikTok', 'Hulu', 'Nike', 'Twitch'],
  },
  'repo:html': {
    tagline: 'Markup and Semantics',
    meaningChecklist: [
      'Usar semantica correta e acessibilidade',
      'Estruturar layout com clareza',
      'Evitar divitis e manter manutencao simples',
    ],
    expectationsByTier: {
      iniciante: [
        'Estruturar pagina com tags basicas e conteudo organizado.',
        'Evitar markup quebrado e entender hierarquia simples.',
      ],
      basico: [
        'Usar semantica (header/nav/main/section) e formularios corretamente.',
        'Aplicar acessibilidade basica (labels, alt, foco).',
      ],
      intermediario: [
        'Garantir semantica e acessibilidade em componentes reutilizaveis.',
        'Trabalhar com SEO basico e estrutura consistente.',
        'Evitar problemas de navegacao por teclado e leitor de tela.',
      ],
      avancado: [
        'Definir padrões de markup/acessibilidade para o time e revisar PRs.',
        'Resolver problemas de acessibilidade reais com testes (audit) e correcoes.',
        'Garantir consistencia em design systems e componentes complexos.',
        'Pensar em performance de DOM e estrutura para apps grandes.',
      ],
      senior: [
        'Guiar o time em acessibilidade como requisito (processo, checklist, testes).',
        'Definir padrões e garantir consistencia cross-browser.',
        'Liderar melhorias de UX e acessibilidade em escala.',
      ],
      especialista: [
        'Ser referencia em acessibilidade (WCAG) e resolver casos complexos.',
        'Criar padrões/tooling para garantir acessibilidade por default.',
        'Auditar e elevar o nível do produto em qualidade e inclusao.',
        'Mentorar tecnicamente e elevar maturidade do ecossistema.',
      ],
    },
    commonTools: ['ARIA', 'Lighthouse', 'Semantic tags'],
    usedByCompanies: ['Qualquer produto web', 'E-commerces', 'SaaS', 'Apps'],
  },
  'repo:css': {
    tagline: 'Layout and Styling',
    meaningChecklist: [
      'Dominar layout (flex, grid) e responsividade',
      'Manter consistencia com tokens e componentes',
      'Evitar especificidade alta e efeitos colaterais',
    ],
    expectationsByTier: {
      iniciante: [
        'Aplicar estilos simples e ajustar spacing sem quebrar layout.',
        'Entender seletores e cascade no basico.',
      ],
      basico: [
        'Usar flex e grid para layouts comuns com responsividade.',
        'Evitar !important e reduzir efeitos colaterais.',
      ],
      intermediario: [
        'Organizar CSS/SCSS com padrões (BEM/tokens) e consistencia.',
        'Trabalhar com temas e componentes reutilizaveis.',
        'Resolver issues de responsividade e cross-browser comuns.',
      ],
      avancado: [
        'Definir arquitetura de estilos (tokens, design system, components) para o time.',
        'Resolver layouts complexos com grid/flex sem hacks.',
        'Tratar performance (repaint, layout thrash) e manter CSS enxuto.',
        'Garantir acessibilidade visual (contraste, focus states).',
      ],
      senior: [
        'Guiar padrões de UI e consistencia visual em escala.',
        'Liderar refactors de CSS e reduzir regressões com abordagem sistematica.',
        'Elevar qualidade de UI/UX e DX do time.',
      ],
      especialista: [
        'Ser referencia em design systems e arquitetura de estilos para varios times.',
        'Resolver problemas raros de compatibilidade/performance visual em escala.',
        'Criar tooling e padrões para governar CSS em produtos grandes.',
        'Mentorar tecnicamente e elevar a maturidade de UI.',
      ],
    },
    commonTools: ['CSS Grid', 'Flexbox', 'BEM / Utility classes'],
    usedByCompanies: ['Qualquer produto web', 'E-commerces', 'SaaS', 'Apps'],
  },

  // Database
  'repo:sql-server': {
    tagline: 'Relational Database',
    meaningChecklist: [
      'Criar queries com joins e indices corretos',
      'Entender transacoes e locks',
      'Pensar em performance e modelagem',
    ],
    expectationsByTier: {
      iniciante: [
        'Escrever SELECTs simples e entender joins no basico.',
        'Conseguir rodar scripts com cuidado e validar resultados.',
      ],
      basico: [
        'Criar indices basicos e entender quando ajudam ou atrapalham.',
        'Entender transacoes no basico e evitar locks por erro.',
      ],
      intermediario: [
        'Interpretar execution plan para otimizar queries comuns.',
        'Trabalhar com transacoes, locks e isolamento com mais controle.',
        'Modelar tabelas e constraints pensando em integridade e manutencao.',
      ],
      avancado: [
        'Otimizar performance com dados (indexes, stats, plans, IO) e reduzir gargalos.',
        'Prevenir deadlocks e problemas de lock contention em cenarios reais.',
        'Planejar migrations com seguranca e janelas minimizadas.',
        'Definir padrões de queries e acesso a dados para o time.',
      ],
      senior: [
        'Definir estratégia de modelagem/performance e orientar o time em boas praticas.',
        'Garantir operacao (backup, restore, monitoramento) e confiabilidade.',
        'Liderar resolucao de incidentes envolvendo banco e performance.',
      ],
      especialista: [
        'Projetar HA/DR, replicacao e estrategias de escalabilidade quando necessario.',
        'Resolver casos extremos de performance (blocking, hot spots, planos instaveis).',
        'Definir governanca de dados (padroes, auditoria, seguranca, compliance).',
        'Mentorar tecnicamente e elevar maturidade de dados na organizacao.',
      ],
    },
    commonTools: ['SQL Profiler', 'SSMS', 'Execution plan'],
    usedByCompanies: ['Microsoft', 'Itaú', 'Santander', 'Totvs'],
  },
  'repo:postgresql': {
    tagline: 'Relational Database',
    meaningChecklist: [
      'Modelar dados e escrever SQL eficiente',
      'Entender indices, VACUUM e performance',
      'Gerir migracoes e backup com seguranca',
    ],
    expectationsByTier: {
      iniciante: [
        'Escrever queries simples e entender joins/where/order.',
        'Conseguir debugar erros comuns e validar dados retornados.',
      ],
      basico: [
        'Criar indices basicos e entender custo/beneficio.',
        'Entender transacoes e constraints no basico.',
      ],
      intermediario: [
        'Usar EXPLAIN/ANALYZE para melhorar queries e indices.',
        'Entender VACUUM/ANALYZE e impactos em performance.',
        'Gerir migracoes e backups com cuidado.',
      ],
      avancado: [
        'Otimizar consultas e modelagem por padroes de acesso (dados, indices, partitions se precisar).',
        'Prevenir locks e regressões de performance com observacao e teste.',
        'Definir estrategia de migracao segura (expand/contract quando aplicavel).',
        'Garantir operacao: backup/restore testado e monitoramento.',
      ],
      senior: [
        'Definir padrões de dados para o time (modelagem, migrations, performance).',
        'Liderar incidentes e melhorias de confiabilidade/performance.',
        'Orientar decisões de arquitetura envolvendo persistencia.',
      ],
      especialista: [
        'Projetar replicacao, HA/DR e estrategias de escalabilidade quando necessario.',
        'Resolver casos extremos (bloat, autovacuum, hotspots, planos) com profundidade.',
        'Definir governanca e plataforma de dados para varios times.',
        'Mentorar tecnicamente e elevar maturidade de dados na org.',
      ],
    },
    commonTools: ['psql', 'EXPLAIN', 'pgAdmin'],
    usedByCompanies: ['Instagram', 'GitLab', 'Spotify', 'Nubank'],
  },
  'repo:mysql': {
    tagline: 'Relational Database',
    meaningChecklist: [
      'Escrever SQL e modelar dados com cuidado',
      'Entender indices e performance',
      'Gerir replicacao e backup quando necessario',
    ],
    expectationsByTier: {
      iniciante: [
        'Escrever queries simples e entender joins no basico.',
        'Evitar scripts perigosos e validar resultados.',
      ],
      basico: [
        'Criar indices basicos e entender quando ajudam.',
        'Entender transacoes e constraints no basico.',
      ],
      intermediario: [
        'Usar EXPLAIN para otimizar queries e indices.',
        'Trabalhar com replicacao/backup no basico e entender riscos.',
        'Modelar dados pensando em integridade e manutencao.',
      ],
      avancado: [
        'Otimizar performance com dados (plans, indexes, IO) em cenarios reais.',
        'Planejar migrations com seguranca e minimizando downtime.',
        'Definir padrões de queries e acesso a dados para o time.',
        'Prevenir regressões com observacao e testes de carga quando aplicavel.',
      ],
      senior: [
        'Definir estrategia de dados (modelagem, performance, operacao) e orientar o time.',
        'Liderar incidentes e melhorias de confiabilidade/performance.',
        'Garantir rotinas de backup/restore e monitoramento.',
      ],
      especialista: [
        'Projetar HA/DR, replicacao e escalabilidade quando necessario.',
        'Resolver casos extremos de performance/locks e tuning avancado.',
        'Definir governanca de dados e elevar maturidade de varios times.',
        'Mentorar tecnicamente e elevar o ecossistema de dados.',
      ],
    },
    commonTools: ['MySQL Workbench', 'EXPLAIN', 'Percona Toolkit'],
    usedByCompanies: ['YouTube', 'Booking', 'Uber', 'Airbnb'],
  },
  'repo:mongodb': {
    tagline: 'Document Database',
    meaningChecklist: [
      'Modelar documentos e consultas por padroes de acesso',
      'Criar indices e evitar queries caras',
      'Entender consistencia e replicacao',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar colecoes e documentos simples e fazer CRUD basico.',
        'Entender filtros e projections no basico.',
      ],
      basico: [
        'Criar indices basicos e entender impacto em escrita/leitura.',
        'Modelar documentos com foco no uso real (evitar joins desnecessarios).',
      ],
      intermediario: [
        'Usar aggregation pipeline para consultas mais ricas.',
        'Evitar anti-patterns (documentos gigantes, queries sem indice).',
        'Entender replicacao e consistencia no suficiente para operar.',
      ],
      avancado: [
        'Desenhar schema por padroes de acesso e performance (read/write patterns).',
        'Resolver performance com dados (indexes, pipeline, cardinalidade).',
        'Planejar migrations e evolucao de schema com seguranca.',
        'Garantir operacao: backup/restore e monitoramento.',
      ],
      senior: [
        'Definir padrões de modelagem/operacao e orientar o time.',
        'Liderar incidentes e melhorias de confiabilidade/performance.',
        'Decidir quando usar MongoDB (e quando nao) com criterio.',
      ],
      especialista: [
        'Projetar sharding e escalabilidade quando necessario.',
        'Resolver casos extremos de performance/operacao com profundidade.',
        'Definir governanca e plataforma de dados para varios times.',
        'Mentorar tecnicamente e elevar maturidade de dados na org.',
      ],
    },
    commonTools: ['Mongo Compass', 'Aggregation pipeline', 'Indexes'],
    usedByCompanies: ['Adobe', 'eBay', 'Delivery apps', 'SaaS'],
  },
  'repo:redis': {
    tagline: 'In-memory Data Store',
    meaningChecklist: [
      'Usar cache e reduzir latencia',
      'Trabalhar com TTL, locks e filas simples',
      'Evitar inconsistencias e cache stampede',
    ],
    expectationsByTier: {
      iniciante: [
        'Usar Redis como cache simples com TTL.',
        'Entender chaves e valores e evitar dados sensiveis sem cuidado.',
      ],
      basico: [
        'Aplicar padrões de cache (cache-aside) e invalidacao simples.',
        'Usar locks simples quando necessario com cautela.',
      ],
      intermediario: [
        'Evitar stampede (locks, jitter, early refresh) e inconsistencias comuns.',
        'Trabalhar com estruturas (sets, hashes) e pub/sub no basico.',
        'Monitorar memoria e politicas de eviction.',
      ],
      avancado: [
        'Desenhar caching estratégico (o que cachear, TTLs, invalidacao) com dados.',
        'Resolver problemas de consistencia e concorrencia envolvendo cache.',
        'Planejar operacao (persistencia, backups quando aplicavel) e alertas.',
        'Usar padrões como rate limiting e distributed locks com maturidade.',
      ],
      senior: [
        'Definir padrões de cache para o time e evitar regressões de performance.',
        'Liderar incidentes de cache (eviction storms, latencia) e melhorias.',
        'Orientar tradeoffs entre cache, banco e consistencia.',
      ],
      especialista: [
        'Projetar cluster/HA e escalabilidade quando necessario.',
        'Resolver casos extremos (hot keys, memory fragmentation, failover).',
        'Criar plataforma/padrões para uso de cache em varios times.',
        'Mentorar tecnicamente e elevar maturidade de performance.',
      ],
    },
    commonTools: ['Redis CLI', 'TTL', 'Pub/Sub'],
    usedByCompanies: ['Twitter', 'GitHub', 'Stack Overflow', 'Shopify'],
  },
  'repo:elasticsearch': {
    tagline: 'Search and Analytics',
    meaningChecklist: [
      'Indexar documentos e pensar em relevancia',
      'Criar queries e agregacoes',
      'Cuidar de shards e performance',
    ],
    expectationsByTier: {
      iniciante: [
        'Indexar documentos e fazer buscas simples.',
        'Entender fields e filtros basicos.',
      ],
      basico: [
        'Criar queries com filtros e sort com consistencia.',
        'Entender analyzers no basico e evitar mappings ruins.',
      ],
      intermediario: [
        'Trabalhar com agregacoes e entender relevancia basica.',
        'Definir mappings e indices com foco no caso de uso.',
        'Monitorar performance e diagnosticar gargalos comuns.',
      ],
      avancado: [
        'Desenhar estratégia de indices/analyzers e relevancia com criterio.',
        'Planejar shards/replicas e ILM para performance e custo.',
        'Resolver performance com dados (slow logs, heap, GC) e ajustes.',
        'Garantir operacao: rollovers, backups/snapshots e alertas.',
      ],
      senior: [
        'Definir governanca de busca (mappings, relevancia, operacao) para o time.',
        'Liderar incidentes e evolucao de indices sem downtime.',
        'Orientar tradeoffs entre busca, banco e cache.',
      ],
      especialista: [
        'Projetar clusters grandes, multi-tenant e estrategias de escala.',
        'Resolver casos extremos de performance/heap/GC e estabilidade do cluster.',
        'Criar plataforma/padrões de search para varios times.',
        'Mentorar tecnicamente e elevar maturidade de busca/analytics.',
      ],
    },
    commonTools: ['Kibana', 'Mappings', 'ILM'],
    usedByCompanies: ['Wikipedia', 'GitHub', 'Uber', 'Netflix'],
  },

  // Cloud
  'repo:aws': {
    tagline: 'Cloud Platform',
    meaningChecklist: [
      'Escolher servicos e desenhar arquitetura cloud',
      'Entender IAM e seguranca basica',
      'Cuidar de custos, logs e monitoramento',
    ],
    expectationsByTier: {
      iniciante: [
        'Navegar no console com seguranca e entender recursos basicos.',
        'Seguir templates/padroes do time para criar recursos simples.',
      ],
      basico: [
        'Entender IAM no basico e evitar permissões amplas.',
        'Configurar logs/metricas basicos e diagnosticar falhas simples.',
      ],
      intermediario: [
        'Desenhar ambientes e integrar servicos com consistencia.',
        'Trabalhar com rede basica (VPC/subnets/security groups) com cuidado.',
        'Entender custos por componente e evitar desperdicio.',
      ],
      avancado: [
        'Definir arquitetura cloud (seguranca, rede, observabilidade) com tradeoffs claros.',
        'Planejar DR, backups e resiliencia de forma pragmatica.',
        'Automatizar infra/deploy e manter governanca (tags, policies).',
        'Resolver incidentes cloud com dados (logs, metrics, traces).',
      ],
      senior: [
        'Definir padroes de cloud para o time (seguranca, rede, observabilidade, finops).',
        'Liderar iniciativas de governanca (multi-account, landing zone).',
        'Orientar squads e revisar arquiteturas com criterio.',
      ],
      especialista: [
        'Projetar plataforma cloud em escala (multi-conta, multi-regiao) com governanca forte.',
        'Resolver casos extremos (rede, IAM, custo, performance) com profundidade.',
        'Definir estrategia de seguranca/finops e elevar maturidade da organizacao.',
        'Mentorar tecnicamente e acelerar varios times com padrões e tooling.',
      ],
    },
    commonTools: ['IAM', 'CloudWatch', 'VPC'],
    usedByCompanies: ['Netflix', 'Airbnb', 'Spotify', 'Slack'],
  },
  'repo:azure': {
    tagline: 'Cloud Platform',
    meaningChecklist: [
      'Rodar apps e servicos com governanca',
      'Trabalhar com redes, IAM e observabilidade',
      'Automatizar deploy e infraestrutura',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar recursos simples seguindo padrões e templates do time.',
        'Navegar no portal e entender conceitos basicos de recursos.',
      ],
      basico: [
        'Trabalhar com RBAC e identidades no basico com cuidado.',
        'Configurar logs/metricas basicos e diagnosticar falhas simples.',
      ],
      intermediario: [
        'Integrar servicos e redes com consistencia (VNets, subnets, NSGs).',
        'Automatizar deploy basico e entender custos por componente.',
        'Aplicar boas praticas de governanca (tags, policies) no dia a dia.',
      ],
      avancado: [
        'Definir arquitetura cloud com tradeoffs (seguranca, rede, observabilidade).',
        'Planejar resiliencia/DR e operacao com runbooks e alertas.',
        'Automatizar infra/deploy com consistencia e reduzir risco.',
        'Resolver incidentes complexos com dados e diagnostico estruturado.',
      ],
      senior: [
        'Definir padrões e governanca de cloud para o time/empresa.',
        'Liderar landing zone, identidades, redes e observabilidade em escala.',
        'Orientar squads e revisar arquiteturas com criterio.',
      ],
      especialista: [
        'Projetar plataforma Azure em escala (multi-tenant, multi-subscription) com governanca forte.',
        'Resolver casos extremos (rede, identidade, custo, performance) com profundidade.',
        'Definir estrategia corporativa de cloud e elevar maturidade do ecossistema.',
        'Mentorar tecnicamente e criar tooling/padroes para varios times.',
      ],
    },
    commonTools: ['Azure DevOps', 'App Service', 'Azure Monitor'],
    usedByCompanies: ['Microsoft', 'Adobe', 'Samsung', 'Dell'],
  },
  'repo:gcp': {
    tagline: 'Cloud Platform',
    meaningChecklist: [
      'Rodar workloads com seguranca e escala',
      'Trabalhar com IAM e redes',
      'Observabilidade e automacao de ambientes',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar recursos simples seguindo padrões do time.',
        'Navegar no console e entender projetos/recursos no basico.',
      ],
      basico: [
        'Trabalhar com IAM no basico e evitar permissões amplas.',
        'Configurar logs/metricas basicos e diagnosticar falhas simples.',
      ],
      intermediario: [
        'Integrar workloads e redes com consistencia.',
        'Automatizar deploy basico e entender custos por componente.',
        'Aplicar boas praticas de seguranca e observabilidade no dia a dia.',
      ],
      avancado: [
        'Definir arquitetura cloud com tradeoffs claros (seguranca, rede, observability).',
        'Planejar resiliencia/DR e operacao com alertas e runbooks.',
        'Automatizar infra/deploy e reduzir risco operacional.',
        'Resolver incidentes cloud com dados (logs, metrics, traces).',
      ],
      senior: [
        'Definir padrões e governanca de cloud para o time/empresa.',
        'Orientar squads e revisar arquiteturas com criterio.',
        'Liderar iniciativas de confiabilidade/custo/seguranca.',
      ],
      especialista: [
        'Projetar plataforma cloud em escala com governanca forte.',
        'Resolver casos extremos (rede, IAM, custo, performance) com profundidade.',
        'Criar padrões/tooling para varios times e elevar maturidade do ecossistema.',
        'Mentorar tecnicamente e guiar estrategia de cloud.',
      ],
    },
    commonTools: ['Cloud Logging', 'GKE', 'Cloud IAM'],
    usedByCompanies: ['Google', 'Spotify', 'Snap', 'Airbnb'],
  },
  'repo:cloudwatch': {
    tagline: 'Monitoring and Observability',
    meaningChecklist: [
      'Criar metricas, logs e alarmes relevantes',
      'Detectar incidentes cedo (SLO/SLI)',
      'Investigar e reduzir MTTR',
    ],
    expectationsByTier: {
      iniciante: [
        'Encontrar logs e entender erros basicos de aplicacao.',
        'Criar alarmes simples seguindo exemplos do time.',
      ],
      basico: [
        'Montar dashboards basicos e interpretar metricas comuns.',
        'Entender quando criar alertas e evitar ruído.',
      ],
      intermediario: [
        'Definir metricas/alarms relevantes para features criticas.',
        'Investigar incidentes usando logs e metricas com metodo.',
        'Trabalhar com correlação basica (request ids, traces quando existir).',
      ],
      avancado: [
        'Definir SLOs/SLIs e alertas acionaveis (menos ruído, mais sinal).',
        'Criar runbooks e reduzir MTTR com investigacao estruturada.',
        'Garantir observabilidade por default (dashboards, logs, retention, access).',
        'Ajudar times a instrumentar apps e medir o que importa.',
      ],
      senior: [
        'Definir padrões de observabilidade e governanca para o time.',
        'Liderar postmortems e melhorias de confiabilidade.',
        'Orientar squads a operarem com qualidade e previsibilidade.',
      ],
      especialista: [
        'Definir estrategia de observabilidade em escala (platform, standards, tooling).',
        'Resolver incidentes complexos e elevar maturidade operacional de varios times.',
        'Criar padrões e automacoes para instrumentacao/alerting.',
        'Mentorar tecnicamente e guiar cultura de SRE/operacao.',
      ],
    },
    commonTools: ['Dashboards', 'Alarms', 'Log Insights'],
    usedByCompanies: ['Times cloud-first', 'Fintechs', 'SaaS', 'E-commerce'],
  },
  'repo:serverless': {
    tagline: 'Functions and Event-driven',
    meaningChecklist: [
      'Modelar funcoes e eventos com confiabilidade',
      'Entender limites e cold start',
      'Monitorar e controlar custo por invocacao',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar funcoes simples e integrar com um gatilho basico.',
        'Entender logs e tratar erros basicos no handler.',
      ],
      basico: [
        'Trabalhar com eventos/payloads e validar entradas.',
        'Entender timeouts e limites comuns e evitar falhas obvias.',
      ],
      intermediario: [
        'Desenhar handlers idempotentes e tratar retries corretamente.',
        'Monitorar custo/latencia e entender cold start no dia a dia.',
        'Garantir observabilidade (logs/metricas) e diagnosticar falhas.',
      ],
      avancado: [
        'Desenhar arquitetura event-driven com governanca (contratos, retries, DLQ).',
        'Resolver performance/custo com dados (cold start, concurrency, batching).',
        'Garantir operacao (alertas, runbooks) e confiabilidade.',
        'Evitar armadilhas: duplicidade, ordering, poison messages.',
      ],
      senior: [
        'Definir padrões serverless para o time (templates, contracts, observability).',
        'Liderar incidentes e evolucao segura de arquitetura event-driven.',
        'Orientar squads em tradeoffs de custo/performance.',
      ],
      especialista: [
        'Projetar plataforma serverless em escala (multi-ambiente, governanca, DX).',
        'Resolver casos extremos (throttling, limits, cold starts severos) com profundidade.',
        'Criar tooling/padrões para self-service e elevar maturidade de varios times.',
        'Mentorar tecnicamente e guiar estrategia event-driven.',
      ],
    },
    commonTools: ['Lambda', 'API Gateway', 'EventBridge'],
    usedByCompanies: ['Coca-Cola', 'Nordstrom', 'Expedia', 'SaaS'],
  },

  // DevOps
  'repo:docker': {
    tagline: 'Container Platform',
    meaningChecklist: [
      'Containerizar aplicacoes com boas praticas',
      'Entender imagens, layers e build eficiente',
      'Rodar local e em pipelines com consistencia',
    ],
    expectationsByTier: {
      iniciante: [
        'Rodar containers localmente e entender imagens/containers no basico.',
        'Criar Dockerfile simples seguindo exemplos do time.',
      ],
      basico: [
        'Usar compose e configurar variaveis/volumes de forma segura.',
        'Evitar imagens gigantes e entender layers no basico.',
      ],
      intermediario: [
        'Escrever Dockerfiles multi-stage e melhorar cache de build.',
        'Configurar networking/volumes e diagnosticar problemas comuns.',
        'Integrar com CI/CD e garantir builds reproduziveis.',
      ],
      avancado: [
        'Tratar seguranca de imagem (least privilege, scan, secrets) com maturidade.',
        'Otimizar performance e tamanho de imagem com dados.',
        'Definir padroes de containers para o time (base images, guidelines).',
        'Resolver problemas dificeis de build/runtime (deps nativas, perms).',
      ],
      senior: [
        'Definir padroes de containerizacao e guiar revisoes/refactors.',
        'Liderar iniciativas de seguranca e confiabilidade em pipelines.',
        'Orientar squads e reduzir friccao operacional.',
      ],
      especialista: [
        'Criar plataforma/padroes de build para varios times (golden images, tooling).',
        'Resolver casos extremos de supply chain/seguranca e performance.',
        'Definir governanca e elevar maturidade de containers na org.',
        'Mentorar tecnicamente e elevar o ecossistema DevOps.',
      ],
    },
    commonTools: ['Dockerfile', 'Compose', 'Registries'],
    usedByCompanies: ['Google', 'Netflix', 'Spotify', 'Quase todo SaaS'],
  },
  'repo:kubernetes': {
    tagline: 'Container Orchestration',
    meaningChecklist: [
      'Publicar apps com deployments e services',
      'Entender config, secrets e escalabilidade',
      'Operar clusters com observabilidade e boas praticas',
    ],
    expectationsByTier: {
      iniciante: [
        'Aplicar manifests simples e entender pods/deployments no basico.',
        'Conseguir debugar problemas comuns (logs, describe) com ajuda.',
      ],
      basico: [
        'Trabalhar com services/ingress no basico e configurar env/configmap.',
        'Entender requests/limits e evitar derrubar o cluster por erro.',
      ],
      intermediario: [
        'Configurar readiness/liveness, autoscaling e rollouts com consistencia.',
        'Operar com observabilidade basica e diagnosticar incidentes comuns.',
        'Usar Helm e padronizar manifests do time.',
      ],
      avancado: [
        'Desenhar padroes de deploy (blue/green, canary) e reduzir risco.',
        'Tratar seguranca (RBAC, network policies, secrets) com maturidade.',
        'Resolver performance/custo (requests/limits, bin packing) com dados.',
        'Definir padrões e guiar operacao com SLOs/runbooks.',
      ],
      senior: [
        'Definir arquitetura de plataforma (namespaces, policies, observability) para o time.',
        'Liderar incidentes e melhorias de confiabilidade do cluster.',
        'Orientar squads e revisar workloads com criterio.',
      ],
      especialista: [
        'Projetar clusters em escala (multi-cluster, multi-regiao) e governanca forte.',
        'Resolver casos extremos (etcd, networking, scheduling) com profundidade.',
        'Criar plataforma self-service e acelerar varios times com padrões/tooling.',
        'Mentorar tecnicamente e elevar maturidade de plataforma.',
      ],
    },
    commonTools: ['kubectl', 'Helm', 'Ingress'],
    usedByCompanies: ['Google', 'Spotify', 'Airbnb', 'Nubank'],
  },
  'repo:terraform': {
    tagline: 'Infrastructure as Code',
    meaningChecklist: [
      'Versionar infraestrutura com modulos',
      'Trabalhar com estados e ambientes',
      'Evitar drift e manter governanca',
    ],
    expectationsByTier: {
      iniciante: [
        'Aplicar modulos simples e entender plan/apply no basico.',
        'Evitar mudar recursos criticos sem revisao.',
      ],
      basico: [
        'Organizar variaveis, outputs e ambientes com consistencia.',
        'Entender state no basico e trabalhar com backend remoto.',
      ],
      intermediario: [
        'Criar modulos reutilizaveis e padronizar recursos.',
        'Tratar dependencias e evitar drift com boas praticas.',
        'Integrar com pipelines e validar changes com cuidado.',
      ],
      avancado: [
        'Definir governanca de IaC (padroes, reviews, policies) para reduzir risco.',
        'Planejar mudanças sem downtime e com rollout seguro.',
        'Resolver problemas dificeis (state, drift, imports, refactors) com maturidade.',
        'Tratar seguranca e compliance via código (policies, least privilege).',
      ],
      senior: [
        'Definir plataforma IaC para o time (modulos oficiais, guidelines, CI).',
        'Liderar migrações e refactors grandes com confiabilidade.',
        'Orientar squads e revisar arquiteturas com criterio.',
      ],
      especialista: [
        'Criar plataforma self-service e padrões para varios times em escala.',
        'Resolver casos extremos (state conflicts, refactors gigantes, multi-account).',
        'Definir governanca corporativa de IaC e elevar maturidade da org.',
        'Mentorar tecnicamente e elevar o ecossistema de plataforma.',
      ],
    },
    commonTools: ['Modules', 'Workspaces', 'State backends'],
    usedByCompanies: ['HashiCorp users', 'Fintechs', 'SaaS', 'E-commerce'],
  },
  'repo:github-actions': {
    tagline: 'CI/CD Automation',
    meaningChecklist: [
      'Criar pipelines de build, test e deploy',
      'Trabalhar com secrets e ambientes',
      'Melhorar tempo de pipeline e confiabilidade',
    ],
    expectationsByTier: {
      iniciante: [
        'Executar workflows existentes e ajustar passos simples.',
        'Entender logs de pipeline e corrigir falhas basicas.',
      ],
      basico: [
        'Criar jobs simples com cache e artefatos.',
        'Trabalhar com secrets de forma segura.',
      ],
      intermediario: [
        'Organizar workflows (matrix, reuse) e melhorar tempo de build.',
        'Garantir qualidade (lint/test) e deploy com gates.',
        'Diagnosticar falhas intermitentes e melhorar confiabilidade.',
      ],
      avancado: [
        'Desenhar pipelines com segurança (OIDC, least privilege, secrets hygiene).',
        'Otimizar performance com dados (cache, parallelism, runners).',
        'Definir padrões de CI/CD para o time e reduzir friccao.',
        'Resolver problemas dificeis (flaky tests, artifacts, env drift).',
      ],
      senior: [
        'Definir plataforma de CI/CD para o time (templates, guidelines, governanca).',
        'Liderar melhorias de supply chain e confiabilidade.',
        'Orientar squads e manter consistencia de deploy.',
      ],
      especialista: [
        'Criar plataforma de pipelines em escala (runners, templates, observability).',
        'Resolver casos extremos de supply chain/seguranca e performance.',
        'Definir governanca corporativa de CI/CD e elevar maturidade da org.',
        'Mentorar tecnicamente e elevar ecossistema DevOps.',
      ],
    },
    commonTools: ['Workflows', 'Runners', 'Artifacts'],
    usedByCompanies: ['GitHub', 'Startups', 'SaaS', 'Open-source'],
  },
  'repo:gitlab-ci': {
    tagline: 'CI/CD Pipelines',
    meaningChecklist: [
      'Configurar stages e jobs com cache',
      'Gerir runners e secrets',
      'Automatizar deploy com seguranca',
    ],
    expectationsByTier: {
      iniciante: [
        'Executar pipelines existentes e ajustar passos simples.',
        'Entender logs de jobs e corrigir falhas basicas.',
      ],
      basico: [
        'Criar jobs simples com cache e artifacts.',
        'Trabalhar com variables/secrets com cuidado.',
      ],
      intermediario: [
        'Organizar stages e otimizar pipelines (cache, paralelismo) com consistencia.',
        'Garantir gates de qualidade e deploy com confiabilidade.',
        'Diagnosticar falhas intermitentes e melhorar estabilidade.',
      ],
      avancado: [
        'Desenhar pipelines seguros (permissions, secrets hygiene, runners).',
        'Definir padrões de CI/CD para o time e reduzir friccao.',
        'Otimizar performance com dados e resolver gargalos.',
        'Resolver problemas dificeis (runner capacity, flaky, env drift).',
      ],
      senior: [
        'Definir plataforma de CI/CD para o time (templates, guidelines, governanca).',
        'Liderar melhorias de confiabilidade e supply chain.',
        'Orientar squads e manter consistencia de deploy.',
      ],
      especialista: [
        'Criar plataforma de pipelines em escala (runners, templates, observability).',
        'Resolver casos extremos de seguranca/performance em CI/CD.',
        'Definir governanca corporativa e elevar maturidade da org.',
        'Mentorar tecnicamente e elevar o ecossistema DevOps.',
      ],
    },
    commonTools: ['.gitlab-ci.yml', 'Runners', 'Artifacts'],
    usedByCompanies: ['GitLab users', 'Enterprises', 'SaaS', 'E-commerce'],
  },
  'repo:linux': {
    tagline: 'Server Operating System',
    meaningChecklist: [
      'Navegar, diagnosticar e automatizar tarefas',
      'Entender processos, rede e permissoes',
      'Resolver incidentes basicos com logs e ferramentas',
    ],
    expectationsByTier: {
      iniciante: [
        'Navegar no terminal, arquivos e permissoes basicas.',
        'Rodar comandos simples para diagnosticar problemas.',
      ],
      basico: [
        'Entender processos e logs no basico (systemctl/journal).',
        'Trabalhar com rede basica e diagnosticar conectividade.',
      ],
      intermediario: [
        'Automatizar tarefas com shell e lidar com permissoes com seguranca.',
        'Diagnosticar incidentes comuns (CPU, memoria, disco) com metodo.',
        'Entender DNS/TLS no basico e evitar misconfigs comuns.',
      ],
      avancado: [
        'Resolver incidentes complexos (perf, IO, networking) com dados e ferramentas.',
        'Definir padrões de hardening e operacao (users, ssh, patching).',
        'Criar automacoes e runbooks para reduzir MTTR.',
        'Entender limites do sistema e tunar quando necessario.',
      ],
      senior: [
        'Definir padrões operacionais (SRE) e orientar times em produção.',
        'Liderar incidentes e melhorias de confiabilidade.',
        'Guiar decisões de plataforma e governanca operacional.',
      ],
      especialista: [
        'Aprofundar em kernel, networking e performance em casos extremos.',
        'Definir estrategia de plataforma operacional em escala.',
        'Criar tooling/padroes e elevar maturidade operacional de varios times.',
        'Mentorar tecnicamente e guiar cultura de operacao.',
      ],
    },
    commonTools: ['systemd', 'bash', 'netstat / ss'],
    usedByCompanies: ['Quase toda cloud', 'SaaS', 'Fintechs', 'E-commerce'],
  },
  'repo:nginx': {
    tagline: 'Reverse Proxy and Web Server',
    meaningChecklist: [
      'Configurar proxy, cache e headers',
      'Entender TLS e roteamento',
      'Ajudar performance e seguranca basica',
    ],
    expectationsByTier: {
      iniciante: [
        'Configurar proxy simples e entender server/location no basico.',
        'Evitar misconfigs obvias e validar com logs.',
      ],
      basico: [
        'Trabalhar com TLS basico e redirecionamentos.',
        'Configurar headers comuns e entender cache no basico.',
      ],
      intermediario: [
        'Configurar load balancing basico e health checks.',
        'Ajustar timeouts e buffers e diagnosticar problemas comuns.',
        'Trabalhar com logs e metricas para operar no dia a dia.',
      ],
      avancado: [
        'Resolver performance (cache, compressao, keep-alive) com dados.',
        'Endurecer seguranca (TLS, headers, rate limit) com maturidade.',
        'Definir padrões de roteamento/proxy para o time e reduzir incidentes.',
        'Diagnosticar problemas complexos (upstream, TLS, timeouts) com metodo.',
      ],
      senior: [
        'Definir arquitetura de edge/proxy e orientar squads em boas praticas.',
        'Liderar incidentes e melhorias de performance/seguranca.',
        'Garantir padroes e governanca do layer de entrada.',
      ],
      especialista: [
        'Projetar edge em escala (multi-regiao, alta disponibilidade, WAF) e governanca forte.',
        'Resolver casos extremos de performance/seguranca com profundidade.',
        'Criar padrões/tooling e elevar maturidade de edge/proxy na org.',
        'Mentorar tecnicamente e guiar estrategia de plataforma.',
      ],
    },
    commonTools: ['nginx.conf', 'TLS', 'Load balancing'],
    usedByCompanies: ['Netflix', 'Dropbox', 'WordPress.com', 'SaaS'],
  },

  // Mobile
  'repo:react-native': {
    tagline: 'Cross-platform Mobile',
    meaningChecklist: [
      'Criar telas e navegar entre fluxos',
      'Integrar com APIs e estado',
      'Cuidar de performance e build',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar telas simples e navegar entre rotas com orientacao.',
        'Consumir APIs e lidar com loading/erro no basico.',
      ],
      basico: [
        'Gerir estado e componentes com consistencia.',
        'Entender ciclo de build e debug no basico.',
      ],
      intermediario: [
        'Trabalhar com performance (renders, listas) e diagnosticar problemas comuns.',
        'Integrar libs nativas quando necessario com cuidado.',
        'Escrever testes basicos e evitar regressões.',
      ],
      avancado: [
        'Resolver performance com dados (profiling, memory, JSI quando aplicavel).',
        'Definir arquitetura de app (state, networking, offline) com consistencia.',
        'Garantir qualidade de release (crash-free, monitoring, rollbacks).',
        'Criar componentes reutilizaveis e padroes de UI.',
      ],
      senior: [
        'Definir padroes de mobile e orientar o time (arquitetura, qualidade, release).',
        'Liderar incidentes e melhorias de performance/estabilidade.',
        'Tomar decisões de tradeoffs entre nativo e cross-platform.',
      ],
      especialista: [
        'Resolver casos extremos (performance, builds, integrações nativas) em escala.',
        'Criar plataforma/tooling de mobile para varios times.',
        'Definir estrategia de releases, observability e qualidade em escala.',
        'Mentorar tecnicamente e elevar maturidade mobile na org.',
      ],
    },
    commonTools: ['Expo', 'React Navigation', 'Native modules'],
    usedByCompanies: ['Meta', 'Shopify', 'Discord', 'Uber Eats'],
  },
  'repo:flutter': {
    tagline: 'Cross-platform UI Toolkit',
    meaningChecklist: [
      'Criar UI reativa com widgets',
      'Gerir estado e rotas',
      'Integrar com APIs e publicar apps',
    ],
    expectationsByTier: {
      iniciante: [
        'Criar telas simples com widgets e navegar rotas basicas.',
        'Consumir APIs e lidar com loading/erro no basico.',
      ],
      basico: [
        'Gerir estado com um padrao simples (Provider/Bloc) com consistencia.',
        'Entender build/release no basico e debug com DevTools.',
      ],
      intermediario: [
        'Criar componentes reutilizaveis e manter consistencia visual.',
        'Tratar performance basica (listas, rebuilds) e evitar jank.',
        'Escrever testes basicos e evitar regressões.',
      ],
      avancado: [
        'Resolver performance com dados (profiling, frames, memory) e otimizar renders.',
        'Definir arquitetura de app (state, networking, cache/offline) com maturidade.',
        'Garantir qualidade de release (monitoring, crash-free, rollout).',
        'Criar design system e componentes de alto nivel.',
      ],
      senior: [
        'Definir padrões de mobile e orientar o time (arquitetura, qualidade, release).',
        'Liderar incidentes e melhorias de performance/estabilidade.',
        'Tomar decisões de tradeoffs (plugins, nativo, multiplataforma).',
      ],
      especialista: [
        'Resolver casos extremos de performance/builds e integrações em escala.',
        'Criar plataforma/tooling de mobile para varios times.',
        'Definir estrategia de releases e qualidade em escala.',
        'Mentorar tecnicamente e elevar maturidade mobile na org.',
      ],
    },
    commonTools: ['Dart', 'Provider / Bloc', 'Flutter DevTools'],
    usedByCompanies: ['Google', 'Nubank', 'Alibaba', 'BMW'],
  },
  'repo:kotlin': {
    tagline: 'JVM and Android Language',
    meaningChecklist: [
      'Escrever codigo idiomatico e seguro',
      'Trabalhar com coroutines e null safety',
      'Integrar com APIs e arquitetura mobile',
    ],
    expectationsByTier: {
      iniciante: [
        'Escrever codigo basico com null safety e colecoes.',
        'Entender coroutines no basico e evitar travar UI.',
      ],
      basico: [
        'Trabalhar com arquitetura mobile basica (layers) e testes simples.',
        'Tratar erros e concorrencia no basico com cuidado.',
      ],
      intermediario: [
        'Dominar coroutines/flows no uso real e evitar leaks.',
        'Escrever codigo testavel e manter padrao do time.',
        'Diagnosticar bugs complexos (threads, lifecycle) com metodo.',
      ],
      avancado: [
        'Definir padrões de arquitetura e governanca para o app.',
        'Resolver performance/estabilidade com dados (profiling, ANRs).',
        'Tratar concorrencia e cancelamento com maturidade.',
        'Criar libs/componentes reutilizaveis e elevar qualidade.',
      ],
      senior: [
        'Guiar decisões arquiteturais e orientar o time em boas praticas.',
        'Liderar incidentes e melhoria continua (crashes, ANRs, releases).',
        'Garantir consistencia e qualidade do ecossistema mobile.',
      ],
      especialista: [
        'Resolver casos extremos (performance, concorrencia, build) em escala.',
        'Criar plataforma/tooling de Android para varios times.',
        'Definir estrategia de qualidade/observability mobile em escala.',
        'Mentorar tecnicamente e elevar maturidade do ecossistema.',
      ],
    },
    commonTools: ['Coroutines', 'Ktor', 'Gradle'],
    usedByCompanies: ['Google', 'Pinterest', 'Trello', 'Basecamp'],
  },
  'repo:swift': {
    tagline: 'iOS Language',
    meaningChecklist: [
      'Criar apps iOS com boas praticas',
      'Trabalhar com concurrency e memoria',
      'Integrar com APIs e publicar na App Store',
    ],
    expectationsByTier: {
      iniciante: [
        'Escrever codigo basico e entender optionals no dia a dia.',
        'Criar telas simples e integrar com APIs no basico.',
      ],
      basico: [
        'Trabalhar com concurrency basica e evitar travar UI.',
        'Entender ciclo de build/release e debug no basico.',
      ],
      intermediario: [
        'Escrever codigo testavel e manter arquitetura consistente.',
        'Diagnosticar problemas comuns de memoria/performance.',
        'Integrar libs e recursos do iOS com cuidado.',
      ],
      avancado: [
        'Resolver performance/estabilidade com dados (Instruments, profiling).',
        'Definir padrões de arquitetura e componentes reutilizaveis.',
        'Tratar concorrencia e memoria com maturidade.',
        'Garantir qualidade de release (crash-free, monitoring, rollout).',
      ],
      senior: [
        'Guiar decisões arquiteturais e orientar o time em boas praticas iOS.',
        'Liderar incidentes e melhorias de qualidade/performance.',
        'Garantir consistencia do ecossistema de componentes do app.',
      ],
      especialista: [
        'Resolver casos extremos (performance, memoria, build) em escala.',
        'Criar plataforma/tooling iOS para varios times.',
        'Definir estrategia de releases e qualidade em escala.',
        'Mentorar tecnicamente e elevar maturidade mobile na org.',
      ],
    },
    commonTools: ['Xcode', 'SwiftUI / UIKit', 'Instruments'],
    usedByCompanies: ['Apple ecosystem', 'Uber', 'Airbnb', 'Spotify'],
  },
  'repo:android': {
    tagline: 'Android Platform',
    meaningChecklist: [
      'Entender ciclo de vida, permissao e componentes',
      'Criar telas e navegação com consistencia',
      'Diagnosticar crashes e performance',
    ],
    expectationsByTier: {
      iniciante: [
        'Entender activities/fragments e ciclo de vida no basico.',
        'Criar telas simples e navegar fluxos com orientacao.',
      ],
      basico: [
        'Trabalhar com permissoes, storage e recursos comuns com cuidado.',
        'Diagnosticar crashes simples e entender logs basicos.',
      ],
      intermediario: [
        'Aplicar arquitetura (MVVM, camadas) e testes basicos com consistencia.',
        'Resolver problemas comuns de lifecycle e concorrencia.',
        'Tratar performance basica (listas, rendering) e evitar jank.',
      ],
      avancado: [
        'Resolver performance/estabilidade com dados (profiling, ANR, memory).',
        'Definir padrões de arquitetura e componentes reutilizaveis.',
        'Garantir qualidade de release e observability mobile.',
        'Lidar com compatibilidade, devices e casos complexos.',
      ],
      senior: [
        'Definir padroes de Android e orientar o time (arquitetura, qualidade, release).',
        'Liderar incidentes e melhorias de crash-free/ANR.',
        'Tomar decisões de tradeoffs (libs, arquitetura, modularizacao).',
      ],
      especialista: [
        'Resolver casos extremos (builds, performance, devices) em escala.',
        'Criar plataforma/tooling de Android para varios times.',
        'Definir estrategia de releases e qualidade em escala.',
        'Mentorar tecnicamente e elevar maturidade mobile.',
      ],
    },
    commonTools: ['Android Studio', 'Jetpack', 'Gradle'],
    usedByCompanies: ['Google', 'Uber', 'Spotify', 'Nubank'],
  },
  'repo:ios': {
    tagline: 'iOS Platform',
    meaningChecklist: [
      'Entender ciclo de vida e arquitetura de app',
      'Criar UI e interacoes com qualidade',
      'Diagnosticar performance e memoria',
    ],
    expectationsByTier: {
      iniciante: [
        'Entender ciclo de vida e criar telas simples com orientacao.',
        'Integrar com APIs e tratar estados basicos de UI.',
      ],
      basico: [
        'Trabalhar com navegacao, permissoes e recursos comuns com cuidado.',
        'Diagnosticar crashes simples e entender logs basicos.',
      ],
      intermediario: [
        'Aplicar arquitetura (camadas) e testes basicos com consistencia.',
        'Resolver problemas comuns de performance/memoria.',
        'Garantir UX consistente e acessibilidade basica.',
      ],
      avancado: [
        'Resolver performance/estabilidade com dados (Instruments, profiling).',
        'Definir padrões de arquitetura e componentes reutilizaveis.',
        'Garantir qualidade de release e observability mobile.',
        'Lidar com compatibilidade e casos complexos de UI/interacao.',
      ],
      senior: [
        'Definir padroes de iOS e orientar o time (arquitetura, qualidade, release).',
        'Liderar incidentes e melhorias de crash-free/performance.',
        'Tomar decisões de tradeoffs (SwiftUI/UIKit, modularizacao).',
      ],
      especialista: [
        'Resolver casos extremos (performance, memoria, builds) em escala.',
        'Criar plataforma/tooling iOS para varios times.',
        'Definir estrategia de releases e qualidade em escala.',
        'Mentorar tecnicamente e elevar maturidade mobile.',
      ],
    },
    commonTools: ['Xcode', 'SwiftUI / UIKit', 'Instruments'],
    usedByCompanies: ['Apple ecosystem', 'Uber', 'Airbnb', 'Spotify'],
  },
};
