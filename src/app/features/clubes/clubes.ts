import { Component } from '@angular/core';
import { ClubeDestaquesComponent } from './components/clube-destaques/clube-destaques.component';
import { TodosClubesComponent } from './components/todos-clubes/todos-clubes.component';

@Component({
  selector: 'app-clubes',
  imports: [ClubeDestaquesComponent, TodosClubesComponent],
  templateUrl: './clubes.html',
  styleUrl: './clubes.css',
})
export class Clubes {

}
