# Deploy na Vercel

## Como a URL é configurada

Somente `API_URL` muda entre instalações. A configuração utilizada por `ng serve`,
`ng build`, `npm start` e `npm run build` segue esta prioridade:

1. `process.env.API_URL`, fornecida pela Vercel ou pelo terminal.
2. `API_URL` no `.env` da raiz, quando não existe a variável de processo.

O script `scripts/environment-builder.cjs` já executa o papel do script de build:
lê a configuração por `scripts/api-url.cjs` e passa a URL ao `define` do Angular.
Não é necessário um segundo script `build.mjs` ou gerar arquivos de ambiente.
Somente a URL selecionada é incorporada ao JavaScript do navegador e do servidor.

Exemplos aceitos:

```dotenv
API_URL=https://meu-backend.example.com/api
```

Se informar apenas `https://meu-backend.example.com`, o caminho `/api` será acrescentado.
Um caminho explícito, como `/plataforma/api/v2`, será preservado. A API nesse endereço
precisa expor as rotas e os contratos esperados pelo frontend; trocar o endereço não adapta contratos diferentes.

O `.env` é local e ignorado pelo Git. Na Vercel, configure a variável no painel;
não é necessário enviar um arquivo `.env`. A URL é pública no frontend e não deve conter credenciais.

## Configuração inicial na Vercel

1. Envie este código ao seu repositório e importe o projeto na Vercel.
2. Selecione a pasta que contém `package.json`, `angular.json` e `vercel.json` como **Root Directory**.
3. Use **Framework Preset: Other**. O `vercel.json` configura a saída híbrida explicitamente:
   - **Install Command:** `npm ci`.
   - **Build Command:** `npm run build`.
   - **Output Directory:** `dist/ccomp-frontend/browser`.
   - **Node.js:** `24.x`, também definido em `package.json`.
4. Em **Settings → Environment Variables**, cadastre `API_URL` com a URL pública HTTPS do backend.
   Habilite **Production** e **Preview** conforme os ambientes usados. Eles podem ter valores diferentes.
5. Faça o deploy. O log deve mostrar `API_URL carregada do ambiente.`.

Arquivos estáticos e páginas pré-renderizadas são servidos diretamente; os demais endereços
passam pela função `api/render.mjs`, que reutiliza o servidor Angular já existente.
Isso preserva SSR e o acesso direto a detalhes, edição, credenciamento e convites.
Os hosts de Production/Preview são lidos das variáveis de sistema da Vercel; mantenha
**Automatically expose System Environment Variables** habilitado no projeto.
Não configure um segundo rewrite global para `index.html` no painel.

## Quando o backend mudar de endereço

- **Local:** altere `API_URL` no `.env`, pare o servidor e execute `npm start` ou `ng serve` novamente.
- **Vercel:** altere `API_URL` no ambiente desejado e faça **Redeploy**. A alteração vale para o novo build;
  não modifica um deployment que já está publicado. Não é necessário alterar TypeScript, `angular.json` ou rotas.
- Se exportou `API_URL` no terminal, essa variável tem prioridade sobre o `.env`.
  No PowerShell, `Remove-Item Env:API_URL -ErrorAction SilentlyContinue` remove a substituição da sessão.

## Testes locais

Com Node 24 instalado:

```sh
npm ci
npm run test:config
npm start
```

Abra `http://localhost:4200`, acesse eventos/notícias e veja a aba **Network** do navegador.
As requisições da API devem usar a URL configurada. Troque a URL, reinicie e repita.
No Windows, caso a política do PowerShell bloqueie `npm.ps1`, use `npm.cmd`.

Para testar o build como na Vercel, no PowerShell:

```powershell
$env:API_URL = 'https://SEU-BACKEND/api'
$env:VERCEL = '1'
npm.cmd run build
Remove-Item Env:API_URL
Remove-Item Env:VERCEL
npm.cmd run serve:ssr:ccomp-frontend
```

No Linux/macOS:

```sh
API_URL=https://SEU-BACKEND/api VERCEL=1 npm run build
npm run serve:ssr:ccomp-frontend
```

Use um endereço real acessível nos comandos acima. Abra `http://localhost:4000`.
A URL foi fixada no build, portanto o servidor publicado não muda de backend apenas por reiniciar.
Teste login, listagens e imagens. Abra diretamente e recarregue uma página real de evento.

## Testes no Preview e em produção

1. Abra o deployment e confirme, em **Network**, o domínio das chamadas da API.
2. Faça login e recarregue a página para conferir a restauração de sessão.
3. Abra diretamente `/eventos`, um evento existente e `/check-in` com parâmetros válidos.
4. Confira imagens, convites e respostas de erro. Não confirme um credenciamento real apenas para testar o deploy.
5. Mude `API_URL` no Preview, faça Redeploy e confirme o novo domínio das requisições.

## Configuração necessária no backend

O frontend aceita qualquer endereço HTTP(S) válido com o mesmo contrato de API; na Vercel exige HTTPS.
O backend deve estar acessível publicamente e liberar o domínio do frontend no CORS
(incluindo `Authorization`, `Content-Type` e os métodos usados).
Se o domínio do frontend mudar, ajuste também os links de e-mail/QR Code e os redirecionamentos
de autenticação configurados no backend. Esses ajustes são feitos no backend pelo responsável;
nenhum código de backend foi alterado nesta implementação.

Referências: [variáveis e novos deployments](https://vercel.com/docs/environment-variables),
[funções Node.js](https://vercel.com/docs/functions/runtimes/node-js),
[configuração do projeto](https://vercel.com/docs/project-configuration/vercel-json).
