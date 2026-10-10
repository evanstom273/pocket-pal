const text=(description:string)=>({type:'string',minLength:1,maxLength:100,description});
const limit={type:'integer',minimum:1,maximum:100};const offset={type:'integer',minimum:0,maximum:50000};
const requestId={type:'string',minLength:8,maxLength:128,description:'Optional unique request ID. Reuse when retrying the same action to prevent duplicate purchases or care.'};
const category={type:'string',enum:['food','drink','treat','toy','bedding','decoration','grooming','adventure','outdoor','accessory','collectible','special','storage','upgrade']};
const definitions:any[]=[
 ['get_pet','Read the complete persistent Pocket Pal state after real elapsed time. Never invent state.',{}],
 ['get_pet_status','Check needs, hydration, mood, sleep, illness, wallet, independence and any request or pending adventure.',{}],
 ['hatch_pet','Hatch the first Piplet only if no pet exists. Never replaces an existing companion.',{name:{type:'string',minLength:1,maxLength:30},request_id:requestId},['name']],
 ['feed_pet','Feed one stocked meal, consuming one pantry item. Use get_pantry for names or IDs; omit food for an owned favourite. Never creates food.',{food:text('Stocked food name or item ID.'),request_id:requestId}],
 ['give_drink','Give one stocked drink, consuming it. Omit drink for a stocked favourite. Check get_pantry when unsure.',{drink:text('Drink name or item ID.'),request_id:requestId}],
 ['give_treat','Give one stocked treat. Maximum three per hour; happiness gains diminish.',{treat:text('Treat name or item ID.'),request_id:requestId}],
 ['play_with_pet','Play a specific activity from get_activities, or omit for a personality-suited choice. Some activities need an owned toy. Costs energy.',{activity:text('Activity name or ID from get_activities.'),request_id:requestId}],
 ['cuddle_pet','Share personality-aware affection. Safe while sleeping.',{request_id:requestId}],
 ['clean_pet','Give a free basic bath while awake. Grooming items are optional.',{request_id:requestId}],
 ['put_pet_to_sleep','Tuck the pet in. Sleep restores energy; natural waking follows about eight hours.',{request_id:requestId}],
 ['wake_pet','Wake the pet gently. Low energy can cause grumpiness.',{request_id:requestId}],
 ['give_medicine','Help an ill pet recover. Free, four-hour cooldown; no benefit if healthy.',{request_id:requestId}],
 ['rename_pet','Rename the SAME pet and record the change.',{new_name:{type:'string',minLength:1,maxLength:30},request_id:requestId},['new_name']],
 ['get_pet_history','Read permanent memories newest first, with pagination and an optional type filter. Use actual recorded events for what happened while away.',{limit,offset,event_type:{type:'string',maxLength:40}}],
 ['get_pet_personality','Read original traits, learned habits, preferences, relationships, independence and current requests.',{}],
 ['get_pet_stats','Read lifetime care, economy, discoveries, independent care and adventure statistics.',{}],
 ['get_pet_milestones','Read earned and optionally locked milestones.',{include_locked:{type:'boolean'}}],
 ['get_wallet','Read Dewdrops, earning rate and explanation, offline earnings, legacy grant and recent transactions. Prices and amounts use decimal Dewdrops.',{limit}],
 ['get_shop','Browse the large shop catalogue. Prices use decimal Dewdrops; purchase by item ID. Filter by category or query and paginate.',{category,query:{type:'string',maxLength:100},limit,offset}],
 ['purchase_item','Buy stock or a possession using in-game Dewdrops. This spends no real money. Check prices and inventory first. Reuse request_id on retry.',{item_id:text('Exact item ID from get_shop.'),quantity:{type:'integer',minimum:1,maximum:50},request_id:requestId},['item_id']],
 ['get_pantry','List owned consumable food, drinks, treats and supplies with quantities. No item is infinite.',{category}],
 ['get_possessions','List owned toys, furnishings, equipment and keepsakes, including selected items, favourites and temporarily missing toys.',{category}],
 ['play_with_toy','Offer an OWNED toy and play together. Toys develop favourites and temporary boredom. Omit item_id to let the pet choose.',{item_id:text('Owned toy ID or name.'),request_id:requestId}],
 ['use_item','Use an owned consumable supply or equip a reusable furnishing/accessory. Owned toys can be offered here too. Does not buy anything.',{item_id:text('Owned item ID or name.'),request_id:requestId},['item_id']],
 ['get_activities','Read the full activity book, with needs, personality affinity and equipment requirements.',{category:{type:'string',enum:['Games','Creative','Quiet','Training','Silly','Exploring']}}],
 ['get_destinations','Read places to visit, fictional local weather, residents, discoveries and favourite locations. All outings are accompanied.',{}],
 ['take_a_walk','Begin an accompanied outing and a branching adventure at a destination. Read the returned choices; do not invent or auto-complete them.',{destination:text('Destination ID or name from get_destinations.'),request_id:requestId}],
 ['get_adventure','Read the saved current adventure page and actual choices. Adventures persist between Site and chats.',{}],
 ['choose_adventure_option','Choose an option explicitly selected by the user. Obtain current run_id, node_id and choice_id from get_adventure; stale pages are rejected.',{run_id:text('Current adventure runId.'),node_id:text('Current nodeId.'),choice_id:text('One of the current choice IDs.'),request_id:requestId},['run_id','node_id','choice_id']],
 ['head_home','Leave the current adventure and return home. Records the early return without completing the adventure.',{request_id:requestId}],
 ['talk_to_pet','Interact: greet, listen to requests, be silly, encourage confidence, recall a real memory, or search for a misplaced toy.',{topic:{type:'string',enum:['hello','listen','silly','encourage','memory','search']},request_id:requestId}],
 ['get_preferences','Read learned favourite foods, drinks, treats, toys, activities and locations, dislikes and experience counts. Preferences are earned through repeated experiences.',{}],
 ['get_memories','Read permanent memories with pagination, including dreams, outings and important adventure outcomes.',{limit,offset,event_type:{type:'string',maxLength:40}}],
 ['get_autonomous_events','Read recent independent activity, sleep and dreams. Describe only stored events.',{limit}],
 ['set_independent_care','Enable or pause age-appropriate self-feeding, drinking and toy use. Natural sleep and dreams continue.',{enabled:{type:'boolean'},request_id:requestId},['enabled']],
 ['request_care_basket','Receive basic supplies if both the pantry and purse are empty. Limited to once daily, to keep care forgiving.',{request_id:requestId}]
];
export const PET_TOOLS=definitions.map(([name,description,properties,required=[]])=>({name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:name.startsWith('get_'),destructiveHint:false,idempotentHint:name.startsWith('get_')||['put_pet_to_sleep','wake_pet','rename_pet','hatch_pet','set_independent_care'].includes(name),openWorldHint:false}}));
export const ACTION_MAP:Record<string,string>={hatch_pet:'hatch',feed_pet:'feed',give_drink:'drink',give_treat:'treat',play_with_pet:'play',cuddle_pet:'cuddle',clean_pet:'clean',put_pet_to_sleep:'sleep',wake_pet:'wake',give_medicine:'medicine',rename_pet:'rename',purchase_item:'purchase',play_with_toy:'toy',use_item:'use_item',take_a_walk:'walk',choose_adventure_option:'adventure_choice',head_home:'head_home',talk_to_pet:'talk',set_independent_care:'autonomy',request_care_basket:'support'};
export function toolCommand(name:string,args:any,requestId:string){
 const action=ACTION_MAP[name];if(!action)return undefined;const c:any={action,requestId:args.request_id||requestId};
 if(name==='hatch_pet')c.name=args.name;if(name==='rename_pet')c.name=args.new_name;
 if(args.food||args.drink||args.treat||args.activity)c.choice=args.food||args.drink||args.treat||args.activity;
 if(args.item_id)c.itemId=args.item_id;if(args.quantity!==undefined)c.quantity=args.quantity;if(args.destination)c.locationId=args.destination;
 if(args.run_id)c.runId=args.run_id;if(args.node_id)c.nodeId=args.node_id;if(args.choice_id)c.choiceId=args.choice_id;if(args.topic)c.topic=args.topic;if(args.enabled!==undefined)c.enabled=args.enabled;
 return c;
}
export function validToolArgs(tool:any,args:any){if(!args||typeof args!=='object'||Array.isArray(args))return false;const schema=tool.inputSchema;if(Object.keys(args).some(k=>!schema.properties[k])||schema.required.some((k:string)=>!(k in args)))return false;for(const [k,v] of Object.entries(args)){const s=schema.properties[k];if(s.type==='string'&&(typeof v!=='string'||(s.minLength&&v.length<s.minLength)||(s.maxLength&&v.length>s.maxLength)))return false;if(s.type==='integer'&&(!Number.isInteger(v)||(v as number)<s.minimum||(v as number)>s.maximum))return false;if(s.type==='boolean'&&typeof v!=='boolean')return false;if(s.enum&&!s.enum.includes(v))return false}return true}
