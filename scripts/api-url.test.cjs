const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test, afterEach, mock } = require('node:test');
const { resolveApiUrl } = require('./api-url.cjs');

afterEach(() => mock.restoreAll());

test('Vercel usa a variável de ambiente sem ler um .env', () => {
  mock.method(fs, 'readFileSync', () => { throw new Error('Não deve ler .env'); });
  assert.equal(resolveApiUrl('.', { API_URL: 'https://backend.example/api', VERCEL: '1' }), 'https://backend.example/api');
});

test('local usa o .env quando não há variável no processo', () => {
  mock.method(fs, 'readFileSync', () => '# configuração local\nAPI_URL="http://localhost:8080/api/"\n');
  assert.equal(resolveApiUrl('.', {}), 'http://localhost:8080/api');
});

test('uma variável vazia não usa silenciosamente o .env local', () => {
  assert.throws(() => resolveApiUrl('.', { API_URL: '  ' }), /API_URL não definida/);
});

test('ausência do .env e da variável produz mensagem orientativa', () => {
  mock.method(fs, 'readFileSync', () => { throw Object.assign(new Error(), { code: 'ENOENT' }); });
  assert.throws(() => resolveApiUrl('.', {}), /Environment Variables da Vercel/);
});

test('preserva caminhos personalizados, remove barra final e acrescenta /api somente à raiz', () => {
  assert.equal(resolveApiUrl('.', { API_URL: ' https://backend.example/ ' }), 'https://backend.example/api');
  assert.equal(resolveApiUrl('.', { API_URL: 'https://backend.example/platform/api/v2/' }), 'https://backend.example/platform/api/v2');
});

test('rejeita valores que não representam uma URL base de API', () => {
  for (const API_URL of ['backend.example', 'ftp://backend.example', 'https://user:pass@backend.example', 'https://backend.example?token=x', 'https://backend.example/#api']) {
    assert.throws(() => resolveApiUrl('.', { API_URL }), /API_URL/);
  }
});

test('Vercel exige HTTPS, mas desenvolvimento local aceita HTTP', () => {
  assert.throws(() => resolveApiUrl('.', { API_URL: 'http://backend.example/api', VERCEL: '1' }), /HTTPS/);
  assert.equal(resolveApiUrl('.', { API_URL: 'http://localhost:8080' }), 'http://localhost:8080/api');
});
