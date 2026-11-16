# Integrações de eventos: local, materiais e emissão manual

## Backend consultado

Código local em `../ccomp`, somente leitura. Contratos conferidos em `UpdateEventDTO`, `EventMapper`, `EventsServices`, `CertificateVariablesServices`, `EventCertificateManualController`, `ManualParticipantCertificateServices`, `EventMaterialsController`, `ActivityMaterialsController` e `SecurityConfig`.

## Implementado

### Local do evento

- Campo **Local do evento** na primeira etapa de criação/edição, com limite de 255 caracteres, indicação de uso nos certificados e resumo na revisão.
- O POST inicial continua mínimo. O local é enviado em `address` no `PATCH /api/events/{eventId}`, inclusive em eventos sem inscrição obrigatória.
- Reabertura do evento preenche o campo com o valor recebido. A página pública já exibia `address`.
- O estúdio de certificados também permite corrigir esse dado em **Local, organização e cargas horárias**. Após salvar, a prévia usa o local retornado pela API.
- Espaços externos são removidos. Campo vazio envia `""` para limpar; `null`/omissão não limpariam o valor conforme o mapper do backend.
- Se o PATCH após a criação falhar, o ID do rascunho e o local digitado são preservados; tentar novamente não cria outro evento.

O backend preenche `{evento.local}` com `event.address`. O local de uma atividade é independente. Para corrigir um evento já cadastrado, salve seu local e solicite o certificado novamente; o arquivo já baixado não é alterado.

### Certificados manuais de participantes

- **Emitir certificado** na lista de inscritos do evento e no painel **Inscritos e presenças** de cada atividade, para quem pode gerenciar o evento.
- A ação fica disponível após o término, com presença `CHECKED_IN`, em evento não cancelado.
- Integração de `POST /api/events/{eventId}/enrollments/{enrollmentId}/certificate/manual` e `POST /api/events/{eventId}/activities/{activityId}/enrollments/{enrollmentId}/certificate/manual`, sem corpo, resposta PNG.
- Para atividades, o ID da inscrição do evento é resolvido pelo usuário: o ID da linha da atividade não é enviado como se fosse a inscrição do evento.
- O backend continua validando vínculo, encerramento e presença. Em atividades, exige também check-in no evento. Rejeições aparecem junto à ação; nenhum status de presença é alterado automaticamente.
- Loading, bloqueio de cliques repetidos, download e liberação dos URLs temporários.

### Materiais de apoio

- Seção recolhível na página do evento, na etapa **Página do evento** do editor e em cada atividade da programação.
- Público pode consultar links e baixar arquivos de eventos publicados; inclusão e exclusão disponíveis somente para gestores. As permissões são verificadas novamente pela API.
- Bases integradas: `/api/events/{eventId}/materials` e `/api/events/activities/{activityId}/materials`.
- `GET` paginado (`pageSize=10`, `nextCursor`), `POST /links`, `POST /files`, `GET /{materialId}/file` e `DELETE /{materialId}`.
- Cadastro de título, descrição opcional, link HTTP(S) ou arquivo local PDF/PNG/JPEG/WebP de até 10 MB. Multipart usa `title`, `description` e `file`.
- Título sugerido a partir do nome do arquivo; links externos abrem em nova aba; exclusão exige confirmação; erros preservam os campos para nova tentativa.
- Carregamento ocorre ao expandir a seção, sem baixar arquivos junto com a listagem. Layout se adapta a telas pequenas.

## Validação

- 296 testes de eventos aprovados, incluindo contratos HTTP de materiais/certificados, persistência e validação do local, submissões duplicadas, erros, permissões e paginação.
- Build de produção concluído com avisos de orçamento de bundle/CSS já existentes.
- Validação baseada no código do backend e em testes HTTP simulados; não foram feitas emissões, uploads ou alterações em produção.

## Pendências identificadas na revisão

- A central de notificações (`/api/events/me/notifications`) e a gestão de envios (`/api/events/{eventId}/notifications`, públicos selecionados, resultado e reprocessamento) existem no backend, mas não foram integradas nesta iteração. Próximo trabalho no front: caixa de entrada, leitura e painel de comunicação do evento com acompanhamento dos envios.
- A inscrição manual por email de outra pessoa **no evento** continua sem rota no `EnrollmentsController` local. Plano para o backend: expor inscrição por email para gestores, validando duplicidade e capacidade. A inscrição manual em atividades já existente permanece disponível.
- Nenhuma modificação no backend foi realizada.

## Conferência em ambiente de desenvolvimento

1. Criar um rascunho com local e avançar. Conferir o PATCH com `address`, reabrir o evento e confirmar o campo.
2. Salvar o local pelo estúdio e emitir um certificado com `{evento.local}` no modelo.
3. Abrir Materiais de apoio, cadastrar um link e um PDF; conferir consulta pública em evento publicado, download e exclusão como gestor.
4. Confirmar presença de um inscrito e, após o término, emitir o certificado pela lista. Repetir em atividade com presença confirmada também no evento.
