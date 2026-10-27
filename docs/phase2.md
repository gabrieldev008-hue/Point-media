# Fase 2 — candidatos, arquivos e vagas

Continuação autorizada pelo usuário após a entrega da fundação. Stack local mantém SQLite, sem Docker. Referência visual principal: `Projeto Integrador (2)`.

## Entregue

- Candidato: leitura e edição do próprio perfil, telefone, localização, URLs HTTPS, senioridade opcional, pretensão salarial opcional em centavos, competências normalizadas, experiências e formação em tabelas relacionais; consentimento opcional com registro de data, preservado em edições e removido na retirada.
- Exclusão da própria conta mediante senha atual: perfil, experiências, formação, sessões e metadados de currículo removidos em transação; arquivo privado removido após commit. Auditoria mantém ação/UUID sem nome, e-mail ou conteúdo de currículo. Política de retenção ainda depende da empresa.
- RH/ADMIN: consulta paginada de candidatos, pesquisa por nome, detalhe profissional e download autorizado. Não há pontuação nem etapas inventadas nos cartões.
- Vagas: rascunho, edição, publicação, encerramento e cancelamento; exclusão apenas de rascunhos, preservando auditoria. RH e ADMIN podem gerenciar todas as vagas nesta fase. Edições usam revision para impedir sobrescrita concorrente.
- Requisitos separados em tecnologias e outros critérios, indispensáveis/diferenciais. Pesos editáveis somando 100% e criteriaVersion incremental. O motor de triagem e os snapshots históricos completos serão entregues na Fase 4.
- Datas com fuso obrigatório no backend; formulário converte o horário de America/Sao_Paulo para UTC com Intl. Consulta pública filtra abertura e encerramento; no instante exato do prazo a vaga é efetivamente encerrada, mesmo que o status persistido aguarde encerramento explícito. Não há reabertura de vagas encerradas.
- Frontend conectado, com layouts responsivos baseados em Home, Form, Perfil, Candidatos e Vagas: menu lateral preto, superfícies claras, rosa e azul, formulários com validação e feedback, confirmação para ações destrutivas. Fontes comerciais permanecem substituídas por fontes do sistema; não se afirma fidelidade pixel a pixel nem conformidade WCAG auditada.

## Currículos privados

Rotas usam FileInterceptor do Nest/Express com limite de um arquivo e 5 MB durante a recepção. Validação exige extensão e MIME correspondentes; PDF 1.x/2.0 tem assinatura e terminador verificados. DOCX exige ZIP íntegro, CRC, entradas OOXML mínimas, sem caminhos relativos, arquivos executáveis, macros, criptografia ou arquivos multidisco; até 128 entradas e 20 MB descomprimidos. A validação estrutural não equivale a antivírus nem leitura semântica integral de PDF.

Arquivos recebem identificadores UUID independentes do nome original e ficam em `uploads/private`, fora de `apps/web/dist`. LocalPrivateStorage implementa uma abstração substituível por armazenamento de objetos. Downloads exigem sessão e papel; candidato acessa somente seu arquivo, com 404 para arquivos de terceiros. Respostas usam attachment, no-store e nosniff. Nenhuma URL pública ou chave de armazenamento é retornada.

Atualizações substituem o arquivo anterior; erros de transação limpam o novo arquivo. Falha de remoção física após commit é registrada sem caminho/PII e exige manutenção de armazenamento. Análise antimalware e reconciliação de órfãos devem ser incorporadas antes de uso público. IA ainda não recebe ou interpreta documentos nesta fase.

## Persistência e execução local

Migração `202610270002_profiles_jobs` preserva os candidatos e consentimentos existentes. Teste específico comprova essa preservação. Novas tabelas: Skill, CandidateSkill, Experience, Education, ResumeFile, Department, JobOpening, JobRequirement.

`npm run db:migrate:local` aplica SQL versionado sem subprocesso e cria backup SQLite antes de alterar um arquivo existente. Confere SHA-256 de migrações aplicadas, rejeita migrações incompletas ou alteradas, usa transação e foreign_key_check, e registra `_prisma_migrations`. Testes comprovam idempotência e rollback. Restringe-se ao banco dentro do projeto e não permite NODE_ENV=production. `prisma migrate deploy` continua sendo o caminho padrão fora desta sessão restrita.

## Validação executada

- 5 testes de políticas compartilhadas.
- 5 testes SQLite/migrações.
- 8 testes unitários da API.
- 22 testes HTTP com Nest, Prisma, Argon2 e banco SQLite real, incluindo autorização, upload PDF/DOCX, spoofing, limite de tamanho, arquivo de terceiro, substituição, exclusão e prazos.
- Build portátil da API e do frontend concluído, typecheck completo e lint aprovados.
- Smoke da interface compilada em DOM simulado, usando API real: edição de perfil/experiência/salário, upload privado, RH criando/publicando vaga e consulta pública, exclusão do candidato e revogação da sessão. Dados fictícios criados pelo smoke são removidos ao final.

Vitest e Playwright continuam bloqueados pelo ambiente de subprocessos. O smoke não substitui navegador real, comparação de capturas ou auditoria de acessibilidade.

## Próxima fase

Fase 3: candidaturas únicas por vaga/candidato, prazos transacionais, inscrições tardias destinadas ao banco somente mediante consentimento, consultas das próprias candidaturas e pesquisa do banco de talentos. As páginas públicas desta entrega deixam explícito que criar/editar perfil ainda não constitui candidatura. Não foi implementado botão de candidatura sem operação real.
