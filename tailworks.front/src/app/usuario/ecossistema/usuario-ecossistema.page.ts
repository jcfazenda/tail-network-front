import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PanelCandidatosListComponent } from '../../panel-candidatos/panel-candidatos-list.component';
import { ProfitLossCardComponent } from '../../grafics/profit-loss-card/profit-loss-card.component';
import { EcossistemaPage } from '../../home/ecossistema/ecossistema.page';

@Component({
  standalone: true,
  selector: 'app-usuario-ecossistema-page',
  imports: [CommonModule, PanelCandidatosListComponent, ProfitLossCardComponent],
  templateUrl: './usuario-ecossistema.page.html',
  styleUrl: './usuario-ecossistema.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioEcossistemaPage extends EcossistemaPage {}
