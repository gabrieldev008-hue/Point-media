# Requisitos e rastreabilidade

Fontes: solicitação completa do usuário; `../observação.md`; DOCX `Documentação-PI (1).docx`, extraído em 27/10/2026; `Documentação.pdf`, oito páginas, texto extraído dos streams Flate com biblioteca padrão Python. Conferidos os requisitos funcionais e não funcionais de ambas as versões; não encontradas divergências nesses trechos. Preservados todos os originais.

| ID | Requisito | Módulo / fase | Validação prevista ou atual |
|---|---|---|---|
| RF01 | Cadastro público, perfil, links e currículo | auth F1; candidates/files F2 | integração cadastro/login atual; perfil/upload pendentes |
| RF02 | Vagas CRUD, publicação, prazo e fuso | jobs F2–3 | limites exatos do prazo e concorrência pendentes |
| RF03 | Inscrição tardia sem candidatura ativa, talento com consentimento | applications/talent-pool F3 | integração prazo/consentimento pendente |
| RF04 | Talentos sem vaga, filtros, paginação, ordenação | talent-pool F3 | filtros, isolamento, carga pendentes |
| RF05 | Salário, senioridade e tecnologias, pesos por cargo/vaga | screening F4 | compatível, parcial, ausente, pesos pendentes |
| RF06 | Indispensáveis/diferenciais, revisão humana | screening F4 | indispensável desconhecido/não atendido pendente |
| RF07 | Ranking relativo à vaga, explicação e versão | screening F4 | empate, vazio, reprocessamento pendentes |
| RF08 | Três perfis e isolamento no servidor | auth F1 | policy.test.cjs + auth.e2e-spec.ts |
| RF09 | Esteira completa, transições, histórico e notas separadas | applications F5 | fluxo completo e privacidade pendentes |
| RF10 | IA opcional, extração sem invenção, currículo não confiável | ai F6 | fallback/provedor/injeção pendentes |
| RF11 | Indicadores e integração Power BI/GA | analytics F6 | agregação/privacidade pendentes; integração externa não implementada |
| RF12 | Usuários, permissões, configurações e auditoria | auth F1 / admin posterior | criação recrutador atual; restante pendente |
| RN01 | Responsividade, teclado, semântica e WCAG 2.2 AA | web F1/F7 | formulários provisórios; auditoria completa pendente |
| RN02 | Rosa/azul/preto/branco; Fresno/DIN Pro/Freestyle licenciadas | web F7 | mapping de imagens; fontes não fornecidas |
| RN03 | Escala, índices e consultas paginadas | persistence todas | migração inicial; carga futura |
| RN04 | JWT, Argon2, RBAC, validação, rate limit, segredos | auth F1 | 10 testes HTTP com Prisma/SQLite passaram |
| RN05 | Upload PDF/DOCX privado com limites e assinatura | files F2 | conteúdo real, autorização e MIME pendentes |
| RN06 | LGPD: transparência, retenção, exclusão e direitos | transversal | base legal/prazos dependem da organização; operações futuras |

Nenhuma pontuação global de pessoas. Ausência de evidência não significa ausência de competência. Reprovação/contratação sempre humana. A matriz cobre as funcionalidades do PDF/DOCX e ampliações solicitadas.

Mudança de stack autorizada posteriormente pelo usuário: SQLite local substitui PostgreSQL; Docker deixa de ser pré-requisito. Requisitos funcionais e permissões mantidos.
