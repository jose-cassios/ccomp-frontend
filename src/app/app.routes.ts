import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { Home } from './features/home/home';
import { EventsPageComponent } from './features/events-page/events-page.component';
import { EventoDetalheComponent } from './features/events-page/evento-detalhe/evento-detalhe.component';
import { EmConstrucao } from './shared/components/em-construcao/em-construcao';
import { LoginPageComponent } from './features/auth/pages/login-page/login-page.component';
import { RegisterPageComponent } from './features/auth/pages/register-page/register-page.component';
import { Clubes } from './features/clubes/clubes';
import { NewsComponent } from './features/news-page/news/news.component';
import { NewsPageComponent } from './features/news-page/news-page.component';

export const routes: Routes = [
    // Rotas fora do layout principal (sem header/footer)
    { path: 'login', component: LoginPageComponent },
    { path: 'register', component: RegisterPageComponent },
    {
        path: '',
        component: MainLayoutComponent,
        children: [
        { path: '', component: Home },
        { path: 'eventos', component: EventsPageComponent },
        { path: 'eventos/calendario', component: EmConstrucao },
        { path: 'eventos/:id', component: EventoDetalheComponent },
        { path: 'clubes', component: Clubes },
        { path: 'noticias', component: NewsPageComponent },
        { path: 'news/:slug', component: NewsComponent },
        { path: '**', component: EmConstrucao }
        ]
    },
];
