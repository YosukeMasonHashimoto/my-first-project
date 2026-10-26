import {localDate,periodFor,summary,validateBackup,validateEntry,hasHolidayCalendar} from './budget.js';
const KEY='watashi-no-yohaku-v1';
const $=id=>document.getElementById(id);
const yen=value=>'¥'+value.toLocaleString('ja-JP');
const shortDate=value=>value.slice(5).split('-').map(Number).join('/');
let entries=[],storageReady=true,memoryOnly=false,day=localDate(),noticeTimer;
const isPreview=document.body.dataset.preview==='true';
function explain(message){$('storage-notice').textContent=message;$('storage-notice').hidden=false;}
function useMemory(){memoryOnly=true;explain('試用モード：このプレビューでは端末への保存が使えません。入力は試せますが、画面を閉じたり再読み込みすると消えます。');}
function createEntryId(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 if(globalThis.crypto?.getRandomValues)return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
 return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
function notify(message){$('form-feedback').textContent=message;$('form-feedback').hidden=false;$('status').textContent=message;$('status').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('status').hidden=true,6000);}
let stored=null;
try{stored=localStorage.getItem(KEY);}
catch{
 if(isPreview)useMemory();
 else{storageReady=false;explain('端末への保存が許可されていないため記録できません。Safariで公開URLを開き、ブラウザの保存設定をご確認ください。');}
}
if(stored!==null){
 try{entries=validateBackup(JSON.parse(stored));}
 catch{storageReady=false;explain('保存データを読み込めません。上書きを防ぐため記録を停止しました。バックアップから復元してください。');}
}
function save(next){
 if(memoryOnly){entries=next;return true;}
 try{localStorage.setItem(KEY,JSON.stringify({version:1,entries:next}));entries=next;return true;}
 catch{
  if(isPreview){useMemory();entries=next;return true;}
  notify('保存できませんでした。空き容量やブラウザの保存設定を確認してください。');return false;
 }
}
function render(){
 const current=summary(entries);
 $('calendar-notice').hidden=hasHolidayCalendar(current.period.start)&&hasHolidayCalendar(current.period.next);
 $('period').textContent=`${shortDate(current.period.start)} — ${shortDate(current.period.end)}`;
 $('remaining').textContent=yen(current.remaining);$('spent').textContent=yen(current.spent);
 $('balance-title').textContent=current.remaining<0?'予算を超えた金額':'あと使えるお金';
 if(current.remaining<0)$('remaining').textContent=yen(-current.remaining)+' 超過';
 const used=Math.min(100,Math.round(current.spent/100000*100));$('progress').style.width=`${used}%`;
 document.querySelector('.meter').setAttribute('aria-valuenow',String(used));
 $('next').textContent=`次は${shortDate(current.period.next)}に更新 · 残金は繰り越しません`;
 const selected=$('history-period').value;
 const periods=[...new Set([current.period.start,...entries.map(e=>periodFor(e.date).start)])].sort().reverse();
 $('history-period').replaceChildren(...periods.map(p=>{const option=document.createElement('option');option.value=p;option.textContent=`${p.slice(0,4)}年 ${shortDate(p)}〜${shortDate(periodFor(p).end)}`;return option;}));
 if(periods.includes(selected))$('history-period').value=selected;
 renderHistory();
}
function renderHistory(){
 const selected=$('history-period').value;if(!selected)return;
 const view=summary(entries,selected);$('history-total').textContent=`${view.items.length}件 · 合計 ${yen(view.spent)}`;
 $('entries').replaceChildren(...view.items.map(entry=>{
  const li=document.createElement('li');const icon=document.createElement('span');icon.className='item-icon';icon.textContent='−';icon.setAttribute('aria-hidden','true');
  const info=document.createElement('div');info.className='item-info';const note=document.createElement('div');note.className='item-note';note.textContent=entry.note||'支出';
  const date=document.createElement('div');date.className='item-date';date.textContent=`${entry.date.slice(0,4)}.${entry.date.slice(5).replace('-','.')}`;info.append(note,date);
  const amount=document.createElement('span');amount.className='item-amount';amount.textContent=yen(entry.amount);
  const remove=document.createElement('button');remove.type='button';remove.className='delete';remove.textContent='×';remove.setAttribute('aria-label',`${entry.date}の${entry.note||'支出'} ${yen(entry.amount)}を削除`);
  remove.addEventListener('click',()=>{if(!storageReady){notify($('storage-notice').textContent);return;}if(confirm(`${entry.note||'支出'} ${yen(entry.amount)}を削除しますか？`)&&save(entries.filter(e=>e.id!==entry.id))){render();notify('支出を削除しました');}});
  li.append(icon,info,amount,remove);return li;
 }));$('empty').hidden=view.items.length>0;
}
$('date').value=localDate();
$('entry-form').addEventListener('invalid',event=>{notify(event.target.id==='amount'?'金額を数字で入力してください（例：80000）':'使った日を入力してください');},true);
function recordExpense(event){
 event.preventDefault();if(!$('entry-form').reportValidity())return;if(!storageReady){notify($('storage-notice').textContent);return;}
 try{
 const raw=$('amount').value.replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/[,，]/g,'');
 if(!/^\d+$/.test(raw))throw new Error('金額は1円以上の整数で入力してください');
 const entry=validateEntry({id:createEntryId(),amount:Number(raw),date:$('date').value,note:$('note').value.trim()});
 if(entry.date>localDate())throw new Error('今日までの日付を選んでください');
 if(save([...entries,entry])){
 $('amount').value='';$('note').value='';$('history-period').value='';render();
 if(periodFor(entry.date).start!==periodFor().start)$('history-period').value=periodFor(entry.date).start;
 renderHistory();notify(memoryOnly?'支出を試しに記録しました（再読み込みで消えます）':'支出を記録しました');
 }
 }catch(error){notify(error.message);}
}
$('record-entry').addEventListener('click',recordExpense);
$('entry-form').addEventListener('submit',recordExpense);
$('entry-form').addEventListener('keydown',event=>{
 if(event.key==='Enter'&&!event.isComposing&&event.target.tagName==='INPUT'){event.preventDefault();$('record-entry').click();}
});
$('history-period').addEventListener('change',renderHistory);
$('export').addEventListener('click',()=>{
 if(!storageReady){notify('保存データを読み込めないため書き出せません。');return;}
 const blob=new Blob([JSON.stringify({version:1,entries},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`yohaku-${localDate()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
});
$('import').addEventListener('click',()=>$('backup-file').click());
$('backup-file').addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{if(file.size>20000000)throw new Error('ファイルが大きすぎます');const restored=validateBackup(JSON.parse(await file.text()));
 if(confirm(`${restored.length}件の記録を読み込み、現在の記録を置き換えますか？`)){
 if(save(restored)){storageReady=true;render();notify('バックアップを読み込みました');}
 }
 }catch(error){notify(`読み込めませんでした: ${error.message}`);}finally{event.target.value='';}
});
function refreshDay(){const today=localDate();if(day!==today){if($('date').value===day)$('date').value=today;day=today;$('history-period').value='';render();}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDay();});setInterval(refreshDay,30000);
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>notify('オフライン用の保存に失敗しました。オンラインでご利用ください。'));
