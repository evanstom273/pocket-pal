import {z} from 'zod';
import {Save,Pet,MILESTONES,TRAIT_INFO,settingsSchema,backupSchema,petSchema,basePetSchema,Memory,iso,ageDays} from './model';
import {createPet,simulate,care,status,remember} from './engine';
import {migratePet,itemBy,activityBy,adventureView,careRate,shop,independence,capacity,pantryCount,money,weatherAt} from './world';
import {ITEMS} from './catalogue';
import {LOCATIONS,ACTIVITIES,ADVENTURES} from './world-content';
const name=z.string().trim().min(1).max(30).refine(s=>!/[\x00-\x1f<>]/.test(s),'Use a simple name without markup.');
const base=z.object({requestId:z.string().min(8).max(128),action:z.string()});
const itemChoice=(category:string)=>z.string().max(100).refine(v=>itemBy(v)?.category===category,'Choose an item from the catalogue.').optional();
export const commandSchema=z.discriminatedUnion('action',[
 base.extend({action:z.literal('hatch'),name,timeZone:settingsSchema.shape.timeZone.optional()}).strict(),
 base.extend({action:z.literal('feed'),choice:itemChoice('food')}).strict(),base.extend({action:z.literal('treat'),choice:itemChoice('treat')}).strict(),base.extend({action:z.literal('drink'),choice:itemChoice('drink')}).strict(),
 base.extend({action:z.literal('play'),choice:z.string().max(100).refine(v=>!!activityBy(v)).optional()}).strict(),
 ...(['cuddle','clean','sleep','wake','medicine','head_home','support'] as const).map(action=>base.extend({action:z.literal(action)}).strict()) as any,
 base.extend({action:z.literal('purchase'),itemId:z.string().max(100),quantity:z.number().int().min(1).max(50).default(1)}).strict(),
 base.extend({action:z.literal('use_item'),itemId:z.string().max(100)}).strict(),base.extend({action:z.literal('toy'),itemId:z.string().max(100).optional()}).strict(),
 base.extend({action:z.literal('walk'),locationId:z.string().max(100).optional()}).strict(),
 base.extend({action:z.literal('adventure_choice'),runId:z.string().uuid(),nodeId:z.string().max(100),choiceId:z.string().max(100)}).strict(),
 base.extend({action:z.literal('talk'),topic:z.enum(['hello','listen','silly','encourage','memory','search']).optional()}).strict(),
 base.extend({action:z.literal('autonomy'),enabled:z.boolean()}).strict(),
 base.extend({action:z.literal('rename'),name}).strict(),base.extend({action:z.literal('settings'),settings:settingsSchema.partial().strict()}).strict(),
 base.extend({action:z.literal('reset'),confirmation:z.string(),petId:z.string().uuid()}).strict(),
 base.extend({action:z.literal('import'),confirmation:z.literal('RESTORE'),petId:z.string().uuid().nullable(),backup:backupSchema}).strict()
] as any);
export class PetError extends Error{constructor(message:string,public code=400){super(message)}}
function publicResult(save:Save,revision:number,now:number,reaction?:string,applied?:boolean){return {pet:save.pet,status:save.pet?status(save.pet,now):null,adventure:save.pet?adventureView(save.pet):null,revision,serverTime:iso(now),...(reaction!==undefined?{reaction,applied}:{}),needsHatch:!save.pet}}
async function digest(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export function validateWorld(p:Pet){
 if(Object.keys(p.world.inventory).some(id=>!itemBy(id)))throw new PetError('This backup contains an unknown inventory item.');
 if(Object.entries(p.world.equipped).some(([category,id])=>{const item=itemBy(id);return !item||!p.world.inventory[id]||item.category!==category}))throw new PetError('This backup contains an invalid equipped item.');
 const a=p.world.adventure;if(a){const story=ADVENTURES.find(s=>s.id===a.storyId);if(!story?.nodes.some(n=>n.id===a.nodeId)||!LOCATIONS.some(l=>l.id===a.locationId))throw new PetError('This backup contains an unknown adventure page.');}
}
export async function operate(db:D1Database,owner:string,raw?:unknown,now=Date.now()){
 let command:any;if(raw!==undefined){const parsed=commandSchema.safeParse(raw);if(!parsed.success)throw new PetError('Please check the action and its details.');command=parsed.data}
 const signature=command?await digest(JSON.stringify({...command,requestId:undefined})):'';
 for(let attempt=0;attempt<12;attempt++){
  const row=await db.prepare('SELECT revision, data FROM pet_saves WHERE owner = ?').bind(owner).first<{revision:number,data:string}>();
  const save:Save=row?JSON.parse(row.data):{version:2,pet:null,receipts:[],grantedPetIds:[]};
  if(![1,2].includes(save.version))throw new PetError('This save uses a newer game version. It has been left untouched.',409);
  const revision=row?.revision??0;let archive=false,migrated=false;
  const receipt=command?save.receipts.find(r=>r.id===command.requestId):undefined;if(receipt&&receipt.signature!==signature)throw new PetError('This request ID was already used for a different action.',409);
  save.grantedPetIds||=[];
  if(save.pet){
   if(save.version===1&&!save.pet.world){basePetSchema.parse(save.pet);save.pet=migratePet(save.pet,now,!save.grantedPetIds.includes(save.pet.id));save.grantedPetIds.push(save.pet.id);archive=!!row;migrated=true}
   else if(!save.pet.world)throw new PetError('The expanded save is incomplete. It has been left untouched for recovery.',409);
  }
  save.version=2;
  const baseline=new Set(migrated?[]:(save.pet?.history||[]).map(e=>JSON.stringify(e)));
  if(save.pet)simulate(save.pet,now);
  let reaction:string|undefined=receipt?.reaction,applied=false;
  if(command&&!receipt){
   if(command.action==='hatch'){
    if(save.pet)throw new PetError('Your pet is already here. Hatching again would replace them.',409);
    save.pet=createPet(command.name,now,command.timeZone);reaction=`Hello, ${save.pet.name}! A stocked pantry, a toy and 35.00 Dewdrops welcome your new friend.`;applied=true;
   }else if(command.action==='import'){
    if((save.pet?.id??null)!==command.petId)throw new PetError('Your save changed. Review the current pet before restoring.',409);
    const imported=command.backup.pet;const stamps=[imported.createdAt,imported.lastSimulationAt,imported.lastInteractionAt];
    if(stamps.some(t=>Date.parse(t)>now+60000)||Date.parse(imported.lastSimulationAt)<Date.parse(imported.createdAt))throw new PetError('The backup has inconsistent dates.');
    const p=migratePet(imported,now,!save.grantedPetIds.includes(imported.id));if(p.world.legacyGrant&&!save.grantedPetIds.includes(p.id))save.grantedPetIds.push(p.id);validateWorld(p);
    archive=!!save.pet;save.pet=p;baseline.clear();simulate(p,now);remember(p,now,'restore','A familiar little face','Your Pocket Pal backup was restored. Earlier saved memories remain safe in the journal.');reaction=`${p.name} is safely home again.`;applied=true;
   }else{
    const p=save.pet;if(!p)throw new PetError('No pet has hatched yet. Use hatch_pet or open Pocket Pal to name your first Piplet.',409);
    if(command.action==='rename'){const old=p.name;p.name=command.name;remember(p,now,'rename','A new name',`${old} is now called ${p.name}. Same little friend.`);reaction=`${p.name} tries the new name on for size. It suits them.`;applied=true}
    else if(command.action==='settings'){p.settings={...p.settings,...command.settings};reaction='Your preferences are saved.';applied=true}
    else if(command.action==='reset'){if(command.petId!==p.id||command.confirmation!==`RESET ${p.name}`)throw new PetError('Type RESET followed by your pet’s exact name to confirm.');archive=true;save.pet=null;reaction='A new beginning is ready. Your previous save has been archived.';applied=true}
    else {const result=care(p,command.action,command.choice,now,Math.random,command);reaction=result.reaction;applied=result.applied}
   }
   save.receipts.push({id:command.requestId,signature,reaction:reaction!});save.receipts=save.receipts.slice(-100);
  }
  const pending=save.pet?save.pet.history.filter(e=>!baseline.has(JSON.stringify(e))):[];
  const memoryRows=await Promise.all(pending.map(async e=>({id:await digest(JSON.stringify(e)),timestamp:e.timestamp,type:e.type,data:JSON.stringify(e)})));
  if(save.pet){save.pet.history=save.pet.history.slice(-400);petSchema.parse(save.pet)}
  const serialized=JSON.stringify(save);const statements:D1PreparedStatement[]=[];
  if(row){
   if(archive)statements.push(db.prepare('INSERT INTO pet_archives (id, owner, data, created_at) SELECT ?, owner, data, ? FROM pet_saves WHERE owner = ? AND revision = ?').bind(crypto.randomUUID(),iso(now),owner,revision));
   if(memoryRows.length)statements.push(db.prepare("INSERT OR IGNORE INTO pet_memories (owner, pet_id, event_id, timestamp, event_type, data) SELECT ?, ?, json_extract(value, '$.id'), json_extract(value, '$.timestamp'), json_extract(value, '$.type'), json_extract(value, '$.data') FROM json_each(?) WHERE EXISTS (SELECT 1 FROM pet_saves WHERE owner = ? AND revision = ?)").bind(owner,save.pet!.id,JSON.stringify(memoryRows),owner,revision));
   statements.push(db.prepare('UPDATE pet_saves SET data = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ?').bind(serialized,iso(now),owner,revision));
   const results=statements.length>1?await db.batch(statements):[await statements[0].run()];if(results.at(-1)!.meta.changes===1)return {...publicResult(save,revision+1,now,reaction,applied),...(receipt?{duplicate:true}:{})};
  }else{
   statements.push(db.prepare('INSERT INTO pet_saves (owner, revision, data, updated_at) VALUES (?, 1, ?, ?) ON CONFLICT(owner) DO NOTHING').bind(owner,serialized,iso(now)));
   if(memoryRows.length)statements.push(db.prepare("INSERT OR IGNORE INTO pet_memories (owner, pet_id, event_id, timestamp, event_type, data) SELECT ?, ?, json_extract(value, '$.id'), json_extract(value, '$.timestamp'), json_extract(value, '$.type'), json_extract(value, '$.data') FROM json_each(?) WHERE EXISTS (SELECT 1 FROM pet_saves WHERE owner = ? AND data = ?)").bind(owner,save.pet!.id,JSON.stringify(memoryRows),owner,serialized));
   const results=await db.batch(statements);if(results[0].meta.changes===1)return publicResult(save,1,now,reaction,applied);
  }
 }
 throw new PetError('Your pet is busy with another visit. Please try again in a moment.',409);
}
export async function memories(db:D1Database,owner:string,pet:Pet,eventType?:string,limit=100,offset=0){
 const rows=await db.prepare(`SELECT data FROM pet_memories WHERE owner = ? AND pet_id = ? ${eventType?'AND event_type = ? ':''}ORDER BY timestamp DESC, rowid DESC LIMIT ? OFFSET ?`).bind(owner,pet.id,...(eventType?[eventType]:[]),limit,offset).all<{data:string}>();
 return rows.results.map(row=>JSON.parse(row.data) as Memory);
}
export async function fullBackup(db:D1Database,owner:string,pet:Pet,now:number){const all=await memories(db,owner,pet,undefined,-1);return {format:'pocket-pal',version:2,exportedAt:iso(now),pet:{...pet,history:all.reverse()}}}
export function details(p:Pet,kind:string,args:any,now:number){
 const w=p.world;
 if(kind==='get_pet_status')return status(p,now);
 if(kind==='get_pet_history'||kind==='get_memories'||kind==='get_autonomous_events'){const types=kind==='get_autonomous_events'?['autonomous','dream','sleep']:null;const entries=p.history.filter(e=>(!args.event_type||e.type===args.event_type)&&(!types||types.includes(e.type)));return {name:p.name,history:entries.slice(-(args.limit??20)).reverse(),note:'Use get_pet_history with offset for older permanent memories.'}}
 if(kind==='get_pet_personality'||kind==='get_preferences')return{name:p.name,traits:p.traits.map(trait=>({trait,description:TRAIT_INFO[trait]})),tendencies:p.tendencies,favouriteFoods:p.favouriteFoods,favouriteActivities:p.favouriteActivities,favourites:Object.fromEntries(Object.entries(w.favourites).map(([key,ids])=>[key,ids.map(id=>itemBy(id)?.name||LOCATIONS.find(l=>l.id===id)?.name||id)])),experience:w.preferences,likes:p.likes,dislikes:p.dislikes,relationships:w.relationships,independence:independence(p),request:w.autonomy.request};
 if(kind==='get_pet_stats')return{name:p.name,...p.stats,...w.stats,daysTogether:ageDays(p,now),dewDropsEarned:w.wallet.earned/100,dewDropsSpent:w.wallet.spent/100,favouriteFoods:p.favouriteFoods,favouriteActivities:p.favouriteActivities};
 if(kind==='get_pet_milestones')return{name:p.name,milestones:Object.entries(MILESTONES).map(([id,title])=>({id,title,unlocked:p.milestones.some(m=>m.id===id),timestamp:p.milestones.find(m=>m.id===id)?.timestamp??null})).filter(m=>args.include_locked!==false||m.unlocked)};
 if(kind==='get_wallet')return {currency:'Dewdrops',balance:w.wallet.balance/100,...careRate(p),lastOfflineEarnings:{...w.wallet.lastEarnings,amount:w.wallet.lastEarnings.amount/100},earned:w.wallet.earned/100,spent:w.wallet.spent/100,transactions:w.wallet.transactions.slice(-(args.limit??30)).reverse().map(t=>({...t,amount:t.amount/100,balance:t.balance/100})),legacyGrant:w.legacyGrant};
 if(kind==='get_shop')return shop(p,args.category,args.query,args.offset??0,args.limit??40,now);
 if(kind==='get_pantry'||kind==='get_possessions')return {capacity:capacity(p),pantryUnits:pantryCount(p),items:ITEMS.filter(i=>w.inventory[i.id]>0&&(kind==='get_pantry'?i.consumable:!i.consumable)&&(!args.category||i.category===args.category)).map(i=>({...i,price:i.price/100,quantity:w.inventory[i.id],equipped:Object.values(w.equipped).includes(i.id),preference:w.preferences[i.id]||null,toyState:w.toyState[i.id]||null})),independence:independence(p)};
 if(kind==='get_activities')return {activities:ACTIVITIES.filter(a=>!args.category||a.category===args.category).map(a=>({...a,favourite:p.favouriteActivities.includes(a.name),timesPlayed:p.activityCounts[a.name]||0,available:!a.toyTag||ITEMS.some(i=>i.category==='toy'&&i.tags.includes(a.toyTag!)&&w.inventory[i.id]>0)}))};
 if(kind==='get_destinations')return {weatherNote:'Gentle fictional weather in your Piplet’s world.',locations:LOCATIONS.map(l=>({...l,weather:weatherAt(now,l.id),visits:w.visits[l.id]||0,favourite:w.favourites.locations.includes(l.id)})),currentAdventure:adventureView(p)};
 if(kind==='get_adventure')return {adventure:adventureView(p),instruction:w.adventure?'Return one of the current choice IDs with the runId and nodeId. Do not invent an outcome.':'Choose a destination with take_a_walk to begin.'};
 return p;
}
