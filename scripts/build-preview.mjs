import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const read=name=>readFile(new URL(name,root),'utf8');
const [html,css,budget,app]=await Promise.all(['index.html','style.css','budget.js','app.js'].map(read));
const logic=budget.replace(/^export /gm,'')+'\n'+app.replace(/^import .*;\n/,'').replace(/^if\('serviceWorker' in navigator\).*;\s*$/m,'');
const preview=html
 .replace('<body>','<body data-preview="true">')
 .replace(/<link rel="manifest"[^\n]+\n/,'')
 .replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`)
 .replace('<script type="module" src="./app.js"></script>',()=>`<script>${logic}</script>`);
await writeFile(new URL('preview.html',root),preview);
console.log('Created preview.html (standalone HTML, CSS and JavaScript)');
