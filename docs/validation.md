# Validação da Fase 1 — 27/10/2026

## Estado atual

Fase 2 implementada: perfil profissional, arquivos privados, candidatos e vagas. Passaram 40 testes (5 políticas, 5 banco/migrações, 8 unitários e 22 HTTP). Foram executados também os dois smokes da interface compilada em DOM simulado com API real. Typecheck, lint e build portátil passaram. A segunda migração foi aplicada com backup SQLite prévio. Detalhes, cobertura e limites em [phase2.md](phase2.md).

Atualização mais recente: o frontend foi compilado pelo build portátil e servido junto da API em http://localhost:5173. Um teste executando o JavaScript gerado em DOM simulado passou por login do candidato, navegação para a conta, proteção HttpOnly e logout com API/SQLite reais. O teste não é navegador real. Vitest e Playwright permanecem pendentes.

SQLite é o banco autorizado pelo usuário; Docker/PostgreSQL não são pré-requisitos. Vitest e testes em navegador real ainda estão pendentes. Os resultados abaixo desta atualização registram o histórico da fundação.

## Resultados executados

- 5 testes de políticas compartilhadas passaram.
- 3 testes do SQL SQLite passaram: persistência em disco após reabrir, unicidade/CHECKs e integridade referencial/cascatas.
- 5 testes Jest de configuração passaram.
- 10 testes de integração HTTP passaram com NestJS, Prisma, Argon2 e SQLite reais: cadastro, e-mail duplicado, cookie HttpOnly, credenciais incorretas, RBAC, origem, JWT alterado, sessão expirada/revogada, usuário inativo, ADMIN criando recrutador e rate limit.
- A integração prepara o SQL versionado em arquivo temporário exclusivo e remove esse arquivo após fechar a API; não altera o banco local do usuário. Não equivale a executar o motor de migração Prisma.
- `npm run typecheck`: API, testes, seed e frontend passaram.
- `npm run lint`: passou.
- `npm run build -w @pointmedia/api`: passou.
- Prisma validate e generate passaram usando os binários locais instalados.
- Confirmado no banco local que `_prisma_migrations` registra a migração concluída, sem rollback, e com SHA-256 igual ao SQL atual. Isso verifica o estado encontrado; o comando migrate deploy continuou bloqueado dentro desta sessão.
- API compilada iniciou; GET `/api/health/ready` retornou `{"status":"ready"}`.
- Corrigido seed: Prisma upsert exige `create`, e não `data`.
- `npm run env:setup` gerou as três senhas vazias, sem exibir os valores nem alterar JWT_SECRET. `npm run db:seed` executou duas vezes sem erro.
- Login, consulta da própria sessão e logout dos três perfis do seed foram comprovados por chamadas HTTP reais, usando segredos do ambiente sem imprimi-los.

Total automatizado aprovado: 23 testes. A suíte completa `npm test` ainda não está aprovada, pois o Vitest não inicia neste ambiente.

## Impedimentos atuais

- O fluxo padrão Vite/esbuild e Vitest falha com `spawn EPERM`. Foi acrescentado um build portátil explícito via Vite/Rollup e TypeScript instalado, mantendo typecheck, Tailwind, fonte e API reais. Ele compilou 188 módulos e gerou HTML, CSS e JavaScript sem minificação. Não é alegada equivalência de otimização, HMR ou de testes de navegador.
- Prisma migrate deploy falhou com `spawn EPERM` no schema-engine. O arquivo local já apresenta migração aplicada; não foi recriado nem apagado.
- Playwright ainda não executado, pois depende do frontend iniciado. Fidelidade visual e acessibilidade não foram declaradas aprovadas.

## Histórico relevante

Inicialmente não havia dependências nem lockfile e npm falhava com ENOTCACHED/ECONNREFUSED no proxy 127.0.0.1:9. Depois surgiram pacotes e lockfile na pasta; nova tentativa de instalação encontrou erro interno do npm/Arborist. A instalação existente foi preservada.

A primeira execução do runner nativo falhou por spawn EPERM; usar `--test-isolation=none` permitiu os testes unitários sem subprocessos. As primeiras verificações eram somente de sintaxe; agora o typecheck completo passou.

Foram lidos observação.md, DOCX e os streams textuais das oito páginas do PDF. Inventariadas 22 imagens, com inspeção inicial de Entrar.png; a análise visual das demais continua pendente. Originais preservados e referências PostgreSQL arquivadas.

## Próximo passo

No terminal normal do VS Code, execute `npm run dev`, abra http://localhost:5173 e rode build, Vitest e Playwright. As contas são admin@example.test, rh@example.test e candidato@example.test, com as respectivas senhas SEED_*_PASSWORD no `.env`. Não compartilhe esse arquivo. Resolver falhas reais desses comandos antes de considerar a fase integralmente validada.
