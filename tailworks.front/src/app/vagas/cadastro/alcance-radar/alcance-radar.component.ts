import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type RadarLegendTone = 'high' | 'medium' | 'potential';

export interface RadarLegendItem {
  label: string;
  tone: RadarLegendTone;
  percent?: number;
  detail?: string;
  count?: number;
}

@Component({
  standalone: true,
  selector: 'app-alcance-radar',
  imports: [CommonModule],
  templateUrl: './alcance-radar.component.html',
  styleUrls: ['./alcance-radar.component.scss'],
  host: {
    '[class.radar-overview-host--embedded]': 'embedded',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlcanceRadarComponent {
  private static nextGaugeId = 0;

  readonly gaugeRadius = 42;
  readonly gaugeCircumference = 2 * Math.PI * this.gaugeRadius;
  readonly gaugeGradientId = `radar-gauge-gradient-${AlcanceRadarComponent.nextGaugeId++}`;

  @Input() title = 'Alcance do radar';
  @Input() score = 89;
  @Input() showGaugeLabel = true;
  @Input() gaugeLabel = 'Aderencia';
  @Input() embedded = false;
  @Input() items: RadarLegendItem[] = [
    { label: 'Alta compatibilidade', tone: 'high', percent: 76 },
    { label: 'Media de Compatibilidade', tone: 'medium', detail: '(60-85%)' },
    { label: 'Potenciais', tone: 'potential', count: 97 },
  ];

  get safeScore(): number {
    return Math.min(100, Math.max(0, this.score));
  }

  get gaugeDashOffset(): number {
    return this.gaugeCircumference * (1 - this.safeScore / 100);
  }
}
