import { z } from 'zod';
export const FOODS = ['Fruit bowl','Veggie meal','Noodles','Sandwich','Soup','Rice bowl','Cloud crunch'] as const;
export const TREATS = ['Biscuit','Berry snack','Tiny cake','Sweet bun','Frozen star'] as const;
export const GAMES = ['Cloudball','Hide and peep','Wiggle dance','Ribbon chase','Pocket expedition','Pretend dragon'] as const;
export const TRAITS = ['Affectionate','Playful','Curious','Sleepy','Mischievous','Independent','Food-loving','Dramatic','Shy','Energetic'] as const;
export const TRAIT_INFO:Record<string,string> = {
  Affectionate:'Cuddles build a little more trust. Being together is the best bit.',
  Playful:'Games bring extra joy, but quiet afternoons can get a little boring.',
  Curious:'Always investigating small discoveries and new games.',
  Sleepy:'Runs out of puff sooner and adores a comfortable nap.',
  Mischievous:'More little surprises. Also, mysteriously, more mess.',
  Independent:'Likes your company with a little room to wander.',
  'Food-loving':'Treat time is a very important appointment.',
  Dramatic:'Has a spectacular reaction to the smallest inconvenience.',
  Shy:'Gentle affection is reassuring; quiet games are favourites.',
  Energetic:'More stamina for games and a spring in every step.'
};
export const MILESTONES:Record<string,string> = {first_meal:'First Meal',first_cuddle:'First Cuddle',first_play:'First Game',first_clean:'First Bath',first_sleep:'First Night’s Sleep',week:'One Week Together',month:'One Month Together',best_friends:'Best Friends',inseparable:'Inseparable',food:'Favourite Food Found',game:'Favourite Game Found',recovery:'Feeling Better',plays_100:'100 Plays',cuddles_100:'100 Cuddles',first_drink:'First Little Sip',first_purchase:'A Home of Our Own',first_toy:'A Toy to Treasure',first_outing:'Beyond the Moss',first_adventure:'A Story Worth Keeping',collector:'Pocket Treasures',independent:'I Can Do It!',dreamer:'A Head Full of Dreams',traveller:'A Familiar Little World',toy:'Favourite Toy Found'};
const stamp=z.string().datetime();
const bounded=z.number().finite().min(0).max(100);
const small=z.string().max(300);
const count=z.number().finite().min(0).max(1e9);
export const settingsSchema=z.object({darkMode:z.boolean().optional(),reducedMotion:z.boolean(),rawStats:z.boolean(),reminders:z.boolean(),timeZone:z.string().max(100).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true}catch{return false}},'Unknown time zone')}).strict();
const eventSchema=z.object({timestamp:stamp,type:z.string().max(40),title:small,description:z.string().max(1500)}).strict();
export const basePetSchema=z.object({
  id:z.string().uuid(),name:z.string().trim().min(1).max(30),species:z.literal('Piplet'),createdAt:stamp,lastSimulationAt:stamp,lastInteractionAt:stamp,
  stage:z.enum(['Baby','Child','Teen','Adult']),variant:z.enum(['Sprout','Starlight','Cloudheart','Wildflower']),
  hunger:bounded,happiness:bounded,energy:bounded,cleanliness:bounded,health:bounded,bond:bounded,mood:small,
  sleeping:z.boolean(),sleepStartedAt:stamp.nullable(),
  traits:z.array(z.enum(TRAITS)).min(2).max(4),tendencies:z.array(small).max(30),favouriteFoods:z.array(small).max(300),favouriteActivities:z.array(small).max(150),likes:z.array(small).max(20),dislikes:z.array(small).max(20),
  illness:z.object({name:z.enum(['Sniffles','Grumble belly','Mud fever','Sleepy bug']),severity:bounded,startedAt:stamp,recovery:bounded}).strict().nullable(),
  effects:z.array(z.object({name:small,expiresAt:stamp}).strict()).max(12),
  milestones:z.array(z.object({id:z.string().max(50),timestamp:stamp}).strict()).max(100),
  history:z.array(eventSchema).max(50000),careHistory:z.array(z.object({action:small,timestamp:stamp,choice:small.optional()}).strict()).max(100),
  stats:z.object({meals:count,treats:count,plays:count,cuddles:count,cleans:count,sleeps:count,illnesses:count,medicine:count,highestBond:bounded,happyHours:count,longestHappyHours:count,carePoints:count,nightVisits:count,poorCareHours:count}).strict(),
  foodCounts:z.record(count),activityCounts:z.record(count),lastEventAt:stamp,lastNeglectAt:stamp.nullable(),lastMedicineAt:stamp.nullable(),lastBirthday:count,bedtimes:z.array(z.number().min(0).max(23)).max(14),settings:settingsSchema
}).strict();
const idText=z.string().min(1).max(100);
const ledgerSchema=z.object({id:idText,timestamp:stamp,kind:z.enum(['grant','earnings','purchase','discovery','support']),amount:z.number().int().min(-100000000).max(100000000),description:small,balance:count}).strict();
const preferenceSchema=z.object({uses:count,joy:count,disliked:z.boolean(),lastAt:stamp}).strict();
export const worldSchema=z.object({
 version:z.literal(2),introducedAt:stamp,legacyGrant:z.boolean(),hydration:bounded,
 wallet:z.object({balance:z.number().int().min(0).max(1e9),carry:z.number().min(0).max(1),earned:count,spent:count,transactions:z.array(ledgerSchema).max(240),lastEarnings:z.object({amount:count,hours:count,at:stamp,capped:z.boolean()}).strict(),lastSupportAt:stamp.nullable()}).strict(),
 inventory:z.record(z.number().int().min(0).max(100000)),equipped:z.record(idText),preferences:z.record(preferenceSchema),
 favourites:z.object({drinks:z.array(idText).max(100),treats:z.array(idText).max(100),toys:z.array(idText).max(100),locations:z.array(idText).max(100)}).strict(),
 toyState:z.record(z.object({plays:count,lastAt:stamp,boredUntil:stamp.nullable(),lostUntil:stamp.nullable()}).strict()),
 autonomy:z.object({enabled:z.boolean(),nextAt:stamp,lastAt:stamp,lastDreamAt:stamp,dreamSeen:z.record(stamp),recentReactions:z.array(idText).max(100),recentEvents:z.array(idText).max(40),request:z.object({kind:z.enum(['toy','cuddle','activity','outing']),id:idText.optional(),text:small,at:stamp}).strict().nullable()}).strict(),
 adventure:z.object({runId:z.string().uuid(),storyId:idText,locationId:idText,nodeId:idText,startedAt:stamp,weather:z.enum(['sunny','breezy','drizzly','misty']),choices:z.array(idText).max(20),transcript:z.array(z.object({text:z.string().max(1500),choice:small.optional()}).strict()).max(30)}).strict().nullable(),
 visits:z.record(count),relationships:z.record(count),completedAdventures:z.record(count),lastOutingAt:stamp.nullable(),lastTalkAt:stamp.nullable(),lastReturnAt:stamp,
 stats:z.object({drinks:count,outings:count,adventures:count,independentMeals:count,independentDrinks:count,independentPlays:count,toyPlays:count,discoveries:count,confidence:bounded,conversations:count}).strict()
}).strict();
export const petSchema=basePetSchema.extend({world:worldSchema}).strict();
export type Pet=z.infer<typeof petSchema>;
export type LegacyPet=z.infer<typeof basePetSchema>;
export type World=z.infer<typeof worldSchema>;
export type Memory=z.infer<typeof eventSchema>;
export type Settings=z.infer<typeof settingsSchema>;
export const backupSchema=z.union([z.object({format:z.literal('pocket-pal'),version:z.literal(2),exportedAt:stamp,pet:petSchema}).strict(),z.object({format:z.literal('pocket-pal'),version:z.literal(1),exportedAt:stamp,pet:basePetSchema.or(petSchema)}).strict()]);
export type Receipt={id:string;signature:string;reaction:string};
export type Save={version:1|2;pet:Pet|null;receipts:Receipt[];grantedPetIds?:string[]};
export const HOUR=3600000,DAY=24*HOUR;
export const iso=(n:number)=>new Date(n).toISOString();
export const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
export const ageDays=(p:Pet,now=Date.now())=>Math.max(0,Math.floor((now-Date.parse(p.createdAt))/DAY));
export function statLabel(key:string,v:number){
 const words:Record<string,string[]>={hunger:['Full','Comfortable','Peckish','Hungry','Very hungry'],hydration:['Parched','Thirsty','Could sip','Refreshed','Well hydrated'],happiness:['Miserable','Sad','Content','Happy','Ecstatic'],energy:['Exhausted','Tired','Rested','Energetic','Bouncy'],cleanliness:['Filthy','Dirty','Messy','Clean','Sparkling'],health:['Very sick','Sick','Under the weather','Healthy','Excellent']};
 return (words[key]||words.happiness)[Math.min(4,Math.floor(v/20))];
}
export function bondLabel(v:number){return v>=90?'Inseparable':v>=75?'Best Friend':v>=55?'Close Friend':v>=35?'Good Friend':v>=15?'Getting Comfortable':'New Friend'}
export function hourAt(now:number,tz:string){return Number(new Intl.DateTimeFormat('en-GB',{hour:'numeric',hourCycle:'h23',timeZone:tz}).format(now))}
