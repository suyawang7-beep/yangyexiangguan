// Runs the existing CI core suite plus resident/inbox regressions, on local fixtures only.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const workflow=readFileSync(new URL('../.github/workflows/core-flow.yml',import.meta.url),'utf8');
const core=workflow.match(/for test in (.+?); do/)[1].split(' ');
const cases=[...core.map(file=>[file]),['tests/ui-preview-draw.cjs','--office-only'],['tests/island-mail-flow.mjs'],['tests/island-mail-browser.cjs'],['tests/resident-production.cjs'],['tests/resident-appearance.cjs']];
mkdirSync('test-results/regressions',{recursive:true});
const results=[];
for(const args of cases){
 const begin=Date.now(),file=args[0];let output='',timedOut=false;
 const child=spawn(process.execPath,args,{env:process.env,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 const timer=setTimeout(()=>{timedOut=true;child.kill()},120000);
 const code=await new Promise(resolve=>{child.on('error',e=>{output+=e.stack;resolve(-1)});child.on('exit',resolve)});clearTimeout(timer);
 const result={file,args:args.slice(1),code,timedOut,seconds:Math.round((Date.now()-begin)/100)/10};results.push(result);
 writeFileSync('test-results/regressions/'+file.split('/').pop()+'.log',output);
 writeFileSync('test-results/regressions/summary.json',JSON.stringify(results,null,2));
 console.log((code===0?'PASS':'FAIL')+' '+args.join(' ')+' ('+result.seconds+'s)');
 if(code!==0)console.log(output.slice(-2200));
}
const failures=results.filter(r=>r.code!==0);console.log(`${results.length-failures.length}/${results.length} passed`);if(failures.length)process.exitCode=1;
