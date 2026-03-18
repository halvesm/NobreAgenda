# Extensões Recomendadas (VS Code / Cursor)

Para que este projeto (NobreAgenda - React + Vite + TypeScript + Supabase) funcione perfeitamente após a formatação, instale as seguintes extensões no seu editor de código:

1. **ESLint** (Microsoft) - *Para linting interno e detecção de pequenos problemas no código.*
2. **Prettier - Code formatter** (Prettier) - *Para formatação padrão do código ao salvar.*
3. **Tailwind CSS IntelliSense** (Tailwind Labs) - *Se você for adicionar ou usar classes do Tailwind CSS no futuro.*
4. **DotENV** (mikestead) - *Para realce de sintaxe em arquivos `.env` e `.env.local`.*
5. **PostgreSQL** (Chris Kolkman / Microsoft) ou **SQLTools** - *Útil para interagir com seus arquivos `.sql` e visualizar o banco do Supabase se necessário.*
6. **Error Lens** (Alexander) - *Opcional, mas muito bom para ver erros do TypeScript e ESLint diretamente na linha do código.*
7. **GitLens** (GitKraken) - *Opcional, porém excelente para controle de versão com Git.*

### Como restaurar o projeto:
1. Extraia o arquivo `NobreAgenda_Backup.zip` que foi gerado.
2. Abra a pasta extraída no seu VS Code / Cursor.
3. Abra o terminal e rode `npm install` para baixar todas as dependências (`node_modules`) novamente.
4. Certifique-se de que o seu arquivo `.env.local` está presente com as credenciais do Supabase.
5. Rode `npm run dev` para iniciar o projeto!
