import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './core/layout/public-layout/public-layout.component'; 
import { ShellComponent } from './core/layout/shell.component';
import { authGuard } from './core/auth/auth.guard';
import { AppLayoutComponent } from './core/layout/app-layout/app-layout.component';
import { DashboardPage } from './features/app/recruiter/pages/dashboard/dashboard.page';
import { VagasPage } from './features/app/recruiter/pages/vagas/vagas.page';
import { RadarPage } from './features/app/recruiter/pages/radar/radar.page';
import { MensagensPage } from './features/app/recruiter/pages/mensagens/mensagens.page';
import { EquipePage } from './features/app/recruiter/pages/equipe/equipe.page';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'home', redirectTo: 'login', pathMatch: 'full' },
 
      {
        path: 'talent',
        loadComponent: () =>
          import('./features/app/talent/talent.page').then(m => m.TalentPage),
      },
 
      {
        path: 'login',
        loadComponent: () =>
          import('./features/public/login/login.page').then(m => m.LoginPage),
      },

      /* Recruiter (envólucro: PublicLayout -> AppLayout -> páginas) */
      {
        path: 'recruiter',
        component: AppLayoutComponent,
        canActivate: [authGuard],
        children: [
          { path: '', component: DashboardPage },
          { path: 'dashboard', component: DashboardPage },
          { path: 'vagas', component: VagasPage },
          { path: 'radar', component: RadarPage },
          { path: 'mensagens', component: MensagensPage },
          { path: 'equipe', component: EquipePage },
          { path: 'talentos', component: EquipePage },
        ],
      },
    ],
  }, 

  { path: '**', redirectTo: '/login' },
];
