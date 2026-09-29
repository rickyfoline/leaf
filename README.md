# Leaf

App de celular para registrar, avaliar e comentar livros, um "Letterboxd de livros".
Feito com **Expo (SDK 57) + React Native + TypeScript**, com navegação pelo Expo Router.

Nesta versão os dados ficam **no próprio celular**, num banco SQLite local. Backend, contas online e cobrança real vêm depois (veja "Próximos passos").

## Como rodar

Pré-requisitos: [Node.js 22](https://nodejs.org) ou mais novo e o app **Expo Go** no celular ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).

```bash
git clone https://github.com/rickyfoline/leaf.git
cd leaf
npm install
npx expo start
```

Aparece um QR code no terminal:

- **iPhone:** abra a Câmera e aponte para o QR code.
- **Android:** abra o Expo Go e toque em "Scan QR code".

O celular e o computador precisam estar na mesma rede Wi-Fi. Se a rede bloquear, use `npx expo start --tunnel`.

Outras formas:

| Comando | O que faz |
|---|---|
| `npx expo start --ios` | Abre no simulador do iPhone (precisa de um Mac com Xcode) |
| `npx expo start --android` | Abre no emulador Android (precisa do Android Studio) |
| `npx expo start --web` | Prévia no navegador (bom para olhar as telas; a câmera não funciona) |

Na primeira abertura, faça login com qualquer e-mail e uma senha de 6+ caracteres (a conta fica só no aparelho) ou toque em **Browse as guest**. O app já vem com uma estante de exemplo; dá para zerar em Settings › Reset example library.

### Verificações

```bash
npm test            # testes do banco e das estatísticas (Jest)
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

## O que tem no app

Todas as telas do protótipo web, agora nativas:

- **Login / cadastro** (local), com opção de entrar como convidado.
- **Home:** carrossel de capas, "Reading Now" com progresso de páginas, Wishreads e sugestões de clubes.
- **Busca:** por título, autor, gênero ou ISBN; gêneros, "Best sellers in Brazil" (os 20 da lista da Amazon), Trending e listas (Top Rated, From Pages to Screen, Most Anticipated). Filtros por tamanho e "não lido" são Leaf Plus.
- **Página do livro:** nota geral, histograma, nota dos amigos (Plus), Read / Want to read / Reading, **página atual** com +/−, sinopse, reviews com spoiler escondido e curtidas, e o **botão de compra da Amazon** com link de afiliado e o aviso de Associado.
- **Adicionar livro (+):** busca, status, nota com **meia estrela**, favorito, datas, review, spoiler, compartilhar nos clubes, tags e **leitura do código de barras (ISBN)** pela câmera (Plus).
- **Comunidade:** clubes (entrar, sair, criar; privado é Plus), discussões, enquetes e buddy read com **proteção contra spoiler por página** (Plus).
- **Perfil:** total de páginas lidas (livros terminados + página atual dos que estão em leitura), estatísticas por mês e gênero (Plus), favoritos (3 grátis, 10 no Plus), meta anual, reviews e estante.
- **Configurações:** país da loja, metas, tema do perfil (Plus), importar do Goodreads e exportar CSV (Plus).
- **Leaf Plus (simulado):** planos mensal R$ 9,90, anual R$ 79 e Mecenas R$ 179, teste de 7 dias e oferta depois do 3º livro registrado. **Nada é cobrado.**
- **Retrospectiva do ano** para compartilhar (completa no Plus).

A interface está em inglês, igual ao high fidelity do Figma.

## Banco de dados: obra × edição

O ponto principal do modelo, pensando no lançamento em vários países:

- **`works` (obra):** o livro em si. As **avaliações, reviews e discussões** ficam aqui. "Verity" é uma obra só, no mundo todo.
- **`editions` (edição):** uma impressão vendida em um país: `country`, idioma, título impresso, editora, **ISBN**, **ASIN** e nº de páginas. O **link de compra** sai daqui.

O app mostra a edição do país escolhido em Settings (na primeira abertura, o país do celular). Se a loja do país vende exatamente aquela edição, o botão abre a página do produto (`/dp/ASIN`). Se não, abre uma busca na Amazon daquele país, que também leva a tag de afiliado. Países sem loja Amazon caem na loja dos EUA.

Outras tabelas: `shelf` (estante do leitor), `reviews`, `likes`, `clubs`, `club_members`, `posts`, `poll_options`, `poll_votes`, `charts` (mais vendidos por país) e `kv` (configurações e estado do Plus). O esquema completo, comentado, está em [`src/db/schema.ts`](src/db/schema.ts). Ele foi escrito para virar Postgres (Supabase, por exemplo) quase sem mudança.

## Amazon e afiliados

- Os 20 mais vendidos (Nielsen-PublishNews, agosto de 2026) estão em [`src/data/amazon-br-bestsellers-2026-08.json`](src/data/amazon-br-bestsellers-2026-08.json). Para trocar a lista, substitua esse arquivo e apague o app do celular (ou use um banco novo) para semear de novo.
- As lojas e tags por país ficam em [`src/lib/affiliate.ts`](src/lib/affiliate.ts). **A tag do Brasil ainda é provisória (`SUA_TAG-20`)**: troque pela tag real antes de publicar. Os outros países estão sem tag até as contas existirem.
- As capas vêm da URL por ASIN da Amazon e não foram verificadas. Se uma capa não carregar, o app mostra uma capa desenhada com o título.
- O app não mostra preço: preço só pode vir da API da Amazon.
- Nº de páginas e sinopse dos livros brasileiros ficam vazios até termos uma API de catálogo. Enquanto isso, quem está lendo informa o total de páginas da sua cópia.

## Estrutura

```
src/
  app/            telas (Expo Router): (tabs)/ home, busca, comunidade, perfil; book/[id], add, scan, settings, plus, recap, new-club, login
  components/     botões, capas, estrelas, cards, barra superior
  db/             schema.ts (SQL), migrate.ts (migrações + dados iniciais), repo.ts (consultas)
  data/           catálogo de exemplo e lista da Amazon
  lib/            afiliados, estatísticas de leitura, CSV/Goodreads, planos do Plus
  state/          contexto do app (banco, configurações, avisos)
  __tests__/      testes (rodam o SQL de verdade no SQLite do Node)
```

## Próximos passos

1. **Backend** (Supabase ou Firebase): contas com e-mail, Google e Sign in with Apple; sincronizar `shelf`, `reviews`, `clubs` e `posts`.
2. **Catálogo:** Open Library ou ISBNdb para obras e edições; Creators API da Amazon (liberada após 10 vendas em 30 dias) para capas e links.
3. **Cobrança real do Leaf Plus** pelas lojas, com RevenueCat. Os recursos já estão separados em grátis e Plus.
4. **Publicar:** `npx eas-cli build` gera os apps para a App Store e o Google Play. O leitor de código de barras e o SQLite funcionam no Expo Go; um build próprio só é necessário para publicar.
