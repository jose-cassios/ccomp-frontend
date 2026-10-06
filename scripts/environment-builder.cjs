const { createBuilder } = require('@angular-devkit/architect');
const { buildApplication, executeDevServerBuilder } = require('@angular/build');
const { resolveApiUrl } = require('./api-url.cjs');

module.exports = createBuilder(async function* (options, context) {
  const apiUrl = resolveApiUrl(context.workspaceRoot);
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');
const { createBuilder } = require('@angular-devkit/architect');
const { buildApplication, executeDevServerBuilder } = require('@angular/build');

module.exports = createBuilder(async function* (options, context) {
  const envPath = resolve(context.workspaceRoot, '.env');
  const { API_URL } = parseEnv(readFileSync(envPath, 'utf8'));
  if (!API_URL?.trim()) throw new Error('Defina API_URL no arquivo .env.');

  const url = new URL(API_URL.trim());
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('API_URL deve usar http ou https.');
  }
  if (url.pathname === '/') url.pathname = '/api';
  const apiUrl = url.href.replace(/\/+$/, '');

  const configuredOptions = {
    ...options,
    define: { ...options.define, API_URL: JSON.stringify(apiUrl) },
  };
  context.logger.info(`API_URL carregada ${process.env.API_URL !== undefined ? 'do ambiente' : 'do .env'}.`);
  const execute = options.buildTarget ? executeDevServerBuilder : buildApplication;
  yield* execute(configuredOptions, context);
});
