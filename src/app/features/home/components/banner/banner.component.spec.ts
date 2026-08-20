import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BannerComponent } from './banner.component';

describe('Banner', () => {
  let component: BannerComponent;
  let fixture: ComponentFixture<BannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerComponent],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(BannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should always render the default hero card when no global highlight is configured', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.news-card')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Semana de Tecnologia');
  });

  it('should expose highlight management only when the caller grants permission', () => {
    fixture.componentRef.setInput('canManageHighlights', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Gerenciar destaques');
  });
});
