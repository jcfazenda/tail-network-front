import { Injectable } from '@angular/core'; 
import { RecruiterJob } from '../recruiter/models/recruiter.models';

/* ========================================
   MOCK SERVICE (SIMULA BANCO)
======================================== */
@Injectable({ providedIn: 'root' })
export class RecruiterMockService {

  /* ========================================
     GET JOBS + TALENTS
     (no futuro vira HttpClient)
  ======================================== */
  getJobsTalents(): RecruiterJob[] {
    
    return [
      {
        id: 'job-001',
        title: 'Desenvolvedor .NET Sênior',
        description: 'Atuação em APIs e microsserviços com foco em performance, arquitetura e evolução de produto.',
        department: 'Tecnologia',
        location: 'Rio de Janeiro',
        type: 'Remoto',
        status: 'aberta',
        createdAt: '2026-02-22T18:00:00Z',
        talents: [
          {
            id: 't1',
            name: 'Ana Martins',
            avatarUrl: 'assets/tail-avatar.png',
            lastSeen: 'hoje • 16:40',
            unreadCount: 2,
            lastMessage: 'Posso fazer remoto 100%?',
            messages: [],
          },
          {
            id: 't2',
            name: 'João Pedro',
            avatarUrl: 'assets/tail-avatar-femea.png',
            lastSeen: 'ontem • 21:10',
            unreadCount: 0,
            lastMessage: 'Tenho portfólio, quer que eu envie?',
            messages: [],
          },
          {
            id: 't3',
            name: 'Julio Fazenda',
            avatarUrl: 'assets/avatar-julio.jpeg',
            lastSeen: 'hoje • 09:12',
            unreadCount: 1,
            lastMessage: 'Perfeito, obrigado!',
            messages: [],
          },
        ],
      },

      {
        id: 'job-002',
        title: 'UX Designer',
        description: 'Responsável por fluxos de produto, protótipos e melhorias de experiência em jornadas críticas.',
        department: 'Produto',
        location: 'São Paulo',
        type: 'Híbrido',
        status: 'pausada',
        createdAt: '2026-02-20T18:00:00Z',
        talents: [
          {
            id: 't4',
            name: 'Bruna Lima',
            avatarUrl: 'assets/tail-avatar.png',
            lastSeen: 'hoje • 11:02',
            unreadCount: 0,
            lastMessage: 'Enviei meu CV.',
            messages: [],
          },
        ],
      },

      {
        id: 'job-003',
        title: 'Dev Angular Pleno',
        description: 'Manutenção e evolução de front-end web com componentes reutilizáveis e integração com APIs.',
        department: 'Tecnologia',
        location: 'Remoto',
        type: 'CLT',
        status: 'encerrada',
        createdAt: '2026-02-10T18:00:00Z',
        talents: [],
      },
    ];
  }
}
