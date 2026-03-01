import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'recruiter-top-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss'],
})
export class TopNavComponent {
  @Input() filterCount = 0;
  @Output() filtersClick = new EventEmitter<void>();
  @Output() createClick = new EventEmitter<void>();
}

