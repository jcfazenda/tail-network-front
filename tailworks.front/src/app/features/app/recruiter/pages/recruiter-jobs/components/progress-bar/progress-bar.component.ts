import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type ProgressTone = 'green' | 'amber' | 'blue' | 'red';

@Component({
  selector: 'recruiter-progress-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss'],
})
export class ProgressBarComponent {
  @Input() value = 0;
  @Input() tone: ProgressTone = 'green';
}

