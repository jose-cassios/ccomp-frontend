# Alinhamento de eventos e credenciamento — 30/09/2026

Revisão do código local do backend até `5b19f9b`, incluindo alterações desde `265e010`. Nenhum arquivo do backend foi alterado. As verificações do frontend usam contratos HTTP simulados; a operação real depende da configuração e disponibilidade da API.

## Rotas integradas

| Endpoint | Uso no frontend |
| --- | --- |
| `GET /api/events/activity/{activityId}/qrcode` | Editor → Programação → atividade → Convidados, inscritos e credenciamento. Exibe e permite baixar o PNG por requisição autenticada. |
| `POST /api/events/activity/{activityId}/check-in` | `/check-in?activity_id=7&code=<UUID>`; exige login, preserva a URL no retorno de login/cadastro e envia `{ "code": "..." }` após confirmação da pessoa. |
| `POST /api/events/{eventId}/images/cover` | Envia `file` multipart, associa a capa imediatamente; permite PNG, JPEG e WebP. |
| `GET /api/events/{eventId}/images/cover` | Exibe imagens via proxy, inclusive rascunhos com sessão autenticada. Chaves do storage nunca são usadas como URL da imagem. |
| `DELETE /api/events/{eventId}/images/cover` | Remove a capa após confirmação. |
| `DELETE /api/events/activities/{activityId}/unsubscribe` | Corrige o cancelamento individual, antes enviado para `/subscribe`. |

QR e confirmação usam `activity` no singular, diferentemente das rotas de programação. O controlador retorna 200 com mensagem ao confirmar presença, apesar de documentar 204; o frontend aceita ambos.

## Outras correções de compatibilidade

- `STAFF` (Equipe) e `MODERATOR` (Moderador) agora são distintos. Ambos gerenciam conteúdo; somente ADMIN/MODERATOR acessam usuários, auditoria e arquivos. Atribuição de cargos permanece exclusiva do ADMIN.
- Enum de cargos atualizado nas interfaces e na seleção administrativa.
- Alterações de cache, serialização e implementação interna dos destaques não exigem novas rotas na interface.
- `EventDTO.coverImageKey` e o campo ainda chamado `EventListItemDTO.coverImageUrl` contêm chaves do storage. Ambos são traduzidos para o endpoint de imagem.
- A edição de capa por URL foi retirada do formulário de eventos: `UpdateEventDTO.coverImageUrl` continua declarado, mas a entidade só possui `coverImageKey` e o mapper não persiste aquela URL. O envio local usa o contrato funcional disponível.

## Plano resumido para o backend

1. **Corrigir o endereço do QR Code:** em `application.properties`, trocar `${{FRONTEND_CHECK_IN:https://example.com}` por `${FRONTEND_CHECK_IN:http://localhost:4200/check-in}`. Configurar `FRONTEND_CHECK_IN` com a URL pública `/check-in` no ambiente implantado.
2. **Garantir o ID no primeiro QR:** `CheckIn` é criado com `activity`, mas o campo `activityId` é somente leitura. Mapear `CheckInDTO.activityId` a partir de `activity.id`; validar que a primeira geração nunca produz `activity_id=null`.
3. **Invalidar cache após gravações:** revisar a criação de check-in (consulta anterior pode armazenar ausência) e upload/remoção de capas (serviço não invalida os caches de evento/listagem/destaques). Evitar QR recém-criado recusado e capas antigas após recarregar.
4. **Tratar presença nas atividades herdadas:** a inscrição no evento não cria registros `EnrollmentActivity`, mas o check-in exige um deles. Materializar a inscrição herdada ou validar a inscrição ativa no evento conforme a política da atividade. Para atividades públicas, definir se haverá credenciamento sem inscrição.
5. **Expor presença persistida:** incluir `attended_at` nas consultas de inscritos e disponibilizar consulta da presença da pessoa autenticada. Atualmente o frontend só pode confirmar o resultado da operação; não pode exibir um histórico ou relatório confiável após recarregar.
6. **Preservar a primeira confirmação:** `makeAttendance()` sobrescreve a data a cada POST; tornar a confirmação idempotente. Alinhar documentação de respostas 200/204 e eventual validade/renovação do código.
7. **Alinhar imagens e permissões restantes:** retirar ou implementar o campo legado `coverImageUrl` do PATCH. Para upload em notícias/clubes por STAFF, disponibilizar rotas por recurso (storage genérico agora exige ADMIN/MODERATOR).

## Uso

O criador/editor abre a atividade na Programação e exibe o QR Code. O participante lê o código com a câmera do celular, entra na conta usada na inscrição se necessário e pressiona “Confirmar minha presença”. A API valida inscrição, código e horário. Não há concessão de presença local ou inscrição automática pelo frontend.
