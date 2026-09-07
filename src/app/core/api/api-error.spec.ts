import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('reads the messages array used by the current API error contract', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { messages: ['A data informada é inválida.'] },
    });

    expect(apiErrorMessage(error, 'Falha desconhecida.')).toBe('A data informada é inválida.');
  });

  it('reads field validation details and keeps a fallback for unknown errors', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { details: { title: 'O título é obrigatório.' } },
    });

    expect(apiErrorMessage(error, 'Falha desconhecida.')).toBe('O título é obrigatório.');
    expect(apiErrorMessage(new Error('network'), 'Falha desconhecida.')).toBe('Falha desconhecida.');
  });
});
