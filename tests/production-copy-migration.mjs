// Only a locally decrypted backup copy is opened. No business API writes.
import {DatabaseSync} from 'node:sqlite';
import {copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {availablePort} from './helpers/port.mjs';
const root=resolve(process.argv[2]),sourcePath=join(root,'island.sqlite'),targetPath=join(root,'migration-copy.sqlite');
if(!root.startsWith('C:\\Users\\A\\Backups\\buzhi-production\\')||!root.includes('migration-verify-'))throw Error('Only protected local recovery directories are allowed');
copyFileSync(sourcePath,targetPath,2);const source=new DatabaseSync(sourcePath,{readOnly:true});
const quote=s=>'"'+s.replaceAll('"','""')+'"',tables=source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
const snapshots=tables.map(table=>{const columns=source.prepare('PRAGMA table_info('+quote(table)+')').all().map(r=>r.name);const query='SELECT '+columns.map(quote).join(',')+' FROM '+quote(table)+' ORDER BY rowid';return {table,query,rows:JSON.stringify(source.prepare(query).all())}});source.close();
const port=await availablePort(),base='http://127.0.0.1:'+port;let server,db,logs='';
try{
 server=spawn(process.execPath,['server/index.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DB_PATH:targetPath,ASSET_DIR:join(root,'assets'),ADMIN_TOKEN:'migration-local-check-admin-00000000000'},stdio:['ignore','ignore','pipe']});server.stderr.on('data',x=>logs+=x);
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(base+'/health')).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}if(!ready)throw Error('Copied database startup failed');
 const catalog=await (await fetch(base+'/api/catalog')).json();if(catalog.cards.length!==46)throw Error('Migrated catalog must contain46 cards');
 db=new DatabaseSync(targetPath,{readOnly:true});
 if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok'||db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Migrated database integrity failed');
 for(const {table,query,rows} of snapshots)if(JSON.stringify(db.prepare(query).all())!==rows)throw Error('Existing data changed in '+table);
 for(const table of ['island_mail','island_items','card_profiles','coin_redemption_campaigns'])db.prepare('SELECT count(*) FROM '+table).get();
 console.log(JSON.stringify({migration:'passed',allOriginalTablesUnchanged:true,originalTableCount:tables.length,users:db.prepare('SELECT count(*) AS n FROM users').get().n,ledgerRows:db.prepare('SELECT count(*) AS n FROM ledger').get().n,coinsTotal:db.prepare('SELECT sum(amount) AS n FROM ledger').get().n,catalogCards:catalog.cards.length}));
}finally{if(db)db.close();if(server?.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}}
