# Clubes: alinhamento com o backend

Revisão de 16/11/2026, baseada nos controllers, DTOs, serviços e políticas de acesso do repositório local `../ccomp`, em `domain/clubs/{core,members,materials,certificates}`. Nenhum arquivo do backend foi alterado.

## Funcionalidades integradas

| Área | Integração |
| --- | --- |
| Publicação | `PATCH /api/clubs/{id}` com `status`: `DRAFT`, `OPEN` ou `MEMBERS_ONLY`. A data de publicação deixou de determinar a visibilidade. É possível voltar ao rascunho. |
| Capacidade | `max_members` na criação e edição; aceita inteiros não negativos. Vazio na criação significa sem limite; zero impede novas inscrições de membros. Instrutores não entram na contagem. |
| Busca pública | `GET /api/clubs/search?searchTerm=...`, incluindo nome, resumo e conteúdo. Termo mantido na paginação; integrado também à busca global. |
| Meus clubes | Normalização de status, capacidade, imagens e cursores. Participar não concede permissão para editar. |
| Membros | `POST /api/clubs/{id}/members/search` com função/status no corpo e `searchTerm` para nome/e-mail. Ordenação alfabética dos resultados carregados; os filtros aplicados permanecem na paginação. |
| Gestão de vínculos | Adição por e-mail, mudança de função e os cinco estados: ativo, inativo, cancelado, concluído e banido. Conclusão/banimento pedem confirmação. Um banido precisa ser reativado antes de mudar de função. |
| Materiais | `GET /api/clubs/{id}/materials`, `POST /links`, `POST /files`, `GET /{materialId}/file` e `DELETE /{materialId}`. Links HTTP(S), arquivos locais PDF/PNG/JPEG/WebP até 10 MB, download autenticado e paginação. |
| Carga horária | `GET` e `PUT /api/clubs/{id}/certificates/workload`, com horas separadas para membros e instrutores. |
| Certificado próprio | `GET /api/clubs/{id}/certificates/me`, nos detalhes de um clube em que a pessoa tem vínculo. O backend exige participação `COMPLETED`. |
| Emissão pela gestão | `GET /api/clubs/{id}/certificates/members/{recipientId}` e `/instructors/{recipientId}`. Botão junto ao participante concluído, usando o UUID do usuário, não o ID do vínculo. |
| Validação pública | `GET /api/clubs/certificates/validation/{code}` integrado à página `/validar`. Aceita código no caminho ou em `?code=`, como o backend gera no certificado. Consulta certificados de eventos e clubes, distinguindo a origem. |

Materiais e certificados ficam em seções expansíveis. A interface mantém indicadores de carregamento, bloqueia envios duplicados, preserva campos quando há erro e apresenta mensagens junto à ação. Em caso de falha no PATCH posterior à criação, o formulário conserva o ID criado para que uma tentativa não duplique o clube.

## Regras verificadas

- Apenas clubes `OPEN` aparecem na busca pública e aceitam inscrição espontânea.
- Administradores, moderadores e instrutores ativos gerenciam o clube. STAFF pode criar, mas não editar qualquer clube automaticamente.
- Materiais exigem gestor ou participação ativa/concluída; estar autenticado sozinho não concede acesso.
- Certificados exigem vínculo concluído no papel correspondente. A carga horária é registrada na primeira emissão; mudanças posteriores na configuração não alteram certificados emitidos.
- As novas rotas de certificados de clubes geram PNG com modelo padrão. Não existem rotas de personalização de layout de clubes nessa versão.
- O frontend exibe o limite total. Não calcula vagas restantes a partir de uma lista parcial de membros.

## Pendências resumidas para o backend

1. **Expor vínculo e permissões próprios:** devolver papel, status e permissões no `/clubs/me` ou em uma rota de vínculo. Hoje a resposta contém somente os dados do clube, incluindo histórico; o front não pode afirmar se a participação está ativa ou concluída sem uma resposta específica. A gestão é confirmada por uma consulta protegida e a elegibilidade do certificado é validada na emissão.
2. **Permitir remover limite:** distinguir `max_members` omitido de `null` explícito. O mapper atual ignora `null`; limpar o campo não torna um clube novamente ilimitado. O front explica essa limitação e impede um salvamento enganoso.
3. **Identificar a origem na validação:** incluir `event`/`club` no link ou unificar a consulta. Os códigos são gerados em domínios separados. Por enquanto o front consulta ambos e, se houver coincidência, pede para escolher o certificado em vez de mostrar o errado.

## Verificação

Testes de contratos HTTP, permissões, publicação, capacidade, paginação/busca, estados dos membros, materiais e certificados, mais regressões da busca global e validação de certificados de eventos. Build Angular de produção com SSR/prerender.

Os testes usam respostas simuladas conforme o código do backend local. Não foram criados clubes, enviados arquivos nem emitidos certificados reais na API de produção. A homologação com contas reais ainda deve conferir: criar rascunho, publicar, adicionar membro/instrutor, configurar carga horária, concluir participação, baixar e validar certificado; enviar/baixar material; preencher a capacidade e confirmar a rejeição do próximo membro.
