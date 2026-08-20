import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RegisterFormComponent } from './components/register-form/register-form.component';

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
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onRegister(data: { name: string; email: string; password: string; confirmPassword?: string }): void {
    this.authService.register(data).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Registration failed:', error);
      }
    });
  }

  onGoogleLogin(): void {
    console.log('Google login clicked');
    // TODO: Implement Google OAuth
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
