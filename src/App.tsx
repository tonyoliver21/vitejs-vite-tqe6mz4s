import { useState, useMemo, useEffect, useCallback } from "react";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from "recharts";

const SUPABASE_URL = "https://zezyfyyiijqvgplivrgl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplenlmeXlpaWpxdmdwbGl2cmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTUxODgsImV4cCI6MjA4ODk5MTE4OH0.mWZzylhc1b9AY_P4Zvrx2F5_P4mb1cmKOuXB2kqG_tc";
const hasSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

async function sbSelect(t){if(!hasSupabase)return{data:null};try{const r=await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`}});return{data:await r.json()};}catch{return{data:null};}}
async function sbUpsert(t,rows){if(!hasSupabase)return;try{await fetch(`${SUPABASE_URL}/rest/v1/${t}`,{method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify(Array.isArray(rows)?rows:[rows])});}catch{}}
async function sbPatch(t,f,d){if(!hasSupabase)return;try{await fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`,{method:"PATCH",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(d)});}catch{}}
async function sbDelete(t,f){if(!hasSupabase)return;try{await fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`,{method:"DELETE",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"}});}catch{}}

const MONTH_LIST=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_IDX=Object.fromEntries(MONTH_LIST.map((m,i)=>[m,i]));
const GO_LIVE_OPTIONS=["Off",...MONTH_LIST];
const HOURS_PER_DAY=8;
const WORKING_DAYS=21;

function isAutoLive(div,month,cfg){const gl=cfg[div]?.goLiveMonth;if(!gl||gl==="Off")return false;return MONTH_IDX[month]>=MONTH_IDX[gl];}
function qcAssetsPerDay(m){return Math.round((HOURS_PER_DAY*60)/m);}
function generateWeeks(){const out=[{label:"Available Now",value:"now"}];const cur=new Date("2026-01-05");const end=new Date("2026-12-28");while(cur<=end){out.push({label:`w/c ${cur.getDate()} ${cur.toLocaleString("en-GB",{month:"short"})} '26`,value:cur.toISOString().split("T")[0]});cur.setDate(cur.getDate()+7);}return out;}
const WEEK_OPTIONS=generateWeeks();

function availFrac(s,e,wd){let f=1;const t=new Date();if(s&&s!=="now"){const sd=new Date(s);if(sd>t)f=Math.min(f,Math.max(0,(wd-(sd-t)/86400000*(5/7))/wd));}if(e&&e!=="never"){const ed=new Date(e);if(ed>t)f=Math.min(f,Math.max(0,(ed-t)/86400000*(5/7)/wd));}return Math.max(0,Math.min(1,f));}
function startLbl(v){return(!v||v==="now")?"Now":(WEEK_OPTIONS.find(w=>w.value===v)?.label??v);}
function endLbl(v){return(!v||v==="never")?"—":(WEEK_OPTIONS.find(w=>w.value===v)?.label??v);}
function divWeights(d){if(d==="LDB")return{LDB:1,PPD:0,LLD:0};if(d==="PPD")return{LDB:0,PPD:1,LLD:0};if(d==="LLD")return{LDB:0,PPD:0,LLD:1};if(d==="ALL")return{LDB:1/3,PPD:1/3,LLD:1/3};return{LDB:0,PPD:0,LLD:0};}

// ── PURE FUNCTION — designer workload per month ───────────────────────────
function calcDesignerRow(fm,autoOn,cfg,mRate,qcMins,mPerProj,hPerMaster,supplyHrs){
  const lldLive=autoOn&&isAutoLive("LLD",fm.month,cfg);
  const ldbLive=autoOn&&isAutoLive("LDB",fm.month,cfg);
  const ppdLive=autoOn&&isAutoLive("PPD",fm.month,cfg);
  const anyAuto=lldLive||ldbLive||ppdLive;
  const lldAuto=lldLive?Math.round(fm.lld*cfg.LLD.simplePct):0;
  const ldbAuto=ldbLive?Math.round(fm.ldb*cfg.LDB.simplePct):0;
  const ppdAuto=ppdLive?Math.round(fm.ppd*cfg.PPD.simplePct):0;
  const totalAuto=lldAuto+ldbAuto+ppdAuto;
  const totalManual=fm.gt-totalAuto;
  const lldAutoProj=lldLive?Math.round(fm.lldProj*cfg.LLD.simplePct):0;
  const ldbAutoProj=ldbLive?Math.round(fm.ldbProj*cfg.LDB.simplePct):0;
  const ppdAutoProj=ppdLive?Math.round(fm.ppdProj*cfg.PPD.simplePct):0;
  const totalAutoProj=lldAutoProj+ldbAutoProj+ppdAutoProj;
  const masterH=Math.round(totalAutoProj*mPerProj*hPerMaster);
  const qcH=Math.round(totalAuto*qcMins/60);
  const manualH=Math.round((totalManual/mRate)*HOURS_PER_DAY);
  const demand=masterH+qcH+manualH;
  const util=supplyHrs>0?Math.round((demand/supplyHrs)*100):0;
  return{month:fm.month,totalAutoAssets:totalAuto,totalManualAssets:totalManual,autoProj:totalAutoProj,masterH,qcH,manualH,demand,supplyHrs,util,gap:supplyHrs-demand,anyAuto};
}

const FM=[
  {month:"Jan",ldb:3865,ppd:3097,lld:3481,gt:10443,weeksInMonth:4,monthlyForecast:648,permPMMonthly:620,flyPMMonthly:0,ldbProj:54,ppdProj:50,lldProj:58},
  {month:"Feb",ldb:1953,ppd:1695,lld:3306,gt:6954,weeksInMonth:4,monthlyForecast:340,permPMMonthly:570,flyPMMonthly:120,ldbProj:23,ppdProj:20,lldProj:42},
  {month:"Mar",ldb:2548,ppd:2357,lld:5348,gt:10253,weeksInMonth:5,monthlyForecast:1360,permPMMonthly:1360,flyPMMonthly:380,ldbProj:67,ppdProj:62,lldProj:143},
  {month:"Apr",ldb:2855,ppd:2742,lld:11230,gt:16827,weeksInMonth:4,monthlyForecast:1564,permPMMonthly:1647,flyPMMonthly:380,ldbProj:66,ppdProj:64,lldProj:261},
  {month:"May",ldb:2688,ppd:2796,lld:11492,gt:16976,weeksInMonth:4,monthlyForecast:1580,permPMMonthly:1988,flyPMMonthly:0,ldbProj:62,ppdProj:65,lldProj:268},
  {month:"Jun",ldb:4257,ppd:4267,lld:16748,gt:25272,weeksInMonth:5,monthlyForecast:2940,permPMMonthly:3038,flyPMMonthly:450,ldbProj:99,ppdProj:99,lldProj:390},
  {month:"Jul",ldb:4334,ppd:4237,lld:15737,gt:24308,weeksInMonth:4,monthlyForecast:2260,permPMMonthly:2430,flyPMMonthly:300,ldbProj:101,ppdProj:99,lldProj:365},
  {month:"Aug",ldb:724,ppd:777,lld:3223,gt:4724,weeksInMonth:4,monthlyForecast:560,permPMMonthly:2432,flyPMMonthly:0,ldbProj:21,ppdProj:23,lldProj:96},
  {month:"Sep",ldb:3326,ppd:3234,lld:11774,gt:18334,weeksInMonth:4,monthlyForecast:1680,permPMMonthly:2432,flyPMMonthly:0,ldbProj:76,ppdProj:74,lldProj:270},
  {month:"Oct",ldb:4034,ppd:3950,lld:14471,gt:22455,weeksInMonth:4,monthlyForecast:1920,permPMMonthly:2432,flyPMMonthly:0,ldbProj:86,ppdProj:84,lldProj:310},
  {month:"Nov",ldb:2993,ppd:2949,lld:10902,gt:16844,weeksInMonth:4,monthlyForecast:1520,permPMMonthly:2432,flyPMMonthly:0,ldbProj:67,ppdProj:66,lldProj:247},
  {month:"Dec",ldb:2285,ppd:2251,lld:8336,gt:12872,weeksInMonth:4,monthlyForecast:1160,permPMMonthly:2432,flyPMMonthly:0,ldbProj:51,ppdProj:50,lldProj:189},
];

// FM average per division — used for sense-check on Volume tab (Item 6)
const FM_AVG={
  LDB:Math.round(FM.reduce((s,m)=>s+m.ldb,0)/12),
  PPD:Math.round(FM.reduce((s,m)=>s+m.ppd,0)/12),
  LLD:Math.round(FM.reduce((s,m)=>s+m.lld,0)/12),
};

const PERIODS=[{label:"1 Month",months:1,workingDays:21},{label:"3 Months",months:3,workingDays:63},{label:"6 Months",months:6,workingDays:126},{label:"12 Months",months:12,workingDays:252}];
const DEFAULT_ROSTER=[
  {id:1,name:"Ruchika Saini",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:2,name:"Carly Josias",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:3,name:"Busi Nako",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:4,name:"Seatile Molotsane",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:5,name:"Abhishek Khare",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:6,name:"Sriza",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:7,name:"Linda",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:8,name:"Veena Yadav",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:9,name:"Deepanjan Sarkar",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:10,name:"Minal Dhumak",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:11,name:"Vaishali Singh",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:12,name:"Meghav Bhatt",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:13,name:"Priya Chaurasia",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:14,name:"Mansi Vasani",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:15,name:"Ankit Dobhal",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:16,name:"Robin Singh",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:19,name:"Keerthika Manogharan",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:20,name:"Mernoly Simba",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:21,name:"Eva Sachdeva",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:22,name:"Sahil Pujari",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:23,name:"Sarah",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:24,name:"Ankita Hazra",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:25,name:"Ashwini Patil",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:26,name:"Jahanvi Jain",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:27,name:"Jaimin",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:28,name:"Meghna Moza",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:29,name:"Lisa Peignon",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:30,name:"Nishtha Sharma",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:31,name:"Aniket Sawant",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:32,name:"Megha Sarin",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:33,name:"Anushka Sariya",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:40,name:"Medhavi Thakur",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:41,name:"Mahima Bhatia",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:42,name:"Mbuluelo Jili",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:43,name:"Thando Ndashe",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:44,name:"Raghav Agarwal",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:45,name:"Sanjana",role:"Project Manager",family:"PM / Delivery",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:60,name:"Sneha Pathak",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:61,name:"Akshat Bhatnagar",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:62,name:"Denvour Dcruz",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:63,name:"Cynthia",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:64,name:"Antony Varghese",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:65,name:"Deepshika Das",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:66,name:"Kushagra Tayal",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:67,name:"Aadesh Khale",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:68,name:"Monika Singh",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:69,name:"Lindsay",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:70,name:"Annu Singh",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:71,name:"Sreekumar V S",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:72,name:"Rupali Patel",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:73,name:"Liam Chetty",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:74,name:"Vedant Rode",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:75,name:"Ameya Thakur",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:76,name:"Vyomica Vasistha",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:77,name:"Rhea Seth",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:78,name:"Chinmay Sawant",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:79,name:"Bhakti Doshi",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:80,name:"Nate Mzobe",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:81,name:"Narelle",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:82,name:"Gabriella Bakjai",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:83,name:"Akshaya K",role:"Integrated Designer",family:"Creative / Design",type:"FTE",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:100,name:"Kah Yean",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:101,name:"Prajakta Giri",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:102,name:"Noah Lee",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:103,name:"Siva Kumar",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:104,name:"Balaji Kamraj",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:105,name:"Naveen Kumar",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:106,name:"Chinna Anto",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:107,name:"Michael Cheang",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:108,name:"Eric Ting",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LDB",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:109,name:"Zwivhuya Maise",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:110,name:"Jayce Davin",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:111,name:"Michelle Ng",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:112,name:"Leke Ho",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"LLD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:113,name:"Farid",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:114,name:"Rajni Goswami",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:115,name:"Akanksha Gupta",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:116,name:"Jyoti Negi",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:117,name:"Mohd Anas Siddiqui",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
  {id:118,name:"Diksha Panchal",role:"Integrated Designer",family:"Creative / Design",type:"Freelance",division:"PPD",status:"Active",removed:false,startDate:"now",endDate:"never"},
];

const DEFAULT_MIX=[
  {id:"cp-simple",LDB:2,PPD:2,LLD:3,assetsLDB:60,assetsPPD:50,assetsLLD:150,autoEligible:true},
  {id:"cp-adaptation",LDB:3,PPD:3,LLD:4,assetsLDB:40,assetsPPD:35,assetsLLD:50,autoEligible:false},
  {id:"cp-creation",LDB:1,PPD:1,LLD:1,assetsLDB:12,assetsPPD:10,assetsLLD:15,autoEligible:false},
  {id:"retailer",LDB:1,PPD:1,LLD:1,assetsLDB:30,assetsPPD:25,assetsLLD:40,autoEligible:true},
  {id:"gp-eventing",LDB:1,PPD:1,LLD:1,assetsLDB:20,assetsPPD:20,assetsLLD:25,autoEligible:false},
  {id:"gp-pdp",LDB:1,PPD:1,LLD:1,assetsLDB:15,assetsPPD:15,assetsLLD:20,autoEligible:false},
  {id:"lp-eventing",LDB:2,PPD:2,LLD:3,assetsLDB:35,assetsPPD:30,assetsLLD:45,autoEligible:false},
  {id:"lp-pdp",LDB:1,PPD:1,LLD:1,assetsLDB:20,assetsPPD:18,assetsLLD:25,autoEligible:false},
  {id:"urgent",LDB:1,PPD:1,LLD:2,assetsLDB:25,assetsPPD:20,assetsLLD:30,autoEligible:true},
];

const ROLE_OPTIONS=["Project Manager","Project Manager (FR)","Integrated Designer","Managing Director","Group Account Director","Account Director","Account Manager","Programme Lead","Delivery Lead","Project Director","Division Project Lead","Studio Operations Lead","Creative Lead","Automation & Tech Lead","GenAI Creative Director","Art Director","Copywriter","Motion Designer","Automation Designer/Editor","Director Global Client Ecom","Data Analyst/Engineer","Content Lead","Content Manager","Data Wrangler"];
const FAMILY_OPTIONS=["PM / Delivery","Creative / Design","Syndication / Data"];
const STATUS_OPTIONS=["Active","To Hire","On Hold"];
const DC={LDB:"#F59E0B",PPD:"#8B5CF6",LLD:"#3B82F6"};
const DIVS=["LDB","PPD","LLD"];
const ASSET_KEY={LDB:"assetsLDB",PPD:"assetsPPD",LLD:"assetsLLD"};
const PROD_DAYS={Simple:{"0-30":4,"30-50":7,"50-100":10,"100-200":18,"200-300":28,"300-500":42},Complex:{"0-30":5,"30-50":9,"50-100":13,"100-200":22,"200-300":34,"300-500":52},Creation:{"0-30":6,"30-50":11,"50-100":15,"100-200":26,"200-300":40,"300-500":62},Bespoke:{"0-30":10,"30-50":18,"50-100":25,"100-200":42,"200-300":65,"300-500":100}};
const PROD_REVS={Simple:1,Complex:2,Creation:4,Bespoke:4};
const OPERA_DAYS={"0-30":1,"30-50":1,"50-100":2,"100-200":3,"200-300":5,"300-500":8};
const SYND_DAYS={Simple:{"1-5 EANs":4,"5-10 EANs":6,"10-15 EANs":8},Mid:{"1-5 EANs":6,"5-10 EANs":9,"10-15 EANs":12},Complex:{"1-5 EANs":10,"5-10 EANs":15,"10-15 EANs":20}};
const ASSET_BANDS=["0-30","30-50","50-100","100-200","200-300","300-500"];
const PT_BASE=[
  {id:"cp-simple",label:"Country Pull – Simple",stages:[false,false,false,true,true,true,true,false],color:"#3B82F6"},
  {id:"cp-adaptation",label:"Country Pull – Adaptation",stages:[false,true,false,true,true,true,true,false],color:"#6366F1"},
  {id:"cp-creation",label:"Country Pull – Creation",stages:[true,true,false,true,true,true,true,false],color:"#8B5CF6"},
  {id:"retailer",label:"Country Retailer Request",stages:[false,false,false,false,false,false,false,true],color:"#10B981"},
  {id:"gp-eventing",label:"Global Push – Eventing",stages:[false,true,true,false,false,false,true,false],color:"#F59E0B"},
  {id:"gp-pdp",label:"Global Push – PDP",stages:[false,true,true,false,false,false,true,false],color:"#F97316"},
  {id:"lp-eventing",label:"Local Push – Eventing",stages:[false,false,false,true,true,true,true,true],color:"#EF4444"},
  {id:"lp-pdp",label:"Local Push – PDP",stages:[false,false,false,true,true,true,true,true],color:"#EC4899"},
  {id:"urgent",label:"Urgent Brief",stages:[false,false,false,false,false,true,true,false],color:"#14B8A6"},
];
const SK=["missingDMI","mastering","globalRollout","translation","production","operaUpload","syndication"];
const SK_IDX={missingDMI:[0],mastering:[1],globalRollout:[2],translation:[3,4],production:[5],operaUpload:[6],syndication:[7]};
const STAGE_META=[
  {key:"missingDMI",label:"Missing DMI Asset Creation",desc:"Creation complexity · market approval & revision"},
  {key:"mastering",label:"Mastering / Copy Creation",desc:"Mid complexity · re-master & copy extraction"},
  {key:"globalRollout",label:"Global Rollout Invitation",desc:"Country rollout scheduling"},
  {key:"translation",label:"Translation",desc:"Salsify PDP + Asset (concurrent)"},
  {key:"production",label:"Production",desc:"Complexity × asset volume · revision rounds"},
  {key:"operaUpload",label:"Opera Upload",desc:"Upload assets to Opera DAM"},
  {key:"syndication",label:"Syndication",desc:"Salsify enrichment · EAN count × complexity"},
];
const TABS=[{id:"capacity",label:"Capacity"},{id:"forecast",label:"Forecast"},{id:"automation",label:"Automation"},{id:"volume",label:"Volume"},{id:"sla",label:"SLA Calc"},{id:"team",label:"Team"},{id:"settings",label:"Settings"}];
const DEFAULT_AUTO={LLD:{simplePct:0.70,goLiveMonth:"Apr"},LDB:{simplePct:0.50,goLiveMonth:"Jun"},PPD:{simplePct:0.50,goLiveMonth:"Jun"}};

function stageActive(pt,key){return(SK_IDX[key]||[]).some(i=>pt.stages[i]);}
function getDefaultDays(ptId,cplx,aBand,eanBand,syndCplx,withCF){const pt=PT_BASE.find(p=>p.id===ptId);if(!pt)return{};return{missingDMI:pt.stages[0]?(6+(withCF?5:0)):0,mastering:pt.stages[1]?2:0,globalRollout:pt.stages[2]?2:0,translation:(pt.stages[3]||pt.stages[4])?(3+(withCF?6:0)):0,production:pt.stages[5]?((PROD_DAYS[cplx]?.[aBand]??9)+(withCF?(PROD_REVS[cplx]??2)*4:0)):0,operaUpload:pt.stages[6]?(OPERA_DAYS[aBand]??1):0,syndication:pt.stages[7]?(SYND_DAYS[syndCplx]?.[eanBand]??4):0};}
function getWeights(ptId){const w={"cp-simple":{pm:0.25,des:0.65},"cp-adaptation":{pm:0.28,des:0.62},"cp-creation":{pm:0.25,des:0.65},"retailer":{pm:0.20,des:0.15},"gp-eventing":{pm:0.35,des:0.45},"gp-pdp":{pm:0.35,des:0.45},"lp-eventing":{pm:0.28,des:0.52},"lp-pdp":{pm:0.28,des:0.52},"urgent":{pm:0.30,des:0.65}};return w[ptId]||{pm:0.28,des:0.62};}

// Item 10: _nextId derived from loaded roster — updated after Supabase load
let _nextId=400;

function Card({children,className="",padding="p-6"}){return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${padding} ${className}`}>{children}</div>;}
function Badge({children,color="gray",size="sm"}){const colors={gray:"bg-gray-100 text-gray-600",blue:"bg-blue-50 text-blue-700",green:"bg-green-50 text-green-700",amber:"bg-amber-50 text-amber-700",red:"bg-red-50 text-red-700",purple:"bg-purple-50 text-purple-700"};return <span className={`inline-flex items-center rounded-full font-medium ${size==="xs"?"px-2 py-0.5 text-xs":"px-2.5 py-1 text-xs"} ${colors[color]}`}>{children}</span>;}
function SectionHeader({number,title,subtitle,what,insight,color="#3B82F6"}){return(<div className="mb-6"><div className="flex items-start gap-4"><div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5" style={{background:color}}>{number}</div><div className="flex-1"><h2 className="text-lg font-bold text-gray-900 leading-tight">{title}</h2><p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>{(what||insight)&&(<div className="flex gap-3 mt-3 flex-wrap">{what&&<div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-600 max-w-sm"><span className="font-semibold text-gray-400 flex-shrink-0">What</span><span>{what}</span></div>}{insight&&<div className="flex items-start gap-2 rounded-xl px-3 py-2 text-xs max-w-sm" style={{background:color+"0D"}}><span className="font-semibold flex-shrink-0" style={{color}}>{insight.label}</span><span style={{color:color+"CC"}}>{insight.text}</span></div>}</div>)}</div></div></div>);}
function CardDescriptor({title,description,howToRead,accent="#6B7280"}){return(<div className="mb-5 pb-5 border-b border-gray-50"><p className="text-sm font-semibold text-gray-900">{title}</p><p className="text-xs text-gray-400 mt-1 leading-relaxed">{description}</p>{howToRead&&<p className="text-xs mt-2 font-medium" style={{color:accent}}>How to read: {howToRead}</p>}</div>);}
function Insight({type="info",children}){const s={info:{bg:"#EFF6FF",border:"#BFDBFE",text:"#1E40AF",icon:"ℹ"},warn:{bg:"#FFFBEB",border:"#FDE68A",text:"#92400E",icon:"⚠"},tip:{bg:"#F0FDF4",border:"#A7F3D0",text:"#065F46",icon:"→"}}[type];return <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mt-3 text-xs leading-relaxed" style={{background:s.bg,border:`1px solid ${s.border}`,color:s.text}}><span className="flex-shrink-0 font-bold">{s.icon}</span><span>{children}</span></div>;}
function SettingRow({label,description,value,min,max,step=1,onChange,display,accent="#3B82F6",derived}){return(<div className="flex items-start gap-6 py-5 border-b border-gray-50 last:border-0"><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900">{label}</p><p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>{derived&&<p className="text-xs font-semibold mt-1.5" style={{color:accent}}>→ {derived}</p>}</div><div className="w-56 flex-shrink-0"><span className="text-xl font-bold block mb-2" style={{color:accent}}>{display||value}</span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(+e.target.value)} className="w-full h-2 rounded-full cursor-pointer" style={{accentColor:accent}}/><div className="flex justify-between text-xs text-gray-300 mt-1"><span>{min}</span><span>{max}</span></div></div></div>);}
function QuickSlider({label,value,min,max,step=1,onChange,display,accent="#3B82F6",hint}){
  const[open,setOpen]=useState(false);
  const handleChange=useCallback(e=>{e.stopPropagation();onChange(+e.target.value);},[onChange]);
  return(<div className="relative"><button onClick={()=>setOpen(o=>!o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200" style={open?{background:"white",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",borderColor:"#E5E7EB"}:{}}><span className="text-gray-400">{label}</span><span className="font-bold" style={{color:accent}}>{display||value}</span><svg width="8" height="5" viewBox="0 0 8 5" fill="none" className={`transition-transform ${open?"rotate-180":""}`}><path d="M1 1l3 3 3-3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>{open&&(<><div className="fixed inset-0 z-40" onClick={()=>setOpen(false)}/><div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 w-64" onMouseDown={e=>e.stopPropagation()}><div className="flex justify-between items-baseline mb-3"><p className="text-xs font-semibold text-gray-700">{label}</p><span className="text-lg font-bold" style={{color:accent}}>{display||value}</span></div><input type="range" min={min} max={max} step={step} value={value} onChange={handleChange} className="w-full h-1.5 rounded-full cursor-pointer" style={{accentColor:accent}}/><div className="flex justify-between text-xs text-gray-400 mt-1"><span>{min}</span><span>{max}</span></div>{hint&&<p className="text-xs text-gray-400 mt-2 pt-2 border-t border-gray-100">{hint}</p>}</div></>)}</div>);}

export default function App(){
  const[roster,setRoster]=useState(DEFAULT_ROSTER);
  const[mix,setMix]=useState(DEFAULT_MIX);
  const[slaOv,setSlaOv]=useState({});
  const[utilPM,setUtilPM]=useState(82);
  const[utilDes,setUtilDes]=useState(82);
  const[manualRate,setManualRate]=useState(25);
  const[pmHoursPerWeek,setPmHoursPerWeek]=useState(40);
  const[hoursPerProject,setHoursPerProject]=useState(2.5);
  const[qcMinsPerAsset,setQcMinsPerAsset]=useState(2.4);
  const[mastersPerProj,setMastersPerProj]=useState(3);
  const[hrsPerMaster,setHrsPerMaster]=useState(3);
  const[periodIdx,setPeriodIdx]=useState(0);
  const[calcCplx,setCalcCplx]=useState("Complex");
  const[eanBand,setEanBand]=useState("1-5 EANs");
  const[syndCplx,setSyndCplx]=useState("Simple");
  const[clientDays,setClientDays]=useState(true);
  const[activeTab,setActiveTab]=useState("capacity");
  const[calcType,setCalcType]=useState("cp-adaptation");
  const[calcAssetBand,setCalcAssetBand]=useState("30-50");
  const[tmSearch,setTmSearch]=useState("");
  const[tmDiv,setTmDiv]=useState("All");
  const[tmType,setTmType]=useState("All");
  const[tmRole,setTmRole]=useState("All");
  const[showAdd,setShowAdd]=useState(false);
  const[newP,setNewP]=useState({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",startDate:"now",endDate:"never"});
  const[editId,setEditId]=useState(null);
  const[editData,setEditData]=useState({});
  const[dbStatus,setDbStatus]=useState(hasSupabase?"loading":"offline");
  const[saving,setSaving]=useState(false);
  const[prevMonths,setPrevMonths]=useState(1);
  const[forecastDiv,setForecastDiv]=useState("Total");
  const[autoScenario,setAutoScenario]=useState("with");
  const[actuals,setActuals]=useState(FM.map(m=>({month:m.month,actualAssets:0,actualLdb:0,actualPpd:0,actualLld:0})));
  const[autoEnabled,setAutoEnabled]=useState(true);
  const[autoConfig,setAutoConfig]=useState(DEFAULT_AUTO);

  const period=PERIODS[periodIdx];
  const WD=period.workingDays;
  const autoQCRate=useMemo(()=>qcAssetsPerDay(qcMinsPerAsset),[qcMinsPerAsset]);
  const projectsPerPM=useMemo(()=>Math.max(1,Math.floor(pmHoursPerWeek*(utilPM/100)/hoursPerProject)),[pmHoursPerWeek,hoursPerProject,utilPM]);
  const availHrsPM=+(pmHoursPerWeek*(utilPM/100)).toFixed(1);
  const totalMasterHrs=mastersPerProj*hrsPerMaster;

  const saveSettings=useCallback(async updates=>{if(!hasSupabase)return;await sbUpsert("settings",Object.entries(updates).map(([key,value])=>({key,value:String(value)})));},[]);

  const updateAuto=useCallback((div,field,val)=>{
    setAutoConfig(p=>({...p,[div]:{...p[div],[field]:val}}));
    saveSettings({[`auto${div}_${field}`]:String(val)});
  },[saveSettings]);

  // Item 11: autoEnabled toggle persists to Supabase
  const toggleAutoEnabled=useCallback(()=>{
    setAutoEnabled(v=>{
      const next=!v;
      saveSettings({autoEnabled:String(next)});
      return next;
    });
  },[saveSettings]);

  const PT=useMemo(()=>PT_BASE.map(pt=>({...pt,autoEligible:mix.find(x=>x.id===pt.id)?.autoEligible??false})),[mix]);

  useEffect(()=>{
    if(!hasSupabase){setDbStatus("offline");return;}
    (async()=>{
      setDbStatus("loading");
      try{
        const{data:rD}=await sbSelect("roster");
        if(rD&&rD.length){
          // Item 10: derive _nextId from max existing ID to prevent duplicate conflicts
          _nextId=Math.max(400,...rD.map(p=>p.id||0));
          setRoster(rD.map(p=>({...p,startDate:p.startDate||"now",endDate:p.endDate||"never"})));
        } else {
          await sbUpsert("roster",DEFAULT_ROSTER);
        }
        const{data:mD}=await sbSelect("project_mix");
        if(mD&&mD.length)setMix(mD.map(m=>({...m,assetsLDB:m.assetsLDB??40,assetsPPD:m.assetsPPD??40,assetsLLD:m.assetsLLD??50,autoEligible:m.autoEligible??false})));
        else await sbUpsert("project_mix",DEFAULT_MIX);
        const{data:sD}=await sbSelect("sla_overrides");
        if(sD&&sD.length){const ov={};sD.forEach(r=>{if(!ov[r.pt_id])ov[r.pt_id]={};ov[r.pt_id][r.stage_key]=r.days;});setSlaOv(ov);}
        const{data:stD}=await sbSelect("settings");
        const newAuto={...DEFAULT_AUTO};
        if(stD&&stD.length)stD.forEach(s=>{
          if(s.key==="utilPM")setUtilPM(+s.value);
          if(s.key==="utilDes")setUtilDes(+s.value);
          if(s.key==="manualRate")setManualRate(+s.value);
          if(s.key==="pmHoursPerWeek")setPmHoursPerWeek(+s.value);
          if(s.key==="hoursPerProject")setHoursPerProject(+s.value);
          if(s.key==="qcMinsPerAsset")setQcMinsPerAsset(+s.value);
          if(s.key==="mastersPerProj")setMastersPerProj(+s.value);
          if(s.key==="hrsPerMaster")setHrsPerMaster(+s.value);
          if(s.key==="periodIdx")setPeriodIdx(+s.value);
          if(s.key==="eanBand")setEanBand(s.value);
          if(s.key==="syndCplx")setSyndCplx(s.value);
          if(s.key==="clientDays")setClientDays(s.value==="true");
          // Item 11: load persisted autoEnabled
          if(s.key==="autoEnabled")setAutoEnabled(s.value==="true");
          // autoConfig
          if(s.key==="autoLLD_goLiveMonth")newAuto.LLD.goLiveMonth=s.value;
          if(s.key==="autoLLD_simplePct")newAuto.LLD.simplePct=+s.value;
          if(s.key==="autoLDB_goLiveMonth")newAuto.LDB.goLiveMonth=s.value;
          if(s.key==="autoLDB_simplePct")newAuto.LDB.simplePct=+s.value;
          if(s.key==="autoPPD_goLiveMonth")newAuto.PPD.goLiveMonth=s.value;
          if(s.key==="autoPPD_simplePct")newAuto.PPD.simplePct=+s.value;
        });
        setAutoConfig(newAuto);
        const{data:acD}=await sbSelect("actuals");
        if(acD&&acD.length){
          setActuals(FM.map(fm=>{
            const found=acD.find(a=>a.month===fm.month);
            return found?{month:fm.month,actualAssets:found.actualAssets||0,actualLdb:found.actualLdb||0,actualPpd:found.actualPpd||0,actualLld:found.actualLld||0}:{month:fm.month,actualAssets:0,actualLdb:0,actualPpd:0,actualLld:0};
          }));
        }
        setDbStatus("connected");
      }catch{setDbStatus("error");}
    })();
  },[]);

  useMemo(()=>{if(period.months!==prevMonths){const sc=period.months/prevMonths;setMix(prev=>{const u=prev.map(m=>({...m,LDB:Math.round(m.LDB*sc),PPD:Math.round(m.PPD*sc),LLD:Math.round(m.LLD*sc)}));if(hasSupabase)sbUpsert("project_mix",u);return u;});setPrevMonths(period.months);}},[period.months]);

  const updateMixCount=async(id,div,val)=>{const u=mix.map(m=>m.id===id?{...m,[div]:Math.max(0,val)}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  // Item 4: assets/brief now uses local state + onBlur for Supabase write
  const updateMixAssets=async(id,dk,val)=>{const u=mix.map(m=>m.id===id?{...m,[dk]:Math.max(1,val)}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const toggleAuto=async id=>{const u=mix.map(m=>m.id===id?{...m,autoEligible:!m.autoEligible}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const addPerson=async()=>{if(!newP.name.trim())return;const p={...newP,id:++_nextId,removed:false};setRoster(prev=>[...prev,p]);setShowAdd(false);setNewP({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",startDate:"now",endDate:"never"});if(hasSupabase){setSaving(true);await sbUpsert("roster",[p]);setSaving(false);}};
  const removePerson=async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:true}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:true});setSaving(false);}};
  const restorePerson=async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:false}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:false});setSaving(false);}};
  const startEdit=p=>{setEditId(p.id);setEditData({...p,startDate:p.startDate||"now",endDate:p.endDate||"never"});};
  const saveEdit=async()=>{setRoster(prev=>prev.map(p=>p.id===editId?{...p,...editData}:p));setEditId(null);if(hasSupabase){setSaving(true);await sbUpsert("roster",[editData]);setSaving(false);}};
  const setOv=async(ptId,key,val)=>{const d=Math.max(0,parseInt(String(val))||0);setSlaOv(prev=>({...prev,[ptId]:{...(prev[ptId]||{}),[key]:d}}));if(hasSupabase){setSaving(true);await sbUpsert("sla_overrides",[{pt_id:ptId,stage_key:key,days:d}]);setSaving(false);}};
  const resetOv=async id=>{setSlaOv(prev=>{const n={...prev};delete n[id];return n;});if(hasSupabase){setSaving(true);await sbDelete("sla_overrides",`pt_id=eq.${id}`);setSaving(false);}};
  const hasOv=id=>!!(slaOv[id]&&Object.keys(slaOv[id]).length);
  const updateActualFn=async(i,field,val)=>{
    const v=Math.max(0,parseInt(val)||0);
    setActuals(prev=>prev.map((a,idx)=>idx===i?{...a,[field]:v}:a));
    if(hasSupabase){const month=FM[i].month;setSaving(true);await sbUpsert("actuals",[{month,...actuals[i],[field]:v}]);setSaving(false);}
  };

  const capacityRoster=useMemo(()=>roster.filter(p=>!p.removed&&p.status==="Active"),[roster]);

  const desEfte=useMemo(()=>{
    const r={LDB:0,PPD:0,LLD:0};
    capacityRoster.filter(p=>p.role==="Integrated Designer").forEach(p=>{
      const f=availFrac(p.startDate,p.endDate,WD);const w=divWeights(p.division);
      r.LDB+=f*w.LDB;r.PPD+=f*w.PPD;r.LLD+=f*w.LLD;
    });
    return r;
  },[capacityRoster,WD]);

  const totalDesEfte=desEfte.LDB+desEfte.PPD+desEfte.LLD;

  const pmEfte=useMemo(()=>{
    const r={LDB:0,PPD:0,LLD:0};
    capacityRoster.filter(p=>p.role==="Project Manager").forEach(p=>{
      const f=availFrac(p.startDate,p.endDate,WD);const w=divWeights(p.division);
      r.LDB+=f*w.LDB;r.PPD+=f*w.PPD;r.LLD+=f*w.LLD;
    });
    return r;
  },[capacityRoster,WD]);

  const totalPMEfte=pmEfte.LDB+pmEfte.PPD+pmEfte.LLD;

  const poolsByDiv=useMemo(()=>{
    const res={};
    DIVS.forEach(div=>{
      const pmF=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="FTE"&&p.division===div);
      const pmFL=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="Freelance"&&p.division===div);
      const dF=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE"&&p.division===div);
      const dFL=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance"&&p.division===div);
      res[div]={pm:{fte:pmF.length,fl:pmFL.length,total:pmF.length+pmFL.length},des:{fte:dF.length,fl:dFL.length,total:dF.length+dFL.length}};
    });
    res["All"]={
      pm:{fte:DIVS.reduce((s,d)=>s+res[d].pm.fte,0),fl:DIVS.reduce((s,d)=>s+res[d].pm.fl,0),total:DIVS.reduce((s,d)=>s+res[d].pm.total,0)},
      des:{fte:DIVS.reduce((s,d)=>s+res[d].des.fte,0),fl:DIVS.reduce((s,d)=>s+res[d].des.fl,0),total:DIVS.reduce((s,d)=>s+res[d].des.total,0)},
    };
    return res;
  },[capacityRoster]);

  const ftePM=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="FTE").length;
  const flPM=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="Freelance").length;
  const fteDes=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE").length;
  const flDes=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance").length;

  const desSupplyHrsPerMonth=Math.round(totalDesEfte*WORKING_DAYS*HOURS_PER_DAY*(utilDes/100));
  const manualCap=Math.round(totalDesEfte*WORKING_DAYS*(utilDes/100)*manualRate);
  const totalTeamPMCap=Math.round(totalPMEfte*projectsPerPM*(utilPM/100));

  const getDivCap=useCallback((div,month,withAuto)=>{
    const efte=desEfte[div]||0;
    const live=withAuto&&isAutoLive(div,month,autoConfig)&&autoEnabled;
    const rate=live?Math.round(autoConfig[div].simplePct*autoQCRate+(1-autoConfig[div].simplePct)*manualRate):manualRate;
    return Math.round(efte*WORKING_DAYS*(utilDes/100)*rate);
  },[desEfte,autoConfig,autoEnabled,autoQCRate,manualRate,utilDes]);

  const getDivCapManual=useCallback((div)=>{
    return Math.round((desEfte[div]||0)*WORKING_DAYS*(utilDes/100)*manualRate);
  },[desEfte,utilDes,manualRate]);

  const monthlyCap=useMemo(()=>FM.map(fm=>{
    const ua=autoEnabled&&autoScenario==="with";
    const lld=getDivCap("LLD",fm.month,ua);
    const ldb=getDivCap("LDB",fm.month,ua);
    const ppd=getDivCap("PPD",fm.month,ua);
    const lldM=getDivCapManual("LLD");
    const ldbM=getDivCapManual("LDB");
    const ppdM=getDivCapManual("PPD");
    const lldLive=ua&&isAutoLive("LLD",fm.month,autoConfig);
    const ldbLive=ua&&isAutoLive("LDB",fm.month,autoConfig);
    const ppdLive=ua&&isAutoLive("PPD",fm.month,autoConfig);
    const anyAuto=lldLive||ldbLive||ppdLive;
    const manT=lldM+ldbM+ppdM;
    return{month:fm.month,total:lld+ldb+ppd,lld,ldb,ppd,manualTotal:manT,
      lldAuto:lldLive,ldbAuto:ldbLive,ppdAuto:ppdLive,anyAuto,
      preAutoCapacity:anyAuto?null:manT,postAutoCapacity:anyAuto?(lld+ldb+ppd):null};
  }),[desEfte,getDivCap,getDivCapManual,autoEnabled,autoScenario,autoConfig]);

  // Pure function call — no useMemo, no stale closure possible
  const designerWorkload=FM.map(fm=>calcDesignerRow(fm,autoEnabled,autoConfig,manualRate,qcMinsPerAsset,mastersPerProj,hrsPerMaster,desSupplyHrsPerMonth));

  const pmAnalysis=useMemo(()=>FM.map(fm=>{
    const teamCap=Math.round(totalPMEfte*projectsPerPM*(utilPM/100));
    const demand=fm.monthlyForecast;
    const oliverTotalCap=fm.permPMMonthly+fm.flyPMMonthly;
    return{...fm,teamCap,demand,oliverTotalCap,
      teamCoverPct:demand>0?Math.round((teamCap/demand)*100):0,
      oliverCoverPct:demand>0?Math.round((oliverTotalCap/demand)*100):0,
      teamGap:teamCap-demand,
      teamReqPerPM:totalPMEfte>0?(demand/totalPMEfte).toFixed(1):"—"};
  }),[totalPMEfte,projectsPerPM,utilPM]);

  const calcSlaMap=useMemo(()=>{const m={};PT_BASE.forEach(pt=>{const defs=getDefaultDays(pt.id,calcCplx,calcAssetBand,eanBand,syndCplx,clientDays);const bd={};let total=0;SK.forEach(k=>{const d=slaOv[pt.id]?.[k]!==undefined?slaOv[pt.id][k]:defs[k]??0;bd[k]=d;total+=d;});const w=getWeights(pt.id);m[pt.id]={total,breakdown:bd,defaults:defs,pmDays:Math.round(total*w.pm),desDays:Math.round(total*w.des)};});return m;},[calcCplx,calcAssetBand,eanBand,syndCplx,clientDays,slaOv]);

  const mixAnalysis=useMemo(()=>DIVS.map(div=>{let tProj=0,tAssets=0;mix.forEach(m=>{tProj+=m[div]||0;tAssets+=(m[ASSET_KEY[div]]||0)*(m[div]||0);});return{div,tProj,tAssets};}),[mix]);
  const combined=useMemo(()=>{const a={tProj:0,tAssets:0};mixAnalysis.forEach(d=>{a.tProj+=d.tProj;a.tAssets+=d.tAssets;});return a;},[mixAnalysis]);

  // Item 3 & 5: Suggested Simple% per division from Volume tab mix
  const suggestedSimplePct=useMemo(()=>{
    const result={};
    DIVS.forEach(div=>{
      const ak=ASSET_KEY[div];
      const total=mix.reduce((s,m)=>s+(m[ak]||0)*(m[div]||0),0);
      const autoTotal=mix.filter(m=>m.autoEligible).reduce((s,m)=>s+(m[ak]||0)*(m[div]||0),0);
      result[div]=total>0?Math.round((autoTotal/total)*100):0;
    });
    return result;
  },[mix]);

  // Item 6: FM sense-check per division
  const volumeSenseCheck=useMemo(()=>{
    const result={};
    DIVS.forEach(div=>{
      const volAssets=mixAnalysis.find(x=>x.div===div)?.tAssets||0;
      const fmAvg=FM_AVG[div];
      const pct=fmAvg>0?Math.round((volAssets/fmAvg)*100):0;
      result[div]={volAssets,fmAvg,pct,representative:pct>=50};
    });
    return result;
  },[mixAnalysis]);

  const forecastChartData=useMemo(()=>FM.map((fm,i)=>{
    const a=actuals[i],mc=monthlyCap[i];
    return{...fm,capacityTotal:mc?.total||0,capacityLdb:mc?.ldb||0,capacityPpd:mc?.ppd||0,capacityLld:mc?.lld||0,
      manualCapacity:mc?.manualTotal||0,lldAuto:mc?.lldAuto,ldbAuto:mc?.ldbAuto,ppdAuto:mc?.ppdAuto,
      anyAuto:mc?.anyAuto,preAutoCapacity:mc?.preAutoCapacity,postAutoCapacity:mc?.postAutoCapacity,
      actualAssets:a.actualAssets||null,actualLdb:a.actualLdb||null,actualPpd:a.actualPpd||null,actualLld:a.actualLld||null};
  }),[actuals,monthlyCap]);

  const activeForecastData=useMemo(()=>forecastChartData.map(d=>{
    if(forecastDiv==="LDB")return{...d,targetAssets:d.ldb,capacityLine:d.capacityLdb,actualAssets:d.actualLdb};
    if(forecastDiv==="PPD")return{...d,targetAssets:d.ppd,capacityLine:d.capacityPpd,actualAssets:d.actualPpd};
    if(forecastDiv==="LLD")return{...d,targetAssets:d.lld,capacityLine:d.capacityLld,actualAssets:d.actualLld};
    return{...d,targetAssets:d.gt,capacityLine:d.capacityTotal,actualAssets:d.actualAssets};
  }),[forecastChartData,forecastDiv]);

  // Item 1 & 7: Dynamic go-live month indices for tiles
  const lldGoLiveIdx=MONTH_IDX[autoConfig.LLD.goLiveMonth]??3;
  const ldbGoLiveIdx=MONTH_IDX[autoConfig.LDB.goLiveMonth]??5;
  const lldGoLivePrev=lldGoLiveIdx>0?MONTH_LIST[lldGoLiveIdx-1]:"Mar";
  const allLiveMonth=autoConfig.LDB.goLiveMonth!=="Off"?autoConfig.LDB.goLiveMonth:autoConfig.PPD.goLiveMonth!=="Off"?autoConfig.PPD.goLiveMonth:"Jun";
  const allLiveIdx=MONTH_IDX[allLiveMonth]??5;

  const calcPt=PT.find(p=>p.id===calcType);
  const calcSla=calcSlaMap[calcType];
  const tmFiltered=useMemo(()=>roster.filter(p=>{if(tmDiv!=="All"&&p.division!==tmDiv)return false;if(tmType!=="All"&&p.type!==tmType)return false;if(tmRole!=="All"&&p.role!==tmRole)return false;if(tmSearch&&!p.name.toLowerCase().includes(tmSearch.toLowerCase()))return false;return true;}),[roster,tmSearch,tmDiv,tmType,tmRole]);
  const pendingStarters=useMemo(()=>capacityRoster.filter(p=>p.startDate&&p.startDate!=="now"&&new Date(p.startDate)>new Date()).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)),[capacityRoster]);
  const pendingLeavers=useMemo(()=>capacityRoster.filter(p=>p.endDate&&p.endDate!=="never"&&new Date(p.endDate)>new Date()).sort((a,b)=>new Date(a.endDate)-new Date(b.endDate)),[capacityRoster]);
  const designerChartData=designerWorkload.map(d=>({month:d.month,"Manual Production":d.manualH,"Master Setup":d.masterH,"QC Review":d.qcH,Supply:d.supplyHrs}));

  const ragU=u=>u<=85?{color:"#22C55E",bg:"#F0FDF4",text:"#15803D"}:u<=100?{color:"#F59E0B",bg:"#FFFBEB",text:"#B45309"}:{color:"#EF4444",bg:"#FEF2F2",text:"#B91C1C"};
  const ragCov=p=>p>=100?{color:"#22C55E",bg:"#F0FDF4",text:"#15803D"}:p>=75?{color:"#F59E0B",bg:"#FFFBEB",text:"#B45309"}:{color:"#EF4444",bg:"#FEF2F2",text:"#B91C1C"};

  const TAB_META={
    capacity:{description:"Can the team handle the workload? Shows PM and designer capacity vs L'Oréal's project forecast, month by month."},
    forecast:{description:"Are we on track to deliver the asset volumes L'Oréal expects? Track forecast vs capacity vs actuals across all three divisions."},
    automation:{description:"How does automation change what we can deliver? Configure go-live dates and Simple% per division."},
    volume:{description:"Project mix planning reference. Use the auto-eligible flags and suggested Simple% to calibrate the Automation tab."},
    sla:{description:"How long will a specific project take? Estimate the end-to-end timeline for any brief by type, complexity and asset volume."},
    team:{description:"Who is on the team? Headcount and start/end dates here drive all capacity and supply calculations."},
    settings:{description:"Configure all model assumptions. Changes here update every calculation across the tool instantly."},
  };

  return(
    <div className="min-h-screen font-sans" style={{background:"#F8F8F8",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',sans-serif"}}>
      <div className="sticky top-0 z-40" style={{background:"rgba(248,248,248,0.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(0,0,0,0.06)"}}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{background:"#1D1D1F"}}>L</div>
              <div><p className="text-sm font-semibold text-gray-900 leading-none">eCommerce Capacity</p><p className="text-xs text-gray-400 leading-none mt-0.5">L'Oréal Programme · {period.label}</p></div>
            </div>
            <nav className="flex items-center gap-1">
              {TABS.map(t=>(<button key={t.id} onClick={()=>setActiveTab(t.id)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-all" style={activeTab===t.id?t.id==="settings"?{background:"#F3F4F6",color:"#374151"}:{background:"#1D1D1F",color:"white"}:t.id==="settings"?{color:"#9CA3AF"}:{color:"#6B7280"}}>{t.id==="settings"?"⚙ Settings":t.label}</button>))}
            </nav>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${dbStatus==="connected"?"text-green-700":"text-gray-500"}`} style={{background:dbStatus==="connected"?"#F0FDF4":"#F3F4F6"}}>
                <div className={`w-1.5 h-1.5 rounded-full ${dbStatus==="connected"?"bg-green-500":"bg-gray-400"}`}/>
                {dbStatus==="connected"?"Synced":dbStatus==="offline"?"Offline":"Error"}{saving&&<span className="opacity-60">·saving</span>}
              </div>
              {pendingStarters.length>0&&<Badge color="amber" size="xs">⏳ {pendingStarters.length}</Badge>}
              {pendingLeavers.length>0&&<Badge color="red" size="xs">🔴 {pendingLeavers.length}</Badge>}
            </div>
          </div>
        </div>
        {activeTab!=="settings"&&(
          <div style={{borderTop:"1px solid rgba(0,0,0,0.04)",background:"rgba(248,248,248,0.97)"}}>
            <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 mr-2">
                <span className="text-xs text-gray-400 mr-1">Period</span>
                {PERIODS.map((p,i)=>(<button key={p.label} onClick={()=>{setPeriodIdx(i);saveSettings({periodIdx:i});}} className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all" style={periodIdx===i?{background:"#1D1D1F",color:"white"}:{color:"#9CA3AF"}}>{p.label}</button>))}
              </div>
              <div className="w-px h-5 bg-gray-200 mx-1"/>
              <QuickSlider label="PM Util" value={utilPM} min={60} max={95} onChange={v=>{setUtilPM(v);saveSettings({utilPM:v});}} display={`${utilPM}%`} accent="#3B82F6" hint="Productive PM time %"/>
              <QuickSlider label="Des Util" value={utilDes} min={60} max={95} onChange={v=>{setUtilDes(v);saveSettings({utilDes:v});}} display={`${utilDes}%`} accent="#8B5CF6" hint={`${desSupplyHrsPerMonth.toLocaleString()}h/mo · ${totalDesEfte.toFixed(1)} efte`}/>
              <QuickSlider label="Hrs/project" value={hoursPerProject} min={0.5} max={8} step={0.5} onChange={v=>{setHoursPerProject(v);saveSettings({hoursPerProject:v});}} display={`${hoursPerProject}h`} accent="#3B82F6" hint={`→ ${projectsPerPM} concurrent/PM · ${totalTeamPMCap.toLocaleString()} cap/mo`}/>
              <QuickSlider label="Manual rate" value={manualRate} min={10} max={50} onChange={v=>{setManualRate(v);saveSettings({manualRate:v});}} display={`${manualRate}/day`} accent="#F97316" hint={`Manual cap: ${manualCap.toLocaleString()} assets/mo`}/>
              <QuickSlider label="QC time" value={qcMinsPerAsset} min={0.5} max={10} step={0.5} onChange={v=>{setQcMinsPerAsset(v);saveSettings({qcMinsPerAsset:v});}} display={`${qcMinsPerAsset}min`} accent="#8B5CF6" hint={`= ${autoQCRate} assets/day`}/>
              <QuickSlider label="Masters/proj" value={mastersPerProj} min={1} max={6} onChange={v=>{setMastersPerProj(v);saveSettings({mastersPerProj:v});}} display={`${mastersPerProj}×${hrsPerMaster}h=${totalMasterHrs}h`} accent="#8B5CF6" hint={`${totalMasterHrs}h per auto project`}/>
              <div className="w-px h-5 bg-gray-200 mx-1"/>
              <button onClick={()=>setActiveTab("settings")} className="text-xs font-medium text-gray-400 hover:text-gray-700 px-3 py-1 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all">All settings →</button>
              <div className="ml-auto flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">{projectsPerPM} proj/PM</span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700">{autoQCRate} QC/day</span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{background:autoEnabled?"#F0FDF4":"#F3F4F6",color:autoEnabled?"#15803D":"#6B7280"}}>{autoEnabled?"⚡ Auto ON":"Manual only"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {TAB_META[activeTab]&&(
          <div className="mb-8 pb-6 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{TABS.find(t=>t.id===activeTab)?.label}</p>
            <h1 className="text-2xl font-bold text-gray-900">{activeTab==="settings"?"Settings":TABS.find(t=>t.id===activeTab)?.label}</h1>
            <p className="text-base text-gray-500 mt-1.5">{TAB_META[activeTab].description}</p>
          </div>
        )}

        {/* ══ CAPACITY ══ */}
        {activeTab==="capacity"&&(
          <div className="space-y-10">
            <div>
              <SectionHeader number="A" title="Team Snapshot by Division" subtitle="How many PMs and Integrated Designers do we have in each division right now?" what="Headcount by division. Capacity uses availFrac-weighted efte — start/end dates reduce each person's contribution. ALL = ⅓ each division." insight={{label:"Keep current",text:"Changes on the Team tab recalculate all capacity instantly."}} color="#1D1D1F"/>
              <div className="grid grid-cols-3 gap-4">
                {DIVS.map(div=>{
                  const mc=monthlyCap[0];
                  const dc=div==="LDB"?mc?.ldb:div==="PPD"?mc?.ppd:mc?.lld;
                  return(
                    <Card key={div}>
                      <div className="flex items-center gap-2 mb-4"><div className="w-2.5 h-2.5 rounded-full" style={{background:DC[div]}}/><span className="text-sm font-semibold text-gray-900">{div}</span></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl" style={{background:DC[div]+"10"}}><p className="text-xs text-gray-500 mb-1">Project Managers</p><p className="text-2xl font-bold" style={{color:DC[div]}}>{poolsByDiv[div].pm.total}</p><p className="text-xs text-gray-400 mt-0.5">{poolsByDiv[div].pm.fte} FTE · {poolsByDiv[div].pm.fl} FL</p></div>
                        <div className="p-3 rounded-xl bg-gray-50"><p className="text-xs text-gray-500 mb-1">Designers</p><p className="text-2xl font-bold text-gray-900">{poolsByDiv[div].des.total}</p><p className="text-xs text-gray-400 mt-0.5">{poolsByDiv[div].des.fte} FTE · {poolsByDiv[div].des.fl} FL</p><p className="text-xs text-gray-400 mt-0.5">{desEfte[div].toFixed(1)} efte</p></div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100"><p className="text-xs text-gray-400">Monthly asset capacity (Jan, manual)</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{getDivCapManual(div).toLocaleString()} assets</p></div>
                    </Card>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionHeader number="B" title="Project Manager Capacity vs Forecast" subtitle="Can our PMs handle the number of projects L'Oréal is forecasting each month?" what={`Each PM carries ${projectsPerPM} concurrent projects (${availHrsPM}h ÷ ${hoursPerProject}h/project).`} insight={{label:"Red months",text:"demand exceeds PM capacity."}} color="#3B82F6"/>
              <Card padding="p-0">
                <div className="px-6 pt-5 pb-4 border-b border-gray-50">
                  <CardDescriptor title="Three lines compared month by month" description="Client Forecast = L'Oréal's expectation. Oliver PM Cap = what Oliver assumed. Our PM Cap = what your team can deliver." howToRead="Green ≥100% = covered. Amber ≥75% = near limit. Red <75% = shortfall." accent="#3B82F6"/>
                </div>
                <div className="px-6 pb-2">
                  <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                    <span>Month</span><span className="text-right text-blue-500">Client Forecast</span><span className="text-right text-green-600">Oliver PM Cap</span><span className="text-right text-violet-600">Our PM Cap</span><span className="text-right">Coverage</span>
                  </div>
                  <div className="divide-y divide-gray-50 -mx-6 px-6">
                    {pmAnalysis.map(row=>{const rg=ragCov(row.teamCoverPct);return(
                      <div key={row.month} className="py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors">
                        <div className="grid grid-cols-5 gap-4 items-center text-sm">
                          <span className="font-medium text-gray-900">{row.month}<span className="text-gray-400 font-normal ml-1.5 text-xs">{row.weeksInMonth}w</span></span>
                          <span className="text-right font-semibold text-blue-700">{row.demand.toLocaleString()}</span>
                          <span className="text-right text-green-700">{row.oliverTotalCap.toLocaleString()}<span className="ml-1.5 text-xs font-medium" style={{color:ragCov(row.oliverCoverPct).text}}>{row.oliverCoverPct}%</span></span>
                          <span className="text-right text-violet-700">{row.teamCap.toLocaleString()}<span className="text-xs text-gray-400 ml-1">({row.teamReqPerPM}/PM)</span></span>
                          <div className="flex items-center justify-end gap-2"><div className="w-16 bg-gray-100 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${Math.min(row.teamCoverPct,100)}%`,background:rg.color}}/></div><span className="text-xs font-semibold w-10 text-right" style={{color:rg.text}}>{row.teamCoverPct}%</span></div>
                        </div>
                        {row.teamGap<0&&<div className="mt-1.5 flex items-center gap-2"><span className="text-xs text-red-500">Shortfall: {Math.abs(row.teamGap).toLocaleString()} projects</span><span className="text-xs font-semibold text-red-600">· ~{Math.ceil(Math.abs(row.teamGap)/projectsPerPM)} more PMs needed</span></div>}
                      </div>
                    );})}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                  <p className="text-xs text-gray-400"><span className="font-medium text-gray-600">Formula:</span> {totalPMEfte.toFixed(1)} efte × {projectsPerPM} concurrent × {utilPM}% = {totalTeamPMCap.toLocaleString()} projects/month</p>
                </div>
              </Card>
            </div>
            <div>
              <SectionHeader number="C" title="Designer Capacity — Hours Model" subtitle="Are our designers over or under capacity each month?" what="FM forecast assets are the volume. Automation tab Simple% splits auto vs manual. Toggle automation on the Automation tab." insight={{label:"Supply",text:`${totalDesEfte.toFixed(1)} efte × 21d × 8h × ${utilDes}% = ${desSupplyHrsPerMonth.toLocaleString()}h/mo · ${autoEnabled?"⚡ Auto ON":"Manual only"}`}} color="#8B5CF6"/>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[{color:"#F97316",dot:"B",label:"Manual Production",desc:`Non-auto assets ÷ ${manualRate}/day × 8h.`},{color:"#6366F1",dot:"A1",label:"Master Setup",desc:`Auto projects × ${mastersPerProj} × ${hrsPerMaster}h. Zero when auto OFF.`},{color:"#22C55E",dot:"A2",label:"QC Review",desc:`Auto assets × ${qcMinsPerAsset}min ÷ 60. Zero when auto OFF.`}].map(s=>(<div key={s.label} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"><div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:s.color}}>{s.dot}</div><div><p className="text-sm font-semibold text-gray-900">{s.label}</p><p className="text-xs text-gray-400 mt-1">{s.desc}</p></div></div>))}
              </div>
              <Card className="mb-4">
                <CardDescriptor title="Designer hours — demand vs supply" description="Stacked bars = hours demanded. Dashed = supply. Bars above line = over capacity." howToRead="Orange = manual · Purple = master setup · Green = QC." accent="#8B5CF6"/>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={designerChartData} margin={{top:0,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:12,fill:"#9CA3AF"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"#9CA3AF"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                    <Tooltip contentStyle={{borderRadius:"12px",border:"none",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}} formatter={(v,n)=>[`${v.toLocaleString()}h`,n]}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:"12px"}}/>
                    <Bar dataKey="Manual Production" stackId="a" fill="#F97316"/>
                    <Bar dataKey="Master Setup" stackId="a" fill="#6366F1"/>
                    <Bar dataKey="QC Review" stackId="a" fill="#22C55E" radius={[3,3,0,0]}/>
                    <Line type="monotone" dataKey="Supply" name={`Supply (${desSupplyHrsPerMonth.toLocaleString()}h/mo)`} stroke="#1D1D1F" strokeWidth={2} dot={false} strokeDasharray="6 3"/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
              <Card padding="p-0">
                <div className="px-6 pt-5 pb-2">
                  <CardDescriptor title="Designer hours — monthly detail" description="Demand = Manual h + Master h + QC h. Util % = Demand ÷ Supply." howToRead="Green ≤85% = comfortable. Amber ≤100% = near limit. Red >100% = over capacity." accent="#8B5CF6"/>
                </div>
                <div className="px-6 pb-4">
                  <div className="grid gap-2 text-xs font-medium text-gray-400 uppercase tracking-wide mb-3" style={{gridTemplateColumns:"3rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 3.5rem"}}>
                    <span>Month</span><span className="text-right">FM Total</span><span className="text-right" style={{color:"#F97316"}}>Manual h</span><span className="text-right" style={{color:"#6366F1"}}>Auto proj</span><span className="text-right" style={{color:"#6366F1"}}>Master h</span><span className="text-right" style={{color:"#22C55E"}}>QC h</span><span className="text-right">Demand</span><span className="text-right text-gray-400">Supply</span><span className="text-right">Util</span>
                  </div>
                  <div className="divide-y divide-gray-50 -mx-6 px-6">
                    {designerWorkload.map((row,i)=>{
                      const fm=FM[i];const rg=ragU(row.util);
                      return(
                        <div key={row.month} className={`py-3 hover:bg-gray-50 -mx-6 px-6 transition-colors ${row.gap<0?"bg-red-50/30":""}`}>
                          <div className="grid gap-2 items-center text-sm" style={{gridTemplateColumns:"3rem 1fr 1fr 1fr 1fr 1fr 1fr 1fr 3.5rem"}}>
                            <span className="font-medium text-gray-900">{row.month}{row.anyAuto&&<span className="ml-0.5 text-green-400">⚡</span>}</span>
                            <span className="text-right text-gray-500">{fm.gt.toLocaleString()}</span>
                            <span className="text-right font-semibold text-orange-600">{row.manualH.toLocaleString()}h</span>
                            <span className="text-right text-indigo-600">{row.autoProj}</span>
                            <span className="text-right font-semibold text-indigo-700">{row.masterH.toLocaleString()}h</span>
                            <span className="text-right font-semibold text-green-700">{row.qcH.toLocaleString()}h</span>
                            <span className={`text-right font-bold ${row.demand>row.supplyHrs?"text-red-600":"text-gray-900"}`}>{row.demand.toLocaleString()}h</span>
                            <span className="text-right text-gray-400">{row.supplyHrs.toLocaleString()}h</span>
                            <div className="flex justify-end"><span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{color:rg.text,background:rg.bg}}>{row.util}%</span></div>
                          </div>
                          <div className="flex mt-1.5 rounded-full overflow-hidden h-1">
                            <div style={{width:`${Math.min(row.manualH/row.supplyHrs*100,100)}%`,background:"#F97316"}}/>
                            <div style={{width:`${Math.min(row.masterH/row.supplyHrs*100,100)}%`,background:"#6366F1"}}/>
                            <div style={{width:`${Math.min(row.qcH/row.supplyHrs*100,100)}%`,background:"#22C55E"}}/>
                            <div style={{flex:1,background:"#F3F4F6"}}/>
                          </div>
                          {row.gap<0&&<p className="text-xs mt-1.5 text-red-500">Over by {Math.abs(row.gap).toLocaleString()}h — ~{Math.ceil(Math.abs(row.gap)/(WORKING_DAYS*HOURS_PER_DAY*(utilDes/100)))} additional designer(s) needed</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                  <p className="text-xs text-gray-400"><span className="font-medium text-gray-600">Automation:</span> {autoEnabled?"Active ⚡":"OFF — all demand shown as manual"} · <span className="font-medium text-gray-600">Supply:</span> {totalDesEfte.toFixed(1)} efte × 21d × 8h × {utilDes}% = {desSupplyHrsPerMonth.toLocaleString()}h/mo</p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══ FORECAST ══ */}
        {activeTab==="forecast"&&(
          <div className="space-y-8">
            <div>
              <SectionHeader number="A" title="Capacity at a Glance" subtitle="Key output numbers — what can the team actually deliver each month?" color="#22C55E"/>
              {/* Item 1: Dynamic tile labels based on autoConfig go-live months */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  {label:"Manual capacity / month",value:manualCap.toLocaleString(),sub:`${totalDesEfte.toFixed(1)} efte × 21d × ${utilDes}% × ${manualRate}/day`,icon:"✏️"},
                  {
                    label:autoConfig.LLD.goLiveMonth==="Off"?"LLD automation off":`${autoConfig.LLD.goLiveMonth} capacity (LLD auto live)`,
                    value:(monthlyCap[lldGoLiveIdx]?.total||0).toLocaleString(),
                    sub:autoConfig.LLD.goLiveMonth==="Off"?"LLD go-live not configured":`LLD ${Math.round(autoConfig.LLD.simplePct*100)}% automated from ${autoConfig.LLD.goLiveMonth}`,
                    icon:"⚡"
                  },
                  {
                    label:autoConfig.LDB.goLiveMonth==="Off"&&autoConfig.PPD.goLiveMonth==="Off"?"All divisions manual":`${allLiveMonth} capacity (all divisions)`,
                    value:(monthlyCap[allLiveIdx]?.total||0).toLocaleString(),
                    sub:autoConfig.LDB.goLiveMonth==="Off"?"LDB/PPD go-live not configured":"LDB, PPD, LLD all automated",
                    icon:"🤖"
                  },
                  {label:"PM team capacity / month",value:totalTeamPMCap.toLocaleString(),sub:`${projectsPerPM} concurrent/PM`,icon:"👥"},
                ].map(s=>(<div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="flex items-start justify-between"><div><p className="text-xs font-medium text-gray-400 mb-1">{s.label}</p><p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p><p className="text-xs text-gray-400 mt-1.5">{s.sub}</p></div><span className="text-xl">{s.icon}</span></div></div>))}
              </div>
            </div>
            <div>
              <SectionHeader number="B" title="Asset Volume — Forecast vs Capacity" subtitle="Does our capacity line stay above L'Oréal's asset targets every month?" color="#22C55E"/>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">{[{l:"🤖 With Automation",v:"with"},{l:"Manual Only",v:"without"}].map(o=>(<button key={o.v} onClick={()=>setAutoScenario(o.v)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all" style={autoScenario===o.v?{background:"white",color:"#1D1D1F",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}:{color:"#6B7280"}}>{o.l}</button>))}</div>
                <span className="text-xs text-gray-400">Division:</span>
                {["Total","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setForecastDiv(d)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all" style={forecastDiv===d?{background:d==="Total"?"#1D1D1F":DC[d],color:"white"}:{background:"white",color:"#6B7280",border:"1px solid #E5E7EB"}}>{d}</button>))}
              </div>
              <Card>
                <p className="text-sm text-gray-400 mb-5">{autoScenario==="with"?`LLD auto ${autoConfig.LLD.goLiveMonth} · LDB/PPD auto ${autoConfig.LDB.goLiveMonth} · QC ${autoQCRate}/day`:`Manual baseline — ${manualRate} assets/designer/day`}</p>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={activeForecastData} margin={{top:0,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:12,fill:"#9CA3AF"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"#9CA3AF"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                    <Tooltip contentStyle={{borderRadius:"12px",border:"none",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}} formatter={(v,n)=>[typeof v==="number"?v.toLocaleString():v,n]}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:"12px"}}/>
                    <Bar dataKey="targetAssets" name="L'Oréal Asset Target" fill={forecastDiv==="LDB"?DC.LDB:forecastDiv==="PPD"?DC.PPD:forecastDiv==="LLD"?DC.LLD:"#6366F1"} radius={[4,4,0,0]} opacity={0.6}/>
                    {autoScenario==="with"&&<Line type="stepAfter" dataKey="manualCapacity" name={`Without automation (${manualRate}/day)`} stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="5 4" dot={false}/>}
                    <Line type="stepAfter" dataKey="capacityLine" name={autoScenario==="with"?"Capacity with Automation":"Manual Capacity"} stroke="#22C55E" strokeWidth={2.5} dot={false}/>
                    <Line type="monotone" dataKey="actualAssets" name="Actuals" stroke="#F59E0B" strokeWidth={2.5} dot={{r:4,fill:"#F59E0B"}} connectNulls={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <div>
              {/* Item 2: Scenario indicator on Coverage cards */}
              <SectionHeader number="C" title="Coverage by Division" subtitle="Within each division, how does monthly asset capacity compare to L'Oréal's targets?"
                what="Coverage % = division asset capacity ÷ FM target."
                insight={{label:autoEnabled&&autoScenario==="with"?"Showing: With Automation ⚡":"Showing: Manual Only",text:autoEnabled&&autoScenario==="with"?"Switch to 'Manual Only' above to see baseline coverage.":"Enable automation or switch to 'With Automation' above to see full capacity."}}
                color="#6366F1"/>
              <div className="grid grid-cols-3 gap-4">
                {[{div:"LDB",capKey:"capacityLdb"},{div:"PPD",capKey:"capacityPpd"},{div:"LLD",capKey:"capacityLld"}].map(({div,capKey})=>(
                  <Card key={div} padding="p-0">
                    <div className="px-5 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:DC[div]}}/><span className="text-sm font-semibold text-gray-900">{div}</span><span className="text-xs text-gray-400">{desEfte[div].toFixed(1)} efte</span></div>
                      <div className="flex items-center gap-2">
                        {/* Item 2: scenario badge on each card */}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{background:autoEnabled&&autoScenario==="with"?"#F0FDF4":"#F3F4F6",color:autoEnabled&&autoScenario==="with"?"#15803D":"#6B7280"}}>{autoEnabled&&autoScenario==="with"?`⚡ Auto ${autoConfig[div].goLiveMonth}`:"Manual"}</span>
                      </div>
                    </div>
                    <div className="px-5 py-3 space-y-2.5">
                      {forecastChartData.map(row=>{
                        const target=row[div.toLowerCase()],cap=row[capKey],pct=Math.round((cap/target)*100);
                        const isAuto=div==="LLD"?row.lldAuto:div==="LDB"?row.ldbAuto:row.ppdAuto;
                        const rg=ragCov(pct);
                        return(<div key={row.month}><div className="flex items-center justify-between text-xs mb-1"><span className="font-medium text-gray-700 flex items-center gap-1">{row.month}{isAuto&&<span className="text-green-400">⚡</span>}</span><span className="text-gray-400">{target.toLocaleString()}</span><span className="font-semibold" style={{color:rg.text}}>{pct}%</span></div><div className="w-full h-1.5 rounded-full bg-gray-100"><div className="h-1.5 rounded-full" style={{width:`${Math.min(pct,100)}%`,background:rg.color}}/></div></div>);
                      })}
                    </div>
                    <div className="px-5 py-2 border-t border-gray-50 bg-gray-50 rounded-b-2xl"><p className="text-xs text-gray-400">Manual: {getDivCapManual(div).toLocaleString()}/mo</p></div>
                  </Card>
                ))}
              </div>
            </div>
            <div>
              <SectionHeader number="D" title="Month-by-Month Actuals Tracker" subtitle="Enter real delivery numbers as each month closes." insight={{label:"Update monthly",text:"Evidence base for QBR and governance conversations."}} color="#F59E0B"/>
              <Card padding="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{tableLayout:"fixed"}}>
                    <colgroup><col style={{width:"48px"}}/><col style={{width:"70px"}}/><col style={{width:"62px"}}/><col style={{width:"58px"}}/><col style={{width:"58px"}}/><col style={{width:"58px"}}/><col style={{width:"58px"}}/><col style={{width:"58px"}}/><col style={{width:"58px"}}/><col style={{width:"30px"}}/></colgroup>
                    <thead>
                      <tr className="bg-gray-50 text-gray-400 uppercase text-xs tracking-wide"><th className="py-3 pl-6 text-left font-medium">Month</th><th className="py-3 text-center bg-blue-50 text-blue-500 font-medium" colSpan={2}>Total</th><th className="py-3 text-center font-medium" style={{background:DC.LDB+"15",color:DC.LDB}} colSpan={2}>LDB</th><th className="py-3 text-center font-medium" style={{background:DC.PPD+"15",color:DC.PPD}} colSpan={2}>PPD</th><th className="py-3 text-center font-medium" style={{background:DC.LLD+"15",color:DC.LLD}} colSpan={2}>LLD</th><th></th></tr>
                      <tr className="text-gray-400 text-xs border-b border-gray-100 bg-gray-50"><th className="py-2 pl-6"></th><th className="py-2 text-center font-medium">Target</th><th className="py-2 text-center text-amber-500 font-medium">← Actual</th><th className="py-2 text-center font-medium">Target</th><th className="py-2 text-center text-amber-500 font-medium">← Actual</th><th className="py-2 text-center font-medium">Target</th><th className="py-2 text-center text-amber-500 font-medium">← Actual</th><th className="py-2 text-center font-medium">Target</th><th className="py-2 text-center text-amber-500 font-medium">← Actual</th><th></th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {forecastChartData.map((row,i)=>{const a=actuals[i],cov=Math.round((row.capacityTotal/row.gt)*100),covRg=ragCov(cov),rd=cov>=100?"🟢":cov>=75?"🟡":"🔴",ap2=a.actualAssets?Math.round((a.actualAssets/row.gt)*100):null;return(
                        <tr key={row.month} className={`hover:bg-gray-50 ${row.anyAuto?"bg-green-50/30":""}`}>
                          <td className="py-3 pl-6 font-semibold text-gray-900">{row.month}{row.anyAuto&&<span className="ml-1 text-green-400">⚡</span>}</td>
                          <td className="py-3 text-center"><div className="font-semibold text-blue-700">{row.gt.toLocaleString()}</div><div className="text-xs font-medium mt-0.5" style={{color:covRg.text}}>{cov}% cap</div></td>
                          <td className="py-3 pr-1"><input type="number" min="0" value={a.actualAssets||""} onChange={e=>updateActualFn(i,"actualAssets",e.target.value)} placeholder="Enter…" className="w-full text-center text-xs font-semibold border border-amber-200 rounded-lg py-1.5 bg-amber-50 text-amber-700 focus:outline-none"/>{ap2!==null&&<div className="text-xs font-medium text-amber-600 text-center mt-0.5">{ap2}%</div>}</td>
                          <td className="py-3 text-center font-medium" style={{color:DC.LDB}}>{row.ldb.toLocaleString()}</td>
                          <td className="py-3 pr-1"><input type="number" min="0" value={a.actualLdb||""} onChange={e=>updateActualFn(i,"actualLdb",e.target.value)} placeholder="Enter…" className="w-full text-center text-xs font-semibold border border-amber-200 rounded-lg py-1.5 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-3 text-center font-medium" style={{color:DC.PPD}}>{row.ppd.toLocaleString()}</td>
                          <td className="py-3 pr-1"><input type="number" min="0" value={a.actualPpd||""} onChange={e=>updateActualFn(i,"actualPpd",e.target.value)} placeholder="Enter…" className="w-full text-center text-xs font-semibold border border-amber-200 rounded-lg py-1.5 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-3 text-center font-medium" style={{color:DC.LLD}}>{row.lld.toLocaleString()}</td>
                          <td className="py-3 pr-1"><input type="number" min="0" value={a.actualLld||""} onChange={e=>updateActualFn(i,"actualLld",e.target.value)} placeholder="Enter…" className="w-full text-center text-xs font-semibold border border-amber-200 rounded-lg py-1.5 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-3 text-center">{rd}</td>
                        </tr>
                      );})}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-xs">
                        <td className="py-3 pl-6">Full Year</td>
                        <td className="py-3 text-center text-blue-700 bg-blue-50">{FM.reduce((s,m)=>s+m.gt,0).toLocaleString()}</td>
                        <td className="py-3 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualAssets||0),0).toLocaleString()}</td>
                        <td className="py-3 text-center" style={{color:DC.LDB}}>{FM.reduce((s,m)=>s+m.ldb,0).toLocaleString()}</td>
                        <td className="py-3 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLdb||0),0).toLocaleString()}</td>
                        <td className="py-3 text-center" style={{color:DC.PPD}}>{FM.reduce((s,m)=>s+m.ppd,0).toLocaleString()}</td>
                        <td className="py-3 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualPpd||0),0).toLocaleString()}</td>
                        <td className="py-3 text-center" style={{color:DC.LLD}}>{FM.reduce((s,m)=>s+m.lld,0).toLocaleString()}</td>
                        <td className="py-3 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLld||0),0).toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══ AUTOMATION ══ */}
        {activeTab==="automation"&&(
          <div className="space-y-8">
            <div>
              <SectionHeader number="A" title="Automation Phases — Capacity by Period" subtitle="Capacity figures for each automation phase based on configured go-live months." color="#22C55E"/>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm text-gray-500">Automation</span>
                {/* Item 11: toggleAutoEnabled persists to Supabase */}
                <button onClick={toggleAutoEnabled} className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors" style={{background:autoEnabled?"#22C55E":"#E5E7EB"}}><span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${autoEnabled?"translate-x-6":"translate-x-1"}`}/></button>
                <span className="text-sm font-medium" style={{color:autoEnabled?"#16A34A":"#9CA3AF"}}>{autoEnabled?"Active — Capacity tab shows automation hours":"Disabled — Capacity tab shows manual-only baseline"}</span>
              </div>
              {/* Item 7: Dynamic phase tile labels */}
              <div className="grid grid-cols-3 gap-4">
                {(()=>{
                  const lldIdx=MONTH_IDX[autoConfig.LLD.goLiveMonth];
                  const lldOff=autoConfig.LLD.goLiveMonth==="Off";
                  const ldbOff=autoConfig.LDB.goLiveMonth==="Off";
                  const ppdOff=autoConfig.PPD.goLiveMonth==="Off";
                  const preEnd=!lldOff&&lldIdx>0?MONTH_LIST[lldIdx-1]:"(pre go-live)";
                  const phase2Label=lldOff?"No LLD go-live set":`${autoConfig.LLD.goLiveMonth} – ${!ldbOff?MONTH_LIST[Math.max(0,(MONTH_IDX[autoConfig.LDB.goLiveMonth]??6)-1)]:autoConfig.LLD.goLiveMonth}`;
                  const phase3Label=!ldbOff&&!ppdOff?`${allLiveMonth} – Dec`:"Not all divisions configured";
                  return[
                    {range:`Jan – ${!lldOff?preEnd:"Dec"}`,sub:"Manual only — all assets at manual rate",cap:monthlyCap[0]?.manualTotal||0,bg:"#F8F8F8",border:"#E5E7EB",textMain:"#1D1D1F",note:`${totalDesEfte.toFixed(1)} efte × 21d × ${manualRate}/day`},
                    {range:phase2Label,sub:lldOff?"LLD go-live not configured":`LLD automated · LDB & PPD manual`,cap:lldOff?0:(monthlyCap[lldGoLiveIdx]?.total||0),bg:"#ECFDF5",border:"#A7F3D0",textMain:"#065F46",note:lldOff?"Set LLD go-live on Division Configuration below":`LLD blended: ${Math.round(autoConfig.LLD.simplePct*autoQCRate+(1-autoConfig.LLD.simplePct)*manualRate)}/day`},
                    {range:phase3Label,sub:(!ldbOff&&!ppdOff)?"All three divisions on automation":"Configure go-live months below",cap:(!ldbOff&&!ppdOff)?(monthlyCap[allLiveIdx]?.total||0):0,bg:"#1D1D1F",border:"#1D1D1F",textMain:"white",note:(!ldbOff&&!ppdOff)?"Maximum capacity":""},
                  ].map(s=>(<div key={s.range} className="rounded-2xl border p-6" style={{background:s.bg,borderColor:s.border}}><p className="text-xs font-medium mb-1" style={{color:s.textMain,opacity:0.6}}>{s.range}</p><p className="text-sm font-semibold mb-3" style={{color:s.textMain,opacity:0.8}}>{s.sub}</p><p className="text-3xl font-bold mb-1" style={{color:s.textMain}}>{s.cap.toLocaleString()}</p><p className="text-sm mb-3" style={{color:s.textMain,opacity:0.6}}>assets / month</p><p className="text-xs font-medium" style={{color:s.textMain,opacity:0.45}}>{s.note}</p></div>));
                })()}
              </div>
            </div>
            <div>
              <SectionHeader number="B" title="QC Rate" subtitle="How fast can designers review auto-generated assets on canvas?" what={`${qcMinsPerAsset} min/asset = ${autoQCRate} assets/day — ${(autoQCRate/manualRate).toFixed(1)}× faster than manual.`} color="#8B5CF6"/>
              <Card><div className="flex items-center justify-between"><div><p className="text-sm text-gray-400">Set via the <strong>QC time</strong> slider above, or on the Settings tab.</p></div><div className="text-right p-5 rounded-2xl bg-gray-50 ml-6"><p className="text-5xl font-bold text-gray-900">{autoQCRate}</p><p className="text-sm text-gray-500 mt-1">assets / designer / day</p><p className="text-xs text-gray-400 mt-1">{qcMinsPerAsset} min per asset</p></div></div></Card>
            </div>
            <div>
              <SectionHeader number="C" title="Division Configuration" subtitle="Set the go-live month and Simple% for each division." what="Simple % is applied to FM forecast assets to determine how many are automated." color="#1D1D1F"/>
              <div className="grid grid-cols-3 gap-4">
                {DIVS.map(div=>{
                  const cfg=autoConfig[div];
                  const isOff=cfg.goLiveMonth==="Off";
                  // Item 8: show "Not active" when goLiveMonth is "Off"
                  const br=Math.round(cfg.simplePct*autoQCRate+(1-cfg.simplePct)*manualRate);
                  const uplift=Math.round((br/manualRate-1)*100);
                  return(
                    <Card key={div}>
                      <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{background:DC[div]}}/><span className="text-base font-semibold text-gray-900">{div}</span><span className="text-xs text-gray-400">{desEfte[div].toFixed(1)} efte</span></div>{!isOff&&<Badge color={div==="LDB"?"amber":div==="PPD"?"purple":"blue"} size="xs">Go-live: {cfg.goLiveMonth}</Badge>}{isOff&&<Badge color="gray" size="xs">Off</Badge>}</div>
                      <div className="mb-4"><p className="text-xs font-medium text-gray-500 mb-2">Go-Live Month</p><div className="flex gap-1 flex-wrap">{GO_LIVE_OPTIONS.map(m=>(<button key={m} onClick={()=>updateAuto(div,"goLiveMonth",m)} className="px-2 py-1 text-xs rounded-lg font-medium transition-all" style={cfg.goLiveMonth===m?{background:DC[div],color:"white"}:{background:"#F3F4F6",color:"#6B7280"}}>{m}</button>))}</div></div>
                      <div className="mb-2"><div className="flex justify-between mb-1.5"><p className="text-xs font-medium text-gray-500">Simple % — proportion of {div} FM assets automated</p><span className="text-sm font-bold" style={{color:DC[div]}}>{Math.round(cfg.simplePct*100)}%</span></div><input type="range" min={0} max={1} step={0.05} value={cfg.simplePct} onChange={e=>updateAuto(div,"simplePct",+e.target.value)} className="w-full h-1.5 rounded-full" style={{accentColor:DC[div]}}/></div>
                      <p className="text-xs text-gray-400 mb-4">Auto assets = fm.{div.toLowerCase()} × {Math.round(cfg.simplePct*100)}%. Auto proj = fm.{div.toLowerCase()}Proj × {Math.round(cfg.simplePct*100)}%.</p>
                      {/* Item 8: conditional display */}
                      {isOff?(
                        <div className="p-4 rounded-xl text-center bg-gray-50">
                          <p className="text-sm font-semibold text-gray-400">Not active</p>
                          <p className="text-xs text-gray-400 mt-1">Set a go-live month above to activate automation for {div}</p>
                        </div>
                      ):(
                        <div className="p-4 rounded-xl text-center" style={{background:DC[div]+"10"}}><p className="text-xs font-medium mb-1" style={{color:DC[div]}}>Blended rate when live</p><p className="text-2xl font-bold" style={{color:DC[div]}}>{br}</p><p className="text-xs text-gray-500 mt-0.5">assets / designer / day</p><p className="text-xs font-semibold text-green-600 mt-1.5">+{uplift}% vs manual</p></div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
            <div>
              <SectionHeader number="D" title="Project Type Eligibility — Reference Only" subtitle="These flags help inform what Simple% to set. They do not directly drive the hours model." color="#10B981"/>
              <Card>
                <Insight type="info">The designer hours model uses Simple% (Division Configuration above) applied to FM forecast assets. These toggles are a planning reference.</Insight>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {mix.map(m=>{const pt=PT_BASE.find(p=>p.id===m.id);if(!pt)return null;return(<div key={m.id} className="flex items-center justify-between p-3.5 rounded-xl border transition-all" style={m.autoEligible?{background:"#F0FDF4",borderColor:"#BBF7D0"}:{background:"#F9FAFB",borderColor:"#E5E7EB"}}><div className="flex items-center gap-2.5 flex-1 min-w-0"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:pt.color}}/><span className="text-xs font-medium text-gray-800 truncate">{pt.label}</span></div><div className="flex items-center gap-2 ml-2 flex-shrink-0"><span className={`text-xs font-medium ${m.autoEligible?"text-green-700":"text-gray-400"}`}>{m.autoEligible?"⚡ Auto":"Manual"}</span><button onClick={()=>toggleAuto(m.id)} className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors" style={{background:m.autoEligible?"#22C55E":"#D1D5DB"}}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${m.autoEligible?"translate-x-4":"translate-x-0.5"}`}/></button></div></div>);})}
                </div>
              </Card>
            </div>
            <div>
              <SectionHeader number="E" title="Capacity Step-Change Chart" subtitle="How automation transforms deliverable volume across 2026." color="#22C55E"/>
              <Card>
                {/* Item 9: show note when autoEnabled is false */}
                {!autoEnabled&&(
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                    <span className="text-amber-600 font-bold text-lg">⚠</span>
                    <div><p className="text-sm font-semibold text-amber-800">Automation is currently disabled</p><p className="text-xs text-amber-600 mt-0.5">The green automation line will not appear. Enable automation using the toggle above to see the capacity step-change.</p></div>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={forecastChartData} margin={{top:0,right:10,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false}/>
                    <XAxis dataKey="month" tick={{fontSize:12,fill:"#9CA3AF"}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:11,fill:"#9CA3AF"}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                    <Tooltip contentStyle={{borderRadius:"12px",border:"none",boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}} formatter={(v,n)=>[typeof v==="number"?v.toLocaleString():v,n]}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:"12px"}}/>
                    <Bar dataKey="gt" name="L'Oréal Asset Target" fill="#6366F1" opacity={0.5} radius={[4,4,0,0]}/>
                    <Line type="stepAfter" dataKey="preAutoCapacity" name={`Manual baseline (${manualRate}/day)`} stroke="#D1D5DB" strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false}/>
                    <Line type="stepAfter" dataKey="postAutoCapacity" name="Capacity with automation" stroke="#22C55E" strokeWidth={2.5} dot={false} connectNulls={false}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* ══ VOLUME ══ */}
        {activeTab==="volume"&&(
          <div className="space-y-8">
            <div>
              <SectionHeader number="A" title="Project Intake by Type & Division" subtitle="Expected project mix — planning reference and Simple% calibration tool."
                what="Adjust project counts and asset volumes. Use auto-eligible flags to calculate the suggested Simple% for each division. Apply directly to the Automation tab with one click."
                insight={{label:"How to use",text:"Mark project types as auto-eligible, then use the suggested Simple% cards below to calibrate the Automation tab."}} color="#6366F1"/>

              {/* Items 3, 5, 6: Suggested Simple% + FM sense-check per division */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {DIVS.map(div=>{
                  const da=mixAnalysis.find(x=>x.div===div)||{tProj:0,tAssets:0};
                  const suggested=suggestedSimplePct[div];
                  const current=Math.round(autoConfig[div].simplePct*100);
                  const diff=suggested-current;
                  const sc=volumeSenseCheck[div];
                  return(
                    <Card key={div}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full" style={{background:DC[div]}}/>
                        <span className="text-sm font-semibold text-gray-900">{div}</span>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">{da.tProj}</p>
                      <p className="text-sm text-gray-400 mt-1">projects · <span className="font-medium text-gray-600">{da.tAssets.toLocaleString()} assets</span></p>

                      {/* Item 3: Suggested Simple% */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-500">Suggested Simple%</p>
                          <span className="text-sm font-bold" style={{color:DC[div]}}>{suggested}%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                          <span>Currently set: {current}%</span>
                          {diff!==0&&<span style={{color:diff>0?"#22C55E":"#EF4444"}}>{diff>0?"+":""}{diff}%</span>}
                          {diff===0&&<span className="text-green-600">✓ Matched</span>}
                        </div>
                        {/* Item 5: Apply button */}
                        {diff!==0&&(
                          <button onClick={()=>updateAuto(div,"simplePct",suggested/100)} className="w-full py-1.5 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90" style={{background:DC[div]}}>
                            Apply {suggested}% to Automation →
                          </button>
                        )}
                        {diff===0&&<p className="text-xs text-green-600 text-center py-1">✓ Automation tab already matches</p>}
                      </div>

                      {/* Item 6: FM sense-check */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">vs FM avg ({sc.fmAvg.toLocaleString()}/mo)</span>
                          <span className="font-semibold" style={{color:sc.representative?"#15803D":"#B45309"}}>{sc.pct}%</span>
                        </div>
                        {!sc.representative&&(
                          <p className="text-xs text-amber-600 leading-relaxed">⚠ Volume mix represents only {sc.pct}% of FM forecast. Simple% calibration based on this mix may not reflect actual workload accurately.</p>
                        )}
                        {sc.representative&&(
                          <p className="text-xs text-green-600">✓ Volume mix is representative of FM forecast</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Card padding="p-0">
                <div className="px-6 pt-5 pb-4 border-b border-gray-50"><p className="text-sm font-semibold text-gray-900">Planning reference table</p><p className="text-xs text-gray-400 mt-1">Toggle ⚡ Auto on project types you expect to go through automation. This calculates the suggested Simple% shown on the cards above.</p></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-gray-50 text-gray-400 font-medium uppercase tracking-wide text-xs"><th className="px-6 py-3 text-left">Project Type</th><th className="px-3 py-3 text-center">Flag</th><th className="px-3 py-3 text-center" style={{color:DC.LDB}}>LDB proj</th><th className="px-3 py-3 text-center" style={{color:DC.LDB}}>assets/brief</th><th className="px-3 py-3 text-center" style={{color:DC.PPD}}>PPD proj</th><th className="px-3 py-3 text-center" style={{color:DC.PPD}}>assets/brief</th><th className="px-3 py-3 text-center" style={{color:DC.LLD}}>LLD proj</th><th className="px-3 py-3 text-center" style={{color:DC.LLD}}>assets/brief</th><th className="px-3 py-3 text-center">Total</th><th className="px-3 py-3 text-center">Assets</th></tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {mix.map(m=>{
                        const pt=PT_BASE.find(p=>p.id===m.id);
                        const rowTot=m.LDB+m.PPD+m.LLD;
                        const rowAssets=(m.assetsLDB*m.LDB)+(m.assetsPPD*m.PPD)+(m.assetsLLD*m.LLD);
                        return(
                          <tr key={m.id} className={`hover:bg-gray-50 transition-colors ${m.autoEligible?"bg-green-50/30":""}`}>
                            <td className="px-6 py-3"><div className="flex items-center gap-2.5"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:pt?.color||"#666"}}/><span className="font-medium text-gray-800">{pt?.label||m.id}</span></div></td>
                            <td className="px-3 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.autoEligible?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{m.autoEligible?"⚡ Auto":"Manual"}</span></td>
                            <td className="px-3 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"LDB",m.LDB-1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">−</button><span className="w-6 text-center font-bold" style={{color:DC.LDB}}>{m.LDB}</span><button onClick={()=>updateMixCount(m.id,"LDB",m.LDB+1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">+</button></div></td>
                            {/* Item 4: onBlur for Supabase write, local state for display */}
                            <td className="px-3 py-3 text-center"><input type="number" min="1" value={m.assetsLDB} onChange={e=>setMix(prev=>prev.map(x=>x.id===m.id?{...x,assetsLDB:Math.max(1,+e.target.value)}:x))} onBlur={e=>updateMixAssets(m.id,"assetsLDB",+e.target.value)} className="w-16 text-center text-xs font-semibold border rounded-lg px-1 py-1.5 focus:outline-none" style={{borderColor:DC.LDB+"40",color:DC.LDB}}/></td>
                            <td className="px-3 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"PPD",m.PPD-1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">−</button><span className="w-6 text-center font-bold" style={{color:DC.PPD}}>{m.PPD}</span><button onClick={()=>updateMixCount(m.id,"PPD",m.PPD+1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">+</button></div></td>
                            <td className="px-3 py-3 text-center"><input type="number" min="1" value={m.assetsPPD} onChange={e=>setMix(prev=>prev.map(x=>x.id===m.id?{...x,assetsPPD:Math.max(1,+e.target.value)}:x))} onBlur={e=>updateMixAssets(m.id,"assetsPPD",+e.target.value)} className="w-16 text-center text-xs font-semibold border rounded-lg px-1 py-1.5 focus:outline-none" style={{borderColor:DC.PPD+"40",color:DC.PPD}}/></td>
                            <td className="px-3 py-3 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"LLD",m.LLD-1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">−</button><span className="w-6 text-center font-bold" style={{color:DC.LLD}}>{m.LLD}</span><button onClick={()=>updateMixCount(m.id,"LLD",m.LLD+1)} className="w-5 h-5 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200">+</button></div></td>
                            <td className="px-3 py-3 text-center"><input type="number" min="1" value={m.assetsLLD} onChange={e=>setMix(prev=>prev.map(x=>x.id===m.id?{...x,assetsLLD:Math.max(1,+e.target.value)}:x))} onBlur={e=>updateMixAssets(m.id,"assetsLLD",+e.target.value)} className="w-16 text-center text-xs font-semibold border rounded-lg px-1 py-1.5 focus:outline-none" style={{borderColor:DC.LLD+"40",color:DC.LLD}}/></td>
                            <td className="px-3 py-3 text-center font-bold text-gray-900">{rowTot}</td>
                            <td className="px-6 py-3 text-center font-semibold text-gray-600">{rowAssets.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-xs">
                        <td colSpan={2} className="px-6 py-3">TOTAL</td>
                        <td className="px-3 py-3 text-center font-bold" style={{color:DC.LDB}}>{mix.reduce((s,m)=>s+m.LDB,0)}</td><td className="px-3 py-3 text-center text-gray-400">—</td>
                        <td className="px-3 py-3 text-center font-bold" style={{color:DC.PPD}}>{mix.reduce((s,m)=>s+m.PPD,0)}</td><td className="px-3 py-3 text-center text-gray-400">—</td>
                        <td className="px-3 py-3 text-center font-bold" style={{color:DC.LLD}}>{mix.reduce((s,m)=>s+m.LLD,0)}</td><td className="px-3 py-3 text-center text-gray-400">—</td>
                        <td className="px-3 py-3 text-center">{combined.tProj}</td>
                        <td className="px-6 py-3 text-center">{combined.tAssets.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ══ SLA CALC ══ */}
        {activeTab==="sla"&&(
          <div className="space-y-6">
            <SectionHeader number="" title="How Long Will This Project Take?" subtitle="Estimate the end-to-end SLA for any single brief." what="Each project type goes through a defined set of stages. This calculator applies the duration for each active stage and sums into a total SLA." insight={{label:"Customise it",text:"The ± controls override any stage duration. Overrides are saved per project type."}} color="#8B5CF6"/>
            <Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div><p className="text-xs font-medium text-gray-500 mb-2">Complexity</p><div className="flex gap-1.5 flex-wrap">{["Simple","Complex","Creation","Bespoke"].map(c=>(<button key={c} onClick={()=>setCalcCplx(c)} className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all" style={calcCplx===c?{background:"#8B5CF6",color:"white"}:{background:"#F3F4F6",color:"#6B7280"}}>{c}</button>))}</div></div>
                <div><p className="text-xs font-medium text-gray-500 mb-2">Asset Volume</p><div className="flex gap-1.5 flex-wrap">{ASSET_BANDS.map(b=>(<button key={b} onClick={()=>setCalcAssetBand(b)} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all" style={calcAssetBand===b?{background:"#1D1D1F",color:"white"}:{background:"#F3F4F6",color:"#6B7280"}}>{b}</button>))}</div></div>
                <div><p className="text-xs font-medium text-gray-500 mb-2">Client Feedback</p><div className="flex gap-1 p-1 bg-gray-100 rounded-xl">{[{l:"Realistic",v:true},{l:"Best Case",v:false}].map(o=>(<button key={String(o.v)} onClick={()=>setClientDays(o.v)} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all" style={clientDays===o.v?{background:"white",color:"#1D1D1F",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}:{color:"#6B7280"}}>{o.l}</button>))}</div></div>
                <div><p className="text-xs font-medium text-gray-500 mb-2">EAN Band</p><div className="flex gap-1.5">{["1-5 EANs","5-10 EANs","10-15 EANs"].map(b=>(<button key={b} onClick={()=>setEanBand(b)} className="px-2 py-1.5 rounded-xl text-xs font-semibold transition-all" style={eanBand===b?{background:"#0F172A",color:"white"}:{background:"#F3F4F6",color:"#6B7280"}}>{b.replace(" EANs","")}</button>))}</div></div>
              </div>
              <div><p className="text-xs font-medium text-gray-500 mb-2">Project Type</p><div className="flex gap-2 flex-wrap">{PT.map(pt=>(<button key={pt.id} onClick={()=>setCalcType(pt.id)} className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all" style={calcType===pt.id?{background:pt.color,color:"white",borderColor:pt.color}:{background:"white",color:"#6B7280",borderColor:"#E5E7EB"}}>{pt.label}{pt.autoEligible&&" ⚡"}{hasOv(pt.id)&&" ✎"}</button>))}</div></div>
            </Card>
            {calcPt&&calcSla&&(
              <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2">
                  <Card padding="p-0">
                    <div className="px-6 pt-5 pb-4 border-b border-gray-50 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded-full" style={{background:calcPt.color}}/><h2 className="text-base font-semibold text-gray-900">{calcPt.label}</h2></div>
                        <div className="flex items-center gap-2 flex-wrap"><Badge color="gray" size="xs">{calcCplx}</Badge><Badge color="gray" size="xs">{calcAssetBand} assets</Badge><Badge color="gray" size="xs">{clientDays?"Realistic":"Best case"}</Badge>{calcPt.autoEligible&&<Badge color="green" size="xs">⚡ Auto eligible</Badge>}{hasOv(calcType)&&<Badge color="amber" size="xs">✎ Custom durations</Badge>}</div>
                        <p className="text-xs text-gray-400 mt-2">Stages marked ✓ are active. Use ± to override any stage duration.</p>
                      </div>
                      {hasOv(calcType)&&<button onClick={()=>resetOv(calcType)} className="text-xs font-medium text-amber-600 hover:text-amber-700 flex-shrink-0 ml-4">↩ Reset</button>}
                    </div>
                    <div className="p-4 space-y-2">
                      {STAGE_META.map(sm=>{const active=stageActive(calcPt,sm.key),defVal=calcSla.defaults[sm.key]??0,curVal=calcSla.breakdown[sm.key]??0,isOv=slaOv[calcType]?.[sm.key]!==undefined;return(
                        <div key={sm.key} className={`flex items-center gap-4 p-3 rounded-xl ${active?"bg-gray-50":"opacity-30"}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active?"bg-gray-900 text-white":"bg-gray-200 text-gray-400"}`}>{active?"✓":"–"}</div>
                          <div className="flex-1 min-w-0"><p className={`text-sm font-medium ${active?"text-gray-900":"text-gray-400"}`}>{sm.label}</p><p className="text-xs text-gray-400 mt-0.5">{sm.desc}</p></div>
                          {active?(
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {isOv&&<span className="text-xs text-gray-300 line-through">{defVal}d</span>}
                              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
                                <button onClick={()=>setOv(calcType,sm.key,curVal-1)} className="w-5 h-5 rounded-lg bg-gray-100 font-bold flex items-center justify-center hover:bg-gray-200">−</button>
                                <input type="number" min="0" value={curVal} onChange={e=>setOv(calcType,sm.key,e.target.value)} className={`w-10 text-center font-bold text-sm border-none outline-none bg-transparent ${isOv?"text-amber-600":"text-gray-900"}`}/>
                                <button onClick={()=>setOv(calcType,sm.key,curVal+1)} className="w-5 h-5 rounded-lg bg-gray-100 font-bold flex items-center justify-center hover:bg-gray-200">+</button>
                              </div>
                              <span className="text-xs text-gray-400">days</span>
                              {isOv&&<button onClick={()=>setOv(calcType,sm.key,defVal)} className="text-xs text-amber-500">↩</button>}
                            </div>
                          ):<span className="text-xs text-gray-300 bg-gray-50 rounded-lg px-3 py-1.5 flex-shrink-0">Not required</span>}
                        </div>
                      );})}
                    </div>
                  </Card>
                </div>
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl text-center text-white" style={{background:"#1D1D1F"}}><p className="text-xs font-medium opacity-60 uppercase tracking-wide mb-2">Total SLA</p><p className="text-5xl font-bold">{calcSla.total}</p><p className="text-sm opacity-60 mt-1">calendar days</p></div>
                  <Card><p className="text-xs font-medium text-gray-500 mb-3">Resource effort estimate</p><div className="space-y-3"><div><div className="flex justify-between text-sm mb-1.5"><span className="text-gray-600">PM days</span><span className="font-bold text-gray-900">{calcSla.pmDays}d</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full bg-blue-500" style={{width:`${Math.min(calcSla.pmDays/calcSla.total*100,100)}%`}}/></div></div><div><div className="flex justify-between text-sm mb-1.5"><span className="text-gray-600">Designer days</span><span className="font-bold text-gray-900">{calcSla.desDays}d</span></div><div className="w-full h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 rounded-full bg-purple-500" style={{width:`${Math.min(calcSla.desDays/calcSla.total*100,100)}%`}}/></div></div></div></Card>
                  <Insight type="info">Use ± to adjust for specific client circumstances — faster approvals, no translation, or stages that don't apply.</Insight>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TEAM ══ */}
        {activeTab==="team"&&(
          <div className="space-y-6">
            <SectionHeader number="" title="Live Team Roster" subtitle="The single source of truth for who is on the team and when they're available." what="Every designer and PM contributes to capacity. Start/end dates reduce availFrac proportionally. division=ALL distributes ⅓ to each division." insight={{label:"Keep current",text:"Start/end dates affect both designer supply and PM capacity."}} color="#1D1D1F"/>
            {pendingStarters.length>0&&(<div className="p-5 rounded-2xl border border-amber-200 bg-amber-50"><p className="text-sm font-semibold text-amber-800 mb-1">⏳ {pendingStarters.length} Pending Starter{pendingStarters.length>1?"s":""}</p><div className="space-y-2 mt-2">{pendingStarters.map(p=>{const f=availFrac(p.startDate,p.endDate,WD);return(<div key={p.id} className="flex items-center gap-3 text-sm"><span className="font-medium text-amber-900">{p.name}</span><Badge color="gray" size="xs">{p.division} · {p.role}</Badge><span className="text-amber-600 text-xs">Starts {startLbl(p.startDate)}</span><span className="ml-auto text-xs font-semibold text-amber-600">{Math.round(f*100)}% this period</span></div>);})}</div></div>)}
            {pendingLeavers.length>0&&(<div className="p-5 rounded-2xl border border-red-200 bg-red-50"><p className="text-sm font-semibold text-red-800 mb-1">🔴 {pendingLeavers.length} Planned Leaver{pendingLeavers.length>1?"s":""}</p><div className="space-y-2 mt-2">{pendingLeavers.map(p=>{return(<div key={p.id} className="flex items-center gap-3 text-sm"><span className="font-medium text-red-900">{p.name}</span><Badge color="gray" size="xs">{p.division} · {p.role}</Badge><span className="text-red-600 text-xs">Exits {endLbl(p.endDate)}</span></div>);})}</div></div>)}
            <div className="grid grid-cols-4 gap-4">
              <Card><p className="text-xs font-medium text-gray-400 mb-2">Total Active</p><p className="text-3xl font-bold text-gray-900">{capacityRoster.length}</p><p className="text-xs text-gray-400 mt-1">{ftePM+fteDes} FTE · {flPM+flDes} Freelance</p><p className="text-xs text-gray-400 mt-0.5">{totalDesEfte.toFixed(1)} des efte · {totalPMEfte.toFixed(1)} PM efte</p></Card>
              {DIVS.map(div=>{return(<Card key={div}><div className="flex items-center gap-1.5 mb-3"><div className="w-2 h-2 rounded-full" style={{background:DC[div]}}/><span className="text-xs font-semibold text-gray-700">{div}</span></div><div className="grid grid-cols-2 gap-2"><div><p className="text-xs text-gray-400">PMs</p><p className="text-xl font-bold text-gray-900">{poolsByDiv[div].pm.total}</p><p className="text-xs text-gray-400">{poolsByDiv[div].pm.fte}F · {poolsByDiv[div].pm.fl}FL</p></div><div><p className="text-xs text-gray-400">Designers</p><p className="text-xl font-bold text-gray-900">{poolsByDiv[div].des.total}</p><p className="text-xs text-gray-400">{poolsByDiv[div].des.fte}F · {poolsByDiv[div].des.fl}FL</p><p className="text-xs text-gray-400">{desEfte[div].toFixed(1)} efte</p></div></div></Card>);})}
            </div>
            {showAdd&&(
              <Card>
                <div className="flex items-center justify-between mb-2"><h2 className="text-base font-semibold text-gray-900">Add New Team Member</h2><button onClick={()=>setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button></div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-3"><label className="text-xs font-medium text-gray-500 block mb-1.5">Full Name</label><input value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))} placeholder="e.g. Jane Smith" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"/></div>
                  {[{label:"Role",val:newP.role,set:v=>setNewP(p=>({...p,role:v})),opts:ROLE_OPTIONS},{label:"Function",val:newP.family,set:v=>setNewP(p=>({...p,family:v})),opts:FAMILY_OPTIONS},{label:"Contract",val:newP.type,set:v=>setNewP(p=>({...p,type:v})),opts:["FTE","Freelance"]},{label:"Division",val:newP.division,set:v=>setNewP(p=>({...p,division:v})),opts:["LDB","PPD","LLD","ALL"]},{label:"Status",val:newP.status,set:v=>setNewP(p=>({...p,status:v})),opts:STATUS_OPTIONS}].map(f=>(<div key={f.label}><label className="text-xs font-medium text-gray-500 block mb-1.5">{f.label}{f.label==="Division"&&<span className="text-gray-400 ml-1">(ALL = ⅓ each)</span>}</label><select value={f.val} onChange={e=>f.set(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">{f.opts.map(o=><option key={o}>{o}</option>)}</select></div>))}
                  <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Start Date</label><select value={newP.startDate} onChange={e=>setNewP(p=>({...p,startDate:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">{WEEK_OPTIONS.map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select></div>
                  <div><label className="text-xs font-medium text-gray-500 block mb-1.5">Exit Date (if known)</label><select value={newP.endDate} onChange={e=>setNewP(p=>({...p,endDate:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none"><option value="never">No planned exit</option>{WEEK_OPTIONS.filter(w=>w.value!=="now").map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select></div>
                </div>
                <div className="flex gap-2"><button onClick={addPerson} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white" style={{background:"#1D1D1F"}}>Add to Roster</button><button onClick={()=>setShowAdd(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100">Cancel</button></div>
              </Card>
            )}
            <div className="flex flex-wrap gap-2 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <input value={tmSearch} onChange={e=>setTmSearch(e.target.value)} placeholder="Search by name…" className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-48 focus:outline-none"/>
                {[{val:tmDiv,set:setTmDiv,opts:["All","LDB","PPD","LLD"]},{val:tmType,set:setTmType,opts:["All","FTE","Freelance"]},{val:tmRole,set:setTmRole,opts:["All","Project Manager","Integrated Designer"]}].map((s,i)=>(<select key={i} value={s.val} onChange={e=>s.set(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none">{s.opts.map(o=><option key={o}>{o}</option>)}</select>))}
                <span className="text-xs text-gray-400">{tmFiltered.length} shown</span>
              </div>
              <button onClick={()=>setShowAdd(true)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{background:"#1D1D1F"}}>+ Add Person</button>
            </div>
            <Card padding="p-0">
              <div className="px-6 py-3 border-b border-gray-50 bg-gray-50"><p className="text-xs text-gray-400"><span className="font-medium text-gray-600">Cap %</span> = availFrac for this planning period. Applies to both designers (supply) and PMs (capacity).</p></div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-400 font-medium uppercase tracking-wide text-xs border-b border-gray-100"><th className="px-6 py-3 text-left">Name</th><th className="px-4 py-3 text-left">Role</th><th className="px-4 py-3 text-center">Type</th><th className="px-4 py-3 text-center">Division</th><th className="px-4 py-3 text-center">Starts</th><th className="px-4 py-3 text-center">Exits</th><th className="px-4 py-3 text-center">Cap %</th><th className="px-4 py-3 text-center">Status</th><th className="px-6 py-3 text-center">Actions</th></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {tmFiltered.map(p=>{
                      const removed=p.removed,isEd=editId===p.id,frac=availFrac(p.startDate,p.endDate,WD);
                      const isPending=p.startDate&&p.startDate!=="now"&&new Date(p.startDate)>new Date();
                      const isLeaving=p.endDate&&p.endDate!=="never"&&new Date(p.endDate)>new Date();
                      return(
                        <tr key={p.id} className={`hover:bg-gray-50/50 transition-colors ${removed?"opacity-40 bg-red-50/50":isLeaving?"bg-red-50/30":isPending?"bg-amber-50/40":isEd?"bg-blue-50/30":""}`}>
                          <td className="px-6 py-3"><span className={`font-medium ${removed?"line-through text-gray-400":"text-gray-900"}`}>{isEd?<input value={editData.name||""} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} className="border border-blue-300 rounded-lg px-2 py-1 text-sm w-full"/>:p.name}</span></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{isEd?<select value={editData.role||""} onChange={e=>setEditData(d=>({...d,role:e.target.value}))} className="border border-blue-300 rounded-lg px-1 py-1 text-xs w-full bg-white">{ROLE_OPTIONS.map(r=><option key={r}>{r}</option>)}</select>:p.role}</td>
                          <td className="px-4 py-3 text-center">{isEd?<select value={editData.type||""} onChange={e=>setEditData(d=>({...d,type:e.target.value}))} className="border border-blue-300 rounded-lg px-1 py-1 text-xs bg-white"><option>FTE</option><option>Freelance</option></select>:<Badge color={p.type==="FTE"?"blue":"purple"} size="xs">{p.type}</Badge>}</td>
                          <td className="px-4 py-3 text-center">{isEd?<select value={editData.division||""} onChange={e=>setEditData(d=>({...d,division:e.target.value}))} className="border border-blue-300 rounded-lg px-1 py-1 text-xs bg-white">{["LDB","PPD","LLD","ALL"].map(d=><option key={d}>{d}</option>)}</select>:<span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full" style={{background:(p.division==="ALL"?"#6b7280":(DC[p.division]||"#6b7280"))+"15",color:p.division==="ALL"?"#6b7280":(DC[p.division]||"#6b7280")}}>{p.division}{p.division==="ALL"&&<span className="ml-0.5 opacity-60">⅓</span>}</span>}</td>
                          <td className="px-4 py-3 text-center">{isEd?<select value={editData.startDate||"now"} onChange={e=>setEditData(d=>({...d,startDate:e.target.value}))} className="border border-blue-300 rounded-lg px-1 py-1 text-xs bg-white w-28">{WEEK_OPTIONS.map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select>:<span className={`text-xs font-medium px-2 py-1 rounded-lg ${isPending?"bg-amber-100 text-amber-700":"text-gray-400"}`}>{isPending?"⏳ ":""}{startLbl(p.startDate)}</span>}</td>
                          <td className="px-4 py-3 text-center">{isEd?<select value={editData.endDate||"never"} onChange={e=>setEditData(d=>({...d,endDate:e.target.value}))} className="border border-red-300 rounded-lg px-1 py-1 text-xs bg-white w-28"><option value="never">No exit</option>{WEEK_OPTIONS.filter(w=>w.value!=="now").map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select>:<span className={`text-xs font-medium px-2 py-1 rounded-lg ${isLeaving?"bg-red-100 text-red-700":"text-gray-300"}`}>{isLeaving?"🔴 ":""}{endLbl(p.endDate)}</span>}</td>
                          <td className="px-4 py-3 text-center"><span className={`text-xs font-bold ${frac>=0.9?"text-green-600":frac>=0.5?"text-amber-600":"text-red-500"}`}>{Math.round(frac*100)}%</span></td>
                          <td className="px-4 py-3 text-center">{isEd?<select value={editData.status||""} onChange={e=>setEditData(d=>({...d,status:e.target.value}))} className="border border-blue-300 rounded-lg px-1 py-1 text-xs bg-white">{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>:<Badge color={removed?"red":p.status==="To Hire"?"amber":"green"} size="xs">{removed?"Removed":p.status}</Badge>}</td>
                          <td className="px-6 py-3"><div className="flex items-center justify-center gap-1.5">
                            {!removed&&!isEd&&<><button onClick={()=>startEdit(p)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">Edit</button><button onClick={()=>removePerson(p.id)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100">Remove</button></>}
                            {isEd&&<><button onClick={saveEdit} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white">Save</button><button onClick={()=>setEditId(null)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600">Cancel</button></>}
                            {removed&&<button onClick={()=>restorePerson(p.id)} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-600">Restore</button>}
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
            {roster.filter(p=>p.removed).length>0&&(<Card><p className="text-sm font-semibold text-gray-700 mb-1">Removed ({roster.filter(p=>p.removed).length})</p><div className="flex flex-wrap gap-2 mt-3">{roster.filter(p=>p.removed).map(p=>(<div key={p.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2"><span className="text-xs font-medium text-gray-600">{p.name}</span><span className="text-xs text-gray-400">{p.division}</span><button onClick={()=>restorePerson(p.id)} className="text-xs text-green-600 font-semibold">↩ Restore</button></div>))}</div></Card>)}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {activeTab==="settings"&&(
          <div className="space-y-8">
            <div className="grid grid-cols-4 gap-4">
              {[
                {label:"Concurrent projects / PM",value:projectsPerPM,sub:`${availHrsPM}h ÷ ${hoursPerProject}h/project`,color:"#3B82F6"},
                {label:"Team PM capacity / month",value:totalTeamPMCap.toLocaleString(),sub:`${totalPMEfte.toFixed(1)} efte × ${projectsPerPM} × ${utilPM}%`,color:"#3B82F6"},
                {label:"QC assets / designer / day",value:autoQCRate,sub:`${qcMinsPerAsset} min per asset`,color:"#8B5CF6"},
                {label:"Designer supply / month",value:`${desSupplyHrsPerMonth.toLocaleString()}h`,sub:`${totalDesEfte.toFixed(1)} efte × 21d × 8h × ${utilDes}%`,color:"#8B5CF6"},
              ].map(s=>(<div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><p className="text-xs font-medium text-gray-400 mb-2">{s.label}</p><p className="text-2xl font-bold" style={{color:s.color}}>{s.value}</p><p className="text-xs text-gray-400 mt-1.5">{s.sub}</p></div>))}
            </div>
            <Insight type="tip">All changes take effect immediately across every tab.</Insight>
            <Card>
              <div className="pb-5 mb-5 border-b border-gray-50"><p className="text-base font-bold text-gray-900">Planning Period</p></div>
              <div className="grid grid-cols-4 gap-3">{PERIODS.map((p,i)=>(<button key={p.label} onClick={()=>{setPeriodIdx(i);saveSettings({periodIdx:i});}} className="p-4 rounded-2xl border-2 text-left transition-all" style={periodIdx===i?{borderColor:"#1D1D1F",background:"#1D1D1F",color:"white"}:{borderColor:"#E5E7EB",background:"white",color:"#374151"}}><p className="text-base font-bold">{p.label}</p><p className="text-xs mt-1 opacity-60">{p.workingDays} working days</p></button>))}</div>
            </Card>
            <Card>
              <div className="pb-5 mb-2 border-b border-gray-50"><p className="text-base font-bold text-gray-900">Utilisation</p></div>
              <SettingRow label="PM Utilisation" description="Drives projectsPerPM and totalTeamPMCap." value={utilPM} min={60} max={95} onChange={v=>{setUtilPM(v);saveSettings({utilPM:v});}} display={`${utilPM}%`} accent="#3B82F6" derived={`${availHrsPM}h/week → ${projectsPerPM} concurrent/PM → ${totalTeamPMCap.toLocaleString()} projects/month`}/>
              <SettingRow label="Designer Utilisation" description="Drives desSupplyHrsPerMonth and all coverage calculations." value={utilDes} min={60} max={95} onChange={v=>{setUtilDes(v);saveSettings({utilDes:v});}} display={`${utilDes}%`} accent="#8B5CF6" derived={`${totalDesEfte.toFixed(1)} efte × 21d × 8h × ${utilDes}% = ${desSupplyHrsPerMonth.toLocaleString()}h/month`}/>
            </Card>
            <Card>
              <div className="pb-5 mb-2 border-b border-gray-50">
                <p className="text-base font-bold text-gray-900">PM Capacity Model</p>
                <div className="mt-3 p-3 bg-blue-50 rounded-xl inline-flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-blue-600">Formula:</span>
                  <span className="text-sm font-semibold text-blue-900">{pmHoursPerWeek}h × {utilPM}% = {availHrsPM}h</span>
                  <span className="text-blue-400">÷</span>
                  <span className="text-sm font-semibold text-blue-900">{hoursPerProject}h/project</span>
                  <span className="text-blue-400">=</span>
                  <span className="text-lg font-bold text-blue-700">{projectsPerPM} concurrent</span>
                </div>
              </div>
              <SettingRow label="Working hours per week" description="Total contracted hours." value={pmHoursPerWeek} min={35} max={45} step={0.5} onChange={v=>{setPmHoursPerWeek(v);saveSettings({pmHoursPerWeek:v});}} display={`${pmHoursPerWeek}h`} accent="#3B82F6"/>
              <SettingRow label="Hours per project per week" description="Average PM time per active project." value={hoursPerProject} min={0.5} max={8} step={0.5} onChange={v=>{setHoursPerProject(v);saveSettings({hoursPerProject:v});}} display={`${hoursPerProject}h`} accent="#3B82F6" derived={`${projectsPerPM} concurrent/PM · ${totalTeamPMCap.toLocaleString()} total/month`}/>
            </Card>
            <Card>
              <div className="pb-5 mb-2 border-b border-gray-50"><p className="text-base font-bold text-gray-900">Designer Throughput</p></div>
              <SettingRow label="Manual production rate" description="Assets authored per day for non-auto project types." value={manualRate} min={10} max={50} onChange={v=>{setManualRate(v);saveSettings({manualRate:v});}} display={`${manualRate} assets/day`} accent="#F97316" derived={`Manual cap: ${manualCap.toLocaleString()} assets/month`}/>
              <SettingRow label="QC time per automated asset" description="Minutes to review each auto-generated asset on canvas." value={qcMinsPerAsset} min={0.5} max={10} step={0.5} onChange={v=>{setQcMinsPerAsset(v);saveSettings({qcMinsPerAsset:v});}} display={`${qcMinsPerAsset} min/asset`} accent="#8B5CF6" derived={`${autoQCRate} assets/day · ${(autoQCRate/manualRate).toFixed(1)}× faster than manual`}/>
              <SettingRow label="Masters per automation project" description="Format masters built before automation runs. Once per project brief." value={mastersPerProj} min={1} max={6} step={1} onChange={v=>{setMastersPerProj(v);saveSettings({mastersPerProj:v});}} display={`${mastersPerProj} masters`} accent="#8B5CF6" derived={`${totalMasterHrs}h per project`}/>
              <SettingRow label="Hours to build one master" description="Time to design and finalise one format master." value={hrsPerMaster} min={1} max={8} step={0.5} onChange={v=>{setHrsPerMaster(v);saveSettings({hrsPerMaster:v});}} display={`${hrsPerMaster}h`} accent="#8B5CF6" derived={`masterH = auto proj × ${mastersPerProj} × ${hrsPerMaster}h`}/>
            </Card>
            <Card>
              <div className="pb-5 mb-5 border-b border-gray-50"><p className="text-base font-bold text-gray-900">SLA Calculator Defaults</p></div>
              <div className="grid grid-cols-3 gap-6">
                <div><p className="text-sm font-semibold text-gray-800 mb-1">Client Feedback</p><div className="flex gap-2 p-1 bg-gray-100 rounded-xl">{[{l:"Realistic",v:true},{l:"Best Case",v:false}].map(o=>(<button key={String(o.v)} onClick={()=>{setClientDays(o.v);saveSettings({clientDays:o.v});}} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all" style={clientDays===o.v?{background:"white",color:"#1D1D1F",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}:{color:"#6B7280"}}>{o.l}</button>))}</div></div>
                <div><p className="text-sm font-semibold text-gray-800 mb-1">EAN Band</p><div className="flex gap-2">{["1-5 EANs","5-10 EANs","10-15 EANs"].map(b=>(<button key={b} onClick={()=>{setEanBand(b);saveSettings({eanBand:b});}} className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all" style={eanBand===b?{borderColor:"#0F172A",background:"#0F172A",color:"white"}:{borderColor:"#E5E7EB",color:"#6B7280"}}>{b.replace(" EANs","")}</button>))}</div></div>
                <div><p className="text-sm font-semibold text-gray-800 mb-1">Syndication Complexity</p><div className="flex gap-2">{["Simple","Mid","Complex"].map(c=>(<button key={c} onClick={()=>{setSyndCplx(c);saveSettings({syndCplx:c});}} className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all" style={syndCplx===c?{borderColor:"#0F172A",background:"#0F172A",color:"white"}:{borderColor:"#E5E7EB",color:"#6B7280"}}>{c}</button>))}</div></div>
              </div>
            </Card>
            <Card>
              <div className="pb-5 mb-5 border-b border-gray-50"><p className="text-base font-bold text-gray-900">Model Notes — v19.1</p></div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">v19.1 changes</p>
                  {[
                    {label:"Item 1",formula:"Forecast tile labels dynamic from autoConfig go-live months"},
                    {label:"Item 2",formula:"Coverage cards show With Automation / Manual scenario badge"},
                    {label:"Item 3",formula:"Volume tab shows suggested Simple% per division from mix"},
                    {label:"Item 4",formula:"Assets/brief inputs write to Supabase on blur only"},
                    {label:"Item 5",formula:"Apply suggested Simple% button on Volume tab"},
                    {label:"Item 6",formula:"FM forecast sense-check per division on Volume tab"},
                    {label:"Item 7",formula:"Automation phase tile labels dynamic from go-live months"},
                    {label:"Item 8",formula:"goLiveMonth=Off shows 'Not active' not blended rate"},
                    {label:"Item 9",formula:"autoEnabled=false shows warning note on Step-Change chart"},
                    {label:"Item 10",formula:"_nextId derived from max(400, ...roster.map(p=>p.id))"},
                    {label:"Item 11",formula:"autoEnabled persisted to Supabase on toggle and load"},
                  ].map(f=>(<div key={f.label} className="flex items-start gap-2 text-xs"><span className="font-semibold text-gray-600 w-16 flex-shrink-0">{f.label}</span><span className="text-gray-400">{f.formula}</span></div>))}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Core formulas unchanged</p>
                  {[
                    {label:"Supply",formula:`totalDesEfte × 21d × 8h × ${utilDes}% = ${desSupplyHrsPerMonth.toLocaleString()}h/mo`},
                    {label:"Auto live?",formula:"autoEnabled && isAutoLive(div, month, cfg)"},
                    {label:"Auto assets",formula:"fm.div × simplePct (only if live)"},
                    {label:"Manual assets",formula:"fm.gt − auto assets"},
                    {label:"Auto projects",formula:"fm.divProj × simplePct (once per brief)"},
                    {label:"Master h",formula:`auto proj × ${mastersPerProj} × ${hrsPerMaster}h`},
                    {label:"QC h",formula:`auto assets × ${qcMinsPerAsset}min ÷ 60`},
                    {label:"Manual h",formula:`manual assets ÷ ${manualRate} × 8h`},
                  ].map(f=>(<div key={f.label} className="flex items-start gap-2 text-xs"><span className="font-semibold text-gray-600 w-28 flex-shrink-0">{f.label}</span><span className="text-gray-400">{f.formula}</span></div>))}
                </div>
              </div>
              <div className="mt-5 pt-5 border-t border-gray-50 flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${dbStatus==="connected"?"bg-green-50 text-green-700":"bg-gray-100 text-gray-500"}`}>
                  <div className={`w-2 h-2 rounded-full ${dbStatus==="connected"?"bg-green-500":"bg-gray-400"}`}/>
                  {dbStatus==="connected"?"Connected to Supabase — all data persisted":"Offline mode — changes are in-memory only"}
                </div>
                {saving&&<span className="text-xs text-gray-400">Saving…</span>}
              </div>
            </Card>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-t border-gray-100">
        <p className="text-xs text-gray-300">L'Oréal eCommerce Programme · Capacity Planning Tool v19.1</p>
        <p className="text-xs text-gray-300">{totalDesEfte.toFixed(1)} efte · {autoEnabled?"⚡ Auto ON":"Manual only"} · {manualRate}/day · {autoQCRate} QC/day · {projectsPerPM} proj/PM · {dbStatus==="connected"?"🟢":"⚪"} Supabase</p>
      </div>
    </div>
  );
}
