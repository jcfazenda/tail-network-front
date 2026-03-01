import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type RadarStageKey = 'active' | 'evolution' | 'conversation';

export type RadarStage = {
  key: RadarStageKey;
  title: string;
  talents: number;
  percent: number;
  metricLabel: string;
  growth: number;
  icons: string;
  tone: 'green' | 'amber' | 'blue';
};

@Component({
  selector: 'recruiter-radar-flow',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radar-flow.component.html',
  styleUrls: ['./radar-flow.component.scss'],
})
export class RadarFlowComponent {
  @Input() stages: RadarStage[] = [];
  @Output() stageClick = new EventEmitter<RadarStageKey>();
}

