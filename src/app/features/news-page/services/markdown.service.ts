import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  render(markdown: string | null | undefined): string {
    if (!markdown?.trim()) {
      return '<p class="markdown-empty">O conteúdo da notícia aparecerá aqui.</p>';
    }

    const html: string[] = [];
    const paragraph: string[] = [];
    const codeLines: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let inCodeBlock = false;

    const flushParagraph = (): void => {
      if (paragraph.length) {
        html.push(`<p>${this.renderInline(paragraph.join(' '))}</p>`);
        paragraph.length = 0;
      }
    };

    const closeList = (): void => {
      if (listType) {
        html.push(`</${listType}>`);
        listType = null;
      }
    };

    const flushCode = (): void => {
      html.push(`<pre><code>${this.escapeHtml(codeLines.join('\n'))}</code></pre>`);
      codeLines.length = 0;
    };

    for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
      if (/^\s*```/.test(line)) {
        flushParagraph();
        closeList();
        if (inCodeBlock) {
          flushCode();
        }
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        html.push(`<h${level}>${this.renderInline(heading[2])}</h${level}>`);
        continue;
      }

      if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
        flushParagraph();
        closeList();
        html.push('<hr>');
        continue;
      }

      const unorderedItem = line.match(/^\s*[-*+]\s+(.+)$/);
      const orderedItem = line.match(/^\s*\d+[.)]\s+(.+)$/);
      if (unorderedItem || orderedItem) {
        flushParagraph();
        const nextListType = unorderedItem ? 'ul' : 'ol';
        if (listType !== nextListType) {
          closeList();
          listType = nextListType;
          html.push(`<${listType}>`);
        }
        html.push(`<li>${this.renderInline((unorderedItem ?? orderedItem)?.[1] ?? '')}</li>`);
        continue;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushParagraph();
        closeList();
        html.push(`<blockquote>${this.renderInline(quote[1])}</blockquote>`);
        continue;
      }

      closeList();
      paragraph.push(line.trim());
    }

    flushParagraph();
    closeList();
    if (inCodeBlock || codeLines.length) {
      flushCode();
    }

    return html.join('\n');
  }

  private renderInline(value: string): string {
    const inlineCode: string[] = [];
    let rendered = this.escapeHtml(value).replace(/`([^`]+)`/g, (_match, code: string) => {
      const index = inlineCode.push(`<code>${code}</code>`) - 1;
      return `%%INLINE_CODE_${index}%%`;
    });

    rendered = rendered
      .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_match, alt: string, url: string) =>
        `<img src="${this.safeUrl(url)}" alt="${alt}" loading="lazy">`,
      )
      .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_match, label: string, url: string) =>
        `<a href="${this.safeUrl(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
      )
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>');

    return rendered.replace(/%%INLINE_CODE_(\d+)%%/g, (_match, index: string) => {
      return inlineCode[Number(index)] ?? '';
    });
  }

  private safeUrl(url: string): string {
    const normalized = url.trim();
    return /^(https?:\/\/|mailto:|\/|#)/i.test(normalized) ? normalized : '#';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
