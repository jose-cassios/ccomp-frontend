const { createBuilder } = require('@angular-devkit/architect');
const { buildApplication, executeDevServerBuilder } = require('@angular/build');
const fs = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');
const { resolveApiUrl } = require('./api-url.cjs');

module.exports = createBuilder(async function* (options, context) {
  const apiUrl = resolveApiUrl(context.workspaceRoot);

  const envPath = resolve(context.workspaceRoot, '.env');
  const local = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
  const googleClientId = (process.env.GOOGLE_CLIENT_ID ?? local.GOOGLE_CLIENT_ID ?? '').trim();
  const configuredOptions = {
    ...options,
    define: { ...options.define, API_URL: JSON.stringify(apiUrl), GOOGLE_CLIENT_ID: JSON.stringify(googleClientId) },
  };
  context.logger.info(`API_URL carregada ${process.env.API_URL !== undefined ? 'do ambiente' : 'do .env'}.`);
  const execute = options.buildTarget ? executeDevServerBuilder : buildApplication;
  yield* execute(configuredOptions, context);
});
