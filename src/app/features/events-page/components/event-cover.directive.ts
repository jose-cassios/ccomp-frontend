import { Directive, ElementRef, Injector, Input, OnDestroy, Renderer2, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ApiConfig } from '../../../core/api/api.config';
import { SKIP_GLOBAL_LOADING } from '../../../core/loading/loading.interceptor';

/** Private draft covers need the same Authorization interceptor as other API requests. */
@Directive({ selector: 'img[eventCover]', standalone: true })
export class EventCoverDirective implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly config = inject(ApiConfig);
  private readonly element = inject(ElementRef<HTMLImageElement>);
  private readonly renderer = inject(Renderer2);
  private request?: Subscription;
  private objectUrl?: string;
  // Scoped to this image (not shared between sessions); bounded and short-lived.
  private readonly covers = new Map<string, { blob: Blob; expires: number }>();

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
    const cached = this.covers.get(url);
    if (cached && cached.expires > Date.now()) {
      this.show(cached.blob);
      return;
    }
    this.request = this.injector.get(HttpClient).get(url, {
      responseType: 'blob', context: new HttpContext().set(SKIP_GLOBAL_LOADING, true),
    }).subscribe({
      next: (blob) => {
        if (!blob?.size || !blob.type.startsWith('image/')) return;
        if (this.covers.size >= 8) this.covers.delete(this.covers.keys().next().value!);
        this.covers.set(url, { blob, expires: Date.now() + 300000 });
        this.show(blob);
      },
      error: () => { /* Keep descriptive alt text when the cover cannot be loaded. */ },
    });
  }

  ngOnDestroy(): void { this.clear(); this.covers.clear(); }

  private show(blob: Blob): void {
    this.objectUrl = URL.createObjectURL(blob);
    this.renderer.setAttribute(this.element.nativeElement, 'src', this.objectUrl);
  }

  private clear(): void {
    this.request?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
