# Atividades: alinhamento com a API — 14/09/2026

Revisão baseada nos controllers, DTOs, serviços, repositórios e configuração de segurança do backend local (`../ccomp`). Nenhum arquivo do backend foi alterado. Consultas de leitura à API em execução confirmaram a busca pública de eventos (200) e o bloqueio da programação anônima (401). Escritas autenticadas foram validadas por testes do frontend, sem criar dados no ambiente.

## Contrato integrado

| Operação | Rota | Contrato/observação |
| --- | --- | --- |
| Criar atividade | `POST /api/events/{eventId}/activities` | Somente `title` e `description`; retorna ID. |
| Completar/editar | `PATCH /api/events/activities/{id}` | `title`, `description`, `type`, `location`, `start_date`, `end_date`, `registration_policy`, `display_order`. |
| Programação | `GET /api/events/{eventId}/activities?cursor=...` | Páginas de 50; frontend percorre os cursores, ordena por horário e agrupa atividades simultâneas. |
| Excluir | `DELETE /api/events/activities/{id}` | Criador ou editor ativo. |
| Inscrição individual | `POST /api/events/activities/{activityId}/subscribe` | Separada da inscrição no evento. |
| Cancelamento individual | `DELETE /api/events/activities/{activityId}/subscribe` | Remove a inscrição da pessoa autenticada. |
| Participantes | `GET /api/events/activities/{activityId}/enrollments?cursor=...&pageSize=10` | Existe, mas há pendência de autorização descrita abaixo; não é usada para descobrir a inscrição do usuário. |

O JSON usa `snake_case`. Datas de atividades são `LocalDateTime`, enviadas sem conversão artificial para UTC. A descrição foi limitada a 1.000 caracteres para respeitar o PATCH (o POST admite 2.000).

Tipos disponíveis: `LECTURE`, `TALK`, `ROUND_TABLE`, `PANEL`, `WORKSHOP`, `MINI_COURSE`, `TUTORIAL`, `HACKATHON`, `PAPER_PRESENTATION`, `POSTER_SESSION`, `PITCH`, `NETWORKING`, `CULTURAL_EVENT`, `CEREMONY`, `EXHIBITION`, `OTHER`. Corrigida a grafia antiga `MINICOURSE`.

As opções antigas `registration_mode` / `access_requirement` foram substituídas no formulário e nas escritas por `registration_policy`:

- `PUBLIC`: a API dispensa inscrição e não cria vínculo; frontend não exibe botão de inscrição.
- `ACTIVITY_REGISTRANTS_ONLY`, `EVENT_REGISTRANTS_ONLY`, `INHERITED_FROM_EVENT`: atualmente o serviço de inscrição trata as três da mesma forma, exigindo inscrição no evento antes de salvar a individual. A interface informa essa limitação, sem prometer regras distintas ainda não aplicadas.

## Proteções e feedback no frontend

- Criação em duas chamadas: se POST funcionar e PATCH falhar, preserva ID e campos para repetir somente PATCH, sem duplicar atividade.
- Edição de informações do evento não apaga a programação já carregada.
- Respostas reais determinam sucesso, erro e inscrição; 404 não é mais apresentado como rota inexistente na API.
- Sem estado de inscrição na resposta, o frontend mantém estado desconhecido, oferece cancelamento explícito e reconhece a confirmação de inscrição existente no 409. Não utiliza lista de participantes nem localStorage como fonte de verdade.
- A verificação de inscrição no evento percorre páginas adicionais, evitando bloquear quem não aparece nos primeiros 50 resultados.
- Cursores repetidos geram erro em vez de consultas intermináveis.
- Convidados continuam visíveis como funcionalidade indisponível, com campos desabilitados; não são enviados dados que o servidor descartaria.

## Recarga e SSR

- `provideHttpClient(withFetch(), ...)` substitui o backend XHR e remove o aviso de depreciação do SSR. O texto do aviso descreve riscos do XHR; sozinho, não comprova um redirect loop nesta aplicação.
- A restauração da sessão saiu do construtor de `AuthService` e passou para `provideAppInitializer`: evita requisições durante a resolução da própria cadeia de interceptadores.
- O loading é liberado também em exceções síncronas; requisições sem timeout explícito têm limite de 30 segundos.
- Refresh simultâneo é compartilhado; token expirado não é anexado ao login/refresh, e bearer tokens não são enviados para URLs externas à API.
- Falha ao carregar o editor encerra o estado pendente e permite tentar novamente.
- Smoke test SSR local em porta 4301 com `NG_ALLOWED_HOSTS=localhost`: páginas de evento abertas repetidamente e páginas de eventos/login renderizaram sem o aviso de XHR. Em produção, configurar a lista explícita dos hosts reais; não usar wildcard para desabilitar essa proteção.

## Plano resumido para o backend

1. **Proteger participantes:** aplicar o resultado de `canEdit` em `ActivitiesEnrollmentsServices.findAllUsersFromActivity`; hoje a variável é calculada, mas não impede consultas sem permissão.
2. **Liberar programação pública:** autorizar GET de `/api/events/{eventId}/activities` na `SecurityConfig`, mantendo a checagem de visibilidade do serviço. Revisar também o GET por slug, que não está na lista pública.
3. **Expor minha inscrição:** retornar estado individual (`subscribed`, `can_subscribe`, motivo) ou criar consulta autenticada específica. Necessário para restaurar botões corretamente após recarga.
4. **Aplicar os três fluxos:** manter `PUBLIC` sem inscrições; `ACTIVITY_REGISTRANTS_ONLY` exige evento + atividade; `INHERITED_FROM_EVENT` cria/remove os vínculos das atividades junto com a inscrição do evento. Validar inscrição ativa, cancelamento e evento encerrado.
5. **Persistir convidados:** adicionar nome e URL da imagem aos DTOs, entidade e respostas; permitir remoção explícita e validar URLs.
6. **Uniformizar validações:** alinhar limite de descrição em POST/PATCH e validar período da atividade em relação ao evento também no servidor.
7. **Impedir conflitos de inscrição:** antes de salvar, buscar as atividades já inscritas pelo usuário no evento e rejeitar intervalos sobrepostos (permitir somente horários adjacentes). Retornar `409` com a atividade conflitante para o frontend atualizar o aviso.

Priorizar autorização e consulta da própria inscrição. As políticas foram integradas conforme o comportamento atual, não conforme uma semântica presumida a partir do nome dos enums.
