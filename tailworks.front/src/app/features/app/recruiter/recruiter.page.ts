import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RecruiterDashboardData, RecruiterJob } from './models/recruiter.models';
import { RecruiterMockService } from '../services/recruiter-mock.service';

@Component({
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recruiter.page.html',
  styleUrls: ['./recruiter.page.scss'],
})
export class RecruiterPage implements OnInit {
  dashboard: RecruiterDashboardData | null = null;

  constructor(private readonly recruiterMock: RecruiterMockService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.dashboard = this.recruiterMock.getDashboardData();
  }

  trackByJobId(_: number, job: RecruiterJob): string {
    return job.id;
  }
}
