import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CLUBES_DESTAQUE } from '../../data/clubes.mock';
import { ClubeDestaque } from '../../models/clube.model';

@Component({
  selector: 'app-clube-destaques',
  imports: [CommonModule],
  templateUrl: './clube-destaques.component.html',
  styleUrl: './clube-destaques.component.css',
})
export class ClubeDestaquesComponent {

  clubes: ClubeDestaque[] = CLUBES_DESTAQUE;
}
