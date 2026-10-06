import { Directive, ElementRef, Injector, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';

/** Private draft covers need the same Authorization interceptor as other API requests. */
@Directive({ selector: 'img[eventCover]', standalone: true })
export class EventCoverDirective implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly config = inject(ApiConfig);
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);
  private request?: Subscription;
  private objectUrl?: string;

  @Input() set eventCover(url: string) {
    this.clear();
    this.renderer.removeAttribute(this.element.nativeElement, 'src');
    if (!url) return;
    const prefix = this.config.buildUrl('/events/');
    if (!url.startsWith(prefix) || !/^\d+\/images\/cover(?:\?|$)/.test(url.slice(prefix.length))) {
      this.renderer.setAttribute(this.element.nativeElement, 'src', url);
      return;
    }
    if (typeof window === 'undefined') return;
    this.request = this.injector.get(HttpClient).get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        if (!blob?.size || !blob.type.startsWith('image/')) return;
        this.objectUrl = URL.createObjectURL(blob);
        this.renderer.setAttribute(this.element.nativeElement, 'src', this.objectUrl);
      },
      error: () => { /* Keep descriptive alt text when the cover cannot be loaded. */ },
    });
  }

  ngOnDestroy(): void { this.clear(); }

  private clear(): void {
    this.request?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
