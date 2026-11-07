# Convidados, ministrantes e edição administrativa

Revisão do backend local em 07/11/2026. Nenhum arquivo do backend foi alterado.

## Correção de permissão

`EventAccessPolicy.canEdit/assertCanEdit` e `ActivityServices` autorizam ADMIN e MODERATOR, além do responsável e dos editores ativos. O frontend já reconhecia ADM para editar informações, mas não o incluía em `canManageActivities`. A programação agora usa a mesma permissão de edição do evento, incluindo MODERATOR. A gestão da equipe continua com a regra própria de responsável.

## Fluxo integrado

- Salvar atividade e continuar no modal para gerenciar participantes opcionais.
- Convidado externo: POST `/events/{eventId}/guests`, com `name` e `description`, sem exigir conta/aceite.
- Selecionar o perfil cadastrado na lista paginada; não inferir identidade por nome.
- Editar nome/apresentação: PATCH `/events/{eventId}/guests/{guestId}/profile`.
- Foto local com prévia: POST multipart `file` em `/events/{eventId}/guests/{guestId}/image`; GET autenticado quando necessário e DELETE para remover. PNG, JPEG e WebP. Falhas preservam o arquivo para repetir apenas o upload.
- Associar perfil à atividade ou mudar a função: POST `/events/{eventId}/guests/{guestId}/activities/{activityId}`, com `role`. A função de mediador não atribui role administrativa.
- Consultar participantes da atividade usando `event_guest_id` para operações sobre o perfil, não o ID do vínculo.
- Alterar presença/visibilidade no evento: PATCH `/events/{eventId}/guests/{guestId}`.
- Convites externos: enviar, listar paginado e cancelar nas rotas `/events/{eventId}/invitations` e `/events/invitations/{id}`. Email listado apenas para ADM/MODERATOR. O convite atual é do evento, separado do cadastro direto e do vínculo com atividade.
- Ministrantes: POST/GET `/events/activities/{activityId}/instructors/invitations`, acompanhamento de status e vencimento e DELETE `/events/instructor-invitations/{id}`. Aceite/recusa permanece em `/accept-instructor-invite`, com autenticação e POST `/events/instructor-invitations/{code}/reply?accept=...`.

## Plano resumido para o backend

1. **Corrigir aceite externo:** `GuestInvitationServices.acceptInvite` constrói `EventGuest` sem `name`; a entidade e a migração V26 exigem nome não nulo. Preencher nome, salvar aceite e perfil na mesma transação e evitar duplicação em repetição/reenvio.
2. **Retornar ID no cadastro:** `GuestService.createGuest` já retorna a entidade, mas `GuestController.addGuest` descarta o resultado e responde apenas `MessageResponse`. Retornar `EventGuestDTO`/ID para permitir cadastro + foto + vínculo sem a seleção intermediária hoje necessária.
3. **Vincular convite a perfil/atividade:** aceitar `guest_id` e `activity_id` opcionais, preservando nome/foto já cadastrados após o aceite. Hoje o convite recebe somente email e cria outro perfil.
4. **Identificar ministrantes:** acrescentar nome e imagem ao `EventInstructorDTO`; hoje a consulta retorna IDs, status e datas. Não expor email na consulta pública.
5. **Proteger fotos privadas:** `GuestImageService.getImage` verifica o acesso ao evento, mas não o status/visibilidade do convidado. Aplicar a mesma política da listagem antes de devolver uma imagem privada/cancelada a visitantes.
6. **Desassociar atividade:** disponibilizar DELETE do vínculo convidado–atividade. Cancelar presença hoje afeta o evento inteiro; a interface informa esse alcance.

A rota PATCH `/{eventId}/guests/{guestId}/account` não é usada pelo cadastro externo: ela concede edição da atividade à conta vinculada, contrariando o papel de convidado sem permissão editorial. Usar o fluxo de convite de ministrante quando essa responsabilidade for desejada.

As validações do frontend usam respostas simuladas e o contrato do código Java local; envio efetivo de email, armazenamento e aceite em produção dependem da versão implantada e da infraestrutura do backend.
