import { Routes } from '@angular/router';
import { StubPage } from './stub/stub.page';
import { recruiterAuthGuard, recruiterManageDirectoryGuard, recruiterMasterGuard, talentAuthGuard } from './auth/auth.guards';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
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
  {
    path: 'home/ecossistema',
    loadComponent: () => import('./home/ecossistema/ecossistema.page').then((m) => m.EcossistemaPage),
    data: { title: 'Ecossistema (Template)' },
  },
  { path: 'usuario', redirectTo: 'usuario/ecossistema', pathMatch: 'full' },
  {
    path: 'usuario/ecossistema',
    loadComponent: () => import('./usuario/home/home.page').then((m) => m.HomePage),
    data: { title: 'Ecossistema' },
    canActivate: [talentAuthGuard],
  },
  {
    path: 'usuario/dados-cadastrais',
    loadComponent: () => import('./usuario/usuario.page').then((m) => m.UsuarioPage),
    data: { title: 'Dados Cadastrais' },
    canActivate: [talentAuthGuard],
  },
  {
    path: 'usuario/documentos',
    loadComponent: () => import('./usuario/documentos/documentos.page').then((m) => m.DocumentosPage),
    data: { title: 'Documentos' },
    canActivate: [talentAuthGuard],
  },
  {
    path: 'usuario/stacks',
    loadComponent: () => import('./usuario/stacks/stacks.page').then((m) => m.StacksPage),
    data: { title: 'Minhas Stacks' },
    canActivate: [talentAuthGuard],
  },
  {
    path: 'usuario/experiencia',
    loadComponent: () => import('./usuario/experiencia/experiencia.page').then((m) => m.ExperienciaPage),
    data: { title: 'Experiências' },
    canActivate: [talentAuthGuard],
  },
  { path: 'usuario/dados-cadastrais/stacks', redirectTo: 'usuario/stacks', pathMatch: 'full' },
  { path: 'usuario/dados-cadastrais/experiencia', redirectTo: 'usuario/experiencia', pathMatch: 'full' },
  { path: 'usuario/dados-cadastrais/formacao', redirectTo: 'usuario/dados-cadastrais', pathMatch: 'full' },
  { path: 'usuario/dados-cadastrais/geral', redirectTo: 'usuario/dados-cadastrais', pathMatch: 'full' },
  {
    path: 'usuario/minhas-candidaturas',
    loadComponent: () => import('./usuario/placeholder/placeholder.page').then((m) => m.PlaceholderPage),
    data: { title: 'Minhas Candidaturas' },
    canActivate: [talentAuthGuard],
  },
  {
    path: 'vagas/cadastro',
    loadComponent: () => import('./vagas/cadastro/cadastro.page').then((m) => m.CadastroPage),
    data: { title: 'Abrir Vaga' },
    canActivate: [recruiterAuthGuard],
  },
  {
    path: 'recruiter/panel',
    loadComponent: () => import('./recruiter/recruiter-panel/recruiter-panel.page').then((m) => m.RecruiterPanelPage),
    data: { title: 'Recruiters' },
    canActivate: [recruiterAuthGuard],
  },
  {
    path: 'recruiter/time',
    loadComponent: () => import('./recruiter/recruiter-time/recruiter-time.page').then((m) => m.RecruiterTimePage),
    data: { title: 'Chat do Time' },
    canActivate: [recruiterAuthGuard],
  },
  {
    path: 'recruiter/cadastro',
    loadComponent: () => import('./recruiter/recruiter-cadastro/recruiter-cadastro.page').then((m) => m.RecruiterCadastroPage),
    data: { title: 'Cadastro de Recruiter' },
    canActivate: [recruiterAuthGuard, recruiterManageDirectoryGuard],
  },
  {
    path: 'empresa',
    loadComponent: () => import('./empresa/empresa/empresa.page').then((m) => m.EmpresaPage),
    data: { title: 'Empresas' },
    canActivate: [recruiterAuthGuard, recruiterMasterGuard],
  },
  {
    path: 'empresa/cadastro',
    loadComponent: () => import('./empresa/empresa-cadastro/empresa-cadastro.page').then((m) => m.EmpresaCadastroPage),
    data: { title: 'Cadastro de Empresa' },
    canActivate: [recruiterAuthGuard, recruiterMasterGuard],
  },
  { path: 'vagas', component: StubPage, data: { title: 'Minhas Vagas' }, canActivate: [recruiterAuthGuard] },
  { path: 'radar', component: StubPage, data: { title: 'Radar' }, canActivate: [recruiterAuthGuard] },
  { path: 'talentos', component: StubPage, data: { title: 'Talentos' }, canActivate: [recruiterAuthGuard] },
  { path: 'propostas', component: StubPage, data: { title: 'Propostas' }, canActivate: [recruiterAuthGuard] },
  { path: '**', redirectTo: 'home' },
];
