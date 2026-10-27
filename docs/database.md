# Banco de dados

SQLite local; Prisma 6; migrações SQL versionadas, nunca `db push` em deploy.

Fase 1: User (UUID, e-mail normalizado único, hash, Role, active), CandidateProfile (relação 1:1, nome e data de consentimento do banco de talentos), AuthSession (UUID, expiração, revogação, FK), AuditLog (ator opcional, ação, alvo, instante). Índices por usuário/expiração, ator/data e data de auditoria. E-mail é normalizado antes de gravar e CHECK reforça a regra. Sessão não armazena o JWT.

Cadastro + perfil + auditoria são atômicos. Sessão + auditoria de login também. Logout revoga por identificador e usuário. A senha nunca é devolvida pela API.

Fase 2: Skill/CandidateSkill, Experience/Education, Department/JobOpening/JobRequirement e ResumeFile foram implementados com índices e FKs. Migração `202610270002_profiles_jobs` preserva perfis anteriores. Salários são inteiros em centavos; competências têm nomes normalizados e únicos. ResumeFile tem chave privada e unicidade por usuário. JobOpening armazena pesos, criteriaVersion e revision para controle concorrente. Veja [Fase 2](phase2.md).

Evolução futura: Application com unicidade candidato/vaga; ApplicationStageHistory e RecruiterNote; ScreeningConfiguration versionada e ScreeningResult com fatores explicáveis. Serão migrados nas respectivas fases.

Seed fictício cria os três papéis, apenas com senhas explicitamente fornecidas no ambiente. Não sobrescreve contas existentes; o banco de testes precisa ser separado (`TEST_DATABASE_URL`). Não apontar testes para produção.

SQLite: arquivos `pointmedia.db` e `pointmedia_test.db` separados, criados pelo Prisma. IDs UUID são TEXT; datas usam DATETIME, convertidas pelo Prisma; relacionamentos têm FKs e e-mail/Role têm CHECKs. Migração anterior PostgreSQL em `docs/archive/postgresql` é apenas referência. Documentação do conector: https://www.prisma.io/docs/orm/v6/overview/databases/sqlite .
