# Fercoi 2026 — Dashboard de Pedidos

Dashboard estático (HTML/CSS/JS puro) para acompanhar faturamento, comissões
e pedidos da Fercoi em 2026, com tema claro/escuro e CRUD de pedidos
sincronizado via GitHub.

## Estrutura do projeto

```
SalesFercoi2026/
├── index.html          # App (Dashboard + Pedidos)
├── css/style.css        # Estilos (temas claro/escuro)
├── js/
│   ├── config.js        # Config local (tema, sincronização)
│   ├── github.js         # Leitura/gravação via GitHub Contents API
│   ├── store.js          # Dados em memória + regra de competência
│   ├── charts.js          # Gráficos (Chart.js)
│   ├── pedidos.js          # Tabela e CRUD
│   └── main.js              # Inicialização
└── data/orders.json     # Base de pedidos (157 registros migrados da planilha)
```

## Regra de "mês de competência"

Vendas de **26 do mês anterior até 25 do mês corrente** entram na competência
do mês corrente. Exemplo: uma venda em 26/03 a 25/04 conta para a competência
de **Abril**. Essa regra é aplicada automaticamente pelo dashboard a partir da
"Data" de cada pedido — não é preciso marcar o mês manualmente.

## 1. Publicar no GitHub Pages

1. Suba esta pasta para o repositório `SalesFercoi2026` (branch `main`).
2. No GitHub, vá em **Settings → Pages**.
3. Em "Build and deployment", selecione **Deploy from a branch**, branch
   `main`, pasta `/ (root)`. Salve.
4. Após alguns minutos o site ficará disponível em algo como:
   `https://<seu-usuario>.github.io/SalesFercoi2026/`

A leitura do dashboard funciona automaticamente a partir do arquivo
`data/orders.json` publicado — **nenhum token é necessário apenas para
visualizar**.

## 2. Configurar a sincronização (Token) — uma vez por perfil/computador

Para **adicionar, editar ou excluir pedidos** e gravar essas mudanças de
volta no repositório (para que os outros perfis vejam a atualização), cada
perfil precisa configurar seu próprio token de acesso. O token fica salvo
**somente no navegador daquele perfil** (localStorage) — nunca é enviado a
nenhum servidor além do GitHub.

### Criar um Personal Access Token (fine-grained)

1. Acesse https://github.com/settings/personal-access-tokens/new
2. Em **Repository access**, escolha **Only select repositories** e marque
   `SalesFercoi2026`.
3. Em **Permissions → Repository permissions**, defina **Contents** como
   **Read and write**.
4. Defina uma validade (ex.: 1 ano) e gere o token.
5. Copie o token (começa com `github_pat_...`) — ele só é exibido uma vez.

### Configurar no dashboard

1. Abra o dashboard publicado.
2. Clique em **Sincronização** (menu lateral).
3. Preencha:
   - **Usuário/Organização**: seu usuário do GitHub (ex.: `paulohenrique`)
   - **Repositório**: `SalesFercoi2026`
   - **Branch**: `main`
   - **Caminho do arquivo de dados**: `data/orders.json`
   - **Token**: o token gerado acima
4. Clique em **Salvar configuração**.

Repita esse passo nos 3 perfis (cada um com seu próprio token, mas todos
apontando para o mesmo repositório/arquivo).

## 3. Usando o dashboard

- **Dashboard**: gráfico de faturamento e comissão por mês (selecione o ano)
  e gráfico de participação de cada empresa em um mês específico
  (alternando entre Faturamento e Comissão).
- **Pedidos**: tabela com busca, filtro por competência/empresa, ordenação
  por coluna, e botões para criar, editar e excluir pedidos.
- Após alterar pedidos, clique em **Salvar no GitHub** para gravar as
  mudanças no repositório. Os demais perfis verão a atualização na próxima
  vez que abrirem ou recarregarem o dashboard.
- O botão de sol/lua alterna entre tema claro e escuro (preferência salva
  por navegador).

## Sobre sincronização entre perfis

Como o GitHub Pages é estático (sem banco de dados/servidor), o arquivo
`data/orders.json` no repositório funciona como "banco de dados". Cada vez
que alguém clica em **Salvar no GitHub**, o dashboard:

1. Busca a versão mais recente do arquivo (e seu `sha`) diretamente da API
   do GitHub.
2. Envia a nova versão completa do arquivo via commit.

Se dois perfis editarem ao mesmo tempo, o segundo a salvar pode receber um
aviso de conflito — basta recarregar a página (para buscar a versão mais
recente) e refazer a alteração.

## Observações sobre os dados migrados

- A aba "Leeds" da planilha original não foi incluída neste dashboard
  (apenas "Pedidos" / vendas e comissões).
- A taxa de comissão identificada na planilha foi de **0,75%** para todos os
  registros; o campo é editável por pedido caso precise mudar no futuro.
- Alguns nomes de empresa aparecem com pequenas variações de grafia na
  planilha original (ex.: "Mz Fluid..." vs "MZ Fluid...", "Latasa Industria
  e Comercio de Metais" vs "Latasa Metais Ltda"). Isso pode fazer com que a
  mesma empresa apareça duas vezes no gráfico de participação. Recomenda-se
  padronizar esses nomes aos poucos pela tela de Pedidos (editar cada
  registro e ajustar o nome da empresa).
