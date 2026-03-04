import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

type Point = { x: number; y: number };

@Component({
  selector: 'tw-temperature-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './temperature-chart.component.html',
  styleUrls: ['./temperature-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChartComponent {
  @Input() values: number[] = [72, 74, 76, 78, 81, 83, 85];

  readonly w = 240;
  readonly h = 80;
  readonly pad = 10;

  private toPoints(vals: number[]): Point[] {
    if (!vals?.length) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = Math.max(1, max - min);
    const innerW = this.w - this.pad * 2;
    const innerH = this.h - this.pad * 2;
    return vals.map((v, i) => {
      const x = this.pad + (i * innerW) / Math.max(1, vals.length - 1);
      const y = this.pad + (1 - (v - min) / span) * innerH;
      return { x, y };
    });
  }

  get points(): Point[] {
    return this.toPoints(this.values);
  }

  get linePath(): string {
    if (!this.points.length) return '';
    return this.points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ');
  }

  get areaPath(): string {
    if (!this.points.length) return '';
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    const floorY = (this.h - this.pad).toFixed(2);
    return `${this.linePath} L ${last.x.toFixed(2)} ${floorY} L ${first.x.toFixed(2)} ${floorY} Z`;
  }

  get lastPoint(): Point | null {
    if (!this.points.length) return null;
    return this.points[this.points.length - 1];
  }
}
