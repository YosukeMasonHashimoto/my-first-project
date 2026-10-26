import test from 'node:test';
import assert from 'node:assert/strict';
import {periodFor,summary,validateBackup,paydayFor,isBusinessDay,hasHolidayCalendar} from '../budget.js';
const entry=(date,amount,id='a')=>({id,date,amount,note:''});
test('2026年10月25日（日）は23日（金）に切り替わる',()=>{
 assert.equal(paydayFor(2026,10),'2026-10-23');
 assert.deepEqual(periodFor('2026-10-22'),{start:'2026-09-25',end:'2026-10-22',next:'2026-10-23'});
 const october={start:'2026-10-23',end:'2026-11-24',next:'2026-11-25'};
 for(const date of ['2026-10-23','2026-10-24','2026-10-25','2026-11-24'])assert.deepEqual(periodFor(date),october);
 assert.equal(periodFor('2026-11-25').start,'2026-11-25');
});
test('土日・祝日・特例の連休を営業日までさかのぼる',()=>{
 assert.equal(paydayFor(2026,4),'2026-04-24'); // 25日が土曜日
 assert.equal(paydayFor(2024,2),'2024-02-22'); // 25日が日曜、23日は天皇誕生日
 assert.equal(paydayFor(2020,7),'2020-07-22'); // 五輪の特例：23日・24日が祝日
 assert.equal(paydayFor(2021,7),'2021-07-21'); // 22日・23日が祝日、24日・25日が土日
 assert.equal(paydayFor(2022,9),'2022-09-22'); // 23日が秋分の日
 assert.equal(paydayFor(2026,11),'2026-11-25'); // 平日なら25日のまま
 assert.equal(paydayFor(2025,2),'2025-02-25'); // 前日が振替休日でも25日が平日ならそのまま
});
test('祝日カレンダーの振替休日・国民の休日・平日を判定する',()=>{
 for(const date of ['2025-02-24','2026-09-22','2019-05-01','2021-08-09','2026-10-24','2026-10-25'])assert.equal(isBusinessDay(date),false,date);
 assert.equal(isBusinessDay('2026-10-23'),true);
 assert.equal(hasHolidayCalendar('2026-10-23'),true);
 assert.equal(hasHolidayCalendar('2060-10-23'),false);
});
test('年越しとうるう年の期間。翌月の繰り上げも終了日に反映する',()=>{
 assert.deepEqual(periodFor('2027-01-01'),{start:'2026-12-25',end:'2027-01-24',next:'2027-01-25'});
 assert.deepEqual(periodFor('2028-02-29'),{start:'2028-02-25',end:'2028-03-23',next:'2028-03-24'});
 assert.throws(()=>periodFor('2026-02-29'));
 assert.throws(()=>periodFor('2026-13-01'));
});
test('8万円支出で残高2万円、繰り上げた給料日にリセットし過去の記録を維持する',()=>{
 const entries=[entry('2026-10-22',80000)];
 assert.equal(summary(entries,'2026-10-22').remaining,20000);
 assert.equal(summary(entries,'2026-10-23').remaining,100000);
 assert.equal(entries.length,1);
 assert.deepEqual(entries[0],entry('2026-10-22',80000));
});
test('既存データも給料日の新しい境界で集計し、超過額を表示する',()=>{
 const entries=[entry('2026-09-24',100,'a'),entry('2026-09-25',80000,'b'),entry('2026-10-22',30000,'c'),entry('2026-10-23',50,'d')];
 const result=summary(entries,'2026-10-22');assert.equal(result.remaining,-10000);assert.equal(result.items.length,2);
 assert.equal(summary(entries,'2026-10-23').remaining,99950);
 assert.equal(summary(entries,'2026-10-24').remaining,99950);
});
test('境界日が属する期間に空白や重複がない（2020〜2030年）',()=>{
 for(let year=2020;year<=2030;year++)for(let month=1;month<=12;month++){
  const payday=paydayFor(year,month);assert.ok(isBusinessDay(payday));assert.ok(Number(payday.slice(8))<=25);
  const period=periodFor(payday);assert.equal(period.start,payday);
  assert.equal(periodFor(period.end).start,payday);assert.equal(periodFor(period.next).start,period.next);
  const end=new Date(`${period.next}T12:00:00`);end.setDate(end.getDate()-1);
  const actual=`${end.getFullYear()}-${String(end.getMonth()+1).padStart(2,'0')}-${String(end.getDate()).padStart(2,'0')}`;
  assert.equal(period.end,actual);
 }
});
test('バックアップ形式を維持し、不正な金額・日付・重複IDを拒否する',()=>{
 const data={version:1,entries:[entry('2026-10-24',80000)]};assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(data))),data.entries);
 for(const amount of [0,-1,1.5,'80000',Infinity])assert.throws(()=>validateBackup({version:1,entries:[entry('2026-10-24',amount)]}));
 assert.throws(()=>validateBackup({version:1,entries:[entry('2026-02-30',100)]}));
 assert.throws(()=>validateBackup({version:1,entries:[...data.entries,...data.entries]}));
 assert.throws(()=>validateBackup({version:2,entries:[]}));
});
