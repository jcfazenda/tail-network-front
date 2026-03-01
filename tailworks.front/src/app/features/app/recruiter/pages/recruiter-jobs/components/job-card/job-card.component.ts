import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { AvatarItem, AvatarStackComponent } from '../avatar-stack/avatar-stack.component';
import { BadgeComponent } from '../badge/badge.component';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'recruiter-job-card',
  standalone: true,
  imports: [CommonModule, BadgeComponent, ProgressBarComponent, AvatarStackComponent],
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.scss'],
})
export class JobCardComponent {
  @Input() title = '';
  @Input() company = '';
  @Input() location = '';
  @Input() modeLabel = '';
  @Input() minFit = 0;
  @Input() statusLabel = '';
  @Input() statusTone: 'green' | 'amber' | 'red' = 'green';
  @Input() jobCode = '';
  @Input() jobModel = '';
  @Input() department = '';
  @Input() candidatesCount = 0;
  @Input() inProcessCount = 0;
  @Input() trendPercent = 0;
  @Input() signalLabel = '';
  @Input() avatars: AvatarItem[] = [];
  @Input() avatarExtraCount = 0;
  @Output() showTalents = new EventEmitter<void>();
}
