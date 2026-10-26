import { keyOf, type Coefficient, type Version, type ChangeKind } from './model';
export function currentVersion(versions:Version[],now=new Date()) {
  return versions.filter(v=>Date.parse(`${v.effectiveAt}T00:00:00-03:00`)<=now.getTime())
    .sort((a,b)=>b.effectiveAt.localeCompare(a.effectiveAt)||b.publishedAt.localeCompare(a.publishedAt))[0];
}
export type Difference={before:number|null;after:number|null;delta:number|null;percent:number|null};
const difference=(a:number|undefined,b:number|undefined):Difference=>({before:a??null,after:b??null,delta:a!==undefined&&b!==undefined?b-a:null,percent:a!==undefined&&b!==undefined&&a!==0?(b-a)/a*100:null});
export function compareVersions(a:Version,b:Version) {
  const old=new Map(a.rows.map(r=>[keyOf(r),r])), next=new Map(b.rows.map(r=>[keyOf(r),r]));
  return [...new Set([...old.keys(),...next.keys()])].sort().map(key=>{
    const before=old.get(key),after=next.get(key),row=(after||before)!;
    const status=a.methodology!==b.methodology?'incompatible':!before?'added':!after?'removed':'comparable';
    return {...row,status,ccd:difference(status==='incompatible'?undefined:before?.ccd,status==='incompatible'?undefined:after?.ccd),cc:difference(status==='incompatible'?undefined:before?.cc,status==='incompatible'?undefined:after?.cc)};
  });
}
export function classifyChange(a:Version|undefined,b:Version):ChangeKind {
  if(!a) return 'baseline'; if(b.kind==='rectification') return 'rectification';
  if(a.methodology!==b.methodology) return 'methodology';
  const rows=compareVersions(a,b);
  if(rows.some(r=>r.status!=='comparable')) return 'mixed';
  const deltas=rows.flatMap(r=>[r.ccd.delta!,r.cc.delta!]);
  const up=deltas.some(d=>d>0),down=deltas.some(d=>d<0);
  return up&&down?'mixed':up?'increase':down?'decrease':'publication';
}
export const formatDate=(value?:string,withTime=false)=>!value?'Ainda não registrada':new Intl.DateTimeFormat('pt-BR',{
  timeZone:'America/Fortaleza',day:'2-digit',month:'2-digit',year:'numeric',...(withTime?{hour:'2-digit',minute:'2-digit'} as const:{})
}).format(new Date(value.length===10?`${value}T12:00:00-03:00`:value));
export const number=(n:number,digits=4)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(n);
export const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export function toCsv(rows:(string|number|null)[][]) {
  return '\uFEFF'+rows.map(row=>row.map(cell=>{
    let s=cell===null?'':typeof cell==='number'?String(cell).replace('.',','):cell;
    if(/^[=+\-@\t\r]/.test(s)&&typeof cell!=='number')s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  }).join(';')).join('\r\n');
}
export const filterRows=(rows:Coefficient[],table:string,cargo:string,axles:string)=>rows.filter(r=>(!table||r.table===table)&&(!cargo||r.cargo===cargo)&&(!axles||r.axles===Number(axles)));
