import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserRole } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  template: `
    <div class="wrap">
      <h2>Como você vai usar o TailWorks?</h2>
      <p>Escolhe um caminho. Dá pra trocar depois.</p>

      <div class="grid">
        <button class="card" (click)="go('recruiter')">
          <b>Recruiter / Company</b>
          <span>Crie Radar, acompanhe evolução, shortlist.</span>
        </button>

        <button class="card" (click)="go('talent')">
          <b>Talento</b>
          <span>Perfil validável, trilhas, evidências e reputação.</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .wrap{max-width:900px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:22px}
    h2{margin:0 0 6px;color:#111827}
    p{margin:0 0 16px;color:#6b7280}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    @media (max-width: 900px){.grid{grid-template-columns:1fr}}
    .card{border:1px solid #e5e7eb;border-radius:18px;padding:18px;background:#f9fafb;text-align:left;cursor:pointer}
    .card:hover{background:#fff}
    b{display:block;color:#111827;font-size:18px;margin-bottom:6px}
    span{color:#6b7280}
  `],
})
export class ChooseRolePage {
  private router = inject(Router);
  private auth = inject(AuthService);

  go(role: Exclude<UserRole, null>) {
    // só guarda a intenção por enquanto; login fake vai usar isso
    this.auth.role.set(role);
    this.router.navigateByUrl('/login');
  }
}