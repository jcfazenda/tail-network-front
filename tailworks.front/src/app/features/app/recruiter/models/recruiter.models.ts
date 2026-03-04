export type ChatMsg = {
  id?: string;
  from?: 'me' | 'candidate' | 'recruiter';
  text: string;
  time?: string;
};

// Placeholders to keep compilation while recruiter module is being rebuilt
export type RecruiterTalent = any;
export type RecruiterJob = any;
