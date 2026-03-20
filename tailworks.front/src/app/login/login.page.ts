import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { RecruiterInviteDraft, RecruiterSignupDraft, TalentSignupDraft } from '../auth/mock-auth.service';
import { AuthFacade } from '../core/facades/auth.facade';

type AccessView = 'login' | 'register';
type RegisterFlow = 'organization' | 'individual';
type SocialProvider = 'google' | 'linkedin';

@Component({
  standalone: true,
  selector: 'app-login-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthFacade);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly subscriptions = new Subscription();

  accessView: AccessView = 'login';
  registerFlow: RegisterFlow = 'organization';
  returnUrl = '';

  email = '';
  password = '';
  errorMessage = '';
  successMessage = '';

  recruiterSignup: RecruiterSignupDraft = this.createRecruiterSignupDraft();
  talentSignup: TalentSignupDraft = this.createTalentSignupDraft();

  constructor() {
    this.authService.bootstrapFreshStart();
    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.returnUrl = params.get('returnUrl')?.trim() || '';
        this.accessView = params.get('view') === 'register' ? 'register' : 'login';
        this.registerFlow = params.get('registerFlow') === 'individual' ? 'individual' : 'organization';
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setAccessView(view: AccessView): void {
    this.accessView = view;
    this.errorMessage = '';
    this.successMessage = '';
  }

  setRegisterFlow(flow: RegisterFlow): void {
    this.registerFlow = flow;
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetWorkspace(): void {
    this.authService.resetWorkspace();
    this.errorMessage = '';
    this.successMessage = '';
    this.email = '';
    this.password = '';
    this.accessView = 'login';
    this.registerFlow = 'organization';
    this.recruiterSignup = this.createRecruiterSignupDraft();
    this.talentSignup = this.createTalentSignupDraft();
    void this.router.navigateByUrl('/login');
  }

  addSubordinateRecruiter(): void {
    this.recruiterSignup.subordinateRecruiters = [
      ...this.recruiterSignup.subordinateRecruiters,
      this.createRecruiterInviteDraft(),
    ];
  }

  removeSubordinateRecruiter(index: number): void {
    this.recruiterSignup.subordinateRecruiters = this.recruiterSignup.subordinateRecruiters.filter((_item, itemIndex) => itemIndex !== index);
  }

  login(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.authService.login(this.email, this.password)) {
      this.errorMessage = 'Nao encontramos um acesso com esse e-mail e senha.';
      return;
    }

    void this.router.navigateByUrl('/home');
  }

  continueWithProvider(provider: SocialProvider): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.email.trim()) {
      this.errorMessage = `Informe o e-mail para simular o acesso com ${provider === 'google' ? 'Google' : 'LinkedIn'}.`;
      return;
    }

    if (!this.authService.loginWithProvider(this.email)) {
      this.errorMessage = 'Nao encontramos um acesso com esse e-mail. Cadastre sua conta primeiro.';
      return;
    }

    this.successMessage = `Acesso mock com ${provider === 'google' ? 'Google' : 'LinkedIn'} confirmado.`;
    void this.router.navigateByUrl('/home');
  }

  registerRecruiter(): void {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const account = this.authService.registerRecruiterOrganization(this.recruiterSignup);
      this.successMessage = 'Estrutura inicial criada. Agora entre com sua conta e escolha Recruiter ou Talento no Home.';
      this.accessView = 'login';
      this.email = account.email;
      this.password = account.password;
      this.recruiterSignup = this.createRecruiterSignupDraft();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel concluir o cadastro do recruiter.';
    }
  }

  registerTalent(): void {
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const account = this.authService.registerTalent(this.talentSignup);
      this.successMessage = 'Conta criada. Agora entre e escolha o modo de uso no Home.';
      this.accessView = 'login';
      this.email = account.email;
      this.password = account.password;
      this.talentSignup = this.createTalentSignupDraft();
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Nao foi possivel concluir o cadastro do talento.';
    }
  }

  private createRecruiterInviteDraft(): RecruiterInviteDraft {
    return {
      name: '',
      email: '',
      password: '',
      role: 'Talent Acquisition',
    };
  }

  private createRecruiterSignupDraft(): RecruiterSignupDraft {
    return {
      name: '',
      email: '',
      password: '',
      role: 'Talent Acquisition Lead',
      companyName: '',
      companySector: 'Tecnologia',
      companyLocation: 'Rio de Janeiro - RJ',
      companyDescription: '',
      subordinateRecruiters: [this.createRecruiterInviteDraft()],
    };
  }

  private createTalentSignupDraft(): TalentSignupDraft {
    return {
      name: '',
      email: '',
      password: '',
      location: 'Rio de Janeiro - RJ',
    };
  }
}
