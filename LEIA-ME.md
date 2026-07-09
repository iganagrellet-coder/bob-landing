# Bob — Landing Page (pasta pronta para publicar)

Esta pasta é o site **completo e independente** da landing do Bob. Todos os arquivos já
estão na raiz (não tem subpasta "landing"), então a Vercel reconhece na hora.

Conteúdo:
- `index.html`, `styles.css`, `main.js` — o site.
- `assets/` — imagens e o vídeo.
- `vercel.json` — cabeçalhos de segurança (opcional, pode ignorar).

> A fonte "Inter" é carregada da internet (rsms.me). O resto é tudo local.
> Para ver no seu computador: é só dar **duplo clique no `index.html`** (abre no navegador).

---

## Publicar em bobestagiario.com (tudo pelo navegador, sem terminal)

### 1) Colocar esta pasta no GitHub (uma vez)
1. Acesse **github.com/new** e crie um repositório novo, ex. nome `bob-landing`
   (pode deixar **Private**). Clique **Create repository**.
2. Na página do repo, clique em **"uploading an existing file"** (ou **Add file → Upload files**).
3. **Arraste TODOS os itens desta pasta** (o `index.html`, `styles.css`, `main.js`,
   `vercel.json` e a pasta `assets`) para a área de upload.
4. Clique **Commit changes**.

### 2) Criar o projeto na Vercel
1. Vercel → **Add New → Project** → **Import** o repositório `bob-landing`.
2. **Root Directory** já fica em `./` (os arquivos estão na raiz) — **não precisa mudar nada**.
3. **Framework Preset**: *Other*. Deixe Build Command / Output vazios.
4. Clique **Deploy**. Vai abrir uma URL de teste tipo `bob-landing.vercel.app` — confira o site.

### 3) Ligar o domínio
1. No projeto → **Settings → Domains** → adicione **`bobestagiario.com`** e **`www.bobestagiario.com`**
   (deixe o `www` redirecionando para o domínio principal).
2. No seu painel de **DNS** (mesmo lugar onde está `app.bobestagiario.com`), crie:

   | Host | Tipo | Valor |
   |------|------|-------|
   | `@` (bobestagiario.com) | **A** | `76.76.21.21` |
   | `www` | **CNAME** | `cname.vercel-dns.com` |

   - **Não mexa** no registro `app` (o app continua funcionando em `app.bobestagiario.com`).
   - A Vercel mostra os valores exatos ao adicionar o domínio; se diferirem, use os que ela indicar.
3. Em alguns minutos a Vercel emite o **HTTPS (cadeado)** automaticamente e
   **bobestagiario.com** já abre a landing.

---

## Ainda mais fácil (opção alternativa, sem GitHub): Netlify Drop
Se quiser o caminho mais simples de todos: acesse **app.netlify.com/drop** e **arraste esta
pasta inteira** para a página — o site fica no ar na hora. Depois, em *Domain settings*,
adicione `bobestagiario.com` e ajuste o DNS conforme o Netlify indicar. (O app continua na
Vercel; só a landing ficaria no Netlify.)

## Atualizar o site depois
- Se usou **GitHub + Vercel**: substitua os arquivos no repositório (Add file → Upload files)
  e a Vercel republica sozinha.
- Se usou **Netlify Drop**: arraste a pasta de novo em app.netlify.com/drop (ou conecte o repo).
