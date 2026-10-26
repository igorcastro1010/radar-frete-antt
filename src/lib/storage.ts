import { get, put, BlobNotFoundError } from '@vercel/blob';
import { z } from 'zod';
import { emptyState, type State } from './model';
import type { Repository } from './sync';
const path='radar/state-v1.json';
const stateSchema=z.object({schema:z.literal(1),versions:z.array(z.object({id:z.string(),rows:z.array(z.object({table:z.enum(['A','B','C','D']),cargo:z.string(),axles:z.number(),ccd:z.number().positive(),cc:z.number().positive()})).min(1)}).passthrough()),pending:z.array(z.unknown()),runs:z.array(z.unknown())}).passthrough();
export class BlobRepository implements Repository {
  async read() {
    try {
      const result=await get(path,{access:'private',useCache:false});
      if(!result)return {state:emptyState(),etag:null};
      if(result.statusCode!==200)throw Error('Resposta inesperada do armazenamento');
      const data=await new Response(result.stream).json(); stateSchema.parse(data);
      return {state:data as State,etag:result.blob.etag};
    }catch(error){if(error instanceof BlobNotFoundError)return {state:emptyState(),etag:null};throw error;}
  }
  async save(state:State,etag:string|null) {
    const result=await put(path,JSON.stringify(state),{access:'private',contentType:'application/json',addRandomSuffix:false,
      cacheControlMaxAge:0,allowOverwrite:etag!==null,...(etag?{ifMatch:etag}:{})});
    return result.etag;
  }
  async archive(key:string,value:string) {
    const pathname=`radar/${key}`;
    // Immutable, content-addressed records. Do not upload an unchanged snapshot.
    const existing=await get(pathname,{access:'private',useCache:true});
    if(existing){await existing.stream?.cancel();return;}
    await put(pathname,value,{access:'private',contentType:key.endsWith('.html')?'text/html':'application/json',addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:31536000});
  }
}
