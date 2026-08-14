import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const appSource=await readFile(new URL('../src/app.js',import.meta.url),'utf8');

test('保存後はIndexedDBから読み直した状態を表示する',()=>{
  assert.match(appSource,/await saveState\(next\);const persisted=await loadState\(\)/);
  assert.match(appSource,/state=migrateState\(persisted\)/);
});

test('画面描画ごとにモーダル有無とスクロール禁止状態を同期する',()=>{
  assert.match(appSource,/classList\.toggle\('modal-open',Boolean\(modal\)\)/);
  assert.match(appSource,/modal=null;document\.body\.classList\.remove\('modal-open'\)/);
});

test('犬詳細で保存画像件数を確認できる',()=>{
  assert.match(appSource,/その他（\$\{attachments\.length\}）/);
  assert.match(appSource,/保存した書類（\$\{attachments\.length\}件）/);
});

test('京都府参考様式の入力と5帳簿出力を提供する',()=>{
  for(const text of ['京都府・事業者情報','京都府・個体帳簿情報','個体管理帳簿','繁殖実施状況記録台帳','飼養施設・動物点検台帳','取引状況記録台帳','定期報告届出集計'])assert.match(appSource,new RegExp(text));
  assert.match(appSource,/相手方の関係法令遵守状況/);
  assert.match(appSource,/PDF保存・印刷/);
});
