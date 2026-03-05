import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface RadarCategory {
  label: string;
  value: number;
  color: string;
  offset?: number;
}

interface JobCard {
  title: string;
  priority: string;
  workModel: string;
  match: number;
  talents: number;
  radarCount: number;
  ageLabel: string;
  postedLabel: string;
  avatars: string[];
  extraCount: number;
  status: 'ativas' | 'rascunhos' | 'encerradas';
}

@Component({
  standalone: true,
  selector: 'app-stub-page',
  imports: [CommonModule],
  template: `
    <div class="stub">
      <div class="layout">
        <div class="main">
          <h1>Olá, Rafael <span aria-hidden="true">👋</span></h1>
          <p>Especialista em Recrutamento.</p>

          <section class="radar-card" aria-label="Radar da semana">
            <header>
              <div>
                <h2>Radar da Semana</h2>
                <div class="subtitle subtitle-row">
                  <span><strong>{{ radarTotal }}</strong> novos talentos encontrados</span>
                  <span class="delta">+{{ radarDelta }} desde ontem</span>
                </div>
              </div>
            </header>

            <div class="bars">
            <div class="bar" *ngFor="let cat of radarCategories">
              <div class="label">
                <span class="dot" [style.background]="cat.color"></span>
                {{ cat.label }}
              </div>
              <div class="track" [style.--val]="cat.value">
                <div class="fill" [style.width.%]="cat.value" [style.background]="cat.color"></div>
                <div class="value">{{ cat.value }}%</div>
              </div>
            </div>
            </div>
          </section>

          <section class="jobs">
            <div class="jobs__header">
              <h2>Minhas Vagas</h2>
              <div class="tabs">
                <button class="tab" [class.active]="activeTab==='ativas'" (click)="setTab('ativas')">Ativas</button>
                <button class="tab" [class.active]="activeTab==='rascunhos'" (click)="setTab('rascunhos')">Rascunhos</button>
                <button class="tab" [class.active]="activeTab==='encerradas'" (click)="setTab('encerradas')">Encerradas</button>
              </div>
            </div>

            <ng-container *ngIf="filteredJobs.length; else emptyState">
            <div class="job-card" *ngFor="let job of filteredJobs">
              <div class="card-stripe"></div>
              <div class="card-body">
                <div class="header-row">
                  <div class="badges">
                    <span class="badge badge-priority" *ngIf="job.priority">{{ job.priority }}</span>
                    <span class="badge badge-ghost" *ngIf="job.workModel">{{ job.workModel }}</span>
                  </div>
                  <div class="header-actions">
                    <div></div>
                    <button class="cta">Ver Pipeline →</button>
                  </div>
                </div>

                <h3>{{ job.title }}</h3> 

                <div class="progress-row">
                  <span>Percentual de aderência aos candidatos</span>
                  <span class="created meta-item"></span>
                </div>

                <div class="progress-track">
                  <div class="segment segment-fill" [style.flex]="job.match"></div>
                  <span class="progress-value">{{ job.match }}%</span>
                  <div class="segment segment-rest" [style.flex]="100 - job.match"></div>
                  <div class="progress-avatars">
                    <div class="avatars tiny">
                      <ng-container *ngFor="let avatar of job.avatars; let i = index">
                        <div class="avatar" [style.zIndex]="i + 1" [style.marginLeft.px]="i === 0 ? 0 : -12" [style.backgroundImage]="'url(' + avatar + ')'"></div>
                      </ng-container>
                      <div class="avatar extra">+{{ job.extraCount }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ng-container>
            <ng-template #emptyState>
              <div class="empty">
                Nenhuma vaga em {{ activeTab }}.
              </div>
            </ng-template>
          </section>
        </div>

        <aside class="aside">
          <section class="panel panel-stack">
            <div class="panel-block">
              <h3>Funil de Recrutamento</h3>
              <div class="funnel" *ngFor="let f of funnel">
                <div class="funnel__row">
                  <span>{{ f.label }}</span>
                  <span class="count">{{ f.count }}</span>
                </div>
                <div class="funnel__track">
                  <div class="funnel__fill" [style.width.%]="f.percent"></div>
                </div>
              </div>
            </div>

            <div class="panel-divider"></div>

            <div class="panel-block panel-conv">
              <div class="panel__header">
                <h3>Conversas Recentes</h3>
                <button class="link">View all</button>
              </div>
              <div class="conv" *ngFor="let c of conversations">
                <div class="conv__avatar" [style.backgroundImage]="'url(' + c.avatarUrl + ')'"></div>
                <div class="conv__body">
                  <div class="conv__top">
                    <span class="name">{{ c.name }}</span>
                    <span class="time">{{ c.minutesAgo }}m</span>
                  </div>
                  <div class="conv__text">{{ c.snippet }}</div>
                  <span class="status-dot" [class.online]="c.statusDot==='online'"></span>
                </div>
              </div>
            </div>

            <div class="panel-divider"></div>

            <div class="panel-block panel-ai">
              <div class="panel__header">
                <div class="label">
                  <span class="icon">📄</span> IA TailWorks
                </div>
                <button class="icon-btn">⋯</button>
              </div>
              <h4>Resumo por I.A.</h4>
              <ul class="ai-list">
                <li *ngFor="let item of aiSummary">{{ item }}</li>
              </ul>
              <button class="cta ai-cta">Gerar relatório semanal →</button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .stub{
      padding: 0;
    }
    .layout{
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 0;
      align-items: start;
    }
    .main{
      min-width: 0;
    }
    .aside{
      position: sticky;
      top: 110px;
      align-self: start;
      justify-self: end;
      width: 400px;
      margin-right: -45px;
    }
    .panel{
      background: linear-gradient(180deg, #ffffff 0%, #f8f5ef 100%);
      border-radius: 8px;
      border: 1px solid rgba(15,23,42,0.04);
      box-shadow: 0 18px 32px rgba(15,23,42,0.08);
      padding: 0;
      overflow: hidden;
    }
    .panel-stack .panel-block{
      padding: 18px 18px 12px;
    }
    .panel-stack .panel-block:last-child{
      padding-bottom: 20px;
    }
    .panel-divider{
      height: 1px;
      background: rgba(15,23,42,0.06);
      margin: 0 18px;
    }
    .panel h3{
      margin: 0 0 16px;
      font-size: 24px;
      font-weight: 800;
      color: rgba(15,23,42,0.9);
    }
    .panel-conv .panel__header{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .link{
      border: none;
      background: none;
      color: #f5b300;
      font-weight: 800;
      cursor: pointer;
      font-size: 13px;
    }
    .funnel{
      margin-bottom: 18px;
    }
    .funnel:last-child{
      margin-bottom: 2px;
    }
    .funnel__row{
      display: flex;
      justify-content: space-between;
      font-size: 17px;
      color: rgba(15,23,42,0.9);
      margin-bottom: 6px;
      font-weight: 700;
    }
    .count{
      font-weight: 800;
      color: rgba(15,23,42,0.82);
    }
    .funnel__track{
      height: 12px;
      border-radius: 999px;
      background: #dfe3ec;
      overflow: hidden;
    }
    .funnel__fill{
      height: 100%;
      background: linear-gradient(180deg, #f5b300, #f59e0b);
    }
    .panel-conv .conv{
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      padding: 10px 0;
      position: relative;
      border-bottom: 1px solid rgba(15,23,42,0.05);
    }
    .panel-conv .conv:last-child{
      border-bottom: none;
      padding-bottom: 2px;
    }
    .conv__avatar{
      width: 46px;
      height: 46px;
      border-radius: 999px;
      background: center/cover no-repeat;
      box-shadow: 0 8px 14px rgba(15,23,42,0.12);
    }
    .conv__body{
      position: relative;
      padding-right: 0;
    }
    .conv__top{
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      color: rgba(15,23,42,0.9);
      font-weight: 800;
      line-height: 1.2;
    }
    .name{
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .status-dot{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #f4b100;
      flex: 0 0 auto;
    }
    .status-dot.online{
      background: #3bb200;
    }
    .conv__text{
      font-size: 14px;
      color: rgba(15,23,42,0.62);
      margin-top: 6px;
    }
    .time{
      font-size: 13px;
      color: rgba(15,23,42,0.55);
      margin-left: auto;
      font-weight: 600;
    }
    .panel-ai{
      padding: 20px 18px 22px;
      background: linear-gradient(180deg, #ffffff 0%, #f7f2e9 100%);
      border-radius: 24px;
    }
    .panel__header{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .label{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      color: rgba(15,23,42,0.8);
      font-size: 16px;
    }
    .icon{
      background: linear-gradient(180deg, #f5b300, #f59e0b);
      color: #fff;
      width: 28px;
      height: 28px;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 16px;
      box-shadow: 0 10px 16px rgba(245,179,0,0.22);
    }
    .icon-btn{
      border: 1px solid rgba(15,23,42,0.08);
      background: #f4f2ee;
      border-radius: 12px;
      padding: 6px 10px;
      cursor: pointer;
      color: rgba(15,23,42,0.55);
    }
    .panel-ai h4{
      margin: 8px 0 12px;
      font-size: 22px;
      font-weight: 800;
      color: rgba(15,23,42,0.9);
    }
    .ai-list{
      margin: 0 0 18px;
      padding-left: 18px;
      color: rgba(15,23,42,0.7);
      font-size: 16px;
      display: grid;
      gap: 8px;
    }
    .ai-list li::marker{
      color: #f5b300;
    }
    .ai-cta{
      width: 100%;
      text-align: center;
      padding: 13px 18px;
      border-radius: 22px;
      border: none;
      background: linear-gradient(180deg, #f5b300, #f59e0b);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 16px 28px rgba(245,179,0,0.32);
      font-size: 15px;
    }
    h1{ margin: 0 0 8px; font-size: 26px; color: rgba(15,23,42,0.9); }
    p{ margin: 0; color: rgba(15,23,42,0.65); font-size: 15px; }

    .radar-card{
      margin-top: 22px;
      padding: 20px 22px 24px;
      max-width: 940px;
      background:
        radial-gradient(160% 140% at 10% 0%, rgba(245,179,0,0.08), rgba(255,255,255,0)),
        linear-gradient(180deg, #ffffff 0%, #f9f6f1 100%);
      border-radius: 22px;
      border: 1px solid rgba(15,23,42,0.04);
      box-shadow: 0 18px 36px rgba(15,23,42,0.08);
    }
    .radar-card h2{
      margin: 0 0 12px;
      font-size: 22px;
      color: rgba(15,23,42,0.9);
    }
    .subtitle{
      font-size: 15px;
      color: rgba(15,23,42,0.78);
    }
    .subtitle-row{
      display: flex;
      align-items: center;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid rgba(15,23,42,0.18);
    }
    .subtitle-row .delta{
      margin-left: auto;
    }
    .subtitle strong{
      font-weight: 800;
      margin-right: 4px;
    }
    .delta{
      margin-top: 2px;
      font-size: 13px;
      color: rgba(15,23,42,0.55);
    }
    .bars{
      margin-top: 36px;
      display: grid;
      gap: 12px;
    }
    .bar{
      display: grid;
      grid-template-columns: 130px 1fr;
      align-items: center;
      gap: 10px;
      position: relative;
    }
    .label{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: rgba(15,23,42,0.72);
      font-weight: 600;
      font-size: 14px;
      min-width: 110px;
    }
    .dot{
      width: 12px;
      height: 12px;
      border-radius: 999px;
      box-shadow: 0 0 0 3px rgba(255,255,255,0.9);
    }
    .track{
      position: relative;
      height: 12px;
      border-radius: 999px;
      background: rgba(15,23,42,0.08);
      overflow: visible;
    }
    .fill{
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #f5b300, #f59e0b);
    }
    .value{
      position: absolute;
      left: calc(var(--val, 0) * 1%);
      top: 50%;
      transform: translate(12px, -50%);
      font-weight: 700;
      color: rgba(15,23,42,0.78);
      font-size: 14px;
      white-space: nowrap;
    }

    /* Jobs */
    .jobs{
      margin-top: 44px;
      max-width: 940px;
    }
    .jobs__header{
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 14px;
      padding-left: 6px;
      justify-content: space-between;
    }
    .jobs__header h2{
      margin: 0;
      font-size: 24px;
      font-weight: 500;
      color: rgba(15,23,42,0.9);
    }
    .tabs{
      background: rgba(15,23,42,0.06);
      border-radius: 16px;
      padding: 4px;
      display: inline-flex;
      gap: 6px;
      margin-left: 8px;
    }
    .tab{
      border: none;
      background: transparent;
      padding: 8px 14px;
      border-radius: 12px;
      font-weight: 600;
      color: rgba(15,23,42,0.55);
      cursor: pointer;
    }
    .tab.active{
      background: #fff;
      box-shadow: 0 6px 16px rgba(15,23,42,0.08);
      color: rgba(15,23,42,0.9);
    }

    .job-card{
      position: relative;
      display: block;
      background: linear-gradient(180deg, #ffffff 0%, #f9f6f1 100%);
      border-radius: 20px;
      border: 1px solid rgba(15,23,42,0.06);
      box-shadow: 0 18px 32px rgba(15,23,42,0.12);
      padding: 14px 18px 22px 20px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .card-stripe{
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 8px;
      background: linear-gradient(180deg, #f5b300, #f59e0b);
      border-top-left-radius: 20px;
      border-bottom-left-radius: 20px;
    }
    .card-body{
      position: relative;
      z-index: 1;
    }
    .job-card__left h3{
      margin: 10px 0 8px;
      padding-left: 2px;
      font-size: 22px;
      color: rgba(15,23,42,0.9);
    }
    .badges{
      display: inline-flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .header-row{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
      padding-right: 4px;
    }
    .header-actions{
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .badge{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 5px 10px;
      border-radius: 10px;
      font-weight: 200;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.35px;
    }
    .badge-priority{
      background: linear-gradient(180deg,rgb(244, 238, 222),rgb(253, 235, 196));
      color: #7a4b00;
      box-shadow: 0 6px 12px rgba(245,179,0,0.18);
    }
    .badge-ghost{
      background: #f0f0f3;
      color: rgba(15,23,42,0.65);
    }

    .stacked{
      display: grid;
      gap: 8px;
      align-items: start;
      margin-top: 18px;
    }
    .stats{
      display: inline-flex;
      gap: 18px;
      color: rgba(15,23,42,0.72);
      font-weight: 600;
      align-items: center;
      margin: 0;
      padding-left: 6px;
    }
    .stat{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .dot{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: rgba(15,23,42,0.35);
    }
    .dot.gold{
      background: linear-gradient(135deg, #f5b300, #f59e0b);
    }

    .meta{
      display: inline-flex;
      gap: 12px;
      color: rgba(15,23,42,0.58);
      font-size: 13px;
      align-items: center;
      padding-left: 2px;
      margin: 0;
    }
    .age{
      font-size: 12px;
      color: rgba(15,23,42,0.58);
      font-weight: 700;
      margin-left: auto;
      min-width: 72px;
      text-align: right;
    }
    .meta-item{
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .job-card__right{
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      text-align: right;
      justify-content: flex-start;
      outline: 1px dashed rgba(15,23,42,0.18);
      padding: 8px 10px;
      border-radius: 12px;
    }
    .job-card__right .age{
      font-size: 12px;
      color: rgba(15,23,42,0.58);
      font-weight: 700;
      margin-top: -1px;
    }
    .right-top{
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }
    .avatars{
      display: inline-flex;
      align-items: center;
    }
    .avatars.small .avatar{
      width: 40px;
      height: 40px;
    }
    .avatar{
      width: 48px;
      height: 48px;
      border-radius: 999px;
      background: center/cover no-repeat, #d9dce6;
      border: 2px solid #fff;
      box-shadow: 0 6px 14px rgba(15,23,42,0.12);
    }
    .avatar.extra{
      background:rgb(108, 111, 117);
      color: #fff;
      display: grid;
      place-items: center;
      font-weight: 700;
      font-size: 13px;
      width: 42px;
      height: 42px;
      margin-left: -10px;
      z-index: 99;
    }
    .cta{
      border: none;
      border-radius: 24px;
      padding: 12px 18px;
      background: linear-gradient(180deg, #f5b300, #f59e0b);
      color: #fff;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(245,179,0,0.28);
      min-width: 150px;
    }
    .posted{
      font-size: 12px;
      color: rgba(15,23,42,0.55);
    }
    .empty{
      margin-top: 8px;
      padding: 24px;
      border-radius: 16px;
      border: 1px dashed rgba(15,23,42,0.12);
      color: rgba(15,23,42,0.55);
      background: rgba(255,255,255,0.65);
    }

    /* Progress block */
    .progress-row{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 22px 0 6px;
      padding: 0 2px;
      color: rgba(15,23,42,0.76);
      font-weight: 600;
      font-size: 14px;
    }
    .progress-row .created{
      font-weight: 700;
      color: rgba(15,23,42,0.78);
    }
    .progress-track{
      display: flex;
      align-items: center;
      gap: 12px;
      height: 18px;
      padding: 0 6px;
    }
    .segment{
      height: 14px;
      border-radius: 999px;
      flex-shrink: 1;
      min-width: 14px;
    }
    .segment-fill{
      background: linear-gradient(180deg, #f5b300, #f59e0b);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.55);
    }
    .segment-rest{
      background: #e0e3ec;
      width: 100%;
    }
    .progress-value{
      font-weight: 800;
      color: rgba(15,23,42,0.82);
      font-size: 16px;
      white-space: nowrap;
    }
    .progress-avatars{
      display: flex;
      align-items: center;
      padding-left: 8px;
      gap: 6px;
    }
    .avatars.tiny .avatar{
      width: 44px;
      height: 44px;
    }
    .avatars.tiny .avatar{
      width: 44px;
      height: 44px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  private readonly route = inject(ActivatedRoute);

  readonly radarTotal = 87;
  readonly radarDelta = 12;
  readonly radarCategories: RadarCategory[] = [
    { label: 'Backend', value: 92, color: 'linear-gradient(90deg, #f5b300, #f59e0b)', offset: -2 },
    { label: 'Frontend', value: 81, color: 'linear-gradient(90deg, #f6c340, #f5b300)' },
    { label: 'Cloud', value: 66, color: '#d5d9e6' },
    { label: 'DevOps', value: 55, color: '#cacedc' },
  ];

  readonly funnel = [
    { label: 'Radar', count: 154, percent: 88 },
    { label: 'Negociação', count: 65, percent: 62 },
    { label: 'Contratação', count: 12, percent: 28 },
  ];

  readonly conversations = [
    { name: 'Alex Chen', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Enviei rea portfólio attaaiada...', minutesAgo: 22, statusDot: 'online' },
    { name: 'Maria Silva', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Enviei o portfólio e o Design.', minutesAgo: 30, statusDot: 'online' },
    { name: 'James Wilson', avatarUrl: '/assets/avatars/avatar-rafael.png', snippet: 'Aceitei o convite de entrevista.', minutesAgo: 32, statusDot: 'online' },
  ];

  readonly aiSummary = [
    '3 vagas com alto match',
    '2 candidatos próximos da contratações',
    '1 negociação parada há 3 dias'
  ];

  activeTab: JobCard['status'] = 'ativas';

  readonly jobCards: JobCard[] = [
    {
      title: 'Backend .NET Sênior',
      priority: 'Prioridade Alta',
      workModel: 'Remoto',
      match: 89,
      talents: 23,
      radarCount: 23,
      ageLabel: '2 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 18,
      status: 'ativas',
    },
    {
      title: 'Senior Product Designer',
      priority: 'PRESENCIAL - SÃO PAULO SP',
      workModel: '',
      match: 94,
      talents: 15,
      radarCount: 6,
      ageLabel: '1 dia',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 18,
      status: 'ativas',
    },
    {
      title: 'Data Analyst Mid-Level',
      priority: '',
      workModel: 'Híbrido',
      match: 76,
      talents: 9,
      radarCount: 4,
      ageLabel: '3 dias',
      postedLabel: 'Posticado na 6 a 9 dias',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 6,
      status: 'rascunhos',
    },
    {
      title: 'DevOps Engineer',
      priority: 'Remoto',
      workModel: 'Remoto',
      match: 82,
      talents: 18,
      radarCount: 12,
      ageLabel: '4 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 10,
      status: 'ativas',
    },
    {
      title: 'QA Automation Pleno',
      priority: 'Prioridade Média',
      workModel: 'Híbrido',
      match: 74,
      talents: 11,
      radarCount: 7,
      ageLabel: '5 dias',
      postedLabel: '',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 5,
      status: 'ativas',
    },
    {
      title: 'Product Manager',
      priority: '',
      workModel: 'Remoto',
      match: 68,
      talents: 8,
      radarCount: 3,
      ageLabel: '2 dias',
      postedLabel: 'Posticado na 2 a 5 dias',
      avatars: ['/assets/avatars/avatar-rafael.png','/assets/avatars/avatar-rafael.png'],
      extraCount: 4,
      status: 'encerradas',
    },
  ];

  setTab(tab: JobCard['status']) {
    this.activeTab = tab;
  }

  get filteredJobs(): JobCard[] {
    return this.jobCards.filter(j => j.status === this.activeTab);
  }
}
