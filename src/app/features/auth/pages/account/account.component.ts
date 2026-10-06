import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { EventsService } from '../../../events-page/services/events.service';
import { EventListItem } from '../../../events-page/models/event.model';
import { apiErrorMessage } from '../../../../core/api/api-error';

@Component({
  standalone: true, imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main>
      @if (deactivated()) {
        <h1>Conta desativada</h1>
        <p role="status">Sua conta foi desativada e a sessão foi encerrada. Um novo login reativa o cadastro.</p>
        <a routerLink="/">Voltar ao início</a>
      } @else {
      <h1>Minha conta</h1>
      <p>{{ auth.getCurrentUser()?.email_address || auth.getCurrentUser()?.email }}</p>
      @if (auth.hasAnyRole(['ADM', 'MODERATOR'])) { <a routerLink="/admin/arquivos">Gerenciar arquivos da plataforma</a> }
      @if (error()) { <p role="alert">{{ error() }}</p> }
      @if (message()) { <p role="status">{{ message() }}</p> }
      <form [formGroup]="form" (ngSubmit)="save()">
        <label>Nome<input formControlName="name" autocomplete="name" required maxlength="255"></label>
        <button type="submit" [disabled]="busy()">{{ busy() ? 'Processando…' : 'Salvar perfil' }}</button>
      </form>
      @if (form.touched && form.invalid) { <p role="alert">Informe seu nome (até 255 caracteres).</p> }
      <section>
        <h2>Minhas inscrições em eventos</h2>
        @if (loading()) { <p role="status"><span class="mini-spinner"></span> Carregando…</p> }
        @if (eventsError()) { <p role="alert">{{ eventsError() }}</p><button type="button" (click)="loadEvents()">Tentar novamente</button> }
        @for (event of events(); track event.id) { <a [routerLink]="['/eventos', event.id]">{{ event.title }}</a> }
        @if (!loading() && !eventsError() && !events().length) { <p>Você ainda não possui inscrições ativas.</p> }
        @if (cursor()) { <button type="button" [disabled]="loading()" (click)="loadEvents(true)">Mais eventos</button> }
      </section>
      <section>
        <h2>Desativar conta</h2>
        <p>Seu cadastro será desativado, sem apagar os dados. Um novo login reativa a conta.</p>
        @if (!confirming()) { <button type="button" [disabled]="busy()" (click)="confirming.set(true)">Desativar minha conta</button> }
        @else {
          <p>Deseja realmente desativar sua conta e encerrar esta sessão?</p>
          <button type="button" [disabled]="busy()" (click)="deactivate()">Confirmar desativação</button>
          <button type="button" [disabled]="busy()" (click)="confirming.set(false)">Voltar</button>
        }
      </section>
      }
    </main>
  `,
  styles: `main { max-width:48rem; margin:2rem auto; padding:1.25rem; } h1 {font-size:1.7rem} h2 {font-size:1.2rem} p {margin:.75rem 0; line-height:1.6} section,form { margin-top:1.25rem; padding:1.25rem; border:1px solid var(--border-subtle); background:var(--surface-card); border-radius:.8rem} label,input {display:block; width:100%} input,button {padding:.75rem; border:1px solid var(--border-subtle); border-radius:.5rem; font:inherit} input {box-sizing:border-box; margin:.5rem 0} button {margin:.5rem .5rem 0 0; background:var(--surface-card); color:var(--brand-700); cursor:pointer} button:disabled {opacity:.6} a {display:block; padding:.75rem 0; color:var(--brand-700)}`,
})
export class AccountComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly service = inject(EventsService);
  readonly deactivated = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({ name: [this.auth.getCurrentUser()?.name ?? '', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]] });
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly confirming = signal(false);
  readonly loading = signal(false);
  readonly eventsError = signal('');
  readonly events = signal<EventListItem[]>([]);
  readonly cursor = signal<string | null>(null);
  ngOnInit() { this.loadEvents(); }
  loadEvents(more = false) {
    if (this.loading() || (more && !this.cursor())) return;
    this.loading.set(true); this.eventsError.set('');
    this.service.getMySubscriptions(more ? this.cursor()! : undefined, 20).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (page) => { this.events.update((rows) => more ? [...rows, ...page.content] : page.content); this.cursor.set(page.next_cursor); },
      error: (e: unknown) => this.eventsError.set(apiErrorMessage(e, 'Não foi possível carregar suas inscrições.')),
    });
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    this.auth.updateProfile(this.form.controls.name.value).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => this.message.set('Perfil atualizado.'),
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível salvar o perfil.')),
    });
  }
  deactivate() {
    if (this.busy() || !this.confirming()) return;
    this.busy.set(true); this.error.set('');
    this.auth.deactivateAccount().pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.events.set([]); this.deactivated.set(true); },
      error: (e: unknown) => this.error.set(apiErrorMessage(e, 'Não foi possível desativar a conta.')),
    });
  }
}
