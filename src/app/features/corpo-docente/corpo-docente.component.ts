import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FACULTY_MEMBERS } from './corpo-docente.data';

@Component({
  selector: 'app-corpo-docente',
  imports: [RouterLink],
  templateUrl: './corpo-docente.component.html',
  styleUrl: './corpo-docente.component.css',
})
export class CorpoDocenteComponent {
  readonly professors = FACULTY_MEMBERS;
  readonly professorCount = String(this.professors.length).padStart(2, '0');
}
