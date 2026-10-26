import {JAPAN_HOLIDAYS,HOLIDAY_CALENDAR} from './holidays.js';
export const BUDGET = 100000;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日付が正しくありません');
  const [y,m,d] = value.split('-').map(Number);
  const date = new Date(y,m-1,d,12);
  if (localDate(date) !== value) throw new Error('日付が正しくありません');
  return date;
}
export function hasHolidayCalendar(value) {
  const year=parseDate(value).getFullYear();
  return year>=HOLIDAY_CALENDAR.firstYear&&year<=HOLIDAY_CALENDAR.lastYear;
}
export function isBusinessDay(value) {
  const date=parseDate(value);
  return date.getDay()!==0&&date.getDay()!==6&&!JAPAN_HOLIDAYS[value];
}
function paydayDate(year,monthIndex) {
  const date=new Date(year,monthIndex,25,12);
  while(!isBusinessDay(localDate(date)))date.setDate(date.getDate()-1);
  return date;
}
export function paydayFor(year,month) {
  if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw new Error('年月が正しくありません');
  return localDate(paydayDate(year,month-1));
}
export function periodFor(value = localDate()) {
  const date=parseDate(value),year=date.getFullYear(),month=date.getMonth();
  const offset=date<paydayDate(year,month)?-1:0;
  const start=paydayDate(year,month+offset);
  const next=paydayDate(year,month+offset+1);
  const end=new Date(next);end.setDate(end.getDate()-1);
  return {start:localDate(start),end:localDate(end),next:localDate(next)};
}
export function validateEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id || !Number.isSafeInteger(entry.amount) || entry.amount <= 0 || entry.amount > 99999999 || typeof entry.note !== 'string' || entry.note.length > 100) throw new Error('支出データが正しくありません');
  if (typeof entry.date !== 'string') throw new Error('日付が正しくありません');
  parseDate(entry.date);
  return {id:entry.id,amount:entry.amount,note:entry.note,date:entry.date};
}
export function validateBackup(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.entries) || data.entries.length > 100000) throw new Error('対応するバックアップファイルではありません');
  const entries = data.entries.map(validateEntry);
  if (new Set(entries.map(e=>e.id)).size !== entries.length) throw new Error('重複するデータがあります');
  return entries;
}
export function summary(entries, date=localDate()) {
  const period = periodFor(date);
  const items = entries.filter(e=>e.date>=period.start && e.date<=period.end).sort((a,b)=>b.date.localeCompare(a.date));
  const spent = items.reduce((sum,e)=>sum+e.amount,0);
  return {period,items,spent,remaining:BUDGET-spent};
}
