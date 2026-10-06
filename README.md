# CcompFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.4.

## Development server

Configure `API_URL` no arquivo `.env` (use `.env.example` como modelo).
Depois de trocar a URL, reinicie `npm start`. Nenhum arquivo de ambiente é gerado.
`ng serve`, `ng build` e os comandos npm usam `process.env.API_URL` quando definida;
caso contrário, usam `API_URL` do `.env`. Nenhum arquivo é gerado para configurar o ambiente.
Reinicie o comando após alterar a URL. Os testes usam `/api` relativo.

Para deploy e testes de produção, consulte [o roteiro da Vercel](docs/vercel-deployment.md).

`npm run build` usa a mesma URL do `.env`; para publicar, configure-a antes do build.
`ng serve`, `ng build` e os comandos npm carregam o `.env` diretamente.
Reinicie o comando após alterar a URL. Os testes usam `/api` relativo.

To start a local development server, run:

```bash
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
