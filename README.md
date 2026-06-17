# Biblioteca Front — Next.js + TypeScript + Tailwind

Frontend do sistema de reservas de computadores e salas de estudo.

## Pré-requisitos

- Node.js 18+
- Backend rodando em `http://localhost:8080`

## Como rodar

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variável de ambiente (já está no .env.local)
# NEXT_PUBLIC_API_URL=http://localhost:8080

# 3. Rodar em desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## Estrutura de telas

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/login` | Login com email + senha | Público |
| `/cadastro` | Cadastro de novo usuário | Público |
| `/dashboard/usuario` | Painel do usuário com reservas ativas | Usuário |
| `/dashboard/usuario/reservar` | Criar nova reserva (PC ou Sala) | Usuário |
| `/dashboard/admin` | Painel admin com calendário semanal | Admin |
| `/dashboard/admin/aprovacoes` | Aprovar/rejeitar reservas pendentes | Admin |
| `/dashboard/admin/reservas-admin` | Ver e filtrar todas as reservas | Admin |
| `/dashboard/admin/usuarios-admin` | Gerenciar usuários | Admin |

## Regras de negócio implementadas

- Check-in: janela de 5min antes até 15min após o início
- Cancelamento: até 1 hora antes
- Reservas > 3 PCs ou > 4 tempos → pendente aprovação
- Modo escuro/claro com toggle na sidebar
- JWT armazenado em localStorage
- Redirecionamento automático por nível de acesso (ADMIN / PADRAO)
