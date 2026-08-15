import {copyFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
const files=[
  ['node_modules/tesseract.js/dist/worker.min.js','public/ocr/worker.min.js'],
  ['node_modules/@tesseract.js-data/jpn/4.0.0/jpn.traineddata.gz','public/ocr/lang/jpn.traineddata.gz'],
  ['node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz','public/ocr/lang/eng.traineddata.gz'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js','public/ocr/core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js','public/ocr/core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js','public/ocr/core/tesseract-core-relaxedsimd-lstm.wasm.js'],
];

for(const [source,target] of files){
  const sourcePath=fileURLToPath(new URL(source,root));
  const targetPath=fileURLToPath(new URL(target,root));
  await mkdir(new URL('./',new URL(target,root)),{recursive:true});
  await copyFile(sourcePath,targetPath);
}

console.log('OCR assets prepared.');
