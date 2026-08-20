import { TestBed } from '@angular/core/testing';
import { MarkdownService } from './markdown.service';

describe('MarkdownService', () => {
  let service: MarkdownService;

  beforeEach(() => {
    service = TestBed.inject(MarkdownService);
  });

  it('should render common Markdown structures', () => {
    const html = service.render('## Título\n\nTexto com **destaque**.\n\n- primeiro\n- segundo');

    expect(html).toContain('<h2>Título</h2>');
    expect(html).toContain('<strong>destaque</strong>');
    expect(html).toContain('<ul>');
  });

  it('should escape HTML and reject unsafe links', () => {
    const html = service.render('<script>alert(1)</script> [link](javascript:alert(1))');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="#"');
  });
});
