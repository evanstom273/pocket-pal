import {test} from 'node:test';
import assert from 'node:assert/strict';
import {withPetAccess,currentPetAccess,privateMcpUrl} from '../lib/pet/access';

const read=async(response:Response)=>await response.json() as {owner:string|null;url?:string};
const origin='https://pocket-pal.example';
const response=()=>Promise.resolve(Response.json({owner:currentPetAccess()?.owner??null}));
test('a new browser opens without sign-in and receives a private secure session',async()=>{
 const first=await withPetAccess(new Request(origin+'/api/pet'),response);
 const cookie=first.headers.get('set-cookie')!;
 assert.match(cookie,/^__Host-pocket-pal=[a-f0-9]{64};/);
 for(const flag of ['HttpOnly','SameSite=Lax','Secure','Path=/']) assert.ok(cookie.includes(flag));
 const owner=(await read(first)).owner;
 const next=await withPetAccess(new Request(origin+'/api/pet',{headers:{cookie:cookie.split(';')[0]}}),response);
 assert.equal((await read(next)).owner,owner);
 const other=await withPetAccess(new Request(origin+'/api/pet'),response);
 assert.notEqual((await read(other)).owner,owner);
});
test('a browser private MCP URL and bearer key reach exactly the same owner',async()=>{
 const req=new Request(origin+'/api/pet?view=connection');
 const first=await withPetAccess(req,()=>Promise.resolve(Response.json({url:privateMcpUrl(req),owner:currentPetAccess()?.owner})));
 const saved=await read(first);
 assert.ok(saved.url);
 const url=new URL(saved.url);
 const mcp=await withPetAccess(new Request(url,{method:'POST'}),response);
 assert.equal((await read(mcp)).owner,saved.owner);
 assert.equal(mcp.headers.get('set-cookie'),null);
 const bearer=await withPetAccess(new Request(origin+'/mcp',{method:'POST',headers:{authorization:'Bearer '+url.searchParams.get('key')}}),response);
 assert.equal((await read(bearer)).owner,saved.owner);
});
test('MCP without a valid key and forged platform identity do not gain access',async()=>{
 for(const path of ['/mcp','/mcp?key=bad','/mcp?key='+('a'.repeat(64))+'&key='+('b'.repeat(64))]) {
  const result=await withPetAccess(new Request(origin+path,{method:'POST',headers:{'oai-authenticated-user-id':'victim'}}),response);
  assert.equal((await read(result)).owner,null);
  assert.equal(result.headers.get('set-cookie'),null);
 }
});
test('simultaneous requests retain separate access contexts',async()=>{
 const owners=await Promise.all(['a','b'].map(async char=>{
  const req=new Request(origin+'/mcp?key='+char.repeat(64),{method:'POST'});
  const res=await withPetAccess(req,async()=>{
   const before=currentPetAccess()?.owner;
   await new Promise(resolve=>setTimeout(resolve,5));
   assert.equal(currentPetAccess()?.owner,before);
   return Response.json({owner:before});
  });
  return (await read(res)).owner;
 }));
 assert.notEqual(owners[0],owners[1]);
});
