import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from '../ui/theme.service';

@Component({
  selector: 'tw-recruit-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './recruit-layout.component.html',
  styleUrls: ['./recruit-layout.component.scss'],
})
export class RecruitLayoutComponent implements OnInit {
  theme = inject(ThemeService);

  ngOnInit(): void {
    this.theme.init();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }
}
