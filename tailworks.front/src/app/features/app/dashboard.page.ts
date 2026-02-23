import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div class="grid">
      <div class="card">
        <h2>Radar Ativo</h2>
        <p class="muted">Dev .NET Pleno • Rio/Remoto</p>
        <div class="kpi">82% <small class="muted">média da shortlist</small></div>
      </div>

      <div class="card">
        <h2>Movimento</h2>
        <p class="muted">Últimas 24h</p>
        <ul class="list">
          <li>+3 talentos subiram evidência</li>
          <li>+1 novo curso concluído</li>
          <li>+2 perfis liberaram contato</li>
        </ul>
      </div>

      <div class="card">
        <h2>Próximo passo</h2>
        <p class="muted">Fechar seu onboarding dá poder ao Radar.</p>
        <div class="bar"><span></span></div>
        <small class="muted">Completeness: 35%</small>
      </div>
    </div>
  `,
  styles: [`
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    @media (max-width: 980px){.grid{grid-template-columns:1fr}}
    .kpi{margin-top:10px;font-size:38px;font-weight:900}
    .kpi small{font-size:12px;margin-left:8px}
    .list{margin:10px 0 0;padding-left:18px;opacity:.85}
    .bar{height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;border:1px solid rgba(255,255,255,.08)}
    .bar span{display:block;height:100%;width:35%;background:linear-gradient(135deg,var(--brand-1),var(--brand-2))}
  `],
})
export class DashboardPage {}