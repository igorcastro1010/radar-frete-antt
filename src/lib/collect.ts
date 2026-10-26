import { load } from 'cheerio';
import { discoverActs, extractAct, hash, normalize, normativeText } from './extract';
import { officialHtml } from './fetch-source';
import { verifyCalculator } from './official-calculator';
import { INDEX_URL, METHOD_URL, PREVIOUS_URL, LATEST_URL } from './sources';
import type { State } from './model';
import type { Collection } from './sync';
import approved from './verified-method.json';
export function methodFingerprint(html:string) {
  const text=normativeText(html), start=text.indexOf('Art. 2º'), end=text.indexOf('Art. 6º',start);
  if(start<0||end<start)throw Error('Artigos da metodologia não encontrados');
  return hash(text.slice(start,end));
}
export async function collectSources(previous:State):Promise<Collection> {
  const checkedAt=new Date().toISOString();
  const result:Collection={versions:[],pending:[],sources:[],evidence:[]};
  async function source(name:string,url:string,parse:(html:string)=>Promise<void>|void) {
    try {
      const html=await officialHtml(url);const rawHash=hash(html);
      // Persist meaningful source content; source hashes below identify this evidence.
      const $=load(html);$('script,style,header,footer,nav').remove();
      const content=$('.ato').length?$('.ato').html()!:($('#content-core').html()||$.html());
      const evidenceHash=hash(content);
      await parse(html);
      result.sources.push({name,url,ok:true,checkedAt,hash:evidenceHash});
      if(!previous.runs.some(run=>run.sources.some(s=>s.hash===evidenceHash)))result.evidence.push({hash:evidenceHash,content});
      // Raw normative HTML is retained separately to match each version's hash.
      if(result.versions.some(v=>v.evidenceHash===rawHash)&&!previous.versions.some(v=>v.evidenceHash===rawHash))result.evidence.push({hash:rawHash,content:html});
    }catch(error){result.sources.push({name,url,ok:false,checkedAt,error:error instanceof Error?error.message:'Fonte indisponível'});}
  }
  let links:string[]=[];
  await source('Índice oficial da ANTT',INDEX_URL,html=>{
    links=discoverActs(html);
    if(!links.length)throw Error('Índice sem links normativos reconhecidos');
  });
  await source('Metodologia · ANTTlegis',METHOD_URL,html=>{
    result.methodHash=methodFingerprint(html);
    if(result.methodHash!==approved.methodHash) {
      result.pending.push({id:`method-${result.methodHash}`,title:'Metodologia em análise',url:METHOD_URL,reason:'Texto oficial diverge da metodologia revisada; cálculos suspensos',detectedAt:checkedAt});
      throw Error('Metodologia mudou: revisão necessária');
    }
  });
  // History starts at July 2026. Older acts are intentionally not represented.
  const urls=[...new Set([PREVIOUS_URL,LATEST_URL,...links.filter(url=>{
    const u=new URL(url),year=Number(u.searchParams.get('vlr_ano')||u.searchParams.get('valorAno'));
    const n=Number(u.searchParams.get('num_ato')||u.searchParams.get('numeroAto'));
    const type=u.searchParams.get('sgl_tipo')||u.searchParams.get('tipo');
    return year>2026||(year===2026&&(type==='RES'?n>6084:type==='POR'&&n>22));
  })])];
  if(urls.length>14)result.pending.push({id:`overflow-${checkedAt.slice(0,10)}`,title:'Volume de publicações requer revisão',url:INDEX_URL,reason:'Mais de 14 atos candidatos; revisar o extrator e a cobertura',detectedAt:checkedAt});
  for(const url of urls.slice(0,14)) {
    await source('Anexo normativo · ANTTlegis',url,async html=>{
      const text=normativeText(html);
      if(!/pisos m[íi]nimos|coeficientes dos pisos/i.test(text))throw Error('Ato sem escopo reconhecido');
      let v;
      try{v=extractAct(html,url,checkedAt);}catch(error){
        result.pending.push({id:hash(url+'|'+text).slice(0,24),title:normalize(text).match(/(?:PORTARIA|RESOLUÇÃO).{0,100}/)?.[0]||'Nova publicação localizada',url,reason:error instanceof Error?error.message:'Extração ambígua',detectedAt:checkedAt,hash:hash(html)});
        result.evidence.push({hash:hash(html),content:html});throw error;
      }
      if(v.publishedAt<'2026-07-17')return;
      const known=previous.versions.find(old=>old.id===v.id);
      if(known){result.versions.push(known);return;}
      if(result.methodHash!==approved.methodHash) {
        result.pending.push({id:v.id,title:v.title,url,reason:'Metodologia sem validação nesta coleta',detectedAt:checkedAt,hash:v.evidenceHash});return;
      }
      if(url!==PREVIOUS_URL&&url!==LATEST_URL&&!/Reajustar os coeficientes dos pisos mínimos/i.test(text)) {
        result.pending.push({id:v.id,title:v.title,url,reason:'Nova resolução, metodologia ou tipo de ato exige revisão',detectedAt:checkedAt,hash:v.evidenceHash});return;
      }
      result.versions.push(v);
    });
  }
  const current=[...result.versions].filter(v=>Date.parse(`${v.effectiveAt}T00:00:00-03:00`)<=Date.now()).sort((a,b)=>b.effectiveAt.localeCompare(a.effectiveAt))[0];
  if(current&&!current.simulationValidated&&result.methodHash===approved.methodHash) {
    try{current.simulationValidated=await verifyCalculator(current,result.methodHash);result.sources.push({name:'Calculadora oficial · 8 casos',url:'https://calculadorafrete.antt.gov.br/',ok:true,checkedAt});}
    catch(error){result.sources.push({name:'Calculadora oficial',url:'https://calculadorafrete.antt.gov.br/',ok:false,checkedAt,error:error instanceof Error?error.message:'Validação indisponível'});}
  }
  return result;
}
