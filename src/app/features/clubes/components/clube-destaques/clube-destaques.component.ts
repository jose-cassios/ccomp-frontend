import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { Club } from '../../models/clube.model';

@Component({
  selector: 'app-clube-destaques',
  imports: [CommonModule],
  templateUrl: './clube-destaques.component.html',
  styleUrl: './clube-destaques.component.css',
})
export class ClubeDestaquesComponent {
  readonly clubs = input<readonly Club[]>([]);
  readonly loading = input(false);
  readonly selected = output<Club>();
  readonly enroll = output<Club>();
}
