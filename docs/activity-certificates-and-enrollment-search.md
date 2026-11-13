# Certificados de atividades e busca de inscritos — 13/11/2026

Backend local `../ccomp` consultado sem alterações.

## Participante

Na programação da página do evento, cada atividade encerrada na qual a pessoa está inscrita verifica seu certificado por `GET /events/activities/{activityId}/certificate`. O link **Solicitar certificado** só aparece após resposta bem-sucedida. A API exige inscrição ativa, check-in do evento e presença específica na atividade.

O frontend usa o término e o fuso da atividade; não espera o encerramento do evento. Eventos cancelados, visitantes, pessoas sem inscrição e falhas na consulta de inscrições não iniciam essa verificação. A data precisa estar informada e ser válida.

A listagem `my-subscriptions` não informa presença ou elegibilidade. Por isso, a verificação atual usa a própria emissão: o arquivo fica somente em memória e o link baixa esse resultado, sem outra requisição. Somente atividades exibidas na programação são verificadas. Não há consulta a listas privadas de inscritos para participantes comuns.

Se a presença ainda não estiver confirmada, há uma opção para atualizar a situação; voltar à janela também permite nova consulta após 30 segundos. Isso contempla o check-in do evento que o backend atualiza de forma assíncrona. A troca de conta/atividade cancela a consulta anterior e remove o arquivo antigo da memória.

## Gestão de inscritos

**Inscritos e presenças → Buscar inscrito por nome** utiliza `GET /events/activities/{activityId}/enrollments?searchTerm=...`. A busca ocorre na API, abrangendo registros além da primeira página; também pode encontrar emails conforme o backend. Novas buscas reiniciam o cursor. “Mais inscritos” mantém o mesmo termo.

Os resultados carregados são exibidos em ordem alfabética portuguesa, ignorando diferença de caixa e acentos na ordenação. Quando há mais páginas, a interface informa que a ordem se refere aos resultados carregados. O cursor original da API é preservado: o backend atualmente pagina por relevância/data, não por nome.

## Plano resumido para o backend

- **Consultar elegibilidade própria:** retornar inscrição, presença e disponibilidade sem gerar a imagem do certificado.
- **Validar término na emissão:** impedir certificado antes do fim da atividade, inclusive para clientes diferentes do frontend. O serviço atual verifica inscrição/presença, mas não o horário final nem cancelamento do evento nesse fluxo.
- **Paginar por nome:** oferecer ordenação alfabética com cursor compatível, para ordenar a lista completa sem carregar todos os inscritos.

## Validação

Testes com contratos HTTP simulados cobrem horário/fuso, presença rejeitada, arquivos liberados somente após confirmação, troca de conta, falhas, filtros, paginação e ordenação. Nenhum certificado foi emitido em produção durante os testes.
