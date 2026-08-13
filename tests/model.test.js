import test from 'node:test';import assert from 'node:assert/strict';
import {localDate,ageOn,dueDateFromMating,birthCount,validateBirth,createPuppies,duplicateChip,inspectionStatus,canSaveInspection,validateBackup,cleanPersistentState,annualSummary,seedData,migrateState} from '../src/model.js';

test('ローカル日付は端末時刻の年月日を返す',()=>{assert.equal(localDate(new Date(2026,7,13,0,10)),'2026-08-13');assert.equal(localDate(new Date(2026,7,13,8,10)),'2026-08-13');assert.equal(localDate(new Date(2026,7,13,15,10)),'2026-08-13');});
test('年齢を日付だけで計算する',()=>assert.deepEqual(ageOn('2020-05-10',new Date(2026,7,13,0,10)),{years:6,months:3}));
test('交配日から63日後を日付だけで計算する',()=>assert.equal(dueDateFromMating('2026-06-15'),'2026-08-17'));
test('出産回数を履歴から集計する',()=>assert.equal(birthCount('m',[{motherId:'m'},{motherId:'m'},{motherId:'x'}]),2));
test('出産頭数の整合性を検証する',()=>{assert.equal(validateBirth({maleCount:2,femaleCount:3,healthyCount:5,illCount:0,deadCount:0}),'');assert.match(validateBirth({maleCount:2,femaleCount:3,healthyCount:4,illCount:0,deadCount:0}),/一致しません/);});
test('父母ID付きで性別数どおり子犬を作る',()=>{const xs=createPuppies({maleCount:2,femaleCount:3,date:'2026-08-13',litterId:'l',fatherId:'f'},{id:'m',name:'母犬'},{id:'f'});assert.equal(xs.length,5);assert.equal(xs.filter(x=>x.sex==='オス').length,2);assert.ok(xs.every(x=>x.motherId==='m'&&x.fatherId==='f'&&x.litterId==='l'));});
test('マイクロチップ重複を検出し空欄は除外する',()=>{assert.equal(duplicateChip(seedData().dogs,'SAMPLE-CHIP-001').id,'dog_sora');assert.equal(duplicateChip(seedData().dogs,''),undefined);});
test('1日2回の点検回数を任意日時で判定する',()=>{const now=new Date(2026,7,13,8);assert.equal(inspectionStatus([],now).nextRound,1);assert.equal(inspectionStatus([{date:'2026-08-13',round:1}],now).nextRound,2);assert.equal(inspectionStatus([{date:'2026-08-13',round:1},{date:'2026-08-13',round:2}],now).complete,true);});
test('2回完了後と同一回の重複を防ぐ',()=>{const xs=[{date:'2026-08-13',round:1},{date:'2026-08-13',round:2}];assert.equal(canSaveInspection(xs,'2026-08-13',1),false);assert.equal(canSaveInspection(xs,'2026-08-13',2),false);});
test('正常なバックアップを検証する',()=>{const data=seedData(),r=validateBackup({kind:'kensha-note-backup',version:1,data});assert.equal(r.ok,true);assert.equal(r.summary.dogs,8);});
test('破損バックアップと関連ID欠損を拒否する',()=>{assert.equal(validateBackup({}).ok,false);const data=seedData();data.health.push({id:'bad',dogId:'missing'});assert.equal(validateBackup({kind:'kensha-note-backup',version:1,data}).ok,false);});
test('Undoを永続状態から除き入れ子を防ぐ',()=>{const data=seedData();data.undo={...seedData(),undo:{nested:true}};const clean=cleanPersistentState(data);assert.equal('undo' in clean,false);});
test('年度集計の新規・譲渡・死亡・年度末を計算する',()=>{const state=seedData();state.dogs=[{id:'a',birthDate:'2020-01-01',createdAt:'2025-01-01T00:00:00Z',status:'成犬'},{id:'b',birthDate:'2026-02-01',createdAt:'2026-02-01T00:00:00Z',status:'譲渡済み'},{id:'c',birthDate:'2020-01-01',createdAt:'2025-01-01T00:00:00Z',status:'死亡',deathDate:'2026-05-01'}];state.pickups=[{dogId:'b',status:'完了',actualDate:'2026-08-01'}];const s=annualSummary(state,2026);assert.equal(s.registered,1);assert.equal(s.transferred,1);assert.equal(s.deaths,1);});
test('v1データをv2へ移行しコレクションを維持する',()=>{const v1=seedData();v1.schemaVersion=1;delete v1.attachments;const next=migrateState(v1);assert.equal(next.schemaVersion,2);assert.deepEqual(next.attachments,[]);});
