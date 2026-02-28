import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { RecruiterJob, RecruiterTalent } from '../../models/recruiter.models';
import { RecruiterMockService } from '../../../services/recruiter-mock.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recruiter-talents.page.html',
  styleUrls: ['./recruiter-talents.page.scss'],
})
export class RecruiterTalentsPage implements OnInit {
  talents: RecruiterTalent[] = [];
  jobs: RecruiterJob[] = [];

  query = '';
  local = '';
  minAderencia = 0;
  selectedJobId = '';

  constructor(private readonly recruiterMock: RecruiterMockService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.jobs = this.recruiterMock.getOpenJobs();
    this.talents = this.recruiterMock.getTalents({
      query: this.query,
      local: this.local,
      minAderencia: this.minAderencia,
    });
    if (!this.selectedJobId && this.jobs.length) {
      this.selectedJobId = this.jobs[0].id;
    }
  }

  inviteTalent(talent: RecruiterTalent): void {
    if (!this.selectedJobId) return;
    this.recruiterMock.inviteTalentToJob(talent.id, this.selectedJobId);
    this.reload();
  }

  startHiringRequest(talent: RecruiterTalent): void {
    this.recruiterMock.startHiringRequest(talent.id, this.selectedJobId || undefined);
    this.reload();
  }

  trendLabel(t: RecruiterTalent): string {
    if (t.tendencia === 'up') return 'Subindo';
    if (t.tendencia === 'down') return 'Caindo';
    return 'Estável';
  }

  trackByTalentId(_: number, talent: RecruiterTalent): string {
    return talent.id;
  }
}
