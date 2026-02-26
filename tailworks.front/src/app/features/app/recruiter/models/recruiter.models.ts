/* ========================================
   RECRUITER DOMAIN MODELS (SIMPLE)
======================================== */

export type JobStatus = 'aberta' | 'pausada' | 'encerrada';

/* ========================================
   CHAT MESSAGE
======================================== */
export type ChatMsg = {
  id: string;
  from: 'me' | 'candidate';
  text: string;
  time: string;        // "HH:mm" por enquanto
  createdAt?: string;  // futuro: ISO real
};

/* ========================================
   TALENT (CANDIDATO)
======================================== */
export type RecruiterTalent = {
  id: string;
  name: string;

  avatarUrl?: string;  // opcional (fallback Tail)
  lastSeen: string;
  lastMessage: string;
  unreadCount: number;

  messages: ChatMsg[];
};

/* ========================================
   JOB (VAGA)
======================================== */
export type RecruiterJob = {
  id: string;
  title: string;
  description?: string;
  department: string;
  location: string;
  type: string;

  status: JobStatus;
  createdAt: string; // ISO

  // 🔥 fonte da verdade do "quantos candidatos"
  talents: RecruiterTalent[];
};
