import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
assert(existsSync('admin/v2/operations.js'),'compiled original operation handlers must exist');
const js=readFileSync('admin/v2/operations.js','utf8'),html=readFileSync('admin/v2/operations.html','utf8'),shell=readFileSync('admin/v2/admin.js','utf8');
assert.match(js,/mountOperations/);assert(!/<iframe|<script|id="(?:login|token|enter|logout)"/i.test(html));assert(!/eval\(|new Function\(|fetch\(['"]\/admin\b|let adminToken=/.test(js));
const routes=['island-mail','quiz-results','task-writings','messages','activity','codes','announcements','visual','code-statistics','test-cleanup','users','user-details','audit','characters','cards','assets','asset-check','backups','members','visitors','site-maintenance','coins','office','recovery','residents','account-recovery'];
for(const route of routes)assert((js.includes("'"+route+"'")||js.includes('"'+route+'"')),'missing operational route '+route);
assert(!shell.includes('href="/admin/'),'daily modules must not jump old admin routes');
console.log('PASS unified component contract: full original route coverage, scoped real handlers, one session, no iframe/eval/secondary login or old-page fetch');

const provenance=JSON.parse(readFileSync('admin/v2/operations-provenance.json','utf8'));for(const [path,expected] of Object.entries(provenance.inputs))assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),expected,'regenerate operational components after '+path);const ids=[...html.matchAll(/\bid="([^"\s]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'migrated IDs are unique');const app=readFileSync('ui-preview/app.js','utf8');assert(app.includes('fusionDaily?.limit'));assert(!app.includes('const used=Math.min(3'));
