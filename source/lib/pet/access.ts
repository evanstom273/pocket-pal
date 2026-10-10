import {AsyncLocalStorage} from 'node:async_hooks';

type PetAccess = {owner:string; key:string};
const context = new AsyncLocalStorage<PetAccess|undefined>();
const validKey = /^[a-f0-9]{64}$/;
const secureCookie = '__Host-pocket-pal';
const localCookie = 'pocket-pal-local';

export const currentPetAccess = () => context.getStore();

function cookieName(url:URL) {
 return url.protocol==='https:' ? secureCookie : localCookie;
}

function requestKey(request:Request):string|undefined {
 const url=new URL(request.url);
 const authorization=request.headers.get('authorization');
 if(authorization) {
  const match=/^Bearer ([a-f0-9]{64})$/i.exec(authorization);
  return match?.[1].toLowerCase();
 }
 if(url.pathname==='/mcp' && url.searchParams.has('key')) {
  const keys=url.searchParams.getAll('key');
  return keys.length===1 && validKey.test(keys[0]) ? keys[0] : undefined;
 }
 const name=cookieName(url)+'=';
 const cookie=request.headers.get('cookie')?.split(';').map(value=>value.trim()).find(value=>value.startsWith(name));
 const value=cookie?.slice(name.length);
 return value && validKey.test(value) ? value : undefined;
}

function newKey() {
 return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
}

export async function withPetAccess(request:Request, next:()=>Promise<Response>):Promise<Response> {
 const url=new URL(request.url);
 const browserRead=url.pathname==='/api/pet' && request.method==='GET';
 let key=requestKey(request);
 // A fresh browser gets its own unguessable access key. MCP never creates a
 // session implicitly, and platform identity headers are deliberately ignored.
 if(!key && browserRead && !request.headers.has('authorization')) key=newKey();
 let access:PetAccess|undefined;
 if(key) {
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('pocket-pal:'+key));
  access={key,owner:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')};
 }
 const response=await context.run(access,next);
 const result=new Response(response.body,response);
 result.headers.set('Referrer-Policy','no-referrer');
 if(key && browserRead && response.ok) {
  result.headers.append('Set-Cookie',`${cookieName(url)}=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`);
 }
 return result;
}

export function privateMcpUrl(request:Request) {
 const access=currentPetAccess();
 if(!access) return undefined;
 const url=new URL('/mcp',request.url);
 url.searchParams.set('key',access.key);
 return url.toString();
}
