import {mkdir,copyFile,writeFile,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const output=new URL('_site/',root);
const assets=['index.html','style.css','app.js','budget.js','sw.js','manifest.webmanifest','icon.svg','apple-touch-icon.png','icon-512.png'];
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await Promise.all(assets.map(name=>copyFile(new URL(name,root),new URL(name,output))));
await writeFile(new URL('.nojekyll',output),'');
console.log('Built _site/ with application assets only.');
