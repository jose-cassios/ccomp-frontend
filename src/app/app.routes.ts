import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { Home } from './features/home/home';

export const routes: Routes = [
    {
        path: '',
        component: MainLayoutComponent,
        children: [
        { path: '', component: Home }, // O conteúdo que vai no meio
        // Futuramente: { path: 'eventos', component: EventosComponent }
        ]
    },
  // Exemplo de rota fora do layout principal (sem header/footer)
  // { path: 'login', component: LoginComponent }
];
