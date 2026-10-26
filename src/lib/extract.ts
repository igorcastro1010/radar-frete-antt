import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { z } from 'zod';
import { keyOf, type Coefficient, type Table, type Version } from './model';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const normalize = (value: string) => value.normalize('NFC').replace(/\s+/g,' ').trim();
const rowSchema = z.object({table:z.enum(['A','B','C','D']),cargo:z.string().min(3),axles:z.number().int().min(2).max(9),ccd:z.number().positive().max(1000),cc:z.number().positive().max(100000)});
const axes = [2,3,4,5,6,7,9];
const decimal = (value:string) => {
  const s=normalize(value);
  if (!s) return null;
  if (!/^\d{1,3}(?:\.\d{3})*,\d{2,4}$/.test(s)) throw new Error(`Coeficiente inválido: ${s.slice(0,40)}`);
  return Number(s.replaceAll('.','').replace(',','.'));
};
function iso(day:string,month:string,year:string) {
  const s=`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`;
  if (!Number.isFinite(Date.parse(s)) || new Date(s).toISOString().slice(0,10)!==s) throw new Error('Data inválida');
  return s;
}
export function normativeText(html:string) {
  const $=load(html); const root=$('.ato').first();
  if (!root.length) throw new Error('Texto normativo não encontrado (.ato)');
  root.find('script,style,.noprint').remove();
  // Separators avoid concatenating cells; inline formatting must not affect hashes.
  root.find('td,th,p,br').each((_,el)=>{ $(el).append(' '); });
  return normalize(root.text());
}
export function extractAct(html:string,sourceUrl:string,detectedAt:string):Version {
  const $=load(html), root=$('.ato').first(), text=normativeText(html);
  const title=text.match(/(?:PORTARIA SUROC|RESOLUÇÃO(?: ANTT)?) N[º°o]\s*[\d.]+, DE \d{1,2} DE [A-ZÇ]+ DE \d{4}/i)?.[0];
  if(!title) throw new Error('Identificador do ato não reconhecido');
  const pub=text.match(/D\.O\.U\.,?\s*(\d{2})\/(\d{2})\/(\d{4})/i);
  if(!pub) throw new Error('Publicação no DOU sem data verificável');
  const publishedAt=iso(pub[1],pub[2],pub[3]);
  let effectiveAt=publishedAt;
  if(/entra em vigor no dia seguinte ao de sua publica[çc][ãa]o/i.test(text)) {
    effectiveAt=new Date(Date.parse(publishedAt)+86400000).toISOString().slice(0,10);
  } else if(!/entra em vigor na data de sua publica[çc][ãa]o/i.test(text)) {
    const m=text.match(/entra em vigor (?:em|no dia) (\d{1,2}) de ([a-zç]+) de (\d{4})/i);
    const months=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    if(!m || !months.includes(m[2].toLowerCase())) throw new Error('Vigência ambígua: revisão necessária');
    effectiveAt=iso(m[1],String(months.indexOf(m[2].toLowerCase())+1),m[3]);
  }
  // ANTTlegis currently repeats the complete D table. Deduplicate identical
  // tables only; divergent repetitions must still fail the four-table gate.
  const seenTables=new Set<string>();
  const tables=root.find('table').filter((_,el)=>{
    if($(el).find('table').length || !/Deslocamento\s*\(CCD\)/i.test($(el).text()))return false;
    const signature=normalize($(el).text());
    if(seenTables.has(signature))return false;
    seenTables.add(signature);return true;
  });
  if(tables.length!==4) throw new Error(`Esperadas quatro tabelas; encontradas ${tables.length}`);
  const rows:Coefficient[]=[];
  tables.each((ti,table)=>{
    const tableId='ABCD'[ti] as Table; let cargo=''; let pending: (number|null)[]|undefined;
    $(table).find('tr').each((_,tr)=>{
      const cells=$(tr).children('td,th').toArray().map(el=>normalize($(el).text()));
      const ccdIndex=cells.findIndex(c=>/^Deslocamento\s*\(CCD\)/i.test(c));
      if(ccdIndex>=0) {
        if(pending) throw new Error('Linha CC ausente');
        cargo=cells.slice(0,ccdIndex).filter(v=>v && !/^\d+$/.test(v)).join(' ');
        const vals=cells.slice(ccdIndex+2);
        if(vals.length!==7) throw new Error('Colunas de eixos incompatíveis');
        pending=vals.map(decimal);
      }
      const ccIndex=cells.findIndex(c=>/^Carga e descarga\s*\(CC\)/i.test(c));
      if(ccIndex>=0) {
        if(!pending || !cargo) throw new Error('Par CCD/CC incompleto');
        const vals=cells.slice(ccIndex+2); if(vals.length!==7) throw new Error('Colunas CC incompatíveis');
        const cc=vals.map(decimal);
        pending.forEach((ccd,i)=>{
          if((ccd===null)!==(cc[i]===null)) throw new Error('Aplicabilidade CCD/CC divergente');
          if(ccd!==null) rows.push(rowSchema.parse({table:tableId,cargo,axles:axes[i],ccd,cc:cc[i]}));
        }); pending=undefined;
      }
    });
    if(pending) throw new Error('Última linha incompleta');
    if(rows.filter(r=>r.table===tableId).length<50) throw new Error('Tabela incompleta');
  });
  rows.sort((a,b)=>keyOf(a).localeCompare(keyOf(b),'pt-BR'));
  if(new Set(rows.map(keyOf)).size!==rows.length) throw new Error('Coeficientes duplicados');
  const coefficientsHash=hash(JSON.stringify(rows));
  const actId=normalize(title).split(', DE')[0];
  const contentHash=hash(text);
  return {id:hash(`${actId}|${publishedAt}|${contentHash}`).slice(0,24),actId,title,sourceUrl,publishedAt,effectiveAt,detectedAt,
    methodology:'res-5867-art5-6076-2026',rows,coefficientsHash,contentHash,evidenceHash:hash(html),
    kind:/retifica[çc][ãa]o/i.test(text)?'rectification':'publication'};
}

export function discoverActs(html:string):string[] {
  const $=load(html); const urls=new Set<string>();
  $('a[href]').each((_,el)=>{
    const a=$(el), href=a.attr('href'); if(!href) return;
    let u:URL; try{u=new URL(href,'https://anttlegis.antt.gov.br/');}catch{return;}
    if(u.hostname!=='anttlegis.antt.gov.br' || u.protocol!=='https:') return;
    if(!['/action/UrlPublicasAction.php','/action/ActionDatalegis.php'].includes(u.pathname)) return;
    const year=Number(u.searchParams.get('vlr_ano')||u.searchParams.get('valorAno'));
    if(year<2026) return;
    const context=normalize(a.closest('tr').text()||a.parent().text());
    if(!/pisos m[íi]nimos|anexo ii|piso m[íi]nimo|coeficientes/i.test(context)) return;
    urls.add(u.href);
  }); return [...urls];
}
