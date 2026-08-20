import { Component, input, output } from '@angular/core';
import { GlobalHighlight } from '../../models/global-highlight.model';

@Component({
  selector: 'app-hero-highlight-editor',
  standalone: true,
  templateUrl: './hero-highlight-editor.component.html',
  styleUrl: './hero-highlight-editor.component.css',
})
export class HeroHighlightEditorComponent {
  readonly open = input(false);
  readonly highlights = input<readonly GlobalHighlight[]>([]);
  readonly closed = output<void>();
}
