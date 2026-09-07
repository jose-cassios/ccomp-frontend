import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterFormComponent } from './components/register-form/register-form.component';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    RegisterFormComponent
  ],
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.css']
})
export class RegisterPageComponent {
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  onRegister(data: { name: string; email: string; password: string; confirmPassword?: string }): void {
    this.errorMessage.set(null);
    this.authService.register(data).subscribe({
      next: () => {
        this.navigateToLogin();
      },
      error: (error: unknown) => this.errorMessage.set(apiErrorMessage(
        error,
        'Não foi possível criar a conta. Revise os dados informados.',
      )),
    });
  }

  onGoogleLogin(): void {
    console.log('Google login clicked');
    // TODO: Implement Google OAuth
  }

  navigateToLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigate(['/login'], {
      queryParams: returnUrl?.startsWith('/') ? { returnUrl } : {},
    });
  }
}
