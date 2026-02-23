import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  standalone: true,
  template: `
    <div class="box">
      <h2>Login</h2>
      <p>Sem validação por enquanto. Só pra montar fluxo.</p>

      <label>Email</label>
      <input [value]="email()" (input)="email.set(($any($event.target)).value)" placeholder="voce@empresa.com"/>

      <label>Senha</label>
      <input type="password" placeholder="••••••••"/>

      <button class="btn" (click)="login()">
        Entrar como {{ roleLabel() }}
      </button>

      <a class="link" href="/choose">trocar perfil</a>
    </div>
  `,
  styles: [`
    .box{max-width:420px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:22px;display:flex;flex-direction:column;gap:10px}
    h2{margin:0;color:#111827}
    p{margin:0 0 8px;color:#6b7280}
    label{color:#374151;font-size:13px;margin-top:6px}
    input{border:1px solid #e5e7eb;border-radius:12px;padding:12px;font-size:14px;outline:none}
    input:focus{border-color:#111827}
    .btn{margin-top:10px;background:#111827;color:#fff;border:none;border-radius:12px;padding:12px;font-weight:800;cursor:pointer}
    .link{margin-top:8px;color:#6b7280;text-decoration:none;font-size:13px;text-align:center}
  `],
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = signal('julio@tailworks.com');

  roleLabel() {
    return this.auth.role() === 'recruiter' ? 'Recruiter' : 'Talento';
  }

  login() {
    const role = this.auth.role() ?? 'recruiter'; // default
    this.auth.loginFake(this.email(), role);
    this.router.navigateByUrl('/app/dashboard');
  }
}