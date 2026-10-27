# Referências visuais

Foram encontradas imagens exportadas em `../../Projeto Integrador` (6 arquivos) e `../../Projeto Integrador (2)` (16 arquivos). Não há conexão Figma ativa. Os arquivos originais ficam intactos.

| Referência no segundo diretório | Fluxo / módulo | Entrega |
|---|---|---|
| Home.png, Banco.png | público / banco de talentos | F2–3/F7 |
| Entrar.png, Entrar-1.png, Confirmação.png | autenticação | F1 funcional provisória; fidelidade F7 |
| Form.png, Perfil.png | candidato / perfil e currículo | F2/F7 |
| Dashboard.png | RH / indicadores | F6/F7 |
| Vagas.png | RH / vagas | F2/F7 |
| Candidatos.png, Talentos.png | RH / busca | F3/F7 |
| Triagem.png, Triagem - Modal perfil candidato.png | RH / ranking | F4–5/F7 |
| Admin - Dashboard Administrativo.png | administração | fase administrativa/F7 |
| Admin - Gerenciamento de Usuários.png | usuários e papéis | criação de recrutador F1; demais ações futuras |
| Admin - Métricas gerais.png | analytics | F6/F7 |

Inventário feito; `Entrar.png` inspecionado: fundo preto, formulário claro centralizado, acentos rosa/azul, campos grandes com bordas arredondadas. Inspeção das demais telas e extração de tokens ainda pendentes. Nesta fase telas deliberadamente simples, identificadas como provisórias. Não inferir que uma imagem permite extrair estados, fluxos ou métricas exatas. Fontes comerciais não incluídas. Nenhum requisito funcional será removido para se ajustar a uma imagem.

Atualização F2: inspecionados Home.png, Form.png, Banco.png, Perfil.png, Candidatos.png e Vagas.png da pasta principal indicada pelo usuário. Aplicados menu preto, painéis brancos, tokens rosa/azul, campos arredondados, hero em gradiente e organização das listagens. Frontend usa somente dados persistidos; métricas 300/48h e scores exemplificados nas imagens não foram reproduzidos como números reais.

Refinamento visual posterior: Entrar.png, Entrar-1.png e Admin - Gerenciamento de Usuários.png também revisados. Login reconstruído na estrutura da referência, home com fundo de largura total e seções completas, menu e cartões redimensionados, CSS reorganizado. Veja [comparação de escopo e limitações](frontend-refinement.md).

Divergências registradas: Perfil.png representa recrutador, portanto a edição profissional de candidato foi baseada em Form.png/Banco.png. A imagem combina consentimento para processo e retenção; a implementação mantém consentimento de futuras oportunidades opcional. Vagas.png contém ranking/aprovação, funcionalidades reservadas a F4/F5. Form.png representa candidatura; F2 oferece atualização do perfil e deixa claro que a inscrição específica ainda não ocorre. Fresno/DIN Pro/Freestyle Script não foram usadas sem arquivos/licença. Não há alegação de comparação visual em navegador real.

Divergência funcional identificada: imagem de login inclui recuperação de senha; a fundação ainda não tem provedor de e-mail nem fluxo seguro de recuperação. Não foi colocado um link sem funcionamento. Implementar tokens de uso único, expiração e proteção contra enumeração antes de habilitar esse fluxo.
