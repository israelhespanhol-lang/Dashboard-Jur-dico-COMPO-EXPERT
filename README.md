# Monitoramento Juridico

Radar operacional para acompanhamento de processos judiciais. O sistema separa fatos obtidos de fontes externas, informacoes internas, analise automatica e confirmacao humana. Ele nao substitui a analise de um advogado.

## Estado atual

A primeira entrega contem a dashboard operacional responsiva, filtros e busca local, feedback de sincronizacao, schema PostgreSQL/Prisma, normalizacao centralizada de numero CNJ e endpoint `/api/health`. Os dados visuais da home sao demonstrativos e nao representam dados reais de clientes.

## Stack

- Next.js 16 + TypeScript + App Router
- Tailwind CSS 4 + CSS de componentes
- Prisma + PostgreSQL
- Lucide React

## Executar

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Configure `DATABASE_URL` antes de aplicar o schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Para Supabase, use `DATABASE_URL` no pooler em modo transaction (`6543`) e `DIRECT_URL` no pooler em modo session (`5432`). Substitua `[YOUR-PASSWORD]` pela senha do banco e mantenha ambas as variáveis apenas em `.env.local`.

Para desenvolvimento local, há um PostgreSQL opcional em `docker-compose.yml`:

```bash
docker compose up -d postgres
npm run db:migrate -- --name init
```

A tela `/importar` aceita `.xlsx`, `.xls` e `.csv`, mostra uma prévia, sugere o mapeamento das colunas e só grava após a confirmação. O commit exige `DATABASE_URL`; sem PostgreSQL configurado, a prévia continua disponível e o sistema retorna `Banco não configurado` em vez de perder dados.

## Integracoes

Providers vivem em `src/lib/providers` e implementam uma interface comum. Chaves nunca devem usar prefixo `NEXT_PUBLIC_`.

- `GET /api/integracoes` verifica DataJud, DJEN e Domicilio sem expor credenciais.
- `POST /api/sincronizar` recebe `{ "processNumbers": ["..."] }` e consulta cada fonte isoladamente.
- DataJud usa `DATAJUD_API_KEY`, `DATAJUD_BASE_URL` e `DATAJUD_COURT_ALIAS`.
- DJEN usa a API pública `https://comunicaapi.pje.jus.br/api/v1`; os endpoints públicos não exigem API key. `DJEN_BASE_URL` pode sobrescrever a URL para homologação, se necessário.
- Domicilio Judicial permanece como adapter preparado e `not_configured` sem credenciais oficiais.

DataJud e DJEN devem persistir payload bruto, hash deterministico e `SyncRun` quando a camada de persistencia for ativada; indisponibilidade de uma fonte nao deve apagar dados anteriores.

## Seguranca e privacidade

Use armazenamento privado para anexos, RBAC para ADMIN/JURIDICO/GESTOR/LEITURA, logs de auditoria para mudancas e rate limiting em endpoints de sincronizacao. Nao automatize CAPTCHA, contorne autenticacao ou calcule prazo fatal automaticamente. Mensagens de alerta devem usar linguagem de revisao, como “Possivel providencia pendente”.

## Proximas fases

1. Autenticacao de sessao e importacao `.xlsx`, `.xls` e `.csv` com preview e mapeamento.
2. Providers DataJud/DJEN com deduplicacao e jobs isolados.
3. Timeline, motor deterministico de classificacao, response matcher e alertas.
4. Providencias internas, auditoria, relatorios e exportacao.
