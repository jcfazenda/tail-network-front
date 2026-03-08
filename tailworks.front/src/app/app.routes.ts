import { Routes } from '@angular/router';
import { StubPage } from './stub/stub.page';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
    data: { title: 'Login' },
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
    data: { title: 'Principal' },
  },
  { path: 'usuario', redirectTo: 'usuario/ecossistema', pathMatch: 'full' },
  {
    path: 'usuario/ecossistema',
    loadComponent: () => import('./usuario/home/home.page').then((m) => m.HomePage),
    data: { title: 'Ecossistema' },
  },
  {
    path: 'usuario/dados-cadastrais',
    loadComponent: () => import('./usuario/dados-cadastrais/dados-cadastrais.page').then((m) => m.DadosCadastraisPage),
    data: { title: 'Dados Cadastrais' },
  },
  {
    path: 'usuario/dados-cadastrais/stacks',
    loadComponent: () => import('./usuario/stacks/stacks.page').then((m) => m.StacksPage),
    data: { title: 'Suas Stacks' },
  },
  {
    path: 'usuario/dados-cadastrais/experiencia',
    loadComponent: () => import('./usuario/experiencia/experiencia.page').then((m) => m.ExperienciaPage),
    data: { title: 'Experiência' },
  },
  {
    path: 'usuario/dados-cadastrais/formacao',
    loadComponent: () => import('./usuario/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
    data: { title: 'Formação' },
  },
  {
    path: 'usuario/minhas-candidaturas',
    loadComponent: () => import('./usuario/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
    data: { title: 'Minhas Candidaturas' },
  },
  {
    path: 'vagas/cadastro',
    loadComponent: () => import('./vagas/cadastro/cadastro.page').then((m) => m.CadastroPage),
    data: { title: 'Abrir Vaga' },
  },
  { path: 'vagas', component: StubPage, data: { title: 'Minhas Vagas' } },
  { path: 'radar', component: StubPage, data: { title: 'Radar' } },
  { path: 'talentos', component: StubPage, data: { title: 'Talentos' } },
  { path: 'propostas', component: StubPage, data: { title: 'Propostas' } },
  { path: '**', redirectTo: 'login' },
];
