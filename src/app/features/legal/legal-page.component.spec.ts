import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { LegalPageComponent } from './legal-page.component';

describe('LegalPageComponent', () => {
  let fixture: ComponentFixture<LegalPageComponent>;

  it('renders customized terms of use', async () => {
    await TestBed.configureTestingModule({
      imports: [LegalPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { legalDocument: 'terms' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LegalPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Termos de uso');
    expect(fixture.nativeElement.textContent).toContain('Uso adequado');
  });

  it('renders privacy rights when opened through the privacy route', async () => {
    await TestBed.configureTestingModule({
      imports: [LegalPageComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { legalDocument: 'privacy' } } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LegalPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Política de privacidade');
    expect(fixture.nativeElement.textContent).toContain('Seus direitos');
  });
});
