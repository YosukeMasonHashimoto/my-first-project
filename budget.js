export const BUDGET = 100000;
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function periodFor(value = localDate()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('日付が正しくありません');
  const [y,m,d] = value.split('-').map(Number);
  const check = new Date(y,m-1,d,12);
  if (localDate(check) !== value) throw new Error('日付が正しくありません');
  const start = new Date(y,m-1-(d<25?1:0),25,12);
  const next = new Date(start.getFullYear(),start.getMonth()+1,25,12);
  const end = new Date(next.getFullYear(),next.getMonth(),24,12);
  return {start:localDate(start), end:localDate(end), next:localDate(next)};
}
export function validateEntry(entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.id || !Number.isSafeInteger(entry.amount) || entry.amount <= 0 || entry.amount > 99999999 || typeof entry.note !== 'string' || entry.note.length > 100) throw new Error('支出データが正しくありません');
  if (typeof entry.date !== 'string') throw new Error('日付が正しくありません');
  periodFor(entry.date);
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
