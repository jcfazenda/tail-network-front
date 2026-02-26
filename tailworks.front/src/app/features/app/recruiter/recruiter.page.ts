import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecruiterChatDrawerComponent } from './components/recruiter-chat-drawer/recruiter-chat-drawer.component';

import { RecruiterJob, RecruiterTalent, JobStatus } from './models/recruiter.models'; 
import { RecruiterMockService } from '../services/recruiter-mock.service';

type SortBy = 'newest' | 'applicants' | 'title';

type JobForm = {
  id?: string;
  title: string;
  department: string;
  location: string;
  type: string;
  status: JobStatus;
};

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, RecruiterChatDrawerComponent],
  templateUrl: './recruiter.page.html',
  styleUrls: ['./recruiter.page.scss'],
})
export class RecruiterPage {

  /* ========================================
     UI / FALLBACKS
  ======================================== */
  avatarFallbackUrl = 'assets/tail-avatar.png';

  /* ========================================
     DATA (VEM DO SERVICE)
  ======================================== */
  jobs: RecruiterJob[] = [];

  constructor(private mock: RecruiterMockService) {
    this.jobs = this.mock.getJobsTalents();
  }

  /* ========================================
     TOOLBAR STATE
  ======================================== */
  q = '';
  statusFilter: JobStatus | 'all' = 'all';
  sortBy: SortBy = 'newest';

  /* ========================================
     MODAL STATE
  ======================================== */
  isModalOpen = false;
  modalMode: 'create' | 'edit' = 'create';
  form: JobForm = this.getEmptyForm();

  /* ========================================
     CHAT STATE (PASSA PARA COMPONENTE)
  ======================================== */
  isChatOpen = false;
  chatJob: RecruiterJob | null = null;
  chatTalents: RecruiterTalent[] = [];

  /* ========================================
     KPIs
  ======================================== */
  get activeJobs(): number {
    return this.jobs.filter(j => j.status === 'aberta').length;
  }

  get closedJobs(): number {
    return this.jobs.filter(j => j.status === 'encerrada').length;
  }

  get totalApplicants(): number {
    return this.jobs.reduce((acc, j) => acc + (j.talents?.length ?? 0), 0);
  }

  getApplicantsCount(job: RecruiterJob): number {
    return job.talents?.length ?? 0;
  }

  /* ========================================
     FILTERED LIST
  ======================================== */
  get filteredJobs(): RecruiterJob[] {
    const query = this.normalize(this.q);
    let list = [...this.jobs];

    if (this.statusFilter !== 'all') {
      list = list.filter(j => j.status === this.statusFilter);
    }

    if (query) {
      list = list.filter(j => {
        const hay = this.normalize(`${j.title} ${j.department} ${j.location} ${j.type}`);
        return hay.includes(query);
      });
    }

    if (this.sortBy === 'newest') {
      list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    } else if (this.sortBy === 'applicants') {
      list.sort((a, b) => this.getApplicantsCount(b) - this.getApplicantsCount(a));
    } else {
      list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
    }

    return list;
  }

  private normalize(v: string): string {
    return (v ?? '').trim().toLowerCase();
  }

  setStatusFilter(v: JobStatus | 'all'): void {
    this.statusFilter = v;
  }

  formatJobDisplayId(jobId: string): string {
    const digits = String(jobId ?? '').replace(/\D/g, '');
    const normalized = digits.slice(-5);
    return normalized.padStart(5, '0');
  }

  /* ========================================
     ACTIONS (CRUD)
  ======================================== */
  openCreateModal(): void {
    this.modalMode = 'create';
    this.form = this.getEmptyForm();
    this.isModalOpen = true;
  }

  openEditModal(job: RecruiterJob): void {
    this.modalMode = 'edit';
    this.form = {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      status: job.status,
    };
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  saveModal(): void {
    const title = (this.form.title ?? '').trim();
    if (!title) return;

    if (this.modalMode === 'create') {
      const newId = `job-${String(Date.now())}`;

      const newJob: RecruiterJob = {
        id: newId,
        title,
        department: (this.form.department ?? '').trim(),
        location: (this.form.location ?? '').trim(),
        type: (this.form.type ?? '').trim(),
        status: this.form.status ?? 'aberta',
        createdAt: new Date().toISOString(),
        talents: [], // começa vazio (como banco)
      };

      this.jobs = [newJob, ...this.jobs];
      this.closeModal();
      return;
    }

    const id = this.form.id;
    if (!id) return;

    this.jobs = this.jobs.map(j => {
      if (j.id !== id) return j;

      return {
        ...j,
        title,
        department: (this.form.department ?? '').trim(),
        location: (this.form.location ?? '').trim(),
        type: (this.form.type ?? '').trim(),
        status: this.form.status ?? j.status,
      };
    });

    this.closeModal();
  }

  viewApplicants(job: RecruiterJob): void {
    console.log('Ver candidatos da vaga', job.id, job.talents?.length ?? 0);
  }

  /* ========================================
     CHAT ACTIONS
  ======================================== */
  toggleChat(job: RecruiterJob): void {
    if (this.isChatOpen && this.chatJob?.id === job.id) {
      this.closeChat();
      return;
    }

    this.chatJob = job;
    this.chatTalents = job.talents ?? [];
    this.isChatOpen = true;
  }

  closeChat(): void {
    this.isChatOpen = false;
    this.chatJob = null;
    this.chatTalents = [];
  }

  private getEmptyForm(): JobForm {
    return {
      title: '',
      department: '',
      location: '',
      type: '',
      status: 'aberta',
    };
  }

  /* ========================================
     TRACK BY
  ======================================== */
  trackByJobId(_: number, job: RecruiterJob): string {
    return job.id;
  }

  trackByTalentId(_: number, t: RecruiterTalent): string {
    return t.id;
  }

  refresh(): void {
  console.log('Refresh acionado');
}
}
