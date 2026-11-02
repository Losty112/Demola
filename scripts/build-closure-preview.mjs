// Builds public/closure-preview.html: one self-contained file (CSS + JS inline) of the closure dashboard.
// Usage: npm run build:closure-preview
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import { readFileSync, writeFileSync } from "node:fs";

const js = await build({
  entryPoints: ["scripts/closure-preview-entry.tsx"],
  bundle: true, minify: true, write: false, format: "iife", jsx: "automatic",
  alias: { "@": "." }, define: { "process.env.NODE_ENV": '"production"' },
});
const cssIn = readFileSync("app/globals.css", "utf8");
const css = (await postcss([tailwind()]).process(cssIn, { from: "app/globals.css" })).css;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Benchmark Hospital – closure scenario (executive preview)</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body class="min-h-screen antialiased">
<header class="sticky top-0 z-30 border-b border-line bg-white/80 backdrop-blur"><div class="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6"><span class="font-semibold tracking-tight">Benchmark Hospital</span><span class="ml-auto rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">Prototype · illustrative data</span></div></header>
<div id="root"></div>
<script>${js.outputFiles[0].text.replace(/<\/script/g, "<\\/script")}</script>
</body>
</html>
`;
writeFileSync("public/closure-preview.html", html);
console.log(`public/closure-preview.html  ${(html.length / 1024).toFixed(0)} KB`);
