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
import { publicGuard } from './features/auth/guards/public.guard';
import { roleGuard } from './features/auth/guards/role.guard';
import {
  ADMINISTRATION_ROLES,
  CONTENT_MANAGEMENT_ROLES,
  NEWS_MANAGEMENT_ROLES,
} from './features/auth/config/auth.config';
import { pendingNewsChangesGuard } from './features/news-page/guards/pending-news-changes.guard';
import { pendingEventChangesGuard } from './features/events-page/guards/pending-event-changes.guard';
import { ApresentacaoComponent } from './features/apresentacao/apresentacao.component';
import { CorpoDocenteComponent } from './features/corpo-docente/corpo-docente.component';

export const routes: Routes = [
    // Rotas fora do layout principal (sem header/footer)
    { path: 'login', component: LoginPageComponent, canActivate: [publicGuard] },
    { path: 'register', component: RegisterPageComponent },
    { path: 'recuperar-senha', component: PasswordRecoveryComponent },
    { path: 'reset-password', component: PasswordRecoveryComponent },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
        { path: '', component: Home },
        {
          path: 'eventos/novo',
          loadComponent: () =>
            import('./features/events-page/pages/event-editor/event-editor.component').then(
              (module) => module.EventEditorComponent,
            ),
          canActivate: [authGuard, roleGuard],
          canDeactivate: [pendingEventChangesGuard],
          data: { roles: CONTENT_MANAGEMENT_ROLES },
        },
        {
          path: 'accept-editor-invite',
          loadComponent: () =>
            import('./features/events-page/pages/event-editor-invitation/event-editor-invitation.component').then(
              (module) => module.EventEditorInvitationComponent,
            ),
        },
        // Keeps invitation links issued by the previous frontend route working.
        {
          path: 'eventos/convite-editor',
          loadComponent: () =>
            import('./features/events-page/pages/event-editor-invitation/event-editor-invitation.component').then(
              (module) => module.EventEditorInvitationComponent,
            ),
        },
        {
          path: 'eventos/:id/editar',
          loadComponent: () =>
            import('./features/events-page/pages/event-editor/event-editor.component').then(
              (module) => module.EventEditorComponent,
            ),
          // A autorização do evento é conferida pela API para dono ou editor atribuído.
          // Exigir apenas cargo aqui impediria um colaborador válido de abrir o evento.
          canActivate: [authGuard],
          canDeactivate: [pendingEventChangesGuard],
        },
        {
          path: 'eventos/:id',
          loadComponent: () =>
            import('./features/events-page/pages/event-details/event-details.component').then(
              (module) => module.EventDetailsComponent,
            ),
        },
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
          data: { roles: ADMINISTRATION_ROLES },
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
          // A API valida se a pessoa é autora ou editora desta notícia.
          canActivate: [authGuard],
          canDeactivate: [pendingNewsChangesGuard],
        },
        { path: 'sobre/apresentacao', component: ApresentacaoComponent },
        { path: 'sobre/docentes', component: CorpoDocenteComponent },
        { path: 'noticias', component: NewsPageComponent },
        { path: 'news/:slug', component: NewsComponent },
        { path: '**', component: EmConstrucao }
        ]
    },
];
