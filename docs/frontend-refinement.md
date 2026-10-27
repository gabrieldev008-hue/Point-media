# Refinamento do frontend — Projeto Integrador (2)

Escopo desta entrega: apresentação visual das funcionalidades já implementadas, sem criar métricas, scores, usuários ou ações fictícias.

## Ajustes

- Entrar.png: tela preta independente, sem cabeçalho/rodapé; marca centralizada, título e subtítulo fora do cartão; cartão claro arredondado; campos altos, botão alinhado à direita e controle de visibilidade da senha acessível por teclado, com aria-pressed e nome atualizado.
- Home.png: fundo em gradiente ocupando toda a largura, conteúdo centralizado, marca, título em duas linhas, faixa azul/rosa, cartão de orientações e quatro cartões informativos; vagas, benefícios, CTA e rodapé nas mesmas regiões da referência. Contagem de vagas vem da API; 300 perfis, 100% e retorno em 48h da imagem não foram apresentados como dados reais.
- Candidatos.png: busca e resumo em uma faixa superior; linhas amplas com nome, senioridade, localização, competências e ação de perfil. Sem scores ou etapas que ainda não existem no sistema.
- Perfil.png e Form.png: avatar, campos em duas colunas, campos de contexto acinzentados; formulário profissional com borda fina escura e cantos arredondados. Conta do RH mantém somente informações disponíveis; edição do perfil profissional permanece na área do candidato.
- Vagas.png: proporções de menu, títulos, cartões, chips de tecnologias, sombras e controles; ações persistentes existentes mantidas. O painel de ranking continua reservado à fase de triagem, sem nomes ou pontuações demonstrativas.
- Entrar-1.png: cadastro de recrutador recebeu tipografia, espaçamentos, contornos e superfícies consistentes. Nome/cargo e seleção de outros papéis da imagem não foram simulados: o endpoint atual cria apenas RH com e-mail e senha, restrito a ADMIN.

## Organização

CSS antigo com regras sobrepostas foi substituído por foundation.css (tokens e base), components.css (campos, cartões e controles) e layouts.css (páginas, menu e responsividade). Brand.tsx centraliza a marca vetorial simples; Home.tsx separa a composição da home das rotas.

Layouts ajustados para desktop, tablet e celular, incluindo viewport de pouca altura. Controles mantêm foco visível e alvos de interação. Textos pequenos usam contraste mais escuro que alguns elementos das imagens para preservar legibilidade.

## Limitações verificáveis

Nenhum arquivo de fonte foi localizado na pasta do projeto. São usadas fontes do sistema, sem baixar ou distribuir Fresno/DIN Pro/Freestyle Script sem licença. Isso impede afirmar equivalência tipográfica exata.

Atualização de identidade solicitada pelo usuário: o PNG de logo enviado foi copiado integralmente para `apps/web/public/branding/point-media.png` e substituiu as marcas desenhadas no código. A fonte principal agora é Poppins, carregada via Google Fonts nos pesos 400–900, com preconnect e display=swap. O download para hospedar a fonte localmente foi bloqueado pela rede da sessão; o navegador precisa acessar Google Fonts para carregar Poppins, usando Segoe UI como fallback. O PNG original foi preservado sem edição.

Chromium do Playwright não está instalado; a tentativa com o Chrome já instalado falhou com spawn EPERM nesta sessão. Portanto, não foi possível comparar capturas reais lado a lado nem medir o layout renderizado em navegador. O refinamento foi feito pela inspeção das referências e do código; não é anunciado como pixel-perfect.

Build portátil, typecheck, lint e os dois smokes da interface com API real em DOM simulado foram executados após as alterações. Login/logout, perfil/currículo e criação/publicação de vaga permanecem funcionais. Testes de DOM não substituem a validação visual em navegador.
