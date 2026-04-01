import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { Home } from './features/home/home';

export const routes: Routes = [
  {
    path:'',
    component:MainLayoutComponent,
    children: [
      {
        path:'',
        component:Home
      }
    ]
  }
];
