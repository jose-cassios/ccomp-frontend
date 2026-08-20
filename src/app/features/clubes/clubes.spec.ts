import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { StorageService } from '../../core/storage/storage.service';
import { AuthService } from '../auth/services/auth.service';
import { ClubesService } from './services/clubes.service';
import { Clubes } from './clubes';

describe('Clubes', () => {
  let component: Clubes;
  let fixture: ComponentFixture<Clubes>;
  const emptyPage = { content: [], next_cursor: null, previous_cursor: null };
  const clubsService = {
    search: vi.fn(() => of(emptyPage)),
    getHighlights: vi.fn(() => of([])),
    getMine: vi.fn(() => of(emptyPage)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Clubes],
      providers: [
        provideRouter([]),
        { provide: ClubesService, useValue: clubsService },
        { provide: StorageService, useValue: { upload: vi.fn() } },
        {
          provide: AuthService,
          useValue: {
            hasAnyRole: vi.fn(() => false),
            isAuthenticatedState: signal(false).asReadonly(),
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Clubes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(clubsService.search).toHaveBeenCalled();
    expect(clubsService.getHighlights).toHaveBeenCalled();
  });
});
