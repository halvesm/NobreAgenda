# Como ativar o Motor de Notificações Popups (Edge Function) no Vercel/Supabase

Como as permissões e a interface já estão prontas no site, agora você precisa jogar o script do `"Carteiro"` para o seu painel do Supabase.

Como você está usando a extensão do Github, basta seguir estes rápidos passos copiando e colando no seu terminal:

### Passo 1: Autenticar o seu terminal com o Supabase
Abra o seu terminal (ex: Git Bash ou CMD dentro do VSCode) e rode o comando abaixo:
```bash
npx supabase login
```
*Ele vai pedir para você gerar um token no site do Supabase (basta clicar no link que o terminal mostrar, gerar o token, copiar e colar de volta no terminal).*

### Passo 2: Cadastrar as "Senhas" do Carteiro (VAPID Keys)
Para que a Apple/Google permitam que o Supabase envie mensagens, ele precisa de senhas geradas pelo seu projeto. Cole este comando exato no seu terminal para salvar o segredo (substitua pelo LUGAR DO PROJECT_ID caso ele peça a referência do projeto):
```bash
npx supabase secrets set VAPID_PUBLIC_KEY="BI5Tb9Iq7_zZU2NFpctUhDy6cZMfvsfo5OAb4LiR1KWMtXrxdgfrK1QJ4OQIei99FTFjUwkhHqg6it-bW480Sis" VAPID_PRIVATE_KEY="JVT08yWG8HJ4yDYxk0K0-zBHnW-OaZBz1WiR8OY0is"
```

### Passo 3: Enviar o Script (Deploy)
Agora vamos subir o arquivo `index.ts` que eu acabei de criar na pasta do seu projeto direto para o Supabase:
```bash
npx supabase functions deploy send-push --no-verify-jwt
```
*A flag `--no-verify-jwt` é necessária porque o script será chamado pelo próprio banco de dados internamente (Webhook) e não pelo site logado.*

### Passo 4: Ligar o Motor Automático (Webhook)
Vá ao seu painel visual do Supabase na Internet:
1. Clique em **Database** (no menu lateral esquedo) -> **Webhooks** -> Clique em **Create Webhook**.
2. **Name**: `Disparo de Push`
3. **Table**: Escolha a tabela `notifications`
4. **Events**: Marque APENAS `Insert`
5. **Type**: Escolha `Supabase Edge Functions`
6. **Edge Function**: Escolha `send-push` (que você acabou de fazer o upload!)
7. **Method**: `POST`
8. Salve.

Pronto!! Agora, toda vez que uma notificação for criada no sistema, o banco de dados chama automaticamente este script novo, que entra em contato com o Google/Apple e acende a tela do celular instantaneamente!
