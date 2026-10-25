import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// A standalone HTML retains the supplied version's file-sharing/offline option,
// including the original music and artwork rather than external asset requests.
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const mime={'.mp3':'audio/mpeg','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff':'font/woff'};
const assetCache=new Map();
function embedAssets(text){
  return text.replace(/assets\/[A-Za-z0-9._-]+\.(?:mp3|webp|svg|ttf|woff)/g,ref=>{
    if(!assetCache.has(ref)){const data=fs.readFileSync(path.join(root,ref));assetCache.set(ref,`data:${mime[path.extname(ref)]};base64,${data.toString('base64')}`);}
    return assetCache.get(ref);
  });
}
const names=['game-data.js','visual-data.js','catalog.js','controls.js','engine.js','online.js','app.js'];
const modules=Object.fromEntries(names.map(name=>[name,embedAssets(fs.readFileSync(path.join(root,name),'utf8'))]));
const json=JSON.stringify(modules).replace(/</g,'\\u003c');
const loader=`const sources=${json};\nconst urls={};\nfor(const [name,code] of Object.entries(sources)){const resolved=code.replace(/from '\\.\\/([^']+)'/g,(_,dep)=>"from '"+urls[dep]+"'");urls[name]=URL.createObjectURL(new Blob([resolved],{type:'text/javascript'}));}\nawait import(urls['app.js']);`;
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const file of ['fonts.css','style.css'])html=html.replace(`<link rel="stylesheet" href="${file}">`,`<style>${embedAssets(fs.readFileSync(path.join(root,file),'utf8'))}</style>`);
html=html.replace('<script type="module" src="app.js"></script>',()=>`<script type="module">${loader}</script>`);
const licenses=fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('OFL.txt')).map(n=>fs.readFileSync(path.join(root,'assets',n),'utf8')).join('\n\n');
html=html.replace('</body>',()=>`<template id="font-licenses">${licenses.replaceAll('&','&amp;').replaceAll('<','&lt;')}</template></body>`);
const output=path.join(root,'nakama-offline.html');fs.writeFileSync(output,html);
console.log(`Standalone game: ${(Buffer.byteLength(html)/1024/1024).toFixed(2)} MiB, ${assetCache.size} embedded assets.`);
