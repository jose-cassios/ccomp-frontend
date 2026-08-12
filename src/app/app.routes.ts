import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { Home } from './features/home/home';
import { EventsPageComponent } from './features/events-page/events-page.component';
import { EmConstrucao } from './shared/components/em-construcao/em-construcao';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/pages/register-page/register-page.component';
import { PasswordRecoveryComponent } from './features/auth/pages/password-recovery/password-recovery.component';
import { Clubes } from './features/clubes/clubes';
import { NewsComponent } from './features/news-page/news/news.component';
import { NewsPageComponent } from './features/news-page/news-page.component';
import { authGuard } from './features/auth/guards/auth.guard';
import { roleGuard } from './features/auth/guards/role.guard';
import { NEWS_MANAGEMENT_ROLES } from './features/auth/config/auth.config';
import { pendingNewsChangesGuard } from './features/news-page/guards/pending-news-changes.guard';

export const routes: Routes = [
    // Rotas fora do layout principal (sem header/footer)
    { path: 'login', component: LoginPageComponent },
    { path: 'register', component: RegisterPageComponent },
    { path: 'recuperar-senha', component: PasswordRecoveryComponent },
    { path: 'reset-password', component: PasswordRecoveryComponent },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
        { path: '', component: Home },
        { path: 'eventos', component: EventsPageComponent },
        { path: 'projetos/clubes', component: Clubes },
        { path: 'clubes', redirectTo: 'projetos/clubes', pathMatch: 'full' },
        {
          path: 'admin/usuarios',
          loadComponent: () =>
            import('./features/admin/pages/admin-users/admin-users.component').then(
              (module) => module.AdminUsersComponent,
            ),
          canActivate: [authGuard, roleGuard],
          data: { roles: ['ADM'] },
        },
        {
          path: 'noticias/nova',
          loadComponent: () =>
            import('./features/news-page/pages/news-editor/news-editor.component').then(
              (module) => module.NewsEditorComponent,
            ),
          canActivate: [authGuard, roleGuard],
          canDeactivate: [pendingNewsChangesGuard],
          data: { roles: NEWS_MANAGEMENT_ROLES },
        },
        {
          path: 'noticias/:id/editar',
          loadComponent: () =>
            import('./features/news-page/pages/news-editor/news-editor.component').then(
              (module) => module.NewsEditorComponent,
            ),
          canActivate: [authGuard, roleGuard],
          canDeactivate: [pendingNewsChangesGuard],
          data: { roles: NEWS_MANAGEMENT_ROLES },
        },
        { path: 'noticias', component: NewsPageComponent },
        { path: 'news/:slug', component: NewsComponent },
        { path: '**', component: EmConstrucao }
        ]
    },
];
