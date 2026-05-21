import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { Home } from './features/home/home';
import { EventsPageComponent } from './features/events-page/events-page.component';
import { EmConstrucao } from './shared/components/em-construcao/em-construcao';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
        { path: '', component: Home },
        { path: 'eventos', component: EventsPageComponent },
        { path: '**', component: EmConstrucao }
        ]
    },
  // Exemplo de rota fora do layout principal (sem header/footer)
  // { path: 'login', component: LoginComponent }
];
