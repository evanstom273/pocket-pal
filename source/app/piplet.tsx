'use client';
import {useId} from 'react';
import {ITEMS} from '@/lib/pet/catalogue';
import type {Pet} from '@/lib/pet/model';
export function Piplet({pet,action='',egg=false,small=false,dark=pet?.settings.darkMode??true,compact=false}:{pet:Pet|null;action?:string;egg?:boolean;small?:boolean;dark?:boolean;compact?:boolean}){
 const furnishing=(slot:string)=>ITEMS.find(i=>i.id===pet?.world?.equipped[slot]);
 const id=useId().replace(/:/g,'');const sleep=pet?.sleeping;const night=sleep||dark;const mood=pet?.mood||'Curious';const dirty=(pet?.cleanliness??100)<35;const sick=!!pet?.illness;const sad=['Sad','Lonely','Bored','Grumpy','Hungry','Thirsty'].includes(mood);const veryHappy=['Ecstatic','Excited','Affectionate'].includes(mood);const adult=pet?.stage==='Adult';const variant=pet?.variant;const bodyColor=variant==='Starlight'?'#b4b1ef':variant==='Cloudheart'?'#f4b4c5':variant==='Wildflower'?'#b9d98d':'#a7dac6';
 return <svg className={`pet-scene ${sleep?'is-sleeping':''} ${sick?'is-sick':''} ${action?'doing-'+action:''} ${small?'small-scene':''}`} viewBox={compact?"150 65 340 350":"0 0 640 420"} role="img" aria-label={egg?'A speckled Piplet egg nestled in moss':`${pet?.name||'Piplet'} looks ${mood.toLowerCase()}${dirty?' with muddy patches':''}`}>
  <defs><linearGradient id={id+'sky'} x2="0" y2="1"><stop stopColor={night?'#253c55':'#e3f1de'}/><stop offset="1" stopColor={night?'#446362':'#f3f3ce'}/></linearGradient><linearGradient id={id+'body'} x2="0.3" y2="1"><stop stopColor={bodyColor}/><stop offset="1" stopColor={variant==='Sprout'?'#71b89e':bodyColor}/></linearGradient><radialGradient id={id+'light'}><stop stopColor="#fffde8" stopOpacity=".9"/><stop offset="1" stopColor="#fffde8" stopOpacity="0"/></radialGradient></defs>
  <rect width="640" height="420" rx="32" fill={`url(#${id}sky)`}/>
  <circle cx="465" cy="98" r="106" fill={`url(#${id}light)`} opacity={night?'.2':'1'}/><circle cx="475" cy="91" r="30" fill={night?'#ecebc5':'#fffce5'}/>{night&&<circle cx="487" cy="80" r="27" fill="#2e4858"/>}
  <g fill={night?'#738d97':'#fff'} opacity=".65"><path d="M64 112c-6-21 25-36 38-16 15-12 31-3 31 11 25-8 36 15 15 21H73c-13 0-18-11-9-16Z"/><path d="M342 62c0-16 23-23 32-6 17-10 35 6 24 18h-50c-9 0-12-8-6-12Z"/></g>
  {night&&<g fill="#f7edbc"><circle cx="100" cy="73" r="2"/><circle cx="250" cy="90" r="3"/><circle cx="550" cy="158" r="2"/><path d="m388 127 3 6 7 2-7 3-3 6-2-6-7-3 7-2Z"/></g>}
  <path d="M0 313Q106 275 219 312T448 302T640 309V420H0Z" fill={night?'#3c6459':'#bed3a3'}/><path d="M0 356Q140 310 306 350T640 336V420H0Z" fill={night?'#35574d':'#a9c88d'}/>
  <g stroke={night?'#769b73':'#789e62'} strokeWidth="3" fill="none" strokeLinecap="round"><path d="M63 337v-34m0 22q-18-1-17-16 17 0 17 16Zm0-8q17-1 16-16-15 0-16 16ZM555 329v-42m0 25q-21-1-19-18 17 0 19 18Zm0-10q20-2 19-18-17 0-19 18Z"/><path d="m113 377-6-13m6 13 4-19m375 9-5-15m5 15 7-19"/></g>
  <g fill="#fbf5d6"><circle cx="150" cy="328" r="4"/><circle cx="156" cy="331" r="4"/><circle cx="150" cy="335" r="4"/><circle cx="144" cy="331" r="4"/></g><circle cx="150" cy="331" r="3" fill="#dba753"/>
  <ellipse cx="324" cy="343" rx={egg?85:114} ry="22" fill={night?'#25493c':'#739b68'} opacity=".25"/>
  {!egg&&pet?.world&&<g aria-hidden="true"><ellipse cx="322" cy="350" rx="124" ry="24" fill={night?'#647969':'#d8dab0'} stroke={night?'#809282':'#aab887'} strokeWidth="2" opacity=".85"/>{furnishing('decoration')&&<text x="70" y="290" fontSize="42">{furnishing('decoration')?.icon}</text>}{furnishing('outdoor')&&<text x="518" y="270" fontSize="42">{furnishing('outdoor')?.icon}</text>}{furnishing('toy')&&<text x="465" y="364" fontSize="32">{furnishing('toy')?.icon}</text>}{furnishing('collectible')&&<text x="107" y="379" fontSize="25">{furnishing('collectible')?.icon}</text>}</g>}
  {egg?<g className="egg-wobble"><path d="M325 169c-39 0-78 87-78 120 0 37 35 55 77 55s77-18 77-55c0-36-36-120-76-120Z" fill="#fff6df" stroke="#d9cfaf" strokeWidth="3"/><g fill="#a6c4a0"><ellipse cx="298" cy="235" rx="10" ry="7" transform="rotate(-25 298 235)"/><ellipse cx="346" cy="213" rx="6" ry="9"/><ellipse cx="362" cy="278" rx="11" ry="8"/><ellipse cx="282" cy="294" rx="7" ry="5"/><ellipse cx="319" cy="312" rx="5" ry="7"/></g><path d="m308 261 13-9 13 11 10-6" stroke="#d2c8ac" strokeWidth="3" fill="none"/><path d="M319 171q-12-28 9-35 12 20-9 35Z" fill="#74ac83"/></g>:<g className="creature" style={{transformOrigin:'320px 337px'}}>
   <ellipse cx="265" cy="326" rx="28" ry="14" fill="#70af93"/><ellipse cx="373" cy="326" rx="28" ry="14" fill="#70af93"/>
   <path d="M273 166q-57-77-61-6-3 28 40 65M367 164q50-77 59-8 3 32-42 69" fill={bodyColor} stroke="#76b196" strokeWidth="3"/><path d="M260 173q-30-38-29-12 0 21 25 39M384 172q26-35 25-11 1 20-24 38" fill="#d0e8be"/>
   <path d="M320 148c-58 0-96 39-102 90-8 66 10 102 103 102 94 0 110-38 101-101-7-52-43-91-102-91Z" fill={`url(#${id}body)`} stroke="#65a88c" strokeWidth="3"/>
   <ellipse cx="320" cy="293" rx="52" ry="35" fill="#d9e7be" opacity=".68"/>
   <path d="M318 150q-36-10-27-38 31-1 27 38Z" fill="#73a765"/><path d="M319 150q-2-43 33-46 8 30-33 46Z" fill="#89b774"/><path d="M319 150q10-18 23-30" stroke="#659e61" strokeWidth="2" fill="none"/>
   {adult&&<g fill={variant==='Starlight'?'#fff4ba':variant==='Cloudheart'?'#ffe3e5':'#f8e498'}><path d="m322 178 5 9 10 1-7 7 1 10-9-5-9 5 2-10-8-7 11-1Z"/>{variant==='Wildflower'&&<><circle cx="290" cy="140" r="9"/><circle cx="349" cy="130" r="9"/></>}</g>}
   <g className="arms" stroke="#65a88c" strokeWidth="3" fill={bodyColor}><path d="M231 260q-31-12-24 14 3 17 24 7"/><path d="M411 260q32-12 25 14-3 17-25 7"/></g>
   <g className="face" stroke="#294f44" strokeWidth="5" strokeLinecap="round" fill="none">
    {sleep?<><path d="M269 230q11 9 22 0M351 230q11 9 22 0"/><ellipse cx="321" cy="261" rx="6" ry="5" fill="#527565" strokeWidth="2"/></>:<>
     {veryHappy?<><path d="M269 234q11-18 22 0M351 234q11-18 22 0"/></>:<g className="eyes"><ellipse cx="280" cy="231" rx="7" ry={mood==='Sleepy'?4:mood==='Surprised'?13:10} fill="#294f44" strokeWidth="0"/><ellipse cx="362" cy="231" rx="7" ry={mood==='Sleepy'?4:mood==='Surprised'?13:10} fill="#294f44" strokeWidth="0"/><circle cx="282" cy="227" r="2" fill="white" stroke="none"/><circle cx="364" cy="227" r="2" fill="white" stroke="none"/></g>}
     {mood==='Surprised'?<ellipse cx="321" cy="260" rx="5" ry="7" fill="#527565" strokeWidth="2"/>:sick?<path d="M310 263q5-5 10 0t10 0"/>:sad?<path d="M311 263q10-10 20 0"/>:veryHappy?<path d="M308 253q12 32 26 0Z" fill="#527565" strokeWidth="3"/>:<path d="M311 255q10 12 20 0" strokeWidth="4"/>}
     {mood==='Grumpy'&&<path d="m270 212 19 6m64 0 19-6" strokeWidth="3"/>}
    </>}
   </g>
   <ellipse cx="258" cy="254" rx="15" ry="8" fill="#e6a993" opacity=".65"/><ellipse cx="384" cy="254" rx="15" ry="8" fill="#e6a993" opacity=".65"/>
   {dirty&&<g fill="#8d9270" opacity=".55"><ellipse cx="258" cy="294" rx="12" ry="8"/><ellipse cx="391" cy="278" rx="9" ry="13"/><ellipse cx="342" cy="320" rx="10" ry="6"/></g>}
   {furnishing('accessory')&&<text x="355" y="176" fontSize="30" aria-hidden="true">{furnishing('accessory')?.icon}</text>}
   {sick&&<path d="M273 195q45-12 95 0" stroke="#e9eddf" strokeWidth="14" fill="none"/>}
   {(action==='cuddle'||mood==='Affectionate')&&<g className="float-hearts" fill="#d58191"><path d="M219 199c-22-15-5-34 7-19 14-15 27 5-7 19ZM410 148c-18-13-3-26 5-15 12-11 20 5-5 15Z"/></g>}
  </g>}
  {sleep&&<text x="403" y="178" fill="#f6f2cf" fontSize="25" fontWeight="700" className="sleep-z">z <tspan dy="-18" fontSize="18">z</tspan><tspan dy="-15" fontSize="13"> z</tspan></text>}
  {action==='clean'&&<g fill="#faffff" stroke="#badbd3" strokeWidth="2" opacity=".85" className="bubbles"><circle cx="245" cy="300" r="20"/><circle cx="411" cy="277" r="17"/><circle cx="257" cy="202" r="13"/><circle cx="375" cy="164" r="16"/></g>}
  {['feed','treat'].includes(action)&&<g className="bowl"><path d="M282 340h78q-3 25-39 25t-39-25" fill="#e6ad77" stroke="#bd8556" strokeWidth="2"/><ellipse cx="321" cy="340" rx="39" ry="8" fill="#f3d494"/><g fill="#b67957"><circle cx="303" cy="339" r="4"/><circle cx="322" cy="337" r="4"/><circle cx="340" cy="340" r="4"/></g></g>}
  {action==='drink'&&<g><path d="M299 333h42l-5 34h-32Z" fill="#b8e1df" stroke="#659f9d" strokeWidth="2"/><path d="M339 340q20-5 10 17h-10" stroke="#659f9d" strokeWidth="4" fill="none"/></g>}
  {['play','toy'].includes(action)&&<circle className="cloudball" cx="431" cy="337" r="19" fill="#f5d28d" stroke="#d9b25f" strokeWidth="3"/>}
 </svg>
}
