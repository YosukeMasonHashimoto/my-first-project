import test from 'node:test';
import assert from 'node:assert/strict';
import {periodFor,summary,validateBackup} from '../budget.js';
const entry=(date,amount,id='a')=>({id,date,amount,note:''});
test('25日開始、翌月24日終了。年越しとうるう年を扱う',()=>{
 assert.deepEqual(periodFor('2026-10-24'),{start:'2026-09-25',end:'2026-10-24',next:'2026-10-25'});
 assert.deepEqual(periodFor('2026-10-25'),{start:'2026-10-25',end:'2026-11-24',next:'2026-11-25'});
 assert.deepEqual(periodFor('2027-01-01'),{start:'2026-12-25',end:'2027-01-24',next:'2027-01-25'});
 assert.equal(periodFor('2028-02-29').end,'2028-03-24');
 assert.throws(()=>periodFor('2026-02-29'));
});
test('8万円支出で残高2万円、25日にリセットし過去の記録を維持する',()=>{
 const entries=[entry('2026-10-24',80000)];
 assert.equal(summary(entries,'2026-10-24').remaining,20000);
 assert.equal(summary(entries,'2026-10-25').remaining,100000);
 assert.equal(entries.length,1);
});
test('期間境界・複数支出・予算超過を集計する',()=>{
 const entries=[entry('2026-09-24',100,'a'),entry('2026-09-25',80000,'b'),entry('2026-10-24',30000,'c'),entry('2026-10-25',50,'d')];
 const result=summary(entries,'2026-10-24');assert.equal(result.remaining,-10000);assert.equal(result.items.length,2);
});
test('バックアップを検証し、不正な金額・日付・重複IDを拒否する',()=>{
 const data={version:1,entries:[entry('2026-10-24',80000)]};assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(data))),data.entries);
 for(const amount of [0,-1,1.5,'80000',Infinity])assert.throws(()=>validateBackup({version:1,entries:[entry('2026-10-24',amount)]}));
 assert.throws(()=>validateBackup({version:1,entries:[entry('2026-02-30',100)]}));
 assert.throws(()=>validateBackup({version:1,entries:[...data.entries,...data.entries]}));
 assert.throws(()=>validateBackup({version:2,entries:[]}));
});
