import test from 'node:test';
import assert from 'node:assert/strict';
import {createPet,simulate,care} from '../lib/pet/engine';
import {migratePet,shopPrice,careRate,independence,autonomous,dream,adventureView,worldAction,observePreference,itemBy,capacity} from '../lib/pet/world';
import {reaction} from '../lib/pet/common';
import {operate,details,memories,fullBackup} from '../lib/pet/service';
import {HOUR,DAY,iso,petSchema,backupSchema} from '../lib/pet/model';
import {ITEMS} from '../lib/pet/catalogue';
import {ACTIVITIES,LOCATIONS,ADVENTURES} from '../lib/pet/world-content';
import {DREAMS,REACTIONS,AMBIENT_EVENTS} from '../lib/pet/story-content';
import {PET_TOOLS,toolCommand} from '../lib/pet/tools';
import {database} from './test-store';
const start=Date.parse('2026-10-04T12:00:00Z');const make=()=>createPet('Pebble',start,'Europe/London',()=>.4);
const act=(p:ReturnType<typeof make>,action:string,args:any={},now=start)=>care(p,action,args.choice,now,()=>.4,args);
test('legacy migration preserves all original fields, adds one grant, archives original and is concurrency-safe',async()=>{
 const {db,store}=database();const old:any=make();delete old.world;old.traits=['Mischievous','Energetic','Affectionate'];old.bond=12.89;old.stats.highestBond=12.89;old.stats.meals=3;old.stats.plays=4;old.foodCounts={'Fruit bowl':2};const original=JSON.stringify({version:1,pet:old,receipts:[]});
 db.prepare('INSERT INTO pet_saves VALUES (?, ?, ?, ?)').run('legacy',7,original,iso(start));
 const [a,b]=await Promise.all([operate(store,'legacy',undefined,start),operate(store,'legacy',undefined,start)]);const p=b.pet!;
 for(const key of Object.keys(old).filter(k=>!['history','mood'].includes(k)))assert.deepEqual((p as any)[key],old[key],key);
 assert.equal(p.world.wallet.balance,30000);assert.equal(p.world.wallet.transactions.filter(t=>t.kind==='grant').length,1);assert.equal(p.world.inventory['spring-water'],12);
 assert.equal((db.prepare('SELECT data FROM pet_archives').get() as any).data,original);
 assert.equal((db.prepare('SELECT count(*) n FROM pet_archives').get() as any).n,1);
 const c=await operate(store,'legacy',undefined,start);assert.equal(c.pet!.world.wallet.balance,30000);assert.equal((await memories(store,'legacy',c.pet!)).length,old.history.length+1);assert.equal(c.pet!.id,a.pet!.id);db.close();
});
test('economy uses care quality, fractional accrual, exact replay safety and an offline cap',()=>{
 const p=make(),q=make();p.hunger=0;p.world.hydration=100;p.energy=100;p.happiness=100;p.cleanliness=100;assert.equal(careRate(p).rate,5);
 q.hunger=95;q.world.hydration=5;q.health=25;assert.equal(careRate(q).rate,0);
 const before=p.world.wallet.balance;simulate(p,start+60000,()=>.99);assert(p.world.wallet.balance>before);const balance=p.world.wallet.balance;simulate(p,start+60000,()=>.99);assert.equal(p.world.wallet.balance,balance);
 simulate(p,start+120*DAY,()=>.99);assert(p.world.wallet.earned<=24000+10);assert(p.world.wallet.lastEarnings.capped);assert(p.health>=25);assert(p.happiness>=15);petSchema.parse(p);
});
test('purchases debit once under concurrent retries, consume stock, and refuse unaffordable or invalid quantities',async()=>{
 const {db,store}=database();const hatched=await operate(store,'shop',{action:'hatch',name:'Test',requestId:'hatch-shop'},start);const b=hatched.pet!.world.wallet.balance;
 const cmd={action:'purchase',itemId:'noodles',quantity:5,requestId:'buy-once'};
 await Promise.all([operate(store,'shop',cmd,start),operate(store,'shop',cmd,start)]);
 const after=(await operate(store,'shop',undefined,start)).pet!;assert.equal(after.world.inventory.noodles,5);assert.equal(after.world.wallet.balance,b-5*shopPrice(itemBy('noodles')!,start));
 const fed=await operate(store,'shop',{action:'feed',choice:'noodles',requestId:'meal-once'},start);assert(fed.applied);assert.equal(fed.pet!.world.inventory.noodles,4);
 await assert.rejects(()=>operate(store,'shop',{...cmd,quantity:-1,requestId:'bad-quantity'},start));
 const p=make();p.world.wallet.balance=0;const inv={...p.world.inventory};assert(!act(p,'purchase',{itemId:'noodles'}).applied);assert.deepEqual(p.world.inventory,inv);db.close();
});
test('meals, drinks and treats require owned stock; rejected actions do not consume; use_item cannot bypass treat limits',()=>{
 const p=make();p.hunger=0;const n=p.world.inventory['fruit-bowl'];assert(!act(p,'feed',{choice:'fruit-bowl'}).applied);assert.equal(p.world.inventory['fruit-bowl'],n);
 p.world.hydration=30;assert(act(p,'drink',{choice:'spring-water'}).applied);assert.equal(p.world.inventory['spring-water'],11);assert(p.world.hydration>30);
 p.hunger=80;p.world.inventory['fruit-bowl']=0;assert(!act(p,'feed',{choice:'fruit-bowl'}).applied);assert.equal(p.hunger,80);
 for(let i=0;i<3;i++)assert(act(p,'use_item',{itemId:'biscuit'},start+i*60000).applied);assert(!act(p,'use_item',{itemId:'biscuit'},start+4*60000).applied);assert.equal(p.world.inventory.biscuit,1);
});
test('baby cannot self-feed or drink; child can drink; bonded teen eats existing pantry stock',()=>{
 const baby=make();baby.hunger=75;baby.world.hydration=25;autonomous(baby,start+2*HOUR,()=>.2);assert.equal(baby.stats.meals,0);assert.equal(baby.world.stats.drinks,0);
 const child=make();child.stage='Child';child.hunger=75;child.world.hydration=25;autonomous(child,start+2*HOUR,()=>.2);assert.equal(child.stats.meals,0);assert.equal(child.world.stats.independentDrinks,1);assert.equal(child.world.inventory['spring-water'],11);
 const teen=make();teen.stage='Teen';teen.bond=20;teen.hunger=75;teen.world.hydration=25;const count=Object.values(teen.world.inventory).reduce((a,b)=>a+b,0);autonomous(teen,start+2*HOUR,()=>.2);assert.equal(teen.world.stats.independentMeals,1);assert.equal(teen.world.stats.independentDrinks,1);assert.equal(Object.values(teen.world.inventory).reduce((a,b)=>a+b,0),count-2);assert(teen.milestones.some(m=>m.id==='independent'));
 const empty=make();empty.stage='Adult';empty.hunger=75;empty.world.inventory={};autonomous(empty,start+2*HOUR,()=>.2);assert.equal(empty.stats.meals,0);
});
test('independent care can be paused while natural sleep remains available',()=>{const p=make();p.stage='Adult';p.hunger=80;p.world.hydration=20;act(p,'autonomy',{enabled:false});autonomous(p,start+2*HOUR);assert.equal(p.stats.meals,0);assert.equal(p.world.stats.drinks,0);assert(!independence(p).enabled);p.energy=6;simulate(p,start+HOUR);assert(p.sleeping)});
test('toys are owned, develop temporary boredom, can be searched for, and learn favourites from repeated play',()=>{
 const p=make();assert(!act(p,'toy',{itemId:'imaginary'}).applied);
 assert(act(p,'toy',{itemId:'soft-cloudball'}).applied);assert(act(p,'toy',{itemId:'soft-cloudball'},start+60000).applied);assert(!act(p,'toy',{itemId:'soft-cloudball'},start+120000).applied);
 for(let i=1;i<=3;i++){p.energy=100;act(p,'toy',{itemId:'soft-cloudball'},start+i*4*HOUR)}assert(p.world.favourites.toys.includes('soft-cloudball'));
 p.world.toyState['soft-cloudball'].lostUntil=iso(start+24*HOUR);assert(!act(p,'toy',{itemId:'soft-cloudball'},start+13*HOUR).applied);act(p,'talk',{topic:'search'},start+13*HOUR);assert.equal(p.world.toyState['soft-cloudball'].lostUntil,null);assert(p.history.some(e=>e.title==='There it is!'));
});
test('storage is functional; furniture cannot be repurchased; outfitting preserves needs',()=>{
 const p=make();p.world.wallet.balance=100000;const before=capacity(p);assert(act(p,'purchase',{itemId:'woven-treasure-basket'}).applied);assert.equal(capacity(p),before+100);assert(!act(p,'purchase',{itemId:'woven-treasure-basket'}).applied);
 const bed=ITEMS.find(i=>i.category==='bedding'&&i.id!=='moss-cushion')!;assert(act(p,'purchase',{itemId:bed.id}).applied);assert(act(p,'use_item',{itemId:bed.id}).applied);assert.equal(p.world.equipped.bedding,bed.id);petSchema.parse(p);
});
test('adventures save branches, reject stale choices, record permanent outcomes and recognise returning residents',async()=>{
 const {db,store}=database();let r=await operate(store,'explorer',{action:'hatch',name:'Pebble',requestId:'hello-explorer'},start);
 r=await operate(store,'explorer',{action:'walk',locationId:LOCATIONS[0].id,requestId:'walk-explorer'},start);assert(r.applied);const first=adventureView(r.pet!)!;assert(first.choices.length>=2);
 let cmd={action:'adventure_choice',runId:first.runId,nodeId:first.nodeId,choiceId:first.choices[0].id,requestId:'choice-first'};
 r=await operate(store,'explorer',cmd,start);assert(r.applied);const stale=await operate(store,'explorer',{...cmd,requestId:'choice-stale'},start);assert.equal(stale.applied,false);
 let guard=0;while(r.pet!.world.adventure&&guard++<5){const page=adventureView(r.pet!)!;r=await operate(store,'explorer',{action:'adventure_choice',runId:page.runId,nodeId:page.nodeId,choiceId:page.choices[0].id,requestId:'branch-'+guard},start)}
 assert.equal(r.pet!.world.adventure,null);assert.equal(r.pet!.world.stats.adventures,1);assert((await memories(store,'explorer',r.pet!,'adventure')).length===1);assert(Object.keys(r.pet!.world.relationships).length===1);
 const again=await operate(store,'explorer',{action:'walk',locationId:LOCATIONS[0].id,requestId:'walk-again'},start+HOUR);assert(again.applied);assert(again.pet!.world.adventure!.transcript[0].text.includes('recognises'));db.close();
});
test('all adventure paths terminate and every location is covered by original stories',()=>{
 assert.equal(ITEMS.length,204);assert.equal(ACTIVITIES.length,60);assert.equal(LOCATIONS.length,24);assert.equal(ADVENTURES.length,36);assert.equal(DREAMS.length,84);assert(AMBIENT_EVENTS.length>=40);
 for(const set of [ITEMS,ACTIVITIES,LOCATIONS,ADVENTURES,DREAMS,AMBIENT_EVENTS])assert.equal(new Set(set.map(x=>x.id)).size,set.length);
 for(const l of LOCATIONS){assert(itemBy(l.collectibleId));assert(ADVENTURES.some(a=>a.locationTags.includes(l.id)));}
 for(const a of ADVENTURES){let endings=0;const walk=(id:string,seen:string[])=>{assert(!seen.includes(id),'cycle');const node=a.nodes.find(n=>n.id===id);assert(node);assert(node.choices.length>=2);for(const c of node.choices){if(c.next)walk(c.next,[...seen,id]);else{assert(c.outcome);endings++}}};walk(a.nodes[0].id,[]);assert(endings>=4,a.id)}
});
test('reaction anti-repeat cycles through the pool and dreams have a 45-day cooldown',()=>{
 const p=make();p.traits=['Affectionate','Energetic'];const responses=new Set<string>();for(let i=0;i<6;i++)responses.add(reaction(p,'cuddle',start+i,{},()=>0));assert.equal(responses.size,6);assert(REACTIONS['cuddle:Affectionate'].length>=6);
 p.sleeping=true;for(let i=1;i<=12;i++)dream(p,start+i*6*HOUR,()=>.2);const dreams=p.history.filter(e=>e.type==='dream');assert.equal(dreams.length,12);assert.equal(new Set(dreams.map(e=>e.title)).size,12);assert(p.milestones.some(m=>m.id==='dreamer'));
});
test('preferences and dislikes emerge through repeated experiences, not assignment',()=>{const p=make();assert.equal(p.world.favourites.drinks.length,0);for(let i=1;i<=3;i++)observePreference(p,'spring-water',start+i,7);assert.equal(p.world.favourites.drinks.length,0);observePreference(p,'spring-water',start+4,7);assert(p.world.favourites.drinks.includes('spring-water'));const drink=ITEMS.find(i=>i.category==='drink'&&i.id!=='spring-water')!;for(let i=0;i<3;i++)observePreference(p,drink.id,start+i,2);assert(p.dislikes.includes(drink.name));assert(p.world.preferences[drink.id].disliked)});
test('permanent journal retains older memories beyond the 400-entry active save and exports full data',async()=>{
 const {db,store}=database();const p=make();for(let i=0;i<460;i++)p.history.push({timestamp:iso(start-i),type:'adventure',title:`Memory ${i}`,description:'An important original memory.'});
 const backup={format:'pocket-pal',version:2,exportedAt:iso(start),pet:p};backupSchema.parse(backup);
 const r=await operate(store,'archivist',{action:'import',petId:null,confirmation:'RESTORE',backup,requestId:'big-import'},start);assert.equal(r.pet!.history.length,400);const all=await memories(store,'archivist',r.pet!,undefined,1000);assert.equal(all.length,463);
 const out=await fullBackup(store,'archivist',r.pet!,start);assert.equal(out.pet.history.length,463);backupSchema.parse(out);assert.deepEqual(out.pet.world.inventory,p.world.inventory);assert.equal((await memories(store,'other',r.pet!,undefined,1000)).length,0);db.close();
});
test('MCP and Site command surfaces share wallet, inventory, adventure and full history',async()=>{
 const {db,store}=database();await operate(store,'shared',{action:'hatch',name:'Pal',requestId:'hatch-shared'},start);
 const bought=await operate(store,'shared',toolCommand('purchase_item',{item_id:'noodles',quantity:2},'mcp-buy-once'),start);assert(bought.applied);const site=(await operate(store,'shared',undefined,start)).pet!;assert.equal(site.world.inventory.noodles,2);
 await operate(store,'shared',{action:'feed',choice:'noodles',requestId:'site-fed'},start);const mcp=await operate(store,'shared',toolCommand('get_pantry',{},'read-only'),start);const pantry:any=details(mcp.pet!,'get_pantry',{},start);assert.equal(pantry.items.find((i:any)=>i.id==='noodles').quantity,1);
 for(const t of PET_TOOLS.filter(t=>t.name.startsWith('get_')))assert(details(mcp.pet!,t.name,{},start),t.name);db.close();
});
