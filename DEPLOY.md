# 🚀 Deploy do NobreAgenda

Este guia mostra como fazer o deploy do NobreAgenda. Recomendamos o uso da **Netlify** devido a problemas de conectividade ISP com a Vercel em algumas regiões.

## 📋 Pré-requisitos

- Conta no [Netlify](https://www.netlify.com/)
- Conta no [GitHub](https://github.com) (recomendado)
- Projeto Supabase configurado

## 🔧 Preparação Git

Se ainda não tiver o repositório no GitHub:

```bash
git init
git add .
git commit -m "Migration to Netlify"
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git branch -M main
git push -u origin main
```

---

## 🌐 Deploy na Netlify (Recomendado)

### Passo a Passo

1. Acesse o dashboard da [Netlify](https://app.netlify.com/).
2. Clique em **"Add new site"** -> **"Import an existing project"**.
3. Conecte com seu provedor Git (GitHub).
4. Selecione o repositório `NobreAgenda`.
5. **Configurações de Build**:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Clique em **"Add environment variables"** e adicione:
   - `VITE_SUPABASE_URL`: (Sua URL do Supabase)
   - `VITE_SUPABASE_ANON_KEY`: (Sua Chave Anon do Supabase)
7. Clique em **"Deploy NobreAgenda"**.

### 🎉 Pós-Deploy: Configurar Supabase

Após o deploy, você terá a URL: `https://nobre-agenda.netlify.app`. 
Você **PRECISA** atualizar o Supabase para que o login funcione:

1. Vá ao [Dashboard do Supabase](https://supabase.com/dashboard).
2. Vá em **Authentication** -> **URL Configuration**.
3. Em **Site URL**, coloque: `https://nobre-agenda.netlify.app`.
4. Em **Redirect URLs**, adicione: `https://nobre-agenda.netlify.app/**`.

---

## 📐 Deploy na Vercel (Alternativo)

Se preferir usar a Vercel, o arquivo `vercel.json` continua disponível. O processo é idêntico ao da Netlify, importando o repositório e configurando as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

---

## ⚙️ Variáveis de Ambiente Necessárias

| Variável | Descrição |
| :--- | :--- |
| `VITE_SUPABASE_URL` | URL do projeto no Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (anon/public) do Supabase |

## 🛠️ Comandos Úteis

```bash
# Testar build localmente
npm run build

# Visualizar build localmente
npm run preview
```
