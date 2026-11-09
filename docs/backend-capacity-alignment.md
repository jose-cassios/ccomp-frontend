# Limite de vagas: alinhamento com o backend

Verificação em 09/11/2026, no checkout local ../ccomp. Nenhum arquivo do backend foi alterado. O OpenAPI de produção respondeu 401; não foi possível confirmar se a versão publicada já contém as rotas ausentes no checkout.

## Integrado no frontend

- Criação de evento e atividade: `max_capacity` no POST, incluindo zero.
- Atividade: limite numérico no PATCH; null não é enviado nesse PATCH porque mantém o limite anterior.
- Campos vazios representam ausência de limite. Valores negativos, fracionários ou acima do Integer são recusados.
- PUTs de capacidade preparados, com mensagem de indisponibilidade se a API responder 404/405/501. Os formulários são preservados; PATCHs anteriores podem já ter sido persistidos.
- Status SOLD_OUT e erros de vagas da API são respeitados. Sem contagem de inscritos, o frontend não inventa vagas restantes.

## Plano do backend

1. Expor PUT /api/events/{eventId}/capacity, chamando EventsServices.updateCapacity: permitir editar/remover o limite.
2. Implementar PUT /api/events/activities/{id}/capacity: null remove o limite; verificar permissão, bloquear o registro durante a alteração e invalidar o cache.
3. Incluir max_capacity no EventDTO e no mapper: restaurar o limite ao reabrir o editor. Distinguir null (sem limite) de campo ausente.
4. Retornar contagem ativa ou vagas restantes nas atividades: mostrar esgotamento antes da tentativa de inscrição, preservando a verificação transacional no backend.

As rotas PUT acima são os contratos preparados no frontend. A rota de atividades é citada em UpdateActivityDTO, mas nenhum dos dois controllers locais expõe esses PUTs ainda. EventsServices.updateCapacity já existe. O POST de evento e o POST/PATCH de atividades possuem o campo maxCapacity; o DTO de atividades já o retorna.

Validação realizada com testes de componentes/contratos HTTP simulados e build do frontend; sem criar eventos ou inscrições em produção.
