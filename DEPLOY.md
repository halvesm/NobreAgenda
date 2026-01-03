# 🚀 Deploy para Vercel

Este guia mostra como fazer o deploy do NobreAgenda na Vercel.

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com)
- Conta no [GitHub](https://github.com) (recomendado)
- Projeto Supabase configurado

## 🔧 Preparação

### 1. Inicializar Git (se ainda não foi feito)

```bash
git init
git add .
git commit -m "Initial commit"
```

### 2. Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com/new)
2. Crie um novo repositório
3. **NÃO** inicialize com README, .gitignore ou licença
4. Copie a URL do repositório

### 3. Conectar ao GitHub

```bash
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git branch -M main
git push -u origin main
```

## 🌐 Deploy na Vercel

### Opção 1: Via Interface Web (Recomendado)

1. Acesse [Vercel](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: `https://yfmtmvcfevxopuaqwukh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmbXRtdmNmZXZ4b3B1YXF3dWtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMDE0NzEsImV4cCI6MjA4Mjc3NzQ3MX0.gJxmVgErW7EGzBfxqCsCaqPTLVF8LQ7uKdsXDNy_Ah4`
5. Clique em **"Deploy"**

### Opção 2: Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Para produção
vercel --prod
```

## ⚙️ Configuração de Variáveis de Ambiente

As variáveis de ambiente podem ser configuradas em:
**Project Settings → Environment Variables**

Variáveis necessárias:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🔄 Deploy Automático

Após o primeiro deploy, a Vercel irá automaticamente:
- ✅ Fazer deploy a cada push na branch `main`
- ✅ Criar preview deployments para Pull Requests
- ✅ Executar o build e verificar erros

## 🛠️ Comandos Úteis

```bash
# Ver logs do deploy
vercel logs

# Listar deployments
vercel ls

# Remover deployment
vercel rm [deployment-url]

# Abrir projeto na Vercel
vercel open
```

## 📝 Notas Importantes

1. **Não commite** o arquivo `.env.local` - ele já está no `.gitignore`
2. As variáveis de ambiente devem ser configuradas na Vercel
3. O arquivo `vercel.json` já está configurado para SPA routing
4. Builds falhos não serão deployados

## 🔗 Links Úteis

- [Documentação Vercel](https://vercel.com/docs)
- [Vite + Vercel](https://vercel.com/docs/frameworks/vite)
- [Supabase Docs](https://supabase.com/docs)

## 🆘 Problemas Comuns

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o projeto builda localmente: `npm run build`

### Variáveis de ambiente não funcionam
- Certifique-se de usar o prefixo `VITE_`
- Redeploy após adicionar variáveis: `vercel --prod`

### Rotas 404
- O `vercel.json` já está configurado para SPA routing
- Verifique se o arquivo foi commitado
