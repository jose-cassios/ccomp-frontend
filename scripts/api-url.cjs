const fs = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

function resolveApiUrl(workspaceRoot, env = process.env) {
  // Vercel/CI takes precedence; no .env file is required in deployment.
  let value = env.API_URL;
  if (value === undefined) {
    try {
      value = parseEnv(fs.readFileSync(resolve(workspaceRoot, '.env'), 'utf8')).API_URL;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  if (!value?.trim()) {
    throw new Error('API_URL não definida. Configure no .env local ou nas Environment Variables da Vercel e faça um novo deploy.');
  }

  let url;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('API_URL deve ser uma URL completa, como https://backend.exemplo.com/api.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API_URL deve usar HTTP(S), sem credenciais, query ou fragmento.');
  }
  if (env.VERCEL === '1' && url.protocol !== 'https:') {
    throw new Error('Na Vercel, API_URL deve usar HTTPS para o navegador acessar o backend.');
  }
  if (url.pathname === '/') url.pathname = '/api';
  return url.href.replace(/\/+$/, '');
}

module.exports = { resolveApiUrl };
