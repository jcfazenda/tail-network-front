import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'tw-radar-ativo-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radar-ativo-card.component.html',
  styleUrls: ['./radar-ativo-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadarAtivoCardComponent {
  // topo
  @Input() statusLabel = 'Em Evolução';
  @Input() percent = 82;

  // indicadores
  @Input() weeklyDelta = 4;      // "+4% esta semana"
  @Input() weeklyTrend = 4;      // "4% à semana" (texto do meio)
  @Input() recentApplications = 18;

  get recentDaysLabels(): string[] {
    const base = new Date();
    const result: string[] = [];

    for (let i = 2; i >= 0; i -= 1) {
      const d = new Date(base);
      d.setDate(base.getDate() - i);
      const label = d
        .toLocaleDateString('pt-BR', { weekday: 'short' })
        .replace('.', '')
        .trim();
      result.push(label.charAt(0).toUpperCase() + label.slice(1, 3).toLowerCase());
    }

    return result;
  }
}
