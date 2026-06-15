# CLAUDE.md — Frontend Biblioteca

## Visão geral
Interface do sistema de reservas de salas e computadores de uma biblioteca.
Next.js 15 (App Router) + TypeScript + Tailwind CSS.

**Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 3, Recharts, react-datepicker, lightweight-charts

## Estrutura
```
src/
├── app/
│   ├── layout.tsx              ← Layout raiz (NÃO MEXER)
│   ├── page.tsx                ← Redireciona para /login
│   ├── globals.css             ← Estilos globais
│   ├── login/                  ← Página de login
│   ├── cadastro/               ← Página de cadastro
│   ├── recuperar-senha/        ← Fluxo de recuperação de senha
│   ├── dashboard/
│   │   ├── layout.tsx          ← Layout do dashboard (sidebar, proteção de rota)
│   │   ├── admin/              ← Páginas exclusivas do admin
│   │   │   ├── aprovacoes/
│   │   │   ├── estatisticas/
│   │   │   ├── gerenciar-pcs/
│   │   │   ├── gerenciar-salas/
│   │   │   ├── reservas-admin/
│   │   │   └── usuarios-admin/
│   │   ├── usuario/            ← Páginas do usuário comum
│   │   │   ├── historico/
│   │   │   └── reservar/
│   │   └── perfil/
│   ├── components/
│   │   ├── admin/              ← Componentes exclusivos de admin
│   │   ├── ui/                 ← Componentes reutilizáveis (design system)
│   │   └── usuario/            ← Componentes do usuário
│   └── hooks/                  ← Custom hooks
├── lib/
│   ├── api.ts                  ← Cliente HTTP (NÃO MEXER a função base — ver abaixo)
│   ├── auth-context.tsx        ← Contexto de autenticação (NÃO MEXER)
│   ├── constants.ts            ← Constantes do projeto
│   └── utils.ts                ← Utilitários gerais
└── types/
    └── index.ts                ← Tipos TypeScript compartilhados
```

## ⛔ NÃO MEXER

- `src/lib/auth-context.tsx` — gerencia login/logout, token JWT, expiração (8h), redirecionamento por role. Mexer aqui quebra toda a autenticação.
- `src/lib/api.ts` → função `request()` — é o núcleo do cliente HTTP: injeta o Bearer token, trata erros, lida com 204. Não alterar essa função. Adicionar novos endpoints é ok (seguindo o padrão dos existentes).
- `src/app/layout.tsx` — layout raiz com providers
- `next.config.ts` — config do Next.js
- `tailwind.config.ts` / `postcss.config.js` — config de estilo
- `src/types/index.ts` — tipos base (pode adicionar, não remover/renomear os existentes)

## ✅ Pode trabalhar livremente

- `src/app/dashboard/**` — páginas de features
- `src/app/components/**` — componentes UI e de domínio
- `src/app/hooks/` — custom hooks
- `src/lib/api.ts` — adicionar novos grupos de endpoints (ex: `export const novoModulo = { ... }`)
- `src/lib/constants.ts` e `src/lib/utils.ts`
- `src/types/index.ts` — adicionar novos tipos

## Convenções

### Autenticação
- Usar sempre o hook `useAuth()` de `@/lib/auth-context`
- Campos disponíveis: `user`, `token`, `login()`, `logout()`, `isAdmin`, `isLoading`
- Nunca acessar `localStorage` diretamente para token — usar o contexto

### Chamadas à API
- Importar de `@/lib/api`: `auth`, `salas`, `computadores`, `reservasSala`, `reservasComputador`, `aprovacoes`, `pedidos`, `usuarios`, `relatorios`
- A URL base vem de `NEXT_PUBLIC_API_URL` (`.env.local`) ou `http://localhost:8080`

### Estilo
- Tailwind CSS utilitário — não criar CSS customizado salvo em `globals.css`
- Componentes de UI reutilizáveis ficam em `src/app/components/ui/`
- Seguir o visual já existente nas páginas: cores, espaçamentos, padrão de cards

### TypeScript
- Sempre tipar props de componentes
- Importar tipos de `@/types`
- Não usar `any` — preferir `unknown` se necessário

### Estrutura de páginas
- Páginas do admin em `src/app/dashboard/admin/`
- Páginas do usuário em `src/app/dashboard/usuario/`
- O `dashboard/layout.tsx` já protege as rotas e redireciona por role — não duplicar essa lógica

## Fluxo de autenticação
1. Login → backend retorna JWT + NivelAcesso
2. `auth-context` armazena no localStorage e controla expiração (8h)
3. Redirecionamento automático: ADMIN → `/dashboard/admin`, PADRAO → `/dashboard/usuario`
4. `api.ts` injeta o token automaticamente em todas as requisições

## Como rodar localmente
```bash
npm run dev
```
Disponível em `http://localhost:3000`

Criar `.env.local` com:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```
