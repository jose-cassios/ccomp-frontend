import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-recovery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './password-recovery.component.html',
  styleUrl: './password-recovery.component.css',
})
export class PasswordRecoveryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly token = signal(this.route.snapshot.queryParamMap.get('token') ?? '');
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly isReset = computed(() => Boolean(this.token()));
  readonly requestForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly resetForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmation: ['', [Validators.required]],
  });

  requestReset(): void {
    if (this.requestForm.invalid || this.loading()) {
      this.requestForm.markAllAsTouched();
      return;
    }
    this.startRequest();
  }

  resetPassword(): void {
    if (this.resetForm.invalid || this.resetForm.controls.password.value !== this.resetForm.controls.confirmation.value || this.loading()) {
      this.resetForm.markAllAsTouched();
      if (this.resetForm.controls.password.value !== this.resetForm.controls.confirmation.value) {
        this.errorMessage.set('As senhas informadas não coincidem.');
      }
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.resetPassword({ token: this.token(), password: this.resetForm.controls.password.value })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.message.set('Senha redefinida com sucesso. Agora você já pode entrar.');
          setTimeout(() => this.router.navigate(['/login']), 1200);
        },
        error: (error: { error?: { message?: string } }) => this.errorMessage.set(error.error?.message || 'Não foi possível redefinir a senha. O link pode ter expirado.'),
      });
  }

  private startRequest(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.forgotPassword(this.requestForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.message.set('Se houver uma conta com este e-mail, você receberá as instruções para redefinir sua senha.'),
        error: (error: { error?: { message?: string } }) => this.errorMessage.set(error.error?.message || 'Não foi possível solicitar a redefinição.'),
      });
  }
}
