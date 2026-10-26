import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extractAct } from '../src/lib/extract';
import { emptyState, type State } from '../src/lib/model';
import { synchronize, type Repository, type Collection } from '../src/lib/sync';
const v=extractAct(readFileSync('docs/research/portaria22.html','utf8'),'https://anttlegis.antt.gov.br/a','2026-10-26T14:00:00Z');
class Memory implements Repository {
  state:State=emptyState(); revision=0; immutable=new Map<string,string>();
  async read(){return {state:structuredClone(this.state),etag:String(this.revision)};}
  async save(state:State,etag:string|null){if(etag!==String(this.revision))throw new Error('conflict');this.state=structuredClone(state);return String(++this.revision);}
  async archive(key:string,value:string){if(!this.immutable.has(key))this.immutable.set(key,value);}
}
const now=new Date('2026-10-26T14:00:00Z');
const good:Collection={versions:[v],pending:[],sources:[{name:'ANTT',url:v.sourceUrl,ok:true,checkedAt:now.toISOString()}],evidence:[],methodHash:'method'};
it('primeira carga cria base inicial e deduplica execuções posteriores',async()=>{
  const repo=new Memory();
  await synchronize(repo,async()=>good,'manual',now);
  expect(repo.state.versions).toHaveLength(1);expect(repo.state.versions[0].kind).toBe('baseline');
  await synchronize(repo,async()=>good,'schedule',new Date(now.getTime()+3600001));
  expect(repo.state.versions).toHaveLength(1);expect(repo.state.lastAutomatic).toBeDefined();
});
it('falha parcial mantém a versão anterior e não registra sucesso',async()=>{
  const repo=new Memory();await synchronize(repo,async()=>good,'manual',now);
  await synchronize(repo,async()=>({...good,versions:[],sources:[{name:'ANTT',url:v.sourceUrl,ok:false,checkedAt:'',error:'timeout'}]}),'schedule',new Date(now.getTime()+3600001));
  expect(repo.state.versions[0].id).toBe(v.id);expect(repo.state.lastSuccess).toBe(now.toISOString());
  expect(repo.state.runs[0].status).toBe('failed');
});
it('centraliza concorrência e limita consulta manual global ao orçamento horário',async()=>{
  const repo=new Memory();let calls=0;
  await Promise.allSettled([1,2,3].map(()=>synchronize(repo,async()=>{calls++;return good;},'manual',now)));
  expect(calls).toBe(1);
  expect((await synchronize(repo,async()=>{throw Error('não deve chamar fonte');},'manual',now)).status).toBe('cooldown');
});
it('mantém retificação, ato modificado e mudança de método em análise',async()=>{
  const repo=new Memory();await synchronize(repo,async()=>good,'manual',now);
  await synchronize(repo,async()=>({...good,versions:[{...v,id:'new',contentHash:'changed',kind:'rectification'}]}),'schedule',new Date(now.getTime()+3600001));
  expect(repo.state.versions).toHaveLength(1);expect(repo.state.pending).toHaveLength(1);
  await synchronize(repo,async()=>({...good,methodHash:'different',versions:[{...v,id:'newer',actId:'OTHER'}]}),'schedule',new Date(now.getTime()+7200002));
  expect(repo.state.versions).toHaveLength(1);expect(repo.state.pending.length).toBeGreaterThan(1);
});
it('coletor que lança erro libera bloqueio e deixa falha persistida',async()=>{
  const repo=new Memory(); await synchronize(repo,async()=>{throw new Error('timeout');},'schedule',now);
  expect(repo.state.lock).toBeUndefined();expect(repo.state.runs[0].status).toBe('failed');
});
