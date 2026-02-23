import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'tw-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <aside class="side">
        <div class="brand">
          <span class="mark"></span>
          <div class="name">
            <b>Tail network</b>
            <small>Career OS</small>
          </div>
        </div>

        <nav class="menu">
          <a routerLink="/app/dashboard" routerLinkActive="active" class="item">
            <span class="dot"></span> Dashboard
          </a>
          <a routerLink="/app/radar" routerLinkActive="active" class="item">
            <span class="dot"></span> Radar
          </a>
          <a routerLink="/app/candidates" routerLinkActive="active" class="item">
            <span class="dot"></span> Profissionais
          </a>
          <a routerLink="/app/company" routerLinkActive="active" class="item">
            <span class="dot"></span> Empresa
          </a>
        </nav>

        <div class="sideFooter">
          <div class="pill">
            <span class="pulse"></span>
            <span>Modo Recruiter</span>
          </div>
          <small class="muted">v0.1 • Tail in progress</small>
        </div>
      </aside>

      <section class="main">
        <header class="top">
          <div class="left">
            <div class="crumb">Painel</div>
            <div class="title">Recruiter Workspace</div>
          </div>

          <div class="right">
            <button class="iconBtn" title="Notificações">🔔</button>
            <button class="iconBtn" title="Ajuda">❓</button>

            <div class="user">
              <div class="avatar">J</div>
              <div class="meta">
                <b>Julio</b>
                <small class="muted">criattiicloud.com</small>
              </div>
            </div>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </section>
    </div>
  `,
  styles: [`
    .shell{
      height: 100vh;
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 16px;
      padding: 16px;
    }

    @media (max-width: 980px){
      .shell{ grid-template-columns: 1fr; }
      .side{ display: none; }
    }

    /* ===== SIDEBAR (CLARO, VIVO) ===== */
    .side{
      border-radius: var(--r-lg);
      background: var(--paper);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-soft);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow: hidden;
      position: relative;
    }

    .side::before{
      content:"";
      position:absolute;
      inset:-180px;
      background:
        radial-gradient(circle at 22% 18%, rgba(245,179,0,.24), transparent 60%),
        radial-gradient(circle at 82% 22%, rgba(255,90,0,.18), transparent 60%);
      filter: blur(20px);
      opacity: 1;
      pointer-events:none;
    }

    .brand{
      position: relative;
      z-index: 1;
      display:flex;
      align-items:center;
      gap: 12px;
      padding: 12px 12px;
      border-radius: 16px;
      border: 1px solid var(--border);
      background: rgba(11,11,13,.02);
    }

    .mark{
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--gold), var(--orange));
      box-shadow: 0 0 0 3px rgba(245,179,0,.18);
      flex: 0 0 auto;
    }

    .name b{ display:block; letter-spacing:.2px; }
    .name small{ color: var(--muted); }

    .menu{
      position: relative;
      z-index: 1;
      display:flex;
      flex-direction:column;
      gap: 8px;
      padding: 6px;
    }

    .item{
      display:flex;
      align-items:center;
      gap: 10px;
      padding: 11px 12px;
      border-radius: 14px;
      border: 1px solid transparent;
      color: rgba(11,11,13,.82);
      transition: background .18s ease, border-color .18s ease, transform .18s ease;
    }

    .dot{
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: rgba(11,11,13,.22);
    }

    .item:hover{
      background: rgba(11,11,13,.04);
      border-color: rgba(11,11,13,.08);
      transform: translateY(-1px);
    }

    .item.active{
      background: rgba(245,179,0,.14);
      border-color: rgba(245,179,0,.26);
      color: rgba(11,11,13,.92);
    }

    .item.active .dot{
      background: linear-gradient(135deg, var(--gold), var(--orange));
      box-shadow: 0 0 0 6px rgba(245,179,0,.14);
    }

    .sideFooter{
      position: relative;
      z-index: 1;
      margin-top: auto;
      display:flex;
      flex-direction:column;
      gap: 10px;
      padding: 12px 10px;
      border-top: 1px solid var(--border);
    }

    .pill{
      display:flex;
      align-items:center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 999px;
      background: rgba(11,11,13,.03);
      border: 1px solid var(--border);
      width: max-content;
    }

    .pulse{
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: linear-gradient(135deg, var(--gold), var(--orange));
      box-shadow: 0 0 0 7px rgba(245,179,0,.14);
    }

    /* ===== MAIN (COM MARCA D'ÁGUA FIXA) ===== */
    .main{
      position: relative;
      border-radius: var(--r-lg);
      background: rgba(255,255,255,.70);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-soft);
      overflow: hidden;
      display:flex;
      flex-direction:column;
    }

    /* Marca d’água Tail (suave e fixa no fundo) */
    .main::before{
      content:"";
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;

      background-image: url('/brand/tail-watermark.png');
      background-repeat: no-repeat;
      background-position: 86% 58%;
      background-size: 540px auto;

      opacity: .06;
      filter: grayscale(1) contrast(1.05);
    }

    .top,
    .content{
      position: relative;
      z-index: 1;
    }

    .top{
      height: 74px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      padding: 0 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,.88);
      backdrop-filter: blur(10px);
    }

    .crumb{ font-size: 12px; color: var(--muted); }
    .title{ font-weight: 950; letter-spacing: .2px; }

    .right{
      display:flex;
      align-items:center;
      gap: 10px;
    }

    .iconBtn{
      width: 40px;
      height: 40px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: rgba(11,11,13,.02);
      cursor: pointer;
      transition: background .18s ease, transform .18s ease, border-color .18s ease;
    }
    .iconBtn:hover{
      background: rgba(11,11,13,.05);
      border-color: rgba(255,90,0,.28);
      transform: translateY(-1px);
    }

    .user{
      display:flex;
      align-items:center;
      gap: 10px;
      padding: 7px 10px;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: rgba(11,11,13,.02);
    }

    .avatar{
      width: 36px;
      height: 36px;
      border-radius: 999px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight: 950;
      color: var(--ink);
      background: linear-gradient(135deg, var(--gold), var(--orange));
      box-shadow: 0 14px 34px rgba(245,179,0,.18);
    }

    .meta b{ display:block; font-size: 13px; }
    .meta small{ font-size: 11px; color: var(--muted); }

    .content{
      flex: 1;
      padding: 16px;
    }
  `],
})
export class ShellComponent {}