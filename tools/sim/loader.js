import fs from 'fs';
import path from 'path';
import { Type, loadParamsFor } from './engine.js';

function deriveKey(fp){
  const base = path.basename(fp).replace(/\.js$/,'');
  return base;
}

export function loadBot(filePath){
  const code = fs.readFileSync(filePath,'utf8');
  const key = deriveKey(filePath);
  const PARAMS = Object.freeze(loadParamsFor(key));
  const wrapper = new Function('Type','PARAMS',`
    const console = {log:()=>{}, warn:()=>{}, error:()=>{}}; // 차단
    ${code}
    return { name, type, update };
  `);
  const api = wrapper(Type, PARAMS);
  // 간단 검증
  if (typeof api.name !== 'function' || typeof api.type !== 'function' || typeof api.update !== 'function'){
    throw new Error('Invalid bot snippet: missing name/type/update');
  }
  return api;
}

