import { Routes } from '@angular/router';
import { StubPage } from './stub/stub.page';

export const routes: Routes = [
  { path: '', redirectTo: 'vagas', pathMatch: 'full' },
  { path: 'vagas', component: StubPage, data: { title: 'Minhas Vagas' } },
  { path: 'radar', component: StubPage, data: { title: 'Radar' } },
  { path: 'talentos', component: StubPage, data: { title: 'Talentos' } },
  { path: 'propostas', component: StubPage, data: { title: 'Propostas' } },
  { path: '**', redirectTo: 'vagas' },
];
