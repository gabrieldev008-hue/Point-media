# Point Media — Banco de Talentos

Aplicação local com Fases 1 e 2 implementadas. Monorepositório NestJS + React/Vite + SQLite/Prisma. Os arquivos originais estão preservados fora desta pasta.

## Estado real

Cadastro, autenticação, sessões revogáveis, RBAC e criação de recrutador por administrador. Perfil profissional editável, experiências/formação, upload/download privado de PDF e DOCX, consulta de candidatos pelo RH e CRUD de vagas com requisitos, pesos, publicação e prazos. Frontend integrado e adaptado às referências de `Projeto Integrador (2)`. Candidaturas e ranking pertencem às próximas fases.

SQLite substituiu PostgreSQL a pedido do usuário; Docker não é necessário. Backend e frontend compilados, banco pronto e seed executado. Passaram 40 testes e dois smokes do bundle com API real em DOM simulado. Typecheck e lint aprovados. Playwright e Vitest continuam pendentes pelo bloqueio de subprocessos nesta sessão. Consulte [validação](docs/validation.md).

## Executar no Windows / PowerShell

Use Node.js 24 LTS e Git. SQLite funciona como arquivo local, sem Docker e sem instalar um servidor de banco. A partir desta pasta:

```powershell
npm run env:setup
```

O comando cria `.env` quando necessário e gera apenas o `JWT_SECRET` e as três senhas `SEED_*_PASSWORD` que estiverem vazios. Valores existentes são preservados. Senhas já preenchidas com tamanho inválido precisam ser corrigidas manualmente. Consulte as senhas no `.env`, sem compartilhar o arquivo. Use `DATABASE_URL=file:./pointmedia.db` e `TEST_DATABASE_URL=file:./pointmedia_test.db`.

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Se o motor de migração Prisma não puder iniciar nesta sessão, `npm run db:migrate:local` aplica as mesmas migrações em transação e cria um backup SQLite privado antes da alteração. Não é destinado a produção. Veja [Fase 2](docs/phase2.md).

Após instalar, revise e versione o `package-lock.json` gerado. Frontend: http://localhost:5173; API: http://127.0.0.1:3000/api; Swagger em desenvolvimento: http://127.0.0.1:3000/api/docs. Use `localhost:5173` no navegador para corresponder a WEB_ORIGIN. Não abra a aplicação em `127.0.0.1:5173` sem ajustar a origem.

Em ambientes que bloqueiam subprocessos do esbuild, existe também um build local via Vite/Rollup e TypeScript no mesmo processo:

```powershell
npm run build:portable
npm run start:local
```

O build portátil mantém typecheck e usa o mesmo código da aplicação, Tailwind e API. Gera bundle sem minificação para teste local, sem expor variáveis de ambiente do backend. Ele substitui apenas a transformação JavaScript do esbuild por TypeScript e aplica valores fixos de ambiente de produção ao código cliente; não é o caminho de deploy nem oferece HMR. Os comandos normais de Vite continuam disponíveis. Com o servidor local iniciado, `npm run test:local-ui` verifica o bundle com API real e cookies em DOM simulado, sem substituir Playwright ou revisão visual.

`npm run test:phase2-ui` verifica edição do perfil, upload, criação/publicação de vaga e exclusão do candidato no DOM simulado com API real. Usa dados fictícios próprios e os remove ao final. Na área do candidato, acesse “meu perfil”; no RH, “candidatos” e “vagas”.

Contas fictícias do seed: `admin@example.test`, `rh@example.test`, `candidato@example.test`; senhas são as fornecidas por você no ambiente. Seed não altera senhas de contas existentes. Não executar seed em produção.

## Verificação

```powershell
npm run test:policy
npm run typecheck
npm run lint
npm run build
npm test
```

Os testes HTTP criam e removem seu próprio arquivo SQLite temporário. O E2E usa o arquivo separado configurado em `TEST_DATABASE_URL`, com nome terminado em `_test.db`:

```powershell
npm run test:database
npm run test:integration
npx playwright install chromium
npm run test:e2e
```

A integração aplica o SQL versionado ao arquivo temporário e usa Prisma e HTTP reais; isso não substitui validar `prisma migrate deploy` separadamente. E2E deixa contas fictícias no banco de teste; nunca use banco real nos testes. Playwright inicia API/Vite e migra o banco de teste automaticamente; feche outros servidores nas portas 3000/5173 antes do E2E.

## Endpoints da fundação

| Método / rota | Acesso |
|---|---|
| POST `/api/auth/register` | público, sempre CANDIDATE |
| POST `/api/auth/login` | público |
| GET `/api/auth/me` | três perfis autenticados |
| POST `/api/auth/logout` | três perfis autenticados |
| POST `/api/admin/recruiters` | ADMIN |
| GET `/api/health/live` e `/ready` | público, resposta sem dados sensíveis |
| GET/PUT/DELETE `/api/candidates/me` | candidato; exclusão exige senha atual |
| POST/DELETE `/api/candidates/me/resume` | candidato, arquivo até 5 MB |
| GET `/api/resumes/:id` | proprietário ou RH/ADMIN |
| GET `/api/candidates` e `/:id` | RH/ADMIN, lista paginada e detalhe |
| GET `/api/jobs` e `/:id` | público, apenas vagas publicadas dentro do prazo |
| GET/POST `/api/recruitment/jobs` | RH/ADMIN |
| GET/PUT/DELETE `/api/recruitment/jobs/:id` | RH/ADMIN; somente rascunhos excluíveis |
| PATCH `/api/recruitment/jobs/:id/status` | RH/ADMIN, transição e revision validadas |

Escritas exigem header Origin igual a WEB_ORIGIN; o navegador envia automaticamente. Autenticação usa cookie HttpOnly, não token em localStorage. Para clientes HTTP/Swagger, enviar Origin explicitamente. Logout depende de sessão válida; sessões expiram após 15 minutos. Rate limit de login: 10/min; cadastro: 5/min; demais rotas 120/min por IP/processo.

## Estrutura e decisões

- [Arquitetura](docs/architecture.md)
- [Requisitos e testes por fase](docs/requirements.md)
- [Modelo relacional](docs/database.md)
- [Referências Figma](docs/figma-mapping.md)
- [Plano incremental](docs/implementation-plan.md)
- [Validação e impedimentos](docs/validation.md)

Produção requer HTTPS com proxy de mesma origem para `/api`, backup consistente do arquivo SQLite (ou uma futura migração explícita para PostgreSQL), segredos externos, execução de `prisma migrate deploy` e revisão de retenção/LGPD. API escuta apenas loopback nesta base local; adapte bind/reverse proxy ao preparar deploy. Não há publicação automática.

## Banco local SQLite

O Prisma 6 resolve `file:./pointmedia.db` em relação a `apps/api/prisma/schema.prisma`; o arquivo fica em `apps/api/prisma/pointmedia.db`. `npm run db:migrate` cria o arquivo e aplica o SQL versionado. Nenhum dado de um eventual PostgreSQL é convertido automaticamente. A referência anterior está em `docs/archive/postgresql`; `docker-compose.yml` foi preservado como material legado e não participa da execução SQLite.

SQLite mantém os dados após reiniciar o app. Não versione nem compartilhe o `.db`: contém dados privados. Planejar backup e concorrência antes de uso com múltiplas instâncias.

## License

See [LICENSE](LICENSE), preserved from the GitHub repository.
