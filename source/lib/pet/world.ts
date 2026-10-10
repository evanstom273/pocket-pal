import {Pet,LegacyPet,World,HOUR,DAY,iso,clamp,ageDays,hourAt} from './model';
import {Item,ItemCategory} from './content-types';
import {ITEMS} from './catalogue';
import {ACTIVITIES,LOCATIONS,ADVENTURES} from './world-content';
import {DREAMS,AMBIENT_EVENTS} from './story-content';
import {Random,pick,has,remember,unlock,effect,format,reaction,addTendency,gainBond} from './common';
export const money=(cents:number)=>(cents/100).toFixed(2);
export const itemBy=(idOrName:string|undefined)=>ITEMS.find(i=>i.id===idOrName||i.name.toLowerCase()===idOrName?.toLowerCase());
export const activityBy=(idOrName:string|undefined)=>ACTIVITIES.find(i=>i.id===idOrName||i.name.toLowerCase()===idOrName?.toLowerCase());
export const hasBenefit=(p:Pet,benefit:string)=>ITEMS.some(i=>i.benefit===benefit&&p.world.inventory[i.id]>0&&!i.consumable&&(['upgrade','adventure','storage'].includes(i.category)||Object.values(p.world.equipped).includes(i.id)));
export const stageIndex=(s:string)=>['Baby','Child','Teen','Adult'].indexOf(s);
export const eligibleItem=(p:Pet,i:Item)=>stageIndex(p.stage)>=stageIndex(i.minStage||'Baby');
export function makeWorld(p:LegacyPet,now:number,legacy=false,grant=true):World{
 const amount=legacy?(grant?30000:0):3500;
 const inventory:Record<string,number>={'fruit-bowl':6,'cloud-crunch':6,'spring-water':12,'biscuit':4,'berry-snack':4,'soft-cloudball':1,'moss-cushion':1};
 const preferences:World['preferences']={};
 for(const [name,uses] of Object.entries(p.foodCounts)){const i=itemBy(name);if(i)preferences[i.id]={uses,joy:uses*7,disliked:false,lastAt:p.lastInteractionAt}}
 return {version:2,introducedAt:iso(now),legacyGrant:legacy,hydration:90,wallet:{balance:amount,carry:0,earned:0,spent:0,transactions:[{id:crypto.randomUUID(),timestamp:iso(now),kind:'grant',amount,description:legacy?'One-time legacy care grant — thank you for the life already shared.':'A little welcome purse for your new home.',balance:amount}],lastEarnings:{amount:0,hours:0,at:iso(now),capped:false},lastSupportAt:null},inventory,equipped:{bedding:'moss-cushion',toy:'soft-cloudball'},preferences,favourites:{drinks:[],treats:p.favouriteFoods.map(itemBy).filter(i=>i?.category==='treat').map(i=>i!.id),toys:[],locations:[]},toyState:{},autonomy:{enabled:true,nextAt:iso(now+2*HOUR),lastAt:iso(now),lastDreamAt:iso(now),dreamSeen:{},recentReactions:[],recentEvents:[],request:null},adventure:null,visits:{},relationships:{},completedAdventures:{},lastOutingAt:null,lastTalkAt:null,lastReturnAt:iso(now),stats:{drinks:0,outings:0,adventures:0,independentMeals:0,independentDrinks:0,independentPlays:0,toyPlays:0,discoveries:0,confidence:10,conversations:0}};
}
export function migratePet(p:LegacyPet|Pet,now:number,grant=true):Pet{
 if('world' in p&&p.world?.version===2)return p as Pet;
 const pet=p as Pet;pet.world=makeWorld(p,now,true,grant);
 remember(pet,now,'migration','A bigger little world',`Your original Piplet, memories and care are preserved. ${grant?'A one-time 300.00 Dewdrop legacy care grant,':'Starter supplies,'} a stocked pantry, a soft cloudball and a moss cushion welcome ${p.name} into this new chapter.`);
 return pet;
}
export function careRate(p:Pet){
 const score=(100-p.hunger+p.world.hydration+p.happiness+p.cleanliness+p.health+p.energy)/6;
 const neglected=p.hunger>=94||p.world.hydration<8||p.health<30;
 const rate=neglected?0:score>=85?500:score>=70?425:score>=50?300:score>=30?125:25;
 const tier=neglected?'A pause for care':score>=85?'Excellent care':score>=70?'Good care':score>=50?'Comfortable care':score>=30?'A little care would help':'Needs a gentle reset';
 const needs=[p.hunger>65?'a meal':null,p.world.hydration<40?'a drink':null,p.energy<25?'rest':null,p.cleanliness<40?'a wash':null,p.happiness<50?'company':null,p.illness?'illness care':null].filter(Boolean);
 return {rate:rate/100,rateCents:rate,tier,reason:needs.length?`${p.name} could use ${needs.join(', ')}. These needs lower the earning rate.`:'Needs are well looked after. Comfortable sleep counts as good care too.',offlineCapHours:48};
}
export function transaction(p:Pet,now:number,kind:World['wallet']['transactions'][number]['kind'],amount:number,description:string,id=crypto.randomUUID()){
 const w=p.world.wallet;w.balance=Math.max(0,w.balance+amount);
 if(kind==='earnings'||kind==='discovery')w.earned+=Math.max(0,amount);if(kind==='purchase')w.spent-=amount;
 const last=w.transactions.find(t=>t.id===id);
 if(last){last.amount+=amount;last.balance=w.balance;last.timestamp=iso(now)}else w.transactions.push({id,timestamp:iso(now),kind,amount,description,balance:w.balance});
 w.transactions=w.transactions.slice(-240);
}
export function earn(p:Pet,now:number,hours:number){const w=p.world.wallet;const exact=careRate(p).rateCents*hours+w.carry;const cents=Math.floor(exact+1e-8);w.carry=Math.max(0,exact-cents);if(cents)transaction(p,now,'earnings',cents,'Care earnings',`earn-${Math.floor(now/HOUR)}`);return cents}
export function capacity(p:Pet){return 120+ITEMS.filter(i=>i.benefit==='storage'&&p.world.inventory[i.id]>0).length*100}
export const pantryCount=(p:Pet)=>ITEMS.filter(i=>i.consumable).reduce((n,i)=>n+(p.world.inventory[i.id]||0),0);
export function independence(p:Pet){const stage=stageIndex(p.stage);return {stage:p.stage,enabled:p.world.autonomy.enabled,selfFeed:stage>=2&&(p.bond>=15||stage===3),selfDrink:stage>=1,selfPlay:stage>=1,tidy:stage>=2&&(has(p,'Neat nest')||p.world.stats.confidence>=25||stage===3||hasBenefit(p,'selfcare')),nap:stage>=1,description:stage===0?'A baby needs you for meals and drinks. They explore nearby, dream and ask for company.':stage===1?'Childhood brings independent sips, toy time and little naps. Meals still need your help.':stage===2?'With a little trust, a teen can eat stocked meals, choose toys, nap and learn to tidy.': 'An adult looks after everyday needs from stocked supplies. Company, illness care and adventures are still yours to share.'}}
export function shopPrice(item:Item,now:number){const day=Math.floor(now/DAY);const index=ITEMS.indexOf(item);return Math.max(1,Math.round(item.price*((index+day)%29===0?.9:1)))}
export function shop(p:Pet,category?:string,query='',offset=0,limit=40,now=Date.now()){
 const filtered=ITEMS.filter(i=>(!category||i.category===category)&&(!query||`${i.name} ${i.group} ${i.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())));
 return {currency:'Dewdrops',balance:money(p.world.wallet.balance),categories:[...new Set(ITEMS.map(i=>i.category))],total:filtered.length,offset,items:filtered.slice(offset,offset+limit).map(i=>({...i,price:shopPrice(i,now)/100,regularPrice:i.price/100,owned:p.world.inventory[i.id]||0,suitable:eligibleItem(p,i)})),nextOffset:offset+limit<filtered.length?offset+limit:null};
}
export function observePreference(p:Pet,id:string,now:number,joy=7){
 const w=p.world;const pref=w.preferences[id]||{uses:0,joy:0,disliked:false,lastAt:iso(now)};pref.uses++;pref.joy+=joy;pref.lastAt=iso(now);w.preferences[id]=pref;
 const i=itemBy(id);if(!i)return;
 if(pref.uses>=3&&pref.joy/pref.uses<4&&!pref.disliked){pref.disliked=true;if(p.dislikes.length<20)p.dislikes.push(i.name);remember(p,now,'preference','Not quite their thing',`After several tries, ${p.name} seems less keen on ${i.name.toLowerCase()}. There are plenty of other things to enjoy.`)}
 if(pref.uses<4||pref.joy/pref.uses<5)return;
 let favourites:string[];let label='flavour';
 if(i.category==='drink')favourites=w.favourites.drinks;
 else if(i.category==='treat')favourites=w.favourites.treats;
 else if(i.category==='toy'){favourites=w.favourites.toys;label='toy'}
 else if(i.category==='food'){if(p.favouriteFoods.includes(i.name))return;p.favouriteFoods.push(i.name);remember(p,now,'favourite','A familiar favourite',`${p.name} has grown to love ${i.name.toLowerCase()} through shared meals.`);unlock(p,'food',now);return}
 else return;
 if(!favourites.includes(id)){favourites.push(id);remember(p,now,'favourite',`A favourite ${label}`,`${p.name} keeps choosing ${i.name.toLowerCase()}. Familiar pleasures become part of a little life.`);if(i.category==='toy')unlock(p,'toy',now)}
}
function stocked(p:Pet,category:ItemCategory){return ITEMS.filter(i=>i.category===category&&(p.world.inventory[i.id]||0)>0&&eligibleItem(p,i))}
function chooseStock(p:Pet,category:ItemCategory,choice:string|undefined,rng:Random){if(choice)return itemBy(choice);const options=stocked(p,category);const favourites=options.filter(i=>p.favouriteFoods.includes(i.name)||Object.values(p.world.favourites).some(a=>a.includes(i.id)));if(favourites.length)return pick(favourites,rng);const preferred=options.filter(i=>!p.world.preferences[i.id]?.disliked&&i.traits.some(t=>has(p,t)));return pick(preferred.length?preferred:options.filter(i=>!p.world.preferences[i.id]?.disliked).length?options.filter(i=>!p.world.preferences[i.id]?.disliked):options,rng)}
const declined=(reaction:string):{reaction:string;applied:boolean;choice?:string}=>({reaction,applied:false});
export function consume(p:Pet,category:'food'|'drink'|'treat',choice:string|undefined,now:number,rng:Random=Math.random,autonomous=false){
 if(p.sleeping)return declined(`${p.name} is asleep. Wake them gently before offering ${category==='drink'?'a drink':'something to eat'}.`);
 const item=chooseStock(p,category,choice,rng);
 if(!item||item.category!==category)return declined(choice?'That item is not in this part of the pantry. Check the stocked choices.':`There are no suitable ${category==='food'?'meals':category==='drink'?'drinks':'treats'} stocked. Visit the shop to fill the pantry.`);
 if(!eligibleItem(p,item))return declined(`${item.name} is for ${item.minStage?.toLowerCase()} Piplets and older. Choose something age-suitable.`);
 if(!(p.world.inventory[item.id]>0))return declined(`${item.name} is out of stock. Buy some from the shop first.`);
 if(category==='food'&&p.hunger<18)return declined(reaction(p,'full',now,{item:item.name,food:item.name},rng));
 if(category==='drink'&&p.world.hydration>85)return declined(`${p.name} is well hydrated. Save the ${item.name.toLowerCase()} for later.`);
 const recent=p.careHistory.filter(e=>e.action===(category==='food'?'feed':category==='drink'?'drink':'treat')&&now-Date.parse(e.timestamp)<HOUR).length;
 if(category==='treat'&&recent>=3)return declined(`${p.name} has had three treats in the last hour. Time for a different kind of lovely.`);
 const factor=recent>=6?0:1/(1+recent*.55);const e=item.effects||{};const disliked=p.world.preferences[item.id]?.disliked;const affinity=item.traits.some(t=>has(p,t));
 p.world.inventory[item.id]--;p.hunger=clamp(p.hunger-(e.hunger||0));p.world.hydration=clamp(p.world.hydration+(e.hydration||0));p.energy=clamp(p.energy+(e.energy||0));p.health=clamp(p.health+(e.health||0));p.happiness=clamp(p.happiness+(e.happiness||3)*factor*(disliked?.4:affinity?1.25:1));
 if(!autonomous)gainBond(p,(category==='food'?.16:.12)*factor);
 if(category==='food'){p.stats.meals++;p.foodCounts[item.name]=(p.foodCounts[item.name]||0)+1;if(autonomous)p.world.stats.independentMeals++;unlock(p,'first_meal',now)}
 if(category==='treat'){p.stats.treats++;p.foodCounts[item.name]=(p.foodCounts[item.name]||0)+1}
 if(category==='drink'){p.world.stats.drinks++;if(autonomous)p.world.stats.independentDrinks++;unlock(p,'first_drink',now)}
 const joy=(has(p,'Shy')&&item.tags.includes('fizzy'))||(has(p,'Sleepy')&&item.tags.includes('spicy'))?3:affinity?10:7;
 observePreference(p,item.id,now,joy);effect(p,category==='drink'?'Refreshed':'Well fed',now,45);
 const favourite=p.favouriteFoods.includes(item.name)||p.world.favourites.drinks.includes(item.id)||p.world.favourites.treats.includes(item.id);
 const text=autonomous?`${p.name} helped themselves to ${item.name.toLowerCase()} from the stocked pantry.`:reaction(p,category==='food'?'feed':category,now,{item:item.name,food:item.name},rng);
 if(autonomous)remember(p,now,'autonomous',category==='drink'?'A little independent sip':'I can reach the pantry',text);
 return {reaction:text+(favourite?' The familiar favourite earns a happy foot-tap.':''),applied:true,choice:item.name};
}
export function playActivity(p:Pet,choice:string|undefined,now:number,rng:Random=Math.random){
 if(p.sleeping)return declined(`${p.name} is sleeping. A game can wait until they wake.`);
 const available=ACTIVITIES.filter(a=>!a.toyTag||stocked(p,'toy').some(i=>i.tags.includes(a.toyTag!)));
 const preferred=available.filter(a=>p.favouriteActivities.includes(a.name)||a.traits.some(t=>has(p,t)));
 const a=choice?activityBy(choice):pick(preferred.length?preferred:available,rng);
 if(!a)return declined('Choose an activity from the activity book.');
 if(a.toyTag&&!stocked(p,'toy').some(i=>i.tags.includes(a.toyTag!)))return declined(`This game needs a toy with the ${a.toyTag} tag. The shop can help, or choose a game without equipment.`);
 if(p.energy<Math.max(12,a.energy+5)||p.illness&&p.health<50)return declined(reaction(p,'tired',now,{},rng));
 const recent=p.careHistory.filter(e=>e.action==='play'&&now-Date.parse(e.timestamp)<HOUR).length;
 const factor=recent>=6?0:1/(1+recent*.55);const affinity=a.traits.some(t=>has(p,t));
 p.energy=clamp(p.energy-a.energy);p.cleanliness=clamp(p.cleanliness-a.mess);p.hunger=clamp(p.hunger+2);p.world.hydration=clamp(p.world.hydration-3);p.happiness=clamp(p.happiness+a.happiness*(has(p,'Playful')||affinity?1.25:1)*factor);gainBond(p,.45*factor);p.stats.plays++;
 p.activityCounts[a.name]=(p.activityCounts[a.name]||0)+1;
 if(p.activityCounts[a.name]>=4&&!p.favouriteActivities.includes(a.name)){p.favouriteActivities.push(a.name);remember(p,now,'favourite','Again! Again!',`${p.name} keeps asking for ${a.name}. A favourite activity, discovered together.`);unlock(p,'game',now)}
 if(a.category==='Training')p.world.stats.confidence=clamp(p.world.stats.confidence+1);
 const keys=a.outcomes.map((text,i)=>({id:`activity-${a.id}-${i}`,text}));const last=p.world.autonomy.recentReactions;const pool=keys.filter(k=>!last.includes(k.id));const chosen=pick(pool.length?pool:keys.filter(k=>k.id===last.find(k=>k.startsWith(`activity-${a.id}-`))),rng)||keys[0];last.push(chosen.id);p.world.autonomy.recentReactions=last.slice(-100);
 effect(p,'Playtime',now);unlock(p,'first_play',now);p.world.autonomy.request=null;
 return {reaction:format(p,chosen.text)+(affinity?' '+reaction(p,'play',now,{},rng):''),applied:true,choice:a.name};
}
export function playToy(p:Pet,id:string|undefined,now:number,rng:Random=Math.random,autonomous=false){
 const toy=chooseStock(p,'toy',id,rng);if(!toy||toy.category!=='toy'||!p.world.inventory[toy.id])return declined('Choose an owned toy from the toy box.');
 if(p.sleeping)return declined(`${p.name} is asleep. Their toys will be waiting.`);
 if(p.energy<18)return declined(reaction(p,'tired',now,{},rng));
 const ts=p.world.toyState[toy.id]||{plays:0,lastAt:iso(now),boredUntil:null,lostUntil:null};
 if(ts.lostUntil&&Date.parse(ts.lostUntil)>now)return declined(`${toy.name} has wandered under the moss. Search together, or it will turn up soon.`);
 if(ts.boredUntil&&Date.parse(ts.boredUntil)>now)return declined(`${p.name} would like a change from ${toy.name.toLowerCase()}. Try another toy while this one feels new again.`);
 const repeated=now-Date.parse(ts.lastAt)<2*HOUR&&ts.plays>0;ts.plays++;ts.lastAt=iso(now);if(repeated)ts.boredUntil=iso(now+3*HOUR);ts.lostUntil=null;p.world.toyState[toy.id]=ts;
 const affinity=toy.traits.some(t=>has(p,t));p.world.equipped.toy=toy.id;p.energy=clamp(p.energy-7);p.cleanliness=clamp(p.cleanliness-(has(p,'Mischievous')?3:1));p.happiness=clamp(p.happiness+(affinity?12:8));if(!autonomous)gainBond(p,.25);p.world.stats.toyPlays++;if(autonomous)p.world.stats.independentPlays++;
 observePreference(p,toy.id,now,affinity?10:7);unlock(p,'first_toy',now);effect(p,'Playtime',now,10);
 const text=format(p,toy.behaviour||'{name} gives {toy} a thorough little investigation.',{toy:toy.name,item:toy.name})+' '+reaction(p,'toy',now,{toy:toy.name,item:toy.name},rng);
 if(autonomous)remember(p,now,'autonomous','A little life of their own',text);else p.world.autonomy.request=null;
 return {reaction:text,applied:true,choice:toy.name};
}
export function weatherAt(now:number,locationId:string):'sunny'|'breezy'|'drizzly'|'misty'{const salt=[...locationId].reduce((v,c)=>v+c.charCodeAt(0),0);return (['sunny','breezy','drizzly','misty'] as const)[(Math.floor(now/(6*HOUR))+salt)%4]}
export function adventureView(p:Pet){const run=p.world.adventure;if(!run)return null;const story=ADVENTURES.find(s=>s.id===run.storyId);const location=LOCATIONS.find(l=>l.id===run.locationId);const node=story?.nodes.find(n=>n.id===run.nodeId);if(!story||!location||!node)return null;const context={place:location.name,resident:location.resident};return {...run,title:story.title,place:location.name,resident:location.resident,text:format(p,node.text,context),choices:node.choices.map(c=>({id:c.id,label:format(p,c.label,context)}))}}
function startOuting(p:Pet,locationId:string|undefined,now:number,rng:Random){
 if(p.world.adventure)return declined('An adventure is already waiting for your next choice. Finish it or head home before starting another.');
 if(p.sleeping)return declined(`${p.name} is tucked in. Wake them before an outing.`);
 if(p.world.lastOutingAt&&now-Date.parse(p.world.lastOutingAt)<10*60000)return declined('Let that outing settle for a few minutes. There is plenty to do at home meanwhile.');
 const location=LOCATIONS.find(l=>l.id===locationId||l.name.toLowerCase()===locationId?.toLowerCase())||(!locationId?pick(LOCATIONS,rng):undefined);
 if(!location)return declined('Choose a destination from the outings map.');
 if(p.energy<location.energy+12||p.hunger>85||p.world.hydration<20||p.illness)return declined(`${p.name} needs a little care before heading out: a drink, food, rest, and time to recover if poorly.`);
 const weather=weatherAt(now,location.id);const gear=hasBenefit(p,'explore');
 p.energy=clamp(p.energy-location.energy);p.hunger=clamp(p.hunger+6);p.world.hydration=clamp(p.world.hydration-(weather==='sunny'?10:6));p.cleanliness=clamp(p.cleanliness-location.mess-(weather==='drizzly'&&!gear?4:0));p.happiness=clamp(p.happiness+8+(location.traits.some(t=>has(p,t))?4:0));gainBond(p,.25);p.world.stats.outings++;p.world.visits[location.id]=(p.world.visits[location.id]||0)+1;p.world.lastOutingAt=iso(now);p.world.autonomy.request=null;
 let pool=ADVENTURES.filter(a=>a.locationTags.includes('*')||a.locationTags.includes(location.id));if(!pool.length)pool=ADVENTURES;
 const least=Math.min(...pool.map(a=>p.world.completedAdventures[a.id]||0));pool=pool.filter(a=>(p.world.completedAdventures[a.id]||0)===least);const affinity=pool.filter(a=>a.trait&&has(p,a.trait));const story=pick(affinity.length?affinity:pool,rng);
 const seen=p.world.relationships[location.resident]||0;const callback=seen>0?`${location.resident} recognises ${p.name} from an earlier visit. `:'';
 const intro=callback+format(p,story.intro,{place:location.name,resident:location.resident});
 p.world.adventure={runId:crypto.randomUUID(),storyId:story.id,locationId:location.id,nodeId:story.nodes[0].id,startedAt:iso(now),weather,choices:[],transcript:[{text:intro}]};
 if(p.world.visits[location.id]>=3&&!p.world.favourites.locations.includes(location.id)){p.world.favourites.locations.push(location.id);remember(p,now,'favourite','A place that feels like ours',`${p.name} has grown fond of ${location.name} after your outings together.`)}
 unlock(p,'first_outing',now);if(Object.keys(p.world.visits).length>=10)unlock(p,'traveller',now);
 remember(p,now,'outing',`A visit to ${location.name}`,`${intro} ${format(p,location.weather[weather],{place:location.name,resident:location.resident})}`);
 effect(p,'Surprised',now);return {reaction:`${reaction(p,'walk',now,{place:location.name,resident:location.resident},rng)} ${intro} An adventure choice is waiting.`,applied:true};
}
export function worldAction(p:Pet,command:any,now:number,rng:Random=Math.random):{reaction:string;applied:boolean;choice?:string}{
 const w=p.world;const {action}=command;
 if(action==='purchase'){
  const item=itemBy(command.itemId);const quantity=command.quantity??1;
  if(!item)return declined('That item is not in the shop.');
  if(!item.consumable&&(quantity!==1||(w.inventory[item.id]||0)>0))return declined('You already own this reusable item, or requested more than one.');
  if(item.consumable&&pantryCount(p)+quantity>capacity(p))return declined('The pantry is full. Use a few supplies or add a storage upgrade.');
  const cost=shopPrice(item,now)*quantity;if(w.wallet.balance<cost)return declined(`That costs ${money(cost)} Dewdrops. Your purse holds ${money(w.wallet.balance)}.`);
  transaction(p,now,'purchase',-cost,`${quantity} × ${item.name}`);w.inventory[item.id]=(w.inventory[item.id]||0)+quantity;unlock(p,'first_purchase',now);
  if(!item.consumable)remember(p,now,'possession','Something of their very own',`${p.name}'s home now has ${item.name.toLowerCase()}. ${item.description}`);
  return {reaction:`${quantity} × ${item.name} added for ${money(cost)} Dewdrops. ${reaction(p,'purchase',now,{item:item.name,toy:item.name},rng)}`,applied:true};
 }
 if(action==='drink')return consume(p,'drink',command.choice,now,rng);
 if(action==='toy')return playToy(p,command.itemId||command.choice,now,rng);
 if(action==='use_item'){
  const item=itemBy(command.itemId);if(!item||!w.inventory[item.id])return declined('Choose something you own.');if(!eligibleItem(p,item))return declined(`Save this for ${item.minStage?.toLowerCase()} days.`);
  if(['food','drink','treat'].includes(item.category))return consume(p,item.category as 'food'|'drink'|'treat',item.id,now,rng);
  if(item.category==='toy')return playToy(p,item.id,now,rng);
  if(!item.consumable){if(w.equipped[item.category]===item.id)return declined(`${item.name} is already at home in that spot.`);w.equipped[item.category]=item.id;remember(p,now,'home','A little change at home',`${item.name} is now part of ${p.name}'s surroundings.`);return {reaction:format(p,item.behaviour||'{name} inspects {item}, then settles in beside it.',{item:item.name}),applied:true}}
  if(p.sleeping)return declined('Let your little one wake before using that supply.');
  const e=item.effects||{};if(!Object.keys(e).length)return declined('This item is a keepsake. It is already safe among your belongings.');
  w.inventory[item.id]--;p.energy=clamp(p.energy+(e.energy||0));p.cleanliness=clamp(p.cleanliness+(e.cleanliness||0));p.health=clamp(p.health+(e.health||0));p.hunger=clamp(p.hunger-(e.hunger||0));w.hydration=clamp(w.hydration+(e.hydration||0));p.happiness=clamp(p.happiness+(e.happiness||0));return {reaction:format(p,item.behaviour||'{name} enjoys a little help from {item}.',{item:item.name}),applied:true};
 }
 if(action==='walk')return startOuting(p,command.locationId,now,rng);
 if(action==='adventure_choice'){
  const run=w.adventure;if(!run)return declined('There is no adventure in progress. Pick somewhere to visit.');
  if(command.runId!==run.runId||command.nodeId!==run.nodeId)return declined('That choice belongs to an earlier page. Read the current adventure and choose again.');
  const story=ADVENTURES.find(a=>a.id===run.storyId)!;const node=story.nodes.find(n=>n.id===run.nodeId)!;const choice=node.choices.find(c=>c.id===command.choiceId);if(!choice)return declined('That choice is not available on this page.');
  const location=LOCATIONS.find(l=>l.id===run.locationId)!;const context={place:location.name,resident:location.resident};run.choices.push(choice.id);run.transcript.push({text:format(p,node.text,context),choice:format(p,choice.label,context)});
  if(choice.next){run.nodeId=choice.next;return {reaction:format(p,story.nodes.find(n=>n.id===choice.next)!.text,context),applied:true}}
  const reward=choice.reward||{};p.happiness=clamp(p.happiness+(reward.happiness||0));gainBond(p,Math.min(1,reward.bond||0));w.stats.confidence=clamp(w.stats.confidence+(reward.confidence||0));w.relationships[location.resident]=(w.relationships[location.resident]||0)+(reward.relationship||1);
  if(reward.currency)transaction(p,now,'discovery',Math.min(500,reward.currency),`A little find at ${location.name}`);
  let found='';if(reward.collectible){const item=itemBy(location.collectibleId);if(item){w.inventory[item.id]=1;w.stats.discoveries++;found=` You brought home ${item.name.toLowerCase()}.`;remember(p,now,'discovery','Something to remember it by',`${p.name} found ${item.name.toLowerCase()} at ${location.name}.`)}}
  w.completedAdventures[story.id]=(w.completedAdventures[story.id]||0)+1;w.stats.adventures++;if(choice.tendency&&(w.stats.adventures>=3))addTendency(p,choice.tendency,now);
  const outcome=format(p,choice.outcome||story.memory,context);remember(p,now,'adventure',story.title,`${run.transcript.map(t=>t.choice).filter(Boolean).join(' → ')}. ${outcome}${found} ${format(p,story.memory,context)}`);
  w.adventure=null;unlock(p,'first_adventure',now);if(w.stats.discoveries>=10)unlock(p,'collector',now);return {reaction:outcome+found,applied:true};
 }
 if(action==='head_home'){if(!w.adventure)return declined('You are already home.');remember(p,now,'outing','Home feels good too',`${p.name} left an adventure unfinished and returned to a familiar cosy spot. There is always another day.`);w.adventure=null;return {reaction:`${p.name} heads home beside you. The rest of that mystery can wait for another day.`,applied:true}}
 if(action==='talk'){
  if(w.lastTalkAt&&now-Date.parse(w.lastTalkAt)<60000)return declined(`${p.name} is still taking in your last little moment together.`);w.lastTalkAt=iso(now);w.stats.conversations++;gainBond(p,has(p,'Affectionate')?.2:.1);p.happiness=clamp(p.happiness+2);
  const topic=command.topic||'hello';let text='';
  if(topic==='search'){const missing=Object.entries(w.toyState).filter(([,s])=>s.lostUntil&&Date.parse(s.lostUntil)>now);if(missing.length){const [id,s]=missing[0];s.lostUntil=null;text=`Together you discover ${itemBy(id)?.name||'the missing toy'} tucked under a leaf. ${p.name} looks extremely innocent.`;remember(p,now,'discovery','There it is!',text)}else text=`${p.name} helps you search under the moss. Everything seems to be in its place.`}
  else if(topic==='encourage'){w.stats.confidence=clamp(w.stats.confidence+.5);text=`${p.name} tries a tiny brave step with you nearby. Confidence grows through patient encouragement.`;if(w.stats.conversations>=20)addTendency(p,'Brave steps',now)}
  else if(topic==='memory'){const memory=p.history.findLast(e=>['adventure','favourite','discovery'].includes(e.type));text=memory?`${p.name} settles close while you remember “${memory.title}”. ${memory.description}`:`${p.name} listens as you tell the story of the day you first met.`}
  else if(topic==='listen'&&w.autonomy.request)text=w.autonomy.request.text;
  else if(p.sleeping)text=reaction(p,'sleep',now,{},rng);
  else {const hour=hourAt(now,p.settings.timeZone);text=reaction(p,topic==='silly'?'play':topic==='listen'?'autonomous':hour<12?'morning':hour<18?'afternoon':'evening',now,{},rng)}
  return {reaction:text,applied:true};
 }
 if(action==='autonomy'){w.autonomy.enabled=command.enabled;return {reaction:command.enabled?'Independent care is enabled when your pal is old enough.':'Independent pantry and toy use is paused. Natural sleep and dreams continue.',applied:true}}
 if(action==='support'){
  if(w.wallet.balance>=100||stocked(p,'food').length||stocked(p,'drink').length)return declined('You have supplies or enough Dewdrops for basics. The community basket is for an empty pantry and purse.');
  if(w.wallet.lastSupportAt&&now-Date.parse(w.wallet.lastSupportAt)<DAY)return declined('Your next emergency basket will be ready tomorrow.');
  w.wallet.lastSupportAt=iso(now);w.inventory['cloud-crunch']=(w.inventory['cloud-crunch']||0)+3;w.inventory['spring-water']=(w.inventory['spring-water']||0)+3;transaction(p,now,'support',100,'A little community care basket');remember(p,now,'support','A little help is always here','A community basket added three basic meals, three waters and 1.00 Dewdrop.');return {reaction:'Three meals, three waters and 1.00 Dewdrop are safely in your pantry and purse. Everyone needs a little help sometimes.',applied:true};
 }
 return declined('That activity is not available.');
}
export function dream(p:Pet,now:number,rng:Random=Math.random){
 const a=p.world.autonomy;if(now-Date.parse(a.lastDreamAt)<5*HOUR)return;
 let pool=DREAMS.filter(d=>!a.dreamSeen[d.id]||now-Date.parse(a.dreamSeen[d.id])>=45*DAY);if(!pool.length)return;
 const affinity=pool.filter(d=>d.traits?.some(t=>has(p,t)));if(affinity.length&&rng()<.55)pool=affinity;
 const selected=pick(pool,rng);a.lastDreamAt=iso(now);a.dreamSeen[selected.id]=iso(now);remember(p,now,'dream',selected.title,format(p,selected.text));if(Object.keys(a.dreamSeen).length>=10)unlock(p,'dreamer',now);
}
export function autonomous(p:Pet,now:number,rng:Random=Math.random){
 const w=p.world,a=w.autonomy;for(const [id,state] of Object.entries(w.toyState)){if(state.lostUntil&&Date.parse(state.lostUntil)<=now){state.lostUntil=null;remember(p,now,'autonomous','It was here all along',`${p.name} found ${itemBy(id)?.name||'a toy'} under the moss.`)}}
 if(now<Date.parse(a.nextAt))return;
 a.lastAt=iso(now);a.nextAt=iso(now+(has(p,'Energetic')?1.5:has(p,'Independent')?2:2.5)*HOUR);
 if(p.sleeping){dream(p,now,rng);return}
 const abilities=independence(p);let cared=false;
 if(a.enabled&&abilities.selfFeed&&p.hunger>=58&&stocked(p,'food').length)cared=consume(p,'food',undefined,now,rng,true).applied;
 if(a.enabled&&abilities.selfDrink&&w.hydration<(hasBenefit(p,'selfcare')?65:55)&&stocked(p,'drink').length)cared=consume(p,'drink',undefined,now,rng,true).applied||cared;
 if(cared)unlock(p,'independent',now);
 if(a.enabled&&abilities.tidy&&p.cleanliness<48&&!p.illness){p.cleanliness=clamp(p.cleanliness+(hasBenefit(p,'selfcare')?17:12));remember(p,now,'autonomous','A little tidy',`${p.name} gathered the scattered leaves into one very proud pile. A proper bath is still your job.`);return}
 if(w.adventure||cared)return;
 if(a.enabled&&abilities.selfPlay&&p.energy>35&&p.happiness<85&&rng()<.7){const toys=stocked(p,'toy').filter(i=>!w.toyState[i.id]?.lostUntil&&(!w.toyState[i.id]?.boredUntil||Date.parse(w.toyState[i.id].boredUntil!)<=now));if(toys.length){const chosen=toys.filter(i=>i.traits.some(t=>has(p,t)));playToy(p,pick(chosen.length?chosen:toys,rng).id,now,rng,true);return}}
 if(now-Date.parse(p.lastEventAt)<4*HOUR)return;
 let events=AMBIENT_EVENTS.filter(e=>!a.recentEvents.includes(e.id)&&(!e.traits?.length||e.traits.some(t=>has(p,t))));if(!events.length){a.recentEvents=[];events=AMBIENT_EVENTS.filter(e=>!e.traits?.length||e.traits.some(t=>has(p,t)))}
 const affinity=events.filter(e=>e.traits?.some(t=>has(p,t)));const event=pick(affinity.length&&rng()<.65?affinity:events,rng);a.recentEvents=[...a.recentEvents,event.id].slice(-40);p.lastEventAt=iso(now);p.happiness=clamp(p.happiness+event.happiness);p.cleanliness=clamp(p.cleanliness-event.mess,10);remember(p,now,'autonomous',event.title,format(p,event.text));
 const toys=stocked(p,'toy');const loc=w.favourites.locations[0];
 if(has(p,'Affectionate')&&(event.kind==='affection'||rng()<.35))a.request={kind:'cuddle',text:`${p.name} pats a place beside them and asks for a little cuddle.`,at:iso(now)};
 else if(toys.length&&event.kind==='play'){const toy=pick(toys,rng);a.request={kind:'toy',id:toy.id,text:`${p.name} brings over ${toy.name.toLowerCase()} and waits hopefully for you to join in.`,at:iso(now)}}
 else if(loc&&event.kind==='curiosity')a.request={kind:'outing',id:loc,text:`${p.name} keeps looking toward ${LOCATIONS.find(l=>l.id===loc)?.name}. That earlier adventure seems to have stayed with them.`,at:iso(now)};
 else if(has(p,'Energetic')){const activity=pick(ACTIVITIES.filter(v=>v.traits.includes('Energetic')),rng)||ACTIVITIES[0];a.request={kind:'activity',id:activity.id,text:`${p.name} is full of plans: ${activity.name.toLowerCase()} sounds particularly good.`,at:iso(now)}}
 if(has(p,'Mischievous')&&event.kind==='mess'&&toys.length&&rng()<.3){const toy=pick(toys,rng);w.toyState[toy.id]||={plays:0,lastAt:iso(now),boredUntil:null,lostUntil:null};w.toyState[toy.id].lostUntil=iso(now+2*HOUR);remember(p,now,'autonomous','A toy has gone wandering',`${toy.name} has vanished into the moss. A search together might find it sooner.`)}
}
