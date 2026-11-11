# Integração de eventos — 11/11/2026

Contratos conferidos no backend local `../ccomp`, sem alterar seus arquivos.

- **Credenciamento manual:** `POST /events/{id}/credentials/manual/search`, `POST /events/{id}/credentials/manual` e `GET /events/{id}/credentials/summary`. Disponível na etapa de pessoas. Após confirmar, atualiza a lista de inscritos e o resumo. Registra estação e operador; também confirma o check-in do evento quando necessário. Inscrições canceladas/bloqueadas não são elegíveis. QR do evento permanece fora da interface porque o controller o marca como DEV.
- **Inscritos por atividade:** `GET /events/activities/{id}/enrollments?cursor=...`. Seção restrita ao responsável, editor ativo, administrador ou moderador. Interpreta `have_check_in` e mantém paginação. Usuários comuns não recebem a interface nem fazem a consulta de inscritos.
- **Vagas públicas:** `GET /events/activities/{id}/enrollments/summary`. Exibe `current_enrollments / max_capacity`; limite nulo aparece como “sem limite”. Consulta novamente após inscrição/cancelamento e conflitos. Falhas não são apresentadas como zero vagas. O backend informa que o resumo pode ter consistência eventual; a inscrição continua sujeita à validação transacional da API.
- **Certificados:** a configuração do evento aceita `workload_hours` e `team_certificate_workload_hours` no PATCH. O certificado geral soma horas base e atividades com presença. A emissão exige evento encerrado, não cancelado, e check-in do participante no evento; a verificação definitiva permanece no backend. Equipe e ministrantes mantêm seus certificados próprios. O frontend informa indisponibilidade antes do encerramento/cancelamento e ausência de carga horária da equipe.
- O QR de atividade continua registrando presença específica e atualizando o check-in do evento. O backend envia o email de disponibilidade; não foi criado um segundo envio pelo frontend. Mantido o link de certificado geral, sem reintroduzir botões de download por atividade.

Validação: testes automatizados de componentes e contratos HTTP simulados, TypeScript e build de produção. Não foram feitos credenciamentos, inscrições ou emissões em produção para testar.
