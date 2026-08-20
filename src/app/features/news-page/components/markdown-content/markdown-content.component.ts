import { Component, ViewEncapsulation, computed, inject, input } from '@angular/core';
import { MarkdownService } from '../../services/markdown.service';

@Component({
  selector: 'app-markdown-content',
  standalone: true,
  template: '<div class="markdown-content" [innerHTML]="renderedContent()"></div>',
  styleUrl: './markdown-content.component.css',
  encapsulation: ViewEncapsulation.None,
})
export class MarkdownContentComponent {
  private readonly markdownService = inject(MarkdownService);

  readonly content = input<string | null | undefined>('');
  readonly renderedContent = computed(() => this.markdownService.render(this.content()));
}
