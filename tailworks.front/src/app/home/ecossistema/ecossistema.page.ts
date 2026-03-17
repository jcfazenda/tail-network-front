import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-ecossistema-page',
  imports: [CommonModule],
  templateUrl: './ecossistema.page.html',
  styleUrls: ['./ecossistema.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EcossistemaPage {}
