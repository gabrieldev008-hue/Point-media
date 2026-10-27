# Plano incremental

Estado: F1 entregue; F2 implementada após o usuário pedir continuação, com cobertura HTTP e smoke da UI conectada. Revisão em navegador real ainda pendente por restrição ambiental. F3 não iniciada; próxima entrega é candidatura/banco de talentos. Resultados e limitações em phase2.md.

1. Fundação atual: workspaces, Nest, React, SQLite (alteração solicitada), Prisma/migração/seed, JWT/Argon2, Guards, auditoria, validação, ambiente, testes e documentação.
2. Candidatos/vagas/upload privado; reproduzir referências quando analisadas.
3. Candidaturas com prazo transacional e consentimento; banco de talentos paginado.
4. Compatibilidade determinística explicada e versionada; oito cenários solicitados.
5. Esteira/histórico/notas privadas e status público.
6. IA opcional e indicadores; integrações analíticas configuráveis sem dados sensíveis.
7. Fidelidade visual, acessibilidade e responsividade.
8. E2E de todo fluxo, segurança e deploy.

Critério de saída F1: dependências instaladas e lockfile; prisma validate/generate; migração real SQLite; seed; build/lint; testes unitários e HTTP com banco; testes de frontend; teste de navegador. Impedimentos ambientais não contam como validação concluída. Somente após revisão e autorização do usuário iniciar F2, conforme observação.md.
