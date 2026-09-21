import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';

import { Header } from './header';
import { AuthService } from '../../features/auth/services/auth.service';

describe('Header', () => {
  let component: Header;
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            hasAnyRole: () => false,
            currentUserState: signal(null),
            isAuthenticatedState: signal(false),
            logoutRemote: () => ({ subscribe: () => undefined }),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links directly to the course presentation without a dropdown menu', () => {
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>;
    const courseLink = Array.from(links)
      .find((link) => link.textContent?.trim() === 'Sobre o curso');

    expect(courseLink?.getAttribute('href')).toBe('/sobre/apresentacao');
    expect(fixture.nativeElement.querySelector('.dropdown-menu')).toBeNull();
  });

  it('opens global search with the submitted query', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onSearch('  programação  ');

    expect(navigate).toHaveBeenCalledWith(['/busca'], { queryParams: { q: 'programação' } });
  });
});
