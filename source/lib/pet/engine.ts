import {Pet,LegacyPet,FOODS,TREATS,GAMES,TRAITS,MILESTONES,iso,clamp,ageDays,HOUR,DAY,hourAt,statLabel,bondLabel} from './model';
import {Random,pick,has,remember,unlock,effect,reaction as narrative} from './common';
import {makeWorld,consume,playActivity,worldAction,autonomous,earn,independence,careRate,itemBy,hasBenefit} from './world';
import {ITEMS} from './catalogue';
export {remember} from './common';
export function createPet(name:string,now:number,timeZone='Europe/London',rng:Random=Math.random):Pet{
 const pool=[...TRAITS],traits:Pet['traits']=[];
 for(let i=0;i<3;i++)traits.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
 const base:LegacyPet={id:crypto.randomUUID(),name,species:'Piplet',createdAt:iso(now),lastSimulationAt:iso(now),lastInteractionAt:iso(now),stage:'Baby',variant:'Sprout',hunger:25,happiness:86,energy:90,cleanliness:95,health:100,bond:8,mood:'Curious',sleeping:false,sleepStartedAt:null,traits,tendencies:[],favouriteFoods:[],favouriteActivities:[],likes:['Soft moss','Interesting little sounds'],dislikes:['Empty bowls','Being rushed'],illness:null,effects:[],milestones:[],history:[],careHistory:[],stats:{meals:0,treats:0,plays:0,cuddles:0,cleans:0,sleeps:0,illnesses:0,medicine:0,highestBond:8,happyHours:0,longestHappyHours:0,carePoints:0,nightVisits:0,poorCareHours:0},foodCounts:{},activityCounts:{},lastEventAt:iso(now),lastNeglectAt:null,lastMedicineAt:null,lastBirthday:0,bedtimes:[],settings:{reducedMotion:false,rawStats:false,reminders:true,timeZone}};
 const p:Pet={...base,world:makeWorld(base,now)};
 remember(p,now,'creation','A very small hello',`${name} hatched! A Piplet with a ${traits.join(', ').toLowerCase()} personality, and the beginning of something lovely.`);remember(p,now,'naming','A name of their own',`Welcome to the world, ${name}.`);return p;
}
export function updateMood(p:Pet,now:number){
 p.effects=p.effects.filter(e=>Date.parse(e.expiresAt)>now);
 p.mood=p.sleeping?'Sleeping':p.illness?'Sick':p.hunger>80?'Hungry':p.world.hydration<25?'Thirsty':p.energy<22?'Sleepy':p.cleanliness<23?'Dirty':p.effects.some(e=>e.name==='Grumpy')?'Grumpy':p.happiness<25?'Sad':p.effects.some(e=>e.name==='Cuddled')?'Affectionate':p.effects.some(e=>e.name==='Playtime')?'Excited':p.effects.some(e=>e.name==='Surprised')?'Surprised':p.happiness>90?'Ecstatic':p.happiness<42&&has(p,'Affectionate')?'Lonely':p.happiness<50?'Bored':p.happiness>75&&has(p,'Playful')?'Playful':p.happiness>70?'Happy':has(p,'Curious')?'Curious':'Content';
 if(!p.sleeping&&!p.illness&&p.energy<55&&(hourAt(now,p.settings.timeZone)>=22||hourAt(now,p.settings.timeZone)<5))p.mood='Sleepy';
 p.stats.highestBond=Math.max(p.stats.highestBond,p.bond);
}
function infect(p:Pet,now:number,name:NonNullable<Pet['illness']>['name']){if(p.illness)return;p.illness={name,severity:30,startedAt:iso(now),recovery:0};p.health=Math.min(p.health,65);p.stats.illnesses++;remember(p,now,'illness','A little under the weather',`${p.name} has ${name.toLowerCase()}. Food, a clean nest, rest and medicine will help.`)}
function recover(p:Pet,now:number){p.illness=null;p.health=Math.max(p.health,78);remember(p,now,'recovery','Back to their little self',narrative(p,'recovery',now));unlock(p,'recovery',now)}
function progress(p:Pet,now:number){
 const days=ageDays(p,now);const stage=days>=42&&(p.stats.carePoints>=25||days>=90)?'Adult':days>=14&&(p.stats.carePoints>=8||days>=30)?'Teen':days>=3?'Child':'Baby';
 if(p.stage!==stage){p.stage=stage;if(stage==='Adult'){p.variant=p.stats.plays>p.stats.cuddles*1.4?'Wildflower':p.stats.nightVisits>p.stats.plays/2?'Starlight':'Cloudheart'}remember(p,now,'growth',`Hello, ${stage.toLowerCase()} days`,`${p.name} is growing into a ${stage.toLowerCase()} ${p.species}${stage==='Adult'?` with a ${p.variant} glow`:''}. Still very much themselves. ${independence(p).description}`)}
 const years=Math.floor(days/365);if(years>p.lastBirthday){p.lastBirthday=years;remember(p,now,'birthday','Happy hatchday!',`${years} whole year${years===1?'':'s'} together. ${p.name} is celebrating!`)}
 if(days>=7)unlock(p,'week',now);if(days>=30)unlock(p,'month',now);if(p.bond>=75)unlock(p,'best_friends',now);if(p.bond>=90)unlock(p,'inseparable',now);if(p.stats.plays>=100)unlock(p,'plays_100',now);if(p.stats.cuddles>=100)unlock(p,'cuddles_100',now);
 const add=(t:string,condition:boolean)=>{if(condition&&!p.tendencies.includes(t)){p.tendencies.push(t);remember(p,now,'personality',`A little more ${t.toLowerCase()}`,`${p.name} has developed a ${t.toLowerCase()} tendency through your time together.`)}};
 add('Affectionate',p.stats.cuddles>=25);add('Playful',p.stats.plays>=25);add('Food-loving',p.stats.treats>=25);add('Night owl',p.stats.nightVisits>=15);add('Neat nest',p.stats.cleans>=20);
 if(p.bedtimes.length>=7){const last=p.bedtimes.slice(-7),avg=last.reduce((s,h)=>s+Math.cos(h*Math.PI/12),0)/7,avgSin=last.reduce((s,h)=>s+Math.sin(h*Math.PI/12),0)/7;add('Bedtime regular',Math.sqrt(avg*avg+avgSin*avgSin)>.94)}
}
export function simulate(p:Pet,now:number,rng:Random=Math.random):Pet{
 const previous=Date.parse(p.lastSimulationAt);if(now<=previous){updateMood(p,Math.max(now,previous));return p}
 const elapsed=(now-previous)/HOUR,hours=Math.min(elapsed,48);let t=previous,totalEarned=0;
 for(let remaining=hours;remaining>1e-10;){const h=Math.min(.25,remaining);remaining-=h;t+=h*HOUR;progress(p,t);
  if(p.sleeping&&p.sleepStartedAt&&t-Date.parse(p.sleepStartedAt)>=8*HOUR){p.sleeping=false;p.sleepStartedAt=null;remember(p,t,'sleep','Good morning, little one',narrative(p,'wake',t,{},rng));unlock(p,'first_sleep',t)}
  const asleep=p.sleeping;const newHours=Math.max(0,Math.min(h,(t-Date.parse(p.world.introducedAt))/HOUR));
  const comfort=hasBenefit(p,'sleep');
  p.hunger=clamp(p.hunger+h*(asleep?1.3:3.2),0,95);p.world.hydration=clamp(p.world.hydration-newHours*(asleep?1.2:3),5);
  p.cleanliness=clamp(p.cleanliness-h*(asleep?.65:has(p,'Mischievous')?(hasBenefit(p,'groom')?1.9:2.2):(hasBenefit(p,'groom')?1.2:1.5)),10);
  p.energy=clamp(p.energy+h*(asleep?(comfort?13:12):has(p,'Sleepy')?-5:has(p,'Energetic')?-3:-4),5);
  const bad=p.hunger>85||p.cleanliness<20||p.world.hydration<12;
  p.stats.poorCareHours=bad?p.stats.poorCareHours+h:Math.max(0,p.stats.poorCareHours-h*2);
  if(!p.illness&&p.stats.poorCareHours>=12){infect(p,t,p.cleanliness<20?'Mud fever':'Grumble belly');p.stats.poorCareHours=0}
  p.happiness=clamp(p.happiness+h*(asleep?(has(p,'Sleepy')?.5:-.2):-(bad?2.8:has(p,'Playful')?(hasBenefit(p,'comfort')?1.1:1.35):(hasBenefit(p,'comfort')?.6:.8))),15);
  p.health=clamp(p.health+h*(bad?-1.2:p.hunger<65&&p.cleanliness>45&&p.world.hydration>30?(asleep?1.8:1):0),25);
  if(p.illness){p.illness.severity=clamp(p.illness.severity+h*(bad?.6:-.4),5,70);p.illness.recovery=clamp(p.illness.recovery+h*(bad?.3:asleep?5:2.5));if(p.illness.recovery>=100)recover(p,t)}
  if(p.energy<=(p.world.autonomy.enabled&&independence(p).nap?18:8)&&!p.sleeping){p.sleeping=true;p.sleepStartedAt=iso(t);p.stats.sleeps++;remember(p,t,'sleep','A nap found them',narrative(p,'sleep',t,{},rng))}
  if(newHours>0){autonomous(p,t,rng);totalEarned+=earn(p,t,newHours)}
  if(p.happiness>=70){p.stats.happyHours+=h;p.stats.longestHappyHours=Math.max(p.stats.longestHappyHours,p.stats.happyHours)}else p.stats.happyHours=0;
 }
 if(elapsed>=.5)p.world.wallet.lastEarnings={amount:totalEarned,hours:Math.min(elapsed,48),at:iso(now),capped:elapsed>48};
 if(elapsed>=48&&(!p.lastNeglectAt||now-Date.parse(p.lastNeglectAt)>3*DAY)){p.bond=clamp(p.bond-1,5);p.lastNeglectAt=iso(now);remember(p,now,'reunion','There you are',narrative(p,'return',now,{},rng))}
 if(elapsed>48){p.world.autonomy.nextAt=iso(now+HOUR);if(p.sleeping){p.sleeping=false;p.sleepStartedAt=null}remember(p,now,'rest','A quiet stretch',`After 48 hours, this little world took a gentle pause. No more needs decay or Dewdrops accrued during the remaining absence.`)}
 p.lastSimulationAt=iso(now);progress(p,now);updateMood(p,now);return p;
}
export function care(p:Pet,action:string,choice:string|undefined,now:number,rng:Random=Math.random,command:any={}):{reaction:string;applied:boolean}{
 if(action==='use_item'){const item=itemBy(command.itemId);if(item&&['food','drink','treat','toy'].includes(item.category)){action=item.category==='food'?'feed':item.category;choice=item.id;command={...command,itemId:item.id}}}
 const n=p.name;let reaction='';let applied=true;
 if(p.sleeping&&!['wake','cuddle','sleep','purchase','use_item','talk','autonomy','support','head_home'].includes(action))return{reaction:`${n} is fast asleep. Wake them gently before ${action==='feed'?'a meal':action==='medicine'?'medicine':'doing that'}.`,applied:false};
 const recent=p.careHistory.filter(e=>e.action===action&&now-Date.parse(e.timestamp)<HOUR).length;
 const cooldown=p.careHistory.findLast(e=>e.action===action);
 if(['play','toy','cuddle','clean','use_item'].includes(action)&&cooldown&&now-Date.parse(cooldown.timestamp)<30000)return{reaction:`${n} is still enjoying that moment. Give them a few seconds to catch their breath.`,applied:false};
 const diminish=recent>=6?0:1/(1+recent*.55);
 if(action==='feed'||action==='treat'){
  const result=consume(p,action==='feed'?'food':'treat',choice,now,rng);if(!result.applied)return result;reaction=result.reaction;choice=result.choice;
 }else if(action==='play'){
  const result=playActivity(p,choice,now,rng);if(!result.applied)return result;reaction=result.reaction;choice=result.choice;
 } else if(action==='cuddle'){
  p.happiness=clamp(p.happiness+(has(p,'Affectionate')?12:7)*diminish);p.bond=clamp(p.bond+(has(p,'Affectionate')?.65:has(p,'Independent')?.25:.4)*diminish);p.stats.cuddles++;
  reaction=p.sleeping?`${n} nestles closer without opening their eyes. A soft, sleepy sigh.`:has(p,'Affectionate')?pick([`${n} leans into your hand and firmly cancels all other plans.`,`${n} melts into the cuddle. You seem to be their favourite place.`],rng):has(p,'Independent')?pick([`${n} accepts exactly one cuddle, then wanders off with a pleased little wiggle.`,`${n} sits beside you. Close enough. Perfect, actually.`],rng):`${n} gives a tiny contented hum and settles into your hand.`;effect(p,'Cuddled',now);p.effects=p.effects.filter(e=>e.name!=='Grumpy');unlock(p,'first_cuddle',now);
 } else if(action==='clean'){
  if(p.cleanliness>92)return{reaction:`${n} is already sparkling. Not a speck out of place!`,applied:false};
  p.cleanliness=100;p.health=clamp(p.health+3);p.happiness=clamp(p.happiness+(has(p,'Neat nest')?8:3)*diminish);p.bond=clamp(p.bond+.2*diminish);p.stats.cleans++;reaction=has(p,'Dramatic')?`${n} has survived bath time. Barely. They expect a commemorative plaque.`:has(p,'Mischievous')?`${n} is clean. You, somehow, are soaked.`:`${n} emerges from a cloud of bubbles, fresh, fluffy and rather pleased.`;unlock(p,'first_clean',now);effect(p,'Freshly washed',now);
 } else if(action==='sleep'){
  if(p.sleeping)return{reaction:`${n} is already busy with a very important dream.`,applied:false};
  p.sleeping=true;p.sleepStartedAt=iso(now);p.stats.sleeps++;p.bedtimes.push(hourAt(now,p.settings.timeZone));p.bedtimes=p.bedtimes.slice(-14);if(has(p,'Sleepy'))p.happiness=clamp(p.happiness+3*diminish);reaction=`${n} curls up, does a tiny ceremonial yawn, and drifts off. They’ll wake naturally after about eight hours.`;
 } else if(action==='wake'){
  if(!p.sleeping)return{reaction:`${n} is already awake and looking around.`,applied:false};
  const slept=now-Date.parse(p.sleepStartedAt||iso(now));p.sleeping=false;p.sleepStartedAt=null;
  if(slept>=2*HOUR)unlock(p,'first_sleep',now);if(p.energy<25){p.happiness=clamp(p.happiness-3);effect(p,'Grumpy',now);reaction=`${n} opens one eye. A second eye is apparently out of the question just yet.`}else reaction=`${n} stretches every little limb and blinks up at you. Hello again!`;
 } else if(action==='medicine'){
  if(!p.illness)return{reaction:`${n} is healthy and doesn’t need any medicine.`,applied:false};
  if(p.lastMedicineAt&&now-Date.parse(p.lastMedicineAt)<4*HOUR)return{reaction:`${n} has already had medicine. The next dose can be given at ${new Date(Date.parse(p.lastMedicineAt)+4*HOUR).toISOString()}. Rest and care help meanwhile.`,applied:false};
  p.lastMedicineAt=iso(now);p.illness.recovery=clamp(p.illness.recovery+55);p.illness.severity=clamp(p.illness.severity-20);p.health=clamp(p.health+18);p.bond=clamp(p.bond+.5);p.stats.medicine++;reaction=`${n} makes a spectacular face at the medicine, then leans against you. That should help.`;if(p.illness.recovery>=100)recover(p,now);
 }else {const result=worldAction(p,{...command,action,choice},now,rng);if(!result.applied)return result;reaction=result.reaction;choice=result.choice||choice;}
 if(['cuddle','clean','sleep','wake','medicine'].includes(action)){reaction=reactionText(p,action,now,rng);if(action==='cuddle')p.world.autonomy.request=null;}
 if(applied){p.lastInteractionAt=iso(now);if(!['purchase','use_item','autonomy','support'].includes(action))p.stats.carePoints+=diminish;p.careHistory.push({action,timestamp:iso(now),...(choice?{choice}:{})});p.careHistory=p.careHistory.slice(-100);const hour=hourAt(now,p.settings.timeZone);if((hour>=23||hour<5)&&recent===0)p.stats.nightVisits++;if(p.happiness>=95&&!p.history.some(e=>e.type==='happy'&&now-Date.parse(e.timestamp)<DAY))remember(p,now,'happy','A very good little day',`${n} seems absolutely delighted with life right now.`);progress(p,now);updateMood(p,now)}
 return{reaction,applied};
}
function reactionText(p:Pet,action:string,now:number,rng:Random){const text=narrative(p,action,now,{},rng);const toy=ITEMS.find(i=>i.id===p.world.equipped.toy);return text+(action==='sleep'&&toy&&p.world.favourites.toys.includes(toy.id)?` ${p.name} tucks ${toy.name.toLowerCase()} close beside them.`:'')+(action==='wake'&&p.energy<25?' Those little eyes are still sleepy and a little grumpy.':'')}
export function status(p:Pet,now:number){
 const observations=p.sleeping?[`${p.name} is tucked up, recharging for another little adventure.`]:p.illness?[`${p.name} is feeling poorly. A meal, a wash, medicine and rest will help.`]:p.hunger>70?[`${p.name} keeps looking meaningfully at the bowl.`]:p.mood==='Affectionate'?[`${p.name} has decided your company is the best thing in the pocket.`]:p.mood==='Sleepy'?[`${p.name} is trying very hard to keep both eyes open.`]:[`${p.name} is pottering around the moss, quietly pleased you’re here.`,`${p.name} pauses an important investigation to look up at you.`,`${p.name} gives a little wiggle. All seems well in this corner of the world.`];
 return {name:p.name,ageDays:ageDays(p,now),lifeStage:p.stage,mood:p.mood,hunger:statLabel('hunger',p.hunger),hydration:statLabel('hydration',p.world.hydration),happiness:statLabel('happiness',p.happiness),energy:statLabel('energy',p.energy),cleanliness:statLabel('cleanliness',p.cleanliness),health:statLabel('health',p.health),bond:bondLabel(p.bond),sleeping:p.sleeping,illness:p.illness,wallet:{currency:'Dewdrops',balance:p.world.wallet.balance/100,...careRate(p)},independence:independence(p),request:p.world.autonomy.request,adventurePending:!!p.world.adventure,observation:observations[Math.floor(now/(10*60000))%observations.length]};
}
