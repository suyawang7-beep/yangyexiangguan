import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {coinTenths,ledgerBalance,validCoinAmount} from '../server/money.mjs';
test('integer tenths preserve repeated 131.4 rewards, deductions and historical rows',()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE ledger(user_id TEXT,amount INTEGER)');
 const insert=db.prepare('INSERT INTO ledger VALUES(?,?)');
 for(let i=0;i<40;i++)insert.run('a',131.4);
 insert.run('a',-50);insert.run('a',0.1);insert.run('a',0.2);
 const before=db.prepare('SELECT rowid,* FROM ledger').all();
 assert.equal(ledgerBalance(db,'a'),5206.3);
 assert.deepEqual(db.prepare('SELECT rowid,* FROM ledger').all(),before);
 assert.equal(ledgerBalance(db,'empty'),0);db.close();
});
test('reject unsupported precision and unsafe inputs, tolerate binary representation noise',()=>{
 assert.equal(coinTenths(0.1+0.2),3);
 for(const n of [0.01,NaN,Infinity,'1',null,1e16])assert.throws(()=>coinTenths(n));
 for(const n of [0,-1,5000.1,1.01,'131.4'])assert.equal(validCoinAmount(n),false);
 for(const n of [0.1,131.4,5000])assert.equal(validCoinAmount(n),true);
});
