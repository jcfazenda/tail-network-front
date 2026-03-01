import { Routes } from '@angular/router';

import { PublicLayoutComponent } from './core/layout/public-layout.component';
import { RecruitLayoutComponent } from './core/layout/recruit-layout.component';
import { ShellComponent } from './core/layout/shell.component';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/public/entry.page').then(m => m.EntryPage),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/public/home.page').then(m => m.HomePage),
      },

      {
        path: 'recruiter',
        component: RecruitLayoutComponent,
        canActivate: [authGuard],
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full',
          },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/app/recruiter/pages/recruiter-dashboard/recruiter-dashboard.page').then(m => m.RecruiterDashboardPage),
          },
          {
            path: 'vagas',
            loadComponent: () =>
              import('./features/app/recruiter/pages/recruiter-jobs/recruiter-jobs.page').then(m => m.RecruiterJobsPage),
          },
          {
            path: 'talentos',
            loadComponent: () =>
              import('./features/app/recruiter/pages/recruiter-talents/recruiter-talents.page').then(m => m.RecruiterTalentsPage),
          },
        ],
      },
      {
        path: 'talent',
        loadComponent: () =>
          import('./features/app/talent/talent.page').then(m => m.TalentPage),
      },
      {
        path: 'choose',
        loadComponent: () =>
          import('./features/public/choose-role.page').then(m => m.ChooseRolePage),
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/public/login.page').then(m => m.LoginPage),
      },
    ],
  },

  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/app/dashboard.page').then(m => m.DashboardPage),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];
