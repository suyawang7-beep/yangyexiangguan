// Source-level regression guard; run with node --test tests/buzhi2-account-routes.test.cjs
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../server/index.mjs'),'utf8');
test('logout only revokes bearer session and never deletes user or data',()=>{
 const method=source.match(/function logout\(req\)\{([^\n]*)\}/)?.[1];assert.ok(method);
 assert.match(method,/DELETE FROM sessions WHERE token_hash=\?/);
 assert.doesNotMatch(method,/DELETE FROM users|DELETE FROM ledger|DELETE FROM draws/);
 assert.match(source,/path==='\/api\/logout'&&req.method==='POST'/);
});
test('nickname update validates input and changes only users.nickname',()=>{
 const method=source.match(/function updateNickname\(id,b\)\{([^\n]*)\}/)?.[1];assert.ok(method);
 assert.match(method,/length>20/);assert.match(method,/UPDATE users SET nickname=\? WHERE id=\?/);
 assert.match(source,/updateNickname\(auth\(req\),b\)/);
});
test('stable identity and existing password migration remain intact',()=>{
 assert.match(source,/id TEXT PRIMARY KEY,nickname TEXT NOT NULL/);
 assert.match(source,/function updatePassword\(id,b\)/);
 assert.match(source,/function login\(b\)/);
});
