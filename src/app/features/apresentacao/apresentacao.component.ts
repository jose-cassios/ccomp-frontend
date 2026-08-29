import { Component } from '@angular/core';
import { COURSE_PRESENTATION_CONTENT } from './apresentacao.data';
import { CoursePresentationContent } from './models/course-presentation.model';

@Component({
  selector: 'app-apresentacao',
  imports: [],
  templateUrl: './apresentacao.component.html',
  styleUrl: './apresentacao.component.css',
})
export class ApresentacaoComponent {

  protected readonly content: CoursePresentationContent = COURSE_PRESENTATION_CONTENT;

}
