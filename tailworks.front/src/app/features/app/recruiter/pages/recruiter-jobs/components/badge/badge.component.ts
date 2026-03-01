import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

type BadgeTone = 'green' | 'amber' | 'red' | 'blue';

@Component({
  selector: 'recruiter-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
})
export class BadgeComponent {
  @Input() label = '';
  @Input() tone: BadgeTone = 'green';
}

