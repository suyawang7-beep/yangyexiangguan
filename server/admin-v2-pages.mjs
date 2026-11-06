import {existsSync,readFileSync} from 'node:fs';
const required=['index.html','admin.css','admin.js','model.js','adapter.js'];
export function serveAdminV2(req,res,path){
 if(req.method!=='GET'||!path.startsWith('/admin/v2/'))return false;
 if(path==='/admin/v2/readonly-client.js'){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(readFileSync(new URL('../admin/integration/readonly-client.js',import.meta.url)));return true;}
 const root=new URL('../admin/v2/',import.meta.url);
 if(!required.every(name=>existsSync(new URL(name,root)))){
  res.writeHead(503,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify({error:'海岛控制台源码尚未完整交付',required}));return true;
 }
 const name=path.slice('/admin/v2/'.length)||'index.html';
 if(![...required,'integration.css','operations.js','operations.html','operations.css','pending-grants.js','operation-requests.js','title-management.js','weather-management.js','souvenir-management.js','commission-management.js'].includes(name)){res.writeHead(404,{'cache-control':'no-store'});res.end();return true;}
 const type=name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html';
 res.writeHead(200,{'content-type':type+'; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
 res.end(readFileSync(new URL(name,root)));return true;
}
