import {env} from 'cloudflare:workers';
import {PetError} from './service';
import {currentPetAccess} from './access';
export function database():D1Database {const db=(env as unknown as {DB?:D1Database}).DB;if(!db)throw new PetError('Your pet’s home is temporarily unavailable. Please try again shortly.',503);return db}
export function identity(_request:Request){const id=currentPetAccess()?.owner;if(!id)throw new PetError('Open Pocket Pal in your browser, or use your private MCP link from Settings.',401);return id}
export function sameOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new PetError('This request must come from Pocket Pal.',403)}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff'}})}
export function errorResponse(error:unknown){if(error instanceof PetError)return json({error:error.message},error.code);console.error('Pocket Pal storage request failed',error);return json({error:'Your pet’s home is temporarily unavailable. Your saved pet is safe; please try again.'},503)}
