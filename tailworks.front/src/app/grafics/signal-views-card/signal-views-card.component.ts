import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-signal-views-card',
  templateUrl: './signal-views-card.component.html',
  styleUrls: ['./signal-views-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalViewsCardComponent {
  @Input() label = 'Views';
  @Input() value = '12.7K';
  @Input() delta = '+ 2.6%';
  @Input() meta = 'vs prev. day';
}
