import {it,expect} from 'vitest';
import { calculate } from '../src/lib/calculation';
import { parseOfficialResult } from '../src/lib/official-calculator';
import {readFileSync} from 'node:fs';
const row={table:'A' as const,cargo:'Carga Geral',axles:6,ccd:7.5347,cc:671.93};
it('confere exemplo real da calculadora oficial e arredondamento decimal',()=>{
  expect(calculate(row,100,0)).toEqual({outbound:1425.40,returnValue:0,total:1425.40});
  expect(parseOfficialResult(readFileSync('docs/research/calculator-result.html','utf8'))).toMatchObject({ccd:7.5347,cc:671.93,total:1425.40});
  expect(calculate({...row,ccd:1.005,cc:1},1,0).total).toBe(2.01);
});
it('aplica retorno vazio de 92% apenas ao CCD e distância de retorno',()=>{
  expect(calculate(row,100,100)).toMatchObject({returnValue:693.19,total:2118.59});
  for(const d of [NaN,Infinity,-1,0,100000])expect(()=>calculate(row,d,0)).toThrow();
  expect(()=>calculate(row,100,-1)).toThrow();
});
