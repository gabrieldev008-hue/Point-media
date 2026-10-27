# Arquitetura — Fase 1

Monólito modular NestJS, API REST `/api`, React/Vite e SQLite com Prisma 6. npm workspaces organiza `apps/api`, `apps/web` e `packages/shared`. Node 24 é a versão adotada. Dependências permanecem nas linhas principais explicitadas; o lockfile deverá ser gerado após acesso ao registry, antes de CI/deploy.

Módulos atuais: configuração validada, persistência, autenticação, autorização e saúde. Cadastro público sempre cria CANDIDATE; somente ADMIN cria RECRUITER. Guards globais negam por padrão. O papel é consultado no banco a cada requisição; não confiar em papel vindo do cliente ou de JWT antigo.

JWT de 15 minutos em cookie HttpOnly, SameSite=Lax, Secure em produção; sessão revogável no banco, identificador aleatório, sem token em localStorage. Escritas HTTP exigem Origin igual a WEB_ORIGIN, inclusive login e cadastro. Desenvolvimento usa proxy Vite `/api`, evitando cookies entre origens. HTTPS e proxy de mesma origem são requisitos de produção. Logout revoga a sessão. Não há refresh token nesta fase: autenticar novamente após expirar.

Argon2id protege senhas. ValidationPipe rejeita propriedades extras. Rate limiting global e específico para autenticação; o armazenamento padrão é local ao processo, adequado a uma instância. Escala horizontal exige armazenamento compartilhado. Prisma não devolve hashes ou dados de sessão nos DTOs públicos. Erros têm código/status estável, sem detalhes internos. Auditoria de cadastro, login, logout e criação de recrutador é transacional.

Fase 2 adicionou candidatos, vagas e armazenamento privado. As fases seguintes adicionarão candidaturas, triagem versionada, processos, IA e analytics. Não foram criados endpoints fictícios desses módulos futuros. Veja [entrega da Fase 2](phase2.md).

Decisões: enum Role em vez de tabela de papéis, pois os três perfis são fechados; permissões granulares serão definidas na fase administrativa. Datas persistidas em UTC; apresentação futura em America/Sao_Paulo. Nenhuma publicação externa nesta entrega de fundação local.

Limites: recuperação/verificação de e-mail, MFA, rotação de senha e política de retenção ainda não implementados; bloquear lançamento público até revisão. Seeds dependem de senhas por ambiente, sem credenciais fixas. Não se afirma conformidade LGPD ou WCAG sem avaliação.

## Alteração autorizada: SQLite

A pedido do usuário, SQLite substitui PostgreSQL na Fase 1 para executar sem Docker. Mantidos Prisma, transações, UUIDs gerados pela aplicação, índices e autorização. Removidos tipos nativos exclusivos de PostgreSQL; Role continua enum Prisma, reforçado com CHECK na migração SQLite. Arquivos de banco são privados e ignorados pelo Git. A migração PostgreSQL original foi arquivada, sem apagar dados externos. Não basta mudar DATABASE_URL para voltar a PostgreSQL: requer schema e migrações específicos e migração de dados planejada. Não se promete equivalência de desempenho ou escala horizontal.
