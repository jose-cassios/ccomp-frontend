import { Component, HostListener, signal } from '@angular/core';
import { COURSE_PRESENTATION_CONTENT } from './apresentacao.data';
import { CoursePresentationContent } from './models/course-presentation.model';

const BACK_TO_TOP_OFFSET = 600;

@Component({
  selector: 'app-apresentacao',
  templateUrl: './apresentacao.component.html',
  styleUrl: './apresentacao.component.css',
})
export class ApresentacaoComponent {

  protected readonly content: CoursePresentationContent = COURSE_PRESENTATION_CONTENT;

  protected readonly showBackToTop = signal(false);

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.showBackToTop.set(window.scrollY > BACK_TO_TOP_OFFSET);
  }

  protected scrollToTop(): void {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

