# Destrava Basike

Conversor de vídeos da câmera Basike, 100% no navegador (WebCodecs + mediabunny). React, TypeScript e Vite.

## Rodar localmente

```
npm install
npm run build
npm run preview   # http://localhost:4173
```

Use `npm run dev` enquanto mexe no visual.

## Publicar no GitHub Pages

1. Crie o repositório `destrava-basike` e envie o código para a branch `main`.
2. Em Settings > Pages, escolha "GitHub Actions" como Source.
3. O workflow em `.github/workflows/deploy.yml` faz o build e publica. A URL fica em `https://SEU-USUARIO.github.io/destrava-basike/` e é injetada automaticamente nas tags de SEO, no sitemap e no `llms.txt`.

Com domínio próprio, defina a variável de repositório `SITE_URL` (Settings > Secrets and variables > Actions > Variables).
