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
