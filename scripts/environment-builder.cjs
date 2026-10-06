const { createBuilder } = require('@angular-devkit/architect');
const { buildApplication, executeDevServerBuilder } = require('@angular/build');
const { resolveApiUrl } = require('./api-url.cjs');

module.exports = createBuilder(async function* (options, context) {
  const apiUrl = resolveApiUrl(context.workspaceRoot);

  const configuredOptions = {
    ...options,
    define: { ...options.define, API_URL: JSON.stringify(apiUrl) },
  };
  context.logger.info(`API_URL carregada ${process.env.API_URL !== undefined ? 'do ambiente' : 'do .env'}.`);
  const execute = options.buildTarget ? executeDevServerBuilder : buildApplication;
  yield* execute(configuredOptions, context);
});
