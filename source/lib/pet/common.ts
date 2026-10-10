import {Pet,MILESTONES,iso,clamp} from './model';
import {ITEMS} from './catalogue';
import {LOCATIONS,ACTIVITIES} from './world-content';
import {REACTIONS} from './story-content';
export type Random=()=>number;
export const pick=<T,>(a:readonly T[],rng:Random=Math.random):T=>a[Math.max(0,Math.min(a.length-1,Math.floor(rng()*a.length)))];
export const has=(p:Pet,t:string)=>p.traits.includes(t as any)||p.tendencies.includes(t);
export function remember(p:Pet,now:number,type:string,title:string,description:string){p.history.push({timestamp:iso(now),type,title,description})}
export function unlock(p:Pet,id:string,now:number){if(p.milestones.some(m=>m.id===id))return;p.milestones.push({id,timestamp:iso(now)});remember(p,now,'milestone',MILESTONES[id]||id,`${p.name} reached a little milestone: ${MILESTONES[id]||id}.`)}
export function effect(p:Pet,name:string,now:number,minutes=25){p.effects=p.effects.filter(e=>e.name!==name&&Date.parse(e.expiresAt)>now);p.effects.push({name,expiresAt:iso(now+minutes*60000)});p.effects=p.effects.slice(-12)}
export function format(p:Pet,text:string,context:Record<string,string>={}){
 const world=p.world;const loc=LOCATIONS.find(l=>l.id===world?.adventure?.locationId)||LOCATIONS.find(l=>l.id===world?.favourites.locations[0]);
 const toy=ITEMS.find(i=>i.id===world?.equipped.toy)||ITEMS.find(i=>i.id===world?.favourites.toys[0]);
 const activity=p.favouriteActivities[0]||ACTIVITIES[0]?.name||'Cloudball';
 const values:Record<string,string>={name:p.name,toy:toy?.name||'a little cloudball',food:p.favouriteFoods[0]||'a warm bowl of cloud crunch',activity,place:loc?.name||'the moss garden',resident:loc?.resident||'a tiny passing moth',memory:p.history.findLast(e=>e.type==='adventure')?.title||'the day you first met',item:toy?.name||'a little treasure',...context};
 return text.replace(/\{([a-z]+)\}/g,(_,key)=>values[key]||key);
}
export function reaction(p:Pet,key:string,now:number,context:Record<string,string>={},rng:Random=Math.random){
 const special=p.traits.map(t=>`${key}:${t}`).filter(k=>REACTIONS[k]?.length);const poolKey=special.length?pick(special,rng):key;
 const pool=REACTIONS[poolKey]||REACTIONS[key]||['{name} looks up with a small, contented wiggle.'];
 const recent=p.world.autonomy.recentReactions;let eligible=pool.map((text,i)=>({text,id:`${poolKey}:${i}`})).filter(e=>!recent.includes(e.id));
 if(!eligible.length){const oldest=recent.find(k=>k.startsWith(`${poolKey}:`));eligible=pool.map((text,i)=>({text,id:`${poolKey}:${i}`})).filter(e=>e.id===oldest);if(!eligible.length)eligible=[{text:pool[0],id:`${poolKey}:0`}];}
 const chosen=pick(eligible,rng);p.world.autonomy.recentReactions=[...recent.filter(id=>id!==chosen.id),chosen.id].slice(-100);return format(p,chosen.text,context);
}
export function addTendency(p:Pet,tendency:string,now:number){if(p.tendencies.length<30&&!p.tendencies.includes(tendency)){p.tendencies.push(tendency);remember(p,now,'personality','A little habit takes root',`${p.name} is becoming a ${tendency.toLowerCase()} through real experiences together.`)}}
export const gainBond=(p:Pet,amount:number)=>{p.bond=clamp(p.bond+amount);p.stats.highestBond=Math.max(p.stats.highestBond,p.bond)};
