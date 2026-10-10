import {PET_TOOLS,toolCommand,validToolArgs} from '@/lib/pet/tools';
import {operate,details,memories,PetError} from '@/lib/pet/service';
import {database,identity,json,errorResponse,sameOrigin} from '@/lib/pet/storage';
export const dynamic='force-dynamic';
export async function GET(){return new Response(null,{status:405,headers:{Allow:'POST'}})}
export async function POST(request:Request){
 let rpc:any;try{sameOrigin(request);const text=await request.text();if(text.length>16000)return json({error:'Request too large'},413);rpc=JSON.parse(text)}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Invalid JSON-RPC request'}},400)}
 const id=rpc?.id??null;
 if(rpc?.jsonrpc!=='2.0'||typeof rpc?.method!=='string')return json({jsonrpc:'2.0',id,error:{code:-32600,message:'Invalid request'}},400);
 const respond=(result:any)=>json({jsonrpc:'2.0',id,result});
 if(rpc.method==='initialize')return respond({protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(rpc.params?.protocolVersion)?rpc.params.protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'Pocket Pal',version:'2.0.0'},instructions:'Care for the user’s one persistent Piplet. Both Site and tools share this exact save. Use the returned reaction, needs and actual recorded events; do not invent memories, favourite things or completed actions. If needsHatch is true, help the user pick a name then call hatch_pet. Reads apply time passage. Dewdrops are fictional in-game money. Food, drinks and treats must be stocked. Use get_shop and purchase_item for supplies. For adventures, show the actual returned choices and let the user choose; do not select branches without their intent. A declined care action is not successful care. Refer to the pet using the owner’s preferred pronouns.'});
 if(rpc.method==='notifications/initialized'||rpc.method==='notifications/cancelled')return new Response(null,{status:202});
 if(rpc.method==='ping')return respond({});
 if(rpc.method==='tools/list')return respond({tools:PET_TOOLS});
 if(rpc.method!=='tools/call')return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 try{
  const owner=identity(request),tool=PET_TOOLS.find(t=>t.name===rpc.params?.name);if(!tool)throw new PetError('Unknown Pocket Pal tool.');const args=rpc.params?.arguments??{};if(!validToolArgs(tool,args))throw new PetError('Invalid tool arguments. Please use the declared choices and limits.');
  const now=Date.now();const result=await operate(database(),owner,toolCommand(tool.name,args,crypto.randomUUID()),now);
  const payload:any=result.pet&&tool.name.startsWith('get_')?{...result,pet:undefined,data:details(result.pet,tool.name,args,now)}:result;
  if(result.pet&&['get_pet_history','get_memories'].includes(tool.name)){const history=await memories(database(),owner,result.pet,args.event_type,args.limit??20,args.offset??0);payload.data={name:result.pet.name,history,offset:args.offset??0,nextOffset:history.length===(args.limit??20)?(args.offset??0)+(args.limit??20):null,permanent:true}}
  return respond({content:[{type:'text',text:JSON.stringify(payload)}],structuredContent:payload,isError:false});
 }catch(e){if(e instanceof PetError&&e.code===401)return errorResponse(e);return respond({isError:true,content:[{type:'text',text:e instanceof PetError?e.message:'Your pet’s home is temporarily unavailable. Please try again.'}]})}
}
