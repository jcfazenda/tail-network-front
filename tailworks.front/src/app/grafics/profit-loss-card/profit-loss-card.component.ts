import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-profit-loss-card',
  templateUrl: './profit-loss-card.component.html',
  styleUrls: ['./profit-loss-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfitLossCardComponent {}
