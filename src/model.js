export const SCHEMA_VERSION = 2;
export const REQUIRED_COLLECTIONS = ['dogs','health','inspections','breeding','births','pickups','attachments'];

const SAMPLE_PHOTO = 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"%3E%3Crect width="120" height="120" rx="24" fill="%23dfe9df"/%3E%3Ccircle cx="60" cy="63" r="34" fill="%2397b59f"/%3E%3Ccircle cx="47" cy="58" r="4" fill="%23315c4a"/%3E%3Ccircle cx="73" cy="58" r="4" fill="%23315c4a"/%3E%3Cpath d="M52 74q8 8 16 0" fill="none" stroke="%23315c4a" stroke-width="4" stroke-linecap="round"/%3E%3Cpath d="M30 38l18 12M90 38L72 50" stroke="%2397b59f" stroke-width="16" stroke-linecap="round"/%3E%3C/svg%3E';

export const id = (prefix='id') => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
export function localDate(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function parseLocalDate(value) {
  const [y,m,d]=String(value).split('-').map(Number); return new Date(y,m-1,d,12,0,0,0);
}
export function addDays(value, days) { const d=parseLocalDate(value); d.setDate(d.getDate()+days); return localDate(d); }
export const dueDateFromMating = value => addDays(value,63);
export function ageOn(birthDate, now = new Date()) {
  const birth=parseLocalDate(birthDate), current=now instanceof Date?now:parseLocalDate(now); let years=current.getFullYear()-birth.getFullYear(), months=current.getMonth()-birth.getMonth();
  if(current.getDate()<birth.getDate())months--; if(months<0){years--;months+=12;} return {years,months};
}
export const birthCount = (dogId,births)=>births.filter(x=>x.motherId===dogId&&!x.deletedAt).length;
export function inspectionStatus(inspections, now=new Date()) {
  const date=localDate(now), rounds=new Set(inspections.filter(x=>x.date===date&&!x.deletedAt).map(x=>Number(x.round)));
  return {date,completed:[...rounds].sort(),nextRound:rounds.has(1)?(rounds.has(2)?null:2):1,complete:rounds.has(1)&&rounds.has(2)};
}
export function canSaveInspection(inspections,date,round){return !inspections.some(x=>x.date===date&&Number(x.round)===Number(round)&&!x.deletedAt);}
export function validateBirth({maleCount,femaleCount,healthyCount,illCount,deadCount}) {const total=Number(maleCount)+Number(femaleCount),outcomes=Number(healthyCount)+Number(illCount)+Number(deadCount);return total===outcomes?'':`性別の合計（${total}頭）と状態の合計（${outcomes}頭）が一致しません`;}
export function createPuppies(birth,mother,father=null){
  const make=(sex,i)=>({id:id('dog'),name:`${mother.name}の${sex==='オス'?'男':'女'}の子${i+1}`,sex,birthDate:birth.date,status:'子犬',motherId:mother.id,fatherId:father?.id||birth.fatherId||'',litterId:birth.litterId,ribbon:'未設定',photo:SAMPLE_PHOTO,sample:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),deletedAt:null});
  return [...Array(Number(birth.maleCount))].map((_,i)=>make('オス',i)).concat([...Array(Number(birth.femaleCount))].map((_,i)=>make('メス',i)));
}
export function duplicateChip(dogs,chip,except=''){const value=String(chip||'').trim();return value?dogs.find(d=>d.microchip===value&&d.id!==except&&!d.deletedAt):undefined;}
export function migrateState(raw){
  const base=seedData(); if(!raw||typeof raw!=='object')return base; const next={...base,...raw};
  for(const key of REQUIRED_COLLECTIONS)next[key]=Array.isArray(raw[key])?raw[key]:[];
  next.schemaVersion=SCHEMA_VERSION; next.dogs=next.dogs.map(d=>({...d,photo:d.photo||SAMPLE_PHOTO,createdAt:d.createdAt||new Date().toISOString(),updatedAt:d.updatedAt||d.createdAt||new Date().toISOString(),deletedAt:d.deletedAt||null}));
  next.health=next.health.map(h=>({...h,attachmentStatus:h.attachmentStatus||'未添付'})); delete next.undo; return next;
}
export function cleanPersistentState(value){const clean=structuredClone(value);delete clean.undo;return clean;}
export function backupSummary(data){return {dogs:data.dogs.filter(x=>!x.deletedAt).length,health:data.health.length,inspections:data.inspections.length,breeding:data.breeding.length,births:data.births.length,pickups:data.pickups.length};}
export function validateBackup(value){
  const errors=[]; if(!value||typeof value!=='object')return {ok:false,errors:['JSONオブジェクトではありません']};
  if(value.kind!=='kensha-note-backup')errors.push('バックアップ種別が違います'); if(value.version!==1)errors.push('バックアップバージョンが未対応です');
  const data=value.data; if(!data||![1,2].includes(data.schemaVersion))errors.push('スキーマバージョンが未対応です');
  if(data)for(const key of REQUIRED_COLLECTIONS)if(!Array.isArray(data[key]))errors.push(`${key}が配列ではありません`);
  if(!errors.length){const ids=new Set();for(const d of data.dogs){if(!d.id)errors.push('IDのない犬があります');else if(ids.has(d.id))errors.push(`犬IDが重複しています: ${d.id}`);ids.add(d.id);}for(const h of data.health)if(!ids.has(h.dogId))errors.push(`健康記録の対象犬がありません: ${h.dogId}`);for(const p of data.pickups)if(!ids.has(p.dogId))errors.push(`お迎え記録の対象犬がありません: ${p.dogId}`);}
  return {ok:errors.length===0,errors,summary:errors.length?null:backupSummary(data)};
}
export function annualSummary(state,year){
  const start=`${year}-01-01`,end=`${year}-12-31`; const activeAtStart=state.dogs.filter(d=>d.birthDate<=start&&(!d.createdAt||localDate(d.createdAt)<=start)&&d.status!=='譲渡済み').length;
  const registered=state.dogs.filter(d=>d.createdAt&&localDate(d.createdAt)>=start&&localDate(d.createdAt)<=end).length,transferred=state.pickups.filter(p=>p.status==='完了'&&p.actualDate>=start&&p.actualDate<=end).length,deaths=state.dogs.filter(d=>d.deathDate>=start&&d.deathDate<=end).length;
  return {year,startCount:activeAtStart,registered,transferred,deaths,endCount:Math.max(0,activeAtStart+registered-transferred-deaths),needsReview:state.dogs.some(d=>!d.createdAt)};
}
export function seedData(){
  const nowIso=new Date().toISOString(); const dog=(x)=>({...x,photo:SAMPLE_PHOTO,sample:true,createdAt:nowIso,updatedAt:nowIso,deletedAt:null});
  const dogs=[dog({id:'dog_sora',name:'ソラ（サンプル）',sex:'オス',birthDate:'2021-03-12',status:'成犬',ribbon:'ブルー',microchip:'SAMPLE-CHIP-001'}),dog({id:'dog_hana',name:'ハナ（サンプル）',sex:'メス',birthDate:'2020-05-10',status:'繁殖中',ribbon:'ピンク',microchip:'SAMPLE-CHIP-002'}),dog({id:'dog_coco',name:'ココ（サンプル）',sex:'メス',birthDate:'2022-01-20',status:'出産待ち',ribbon:'イエロー',microchip:'SAMPLE-CHIP-003'}),...['赤','青','緑','紫','白'].map((r,i)=>dog({id:`dog_p${i+1}`,name:`むぎ${i+1}（サンプル）`,sex:i<2?'オス':'メス',birthDate:'2026-06-18',status:i===0?'お迎え待ち':'子犬',ribbon:`${r}リボン`,litterId:'litter_1',motherId:'dog_hana',fatherId:'dog_sora'}))];
  return {schemaVersion:SCHEMA_VERSION,dogs,health:[{id:'h1',dogId:'dog_hana',type:'体重',date:'2026-08-01',value:'5.8 kg',sample:true},{id:'h2',dogId:'dog_p1',type:'ワクチン',date:'2026-07-20',value:'混合6種',attachmentStatus:'未添付',sample:true},{id:'h3',dogId:'dog_p2',type:'駆虫',date:'2026-07-22',value:'サンプル駆虫薬',sample:true},{id:'h4',dogId:'dog_hana',type:'投薬',date:'2026-08-10',value:'サンプル薬・1日1回',sample:true}],inspections:[],breeding:[{id:'breed_1',motherId:'dog_hana',fatherId:'dog_sora',stage:'妊娠確認待ち',matingDate:'2026-07-01',dueDate:'2026-09-02',events:[],sample:true},{id:'breed_2',motherId:'dog_coco',fatherId:'dog_sora',stage:'出産待ち',matingDate:'2026-06-15',dueDate:'2026-08-17',events:[{type:'妊娠確認',date:'2026-07-15',result:'妊娠確認'}],sample:true}],births:[{id:'birth_1',breedingId:'breed_done',motherId:'dog_hana',fatherId:'dog_sora',date:'2026-06-18',maleCount:2,femaleCount:3,healthyCount:5,illCount:0,deadCount:0,litterId:'litter_1',sample:true}],pickups:[{id:'pickup_1',dogId:'dog_p1',date:'2026-08-14',ownerName:'サンプルオーナー',status:'予定',sample:true}],attachments:[],settings:{handler:'サンプル担当者',kennelName:'サンプル犬舎'},createdAt:nowIso};
}
