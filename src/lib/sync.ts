import { randomUUID } from 'node:crypto';
import { classifyChange } from './domain';
import type { State, Version, Pending, SourceResult, SyncRun } from './model';
export interface Repository {
  read():Promise<{state:State;etag:string|null}>;
  save(state:State,etag:string|null):Promise<string>;
  archive(key:string,value:string):Promise<void>;
}
export type Collection={ versions:Version[];pending:Pending[];sources:SourceResult[];evidence:{hash:string;content:string}[];methodHash?:string };
export const INTERVAL_MINUTES=60;
export const COOLDOWN_MS=55*60*1000;
export async function synchronize(repo:Repository,collect:()=>Promise<Collection>,trigger:string,now=new Date()) {
  const {state,etag}=await repo.read(); const startedAt=now.toISOString();
  if(state.lock&&Date.parse(state.lock.until)>now.getTime())return {status:'busy' as const};
  if(state.lastAttempt&&now.getTime()-Date.parse(state.lastAttempt)<COOLDOWN_MS)return {status:'cooldown' as const,nextAt:new Date(Date.parse(state.lastAttempt)+COOLDOWN_MS).toISOString()};
  const owner=randomUUID(); state.lock={owner,until:new Date(now.getTime()+240000).toISOString()};
  state.lastAttempt=startedAt;
  let lockedEtag:string;
  try { lockedEtag=await repo.save(state,etag); }catch {return {status:'busy' as const};}
  let result:Collection;
  try{result=await collect();}catch(error){result={versions:[],pending:[],evidence:[],sources:[{name:'Coleta',url:'https://www.gov.br/antt/',ok:false,checkedAt:startedAt,error:error instanceof Error?error.message:'Falha de coleta'}]};}
  const before=state.versions.length;
  const pendingBefore=state.pending.length;
  const addPending=(p:Pending)=>{if(!state.pending.some(x=>x.id===p.id))state.pending.push(p);};
  result.pending.forEach(addPending);
  const methodChanged=Boolean(state.methodHash&&result.methodHash&&state.methodHash!==result.methodHash);
  for(const v of result.versions.sort((a,b)=>a.effectiveAt.localeCompare(b.effectiveAt))) {
    if(state.versions.some(old=>old.id===v.id))continue;
    let reason='';
    if(methodChanged)reason='Mudança na metodologia ou aplicabilidade: revisão necessária';
    else if(v.kind==='rectification')reason='Retificação: verificar efeito antes de substituir coeficientes';
    else if(state.versions.some(old=>old.actId===v.actId&&old.publishedAt===v.publishedAt))reason='Texto de ato já registrado mudou: possível retificação';
    else if(!result.methodHash)reason='Metodologia não verificada nesta coleta';
    if(reason){addPending({id:v.id,title:v.title,url:v.sourceUrl,reason,detectedAt:startedAt,hash:v.evidenceHash});continue;}
    const prior=[...state.versions].filter(x=>x.effectiveAt<=v.effectiveAt).sort((a,b)=>b.effectiveAt.localeCompare(a.effectiveAt))[0];
    const candidate={...v,kind:classifyChange(prior,v)};
    await repo.archive(`versions/${candidate.id}.json`,JSON.stringify(candidate));
    state.versions.push(candidate);
  }
  for(const evidence of result.evidence)await repo.archive(`evidence/${evidence.hash}.html`,evidence.content);
  if(!state.methodHash&&result.methodHash)state.methodHash=result.methodHash;
  if(methodChanged)addPending({id:`method-${result.methodHash}`,title:'Metodologia da Resolução nº 5.867/2020',url:'https://anttlegis.antt.gov.br/',reason:'Texto de metodologia mudou; cálculos suspensos até revisão',detectedAt:startedAt});
  const ok=result.sources.filter(s=>s.ok).length;
  const status:SyncRun['status']=ok===result.sources.length&&ok>0&&!methodChanged?'success':ok>0?'partial':'failed';
  const run:SyncRun={id:owner,startedAt,finishedAt:new Date().toISOString(),trigger,status,sources:result.sources,added:state.versions.length-before,pending:state.pending.length-pendingBefore};
  state.runs.unshift(run); if(status==='success')state.lastSuccess=startedAt;
  if(trigger==='schedule')state.lastAutomatic=startedAt;
  delete state.lock;
  // The fencing token (ETag of the lock) prevents an expired worker from writing
  // over a newer one. Archive failures leave a lease that expires after 4 min.
  await repo.save(state,lockedEtag);
  console.info(JSON.stringify({event:'sync',id:owner,status,trigger,added:run.added,pending:run.pending}));
  return {status:'completed' as const,run};
}
