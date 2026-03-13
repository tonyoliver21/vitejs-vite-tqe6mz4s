import { useState, useMemo, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ComposedChart, Line } from "recharts";

const SUPABASE_URL = "https://zezyfyyiijqvgplivrgl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplenlmeXlpaWpxdmdwbGl2cmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTUxODgsImV4cCI6MjA4ODk5MTE4OH0.mWZzylhc1b9AY_P4Zvrx2F5_P4mb1cmKOuXB2kqG_tc";
const hasSupabase  = !!(SUPABASE_URL && SUPABASE_KEY);

async function sbSelect(table) {
  if (!hasSupabase) return { data: null };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    return { data: await r.json() };
  } catch { return { data: null }; }
}
async function sbUpsert(table, rows) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
    });
  } catch {}
}
async function sbPatch(table, filter, data) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}
async function sbDelete(table, filter) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
    });
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// FORECAST — Jan–Dec 2026
// ldbProj / ppdProj / lldProj = total projects pro-rated by division asset share
// ─────────────────────────────────────────────────────────────────────────────
const FORECAST_MONTHS = [
  { month:"Jan", fteAssets:6000,  flAssets:1200, ldb:3865,  ppd:3097,  lld:3481,  gt:10443, forecastProjects:162, permPM:155, flyPM:0,  ldbProj:54,  ppdProj:50,  lldProj:58  },
  { month:"Feb", fteAssets:3825,  flAssets:4800, ldb:1953,  ppd:1695,  lld:3306,  gt:6954,  forecastProjects:85,  permPM:133, flyPM:30, ldbProj:23,  ppdProj:20,  lldProj:42  },
  { month:"Mar", fteAssets:8475,  flAssets:9000, ldb:2548,  ppd:2357,  lld:5348,  gt:10253, forecastProjects:272, permPM:272, flyPM:76, ldbProj:67,  ppdProj:62,  lldProj:143 },
  { month:"Apr", fteAssets:16860, flAssets:4500, ldb:2855,  ppd:2742,  lld:11230, gt:16827, forecastProjects:391, permPM:412, flyPM:95, ldbProj:66,  ppdProj:64,  lldProj:261 },
  { month:"May", fteAssets:22800, flAssets:0,    ldb:2688,  ppd:2796,  lld:11492, gt:16976, forecastProjects:395, permPM:497, flyPM:0,  ldbProj:62,  ppdProj:65,  lldProj:268 },
  { month:"Jun", fteAssets:29498, flAssets:3000, ldb:4257,  ppd:4267,  lld:16748, gt:25272, forecastProjects:588, permPM:608, flyPM:90, ldbProj:99,  ppdProj:99,  lldProj:390 },
  { month:"Jul", fteAssets:23598, flAssets:2400, ldb:4334,  ppd:4237,  lld:15737, gt:24308, forecastProjects:565, permPM:608, flyPM:75, ldbProj:101, ppdProj:99,  lldProj:365 },
  { month:"Aug", fteAssets:5900,  flAssets:600,  ldb:724,   ppd:777,   lld:3223,  gt:4724,  forecastProjects:140, permPM:608, flyPM:0,  ldbProj:21,  ppdProj:23,  lldProj:96  },
  { month:"Sep", fteAssets:18334, flAssets:0,    ldb:3326,  ppd:3234,  lld:11774, gt:18334, forecastProjects:420, permPM:608, flyPM:0,  ldbProj:76,  ppdProj:74,  lldProj:270 },
  { month:"Oct", fteAssets:22455, flAssets:0,    ldb:4034,  ppd:3950,  lld:14471, gt:22455, forecastProjects:480, permPM:608, flyPM:0,  ldbProj:86,  ppdProj:84,  lldProj:310 },
  { month:"Nov", fteAssets:16844, flAssets:0,    ldb:2993,  ppd:2949,  lld:10902, gt:16844, forecastProjects:380, permPM:608, flyPM:0,  ldbProj:67,  ppdProj:66,  lldProj:247 },
  { month:"Dec", fteAssets:12872, flAssets:0,    ldb:2285,  ppd:2251,  lld:8336,  gt:12872, forecastProjects:290, permPM:608, flyPM:0,  ldbProj:51,  ppdProj:50,  lldProj:189 },
];

// PM headcount per division (from confirmed roster)
const PM_BY_DIV = { LDB:7, PPD:8, LLD:22 };
const PROJECTS_PER_PM = 5;

const PERIODS = [
  { label:"1 Month",   months:1,  workingDays:21  },
  { label:"3 Months",  months:3,  workingDays:63  },
  { label:"6 Months",  months:6,  workingDays:126 },
  { label:"12 Months", months:12, workingDays:252 },
];

const DEFAULT_ROSTER = [
  { id:1,  name:"Ruchika Saini",        role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:2,  name:"Carly Josias",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:3,  name:"Busi Nako",            role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:4,  name:"Seatile Molotsane",    role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:5,  name:"Abhishek Khare",       role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:6,  name:"Sriza",                role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:7,  name:"Linda",                role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:8,  name:"Veena Yadav",          role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:9,  name:"Deepanjan Sarkar",     role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:10, name:"Minal Dhumak",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:11, name:"Vaishali Singh",       role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:12, name:"Meghav Bhatt",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:13, name:"Priya Chaurasia",      role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:14, name:"Mansi Vasani",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:15, name:"Ankit Dobhal",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:16, name:"Robin Singh",          role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:19, name:"Keerthika Manogharan", role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:20, name:"Mernoly Simba",        role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:21, name:"Eva Sachdeva",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:22, name:"Sahil Pujari",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:23, name:"Sarah",                role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:24, name:"Ankita Hazra",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:25, name:"Ashwini Patil",        role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:26, name:"Jahanvi Jain",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:27, name:"Jaimin",               role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:28, name:"Meghna Moza",          role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:29, name:"Lisa Peignon",         role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:30, name:"Nishtha Sharma",       role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:31, name:"Aniket Sawant",        role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:32, name:"Megha Sarin",          role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:33, name:"Anushka Sariya",       role:"Project Manager", family:"PM / Delivery", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:40, name:"Medhavi Thakur",       role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:41, name:"Mahima Bhatia",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:42, name:"Mbuluelo Jili",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:43, name:"Thando Ndashe",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:44, name:"Raghav Agarwal",       role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:45, name:"Sanjana",              role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:60, name:"Sneha Pathak",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:61, name:"Akshat Bhatnagar",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:62, name:"Denvour Dcruz",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:63, name:"Cynthia",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:64, name:"Antony Varghese",      role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LDB", status:"Active",  removed:false },
  { id:65, name:"Deepshika Das",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:66, name:"Kushagra Tayal",       role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:67, name:"Aadesh Khale",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:68, name:"Monika Singh",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:69, name:"Lindsay",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:70, name:"Annu Singh",           role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"PPD", status:"Active",  removed:false },
  { id:71, name:"Sreekumar V S",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:72, name:"Rupali Patel",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:73, name:"Liam Chetty",          role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:74, name:"Vedant Rode",          role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:75, name:"Ameya Thakur",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:76, name:"Vyomica Vasistha",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:77, name:"Rhea Seth",            role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:78, name:"Chinmay Sawant",       role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:79, name:"Bhakti Doshi",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:80, name:"Nate Mzobe",           role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:81, name:"Narelle",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:82, name:"Gabriella Bakjai",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:83, name:"Akshaya K",            role:"Integrated Designer", family:"Creative / Design", type:"FTE",      division:"LLD", status:"Active",  removed:false },
  { id:100,name:"Kah Yean",             role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:101,name:"Prajakta Giri",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:102,name:"Noah Lee",             role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:103,name:"Siva Kumar",           role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:104,name:"Balaji Kamraj",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:105,name:"Naveen Kumar",         role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:106,name:"Chinna Anto",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:107,name:"Michael Cheang",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:108,name:"Eric Ting",            role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false },
  { id:109,name:"Zwivhuya Maise",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:110,name:"Jayce Davin",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:111,name:"Michelle Ng",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:112,name:"Leke Ho",              role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false },
  { id:113,name:"Farid",                role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
  { id:114,name:"Rajni Goswami",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
  { id:115,name:"Akanksha Gupta",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
  { id:116,name:"Jyoti Negi",           role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
  { id:117,name:"Mohd Anas Siddiqui",   role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
  { id:118,name:"Diksha Panchal",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false },
];

const DEFAULT_MIX = [
  { id:"cp-simple",     LDB:2, PPD:2, LLD:3 },
  { id:"cp-adaptation", LDB:3, PPD:3, LLD:4 },
  { id:"cp-creation",   LDB:1, PPD:1, LLD:1 },
  { id:"retailer",      LDB:1, PPD:1, LLD:1 },
  { id:"gp-eventing",   LDB:1, PPD:1, LLD:1 },
  { id:"gp-pdp",        LDB:1, PPD:1, LLD:1 },
  { id:"lp-eventing",   LDB:2, PPD:2, LLD:3 },
  { id:"lp-pdp",        LDB:1, PPD:1, LLD:1 },
  { id:"urgent",        LDB:1, PPD:1, LLD:2 },
];

const ROLE_OPTIONS   = ["Project Manager","Project Manager (FR)","Integrated Designer","Managing Director","Group Account Director","Account Director","Account Manager","Programme Lead","Delivery Lead","Project Director","Division Project Lead","Studio Operations Lead","Creative Lead","Automation & Tech Lead","GenAI Creative Director","Art Director","Copywriter","Motion Designer","Automation Designer/Editor","Director Global Client Ecom","Data Analyst/Engineer","Content Lead","Content Manager","Data Wrangler"];
const FAMILY_OPTIONS = ["PM / Delivery","Creative / Design","Syndication / Data"];
const STATUS_OPTIONS = ["Active","To Hire","On Hold"];
const DIV_COLORS     = { LDB:"#f59e0b", PPD:"#8b5cf6", LLD:"#3b82f6", ALL:"#6b7280" };
const DIVS           = ["LDB","PPD","LLD"];

const PROD_DAYS = {
  Simple:  {"0-30":4,"30-50":7,"50-100":10,"100-200":18,"200-300":28,"300-500":42},
  Complex: {"0-30":5,"30-50":9,"50-100":13,"100-200":22,"200-300":34,"300-500":52},
  Creation:{"0-30":6,"30-50":11,"50-100":15,"100-200":26,"200-300":40,"300-500":62},
  Bespoke: {"0-30":10,"30-50":18,"50-100":25,"100-200":42,"200-300":65,"300-500":100},
};
const PROD_REVS  = { Simple:1, Complex:2, Creation:4, Bespoke:4 };
const OPERA_DAYS = { "0-30":1,"30-50":1,"50-100":2,"100-200":3,"200-300":5,"300-500":8 };
const SYND_DAYS  = {
  Simple: {"1-5 EANs":4,"5-10 EANs":6,"10-15 EANs":8},
  Mid:    {"1-5 EANs":6,"5-10 EANs":9,"10-15 EANs":12},
  Complex:{"1-5 EANs":10,"5-10 EANs":15,"10-15 EANs":20},
};
const ASSET_BANDS = ["0-30","30-50","50-100","100-200","200-300","300-500"];
const ASSET_MID   = { "0-30":15,"30-50":40,"50-100":75,"100-200":150,"200-300":250,"300-500":400 };

const PT = [
  { id:"cp-simple",     label:"Country Pull – Simple",     stages:[false,false,false,true, true, true, true, false], color:"#3b82f6" },
  { id:"cp-adaptation", label:"Country Pull – Adaptation", stages:[false,true, false,true, true, true, true, false], color:"#6366f1" },
  { id:"cp-creation",   label:"Country Pull – Creation",   stages:[true, true, false,true, true, true, true, false], color:"#8b5cf6" },
  { id:"retailer",      label:"Country Retailer Request",  stages:[false,false,false,false,false,false,false,true],   color:"#22c55e" },
  { id:"gp-eventing",   label:"Global Push – Eventing",    stages:[false,true, true, false,false,false,true, false],  color:"#f59e0b" },
  { id:"gp-pdp",        label:"Global Push – PDP",         stages:[false,true, true, false,false,false,true, false],  color:"#f97316" },
  { id:"lp-eventing",   label:"Local Push – Eventing",     stages:[false,false,false,true, true, true, true, true],   color:"#ef4444" },
  { id:"lp-pdp",        label:"Local Push – PDP",          stages:[false,false,false,true, true, true, true, true],   color:"#ec4899" },
  { id:"urgent",        label:"Urgent Brief",              stages:[false,false,false,false,false,true, true, false],   color:"#14b8a6" },
];
const SK     = ["missingDMI","mastering","globalRollout","translation","production","operaUpload","syndication"];
const SK_IDX = { missingDMI:[0],mastering:[1],globalRollout:[2],translation:[3,4],production:[5],operaUpload:[6],syndication:[7] };
const STAGE_META = [
  { key:"missingDMI",    label:"1. Missing DMI Asset Creation", desc:"Creation complexity · market approval & revision" },
  { key:"mastering",     label:"2. Mastering / Copy Creation",  desc:"Mid complexity · re-master & copy extraction"     },
  { key:"globalRollout", label:"3. Global Rollout Invitation",  desc:"Country rollout scheduling"                       },
  { key:"translation",   label:"4+5. Translation",              desc:"Salsify PDP + Asset (concurrent)"                 },
  { key:"production",    label:"6. Production",                 desc:"Complexity × asset volume · revision rounds"      },
  { key:"operaUpload",   label:"7. Opera Upload",               desc:"Upload assets to Opera DAM"                       },
  { key:"syndication",   label:"8. Syndication",                desc:"Salsify enrichment · EAN count × complexity"      },
];

const ASSETS_PER_DESIGNER_DAY = 25;
const TABS = ["📊 Capacity","📈 Forecast","🗂 Volume","🔢 SLA Calc","👥 Team Manager"];
let _nextId = 400;

const DEFAULT_DIV_ASSET = {
  LDB: { band:"30-50",  custom:false, customCount:300 },
  PPD: { band:"30-50",  custom:false, customCount:300 },
  LLD: { band:"50-100", custom:false, customCount:300 },
};

function stageActive(pt,key){ return (SK_IDX[key]||[]).some(i=>pt.stages[i]); }
function getDefaultDays(ptId,cplx,aBand,eanBand,syndCplx,withCF){
  const pt=PT.find(p=>p.id===ptId); if(!pt) return {};
  return {
    missingDMI:    pt.stages[0]?(6+(withCF?5:0)):0,
    mastering:     pt.stages[1]?2:0,
    globalRollout: pt.stages[2]?2:0,
    translation:   (pt.stages[3]||pt.stages[4])?(3+(withCF?6:0)):0,
    production:    pt.stages[5]?((PROD_DAYS[cplx]?.[aBand]??9)+(withCF?(PROD_REVS[cplx]??2)*4:0)):0,
    operaUpload:   pt.stages[6]?(OPERA_DAYS[aBand]??1):0,
    syndication:   pt.stages[7]?(SYND_DAYS[syndCplx]?.[eanBand]??4):0,
  };
}
function getWeights(ptId){
  const w={"cp-simple":{pm:0.25,des:0.65},"cp-adaptation":{pm:0.28,des:0.62},"cp-creation":{pm:0.25,des:0.65},"retailer":{pm:0.20,des:0.15},"gp-eventing":{pm:0.35,des:0.45},"gp-pdp":{pm:0.35,des:0.45},"lp-eventing":{pm:0.28,des:0.52},"lp-pdp":{pm:0.28,des:0.52},"urgent":{pm:0.30,des:0.65}};
  return w[ptId]||{pm:0.28,des:0.62};
}
function resolveAssetConfig(divAsset){ return divAsset.custom ? { band:"300-500", mid:divAsset.customCount } : { band:divAsset.band, mid:ASSET_MID[divAsset.band]||40 }; }

export default function App(){
  const [roster,      setRoster]     = useState(DEFAULT_ROSTER);
  const [mix,         setMix]        = useState(DEFAULT_MIX);
  const [slaOv,       setSlaOv]      = useState({});
  const [utilPM,      setUtilPM]     = useState(82);
  const [utilDes,     setUtilDes]    = useState(82);
  const [periodIdx,   setPeriodIdx]  = useState(0);
  const [complexity,  setComplexity] = useState("Complex");
  const [divAsset,    setDivAsset]   = useState(DEFAULT_DIV_ASSET);
  const [eanBand,     setEanBand]    = useState("1-5 EANs");
  const [syndCplx,    setSyndCplx]   = useState("Simple");
  const [clientDays,  setClientDays] = useState(true);
  const [activeTab,   setActiveTab]  = useState("📊 Capacity");
  const [divFilter,   setDivFilter]  = useState("All");
  const [calcType,    setCalcType]   = useState("cp-adaptation");
  const [calcDiv,     setCalcDiv]    = useState("LDB");
  const [tmSearch,    setTmSearch]   = useState("");
  const [tmDiv,       setTmDiv]      = useState("All");
  const [tmType,      setTmType]     = useState("All");
  const [tmRole,      setTmRole]     = useState("All");
  const [showAdd,     setShowAdd]    = useState(false);
  const [newP,        setNewP]       = useState({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active"});
  const [editingId,   setEditingId]  = useState(null);
  const [editData,    setEditData]   = useState({});
  const [dbStatus,    setDbStatus]   = useState(hasSupabase?"loading":"offline");
  const [saving,      setSaving]     = useState(false);
  const [prevMonths,  setPrevMonths] = useState(1);
  const [forecastDiv, setForecastDiv]= useState("Total");
  const [projView,    setProjView]   = useState("Total"); // ← division toggle for project card
  const [actuals,     setActuals]    = useState(FORECAST_MONTHS.map(m=>({month:m.month,actualAssets:0,actualProjects:0,actualLdb:0,actualPpd:0,actualLld:0})));

  const period=PERIODS[periodIdx], WD=period.workingDays;
  const updateDivAsset=(div,field,value)=>setDivAsset(prev=>({...prev,[div]:{...prev[div],[field]:value}}));
  const divAssetLabel=(div)=>{ const d=divAsset[div]; return d.custom?`${d.customCount} assets (custom)`:d.band; };

  useEffect(()=>{
    if(!hasSupabase){setDbStatus("offline");return;}
    (async()=>{
      setDbStatus("loading");
      try{
        const{data:rData}=await sbSelect("roster"); if(rData&&rData.length>0)setRoster(rData);else await sbUpsert("roster",DEFAULT_ROSTER);
        const{data:mData}=await sbSelect("project_mix"); if(mData&&mData.length>0)setMix(mData);else await sbUpsert("project_mix",DEFAULT_MIX);
        const{data:sData}=await sbSelect("sla_overrides"); if(sData&&sData.length>0){const ov={};sData.forEach(r=>{if(!ov[r.pt_id])ov[r.pt_id]={};ov[r.pt_id][r.stage_key]=r.days;});setSlaOv(ov);}
        const{data:stData}=await sbSelect("settings");
        if(stData&&stData.length>0){stData.forEach(s=>{
          if(s.key==="utilPM")setUtilPM(+s.value);if(s.key==="utilDes")setUtilDes(+s.value);
          if(s.key==="periodIdx")setPeriodIdx(+s.value);if(s.key==="complexity")setComplexity(s.value);
          if(s.key==="eanBand")setEanBand(s.value);if(s.key==="syndCplx")setSyndCplx(s.value);
          if(s.key==="clientDays")setClientDays(s.value==="true");
        });}
        setDbStatus("connected");
      }catch{setDbStatus("error");}
    })();
  },[]);

  const saveSettings=useCallback(async updates=>{ if(!hasSupabase)return; await sbUpsert("settings",Object.entries(updates).map(([key,value])=>({key,value:String(value)}))); },[]);

  useMemo(()=>{
    if(period.months!==prevMonths){
      const scale=period.months/prevMonths;
      setMix(prev=>{const u=prev.map(m=>({...m,LDB:Math.round(m.LDB*scale),PPD:Math.round(m.PPD*scale),LLD:Math.round(m.LLD*scale)}));if(hasSupabase)sbUpsert("project_mix",u);return u;});
      setPrevMonths(period.months);
    }
  },[period.months]);

  const updateMix=async(id,div,val)=>{ const u=mix.map(m=>m.id===id?{...m,[div]:Math.max(0,val)}:m);setMix(u); if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const addPerson=async()=>{ if(!newP.name.trim())return; const p={...newP,id:++_nextId,removed:false};setRoster(prev=>[...prev,p]);setShowAdd(false);setNewP({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active"}); if(hasSupabase){setSaving(true);await sbUpsert("roster",[p]);setSaving(false);}};
  const removePerson=async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:true}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:true});setSaving(false);}};
  const restorePerson=async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:false}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:false});setSaving(false);}};
  const startEdit=p=>{setEditingId(p.id);setEditData({...p});};
  const saveEdit=async()=>{setRoster(prev=>prev.map(p=>p.id===editingId?{...p,...editData}:p));setEditingId(null);if(hasSupabase){setSaving(true);await sbUpsert("roster",[editData]);setSaving(false);}};
  const setOv=async(ptId,key,val)=>{const days=Math.max(0,parseInt(String(val))||0);setSlaOv(prev=>({...prev,[ptId]:{...(prev[ptId]||{}),[key]:days}}));if(hasSupabase){setSaving(true);await sbUpsert("sla_overrides",[{pt_id:ptId,stage_key:key,days}]);setSaving(false);}};
  const resetOv=async id=>{setSlaOv(prev=>{const n={...prev};delete n[id];return n;});if(hasSupabase){setSaving(true);await sbDelete("sla_overrides",`pt_id=eq.${id}`);setSaving(false);}};
  const hasOv=id=>!!slaOv[id]&&Object.keys(slaOv[id]).length>0;

  const capacityRoster=useMemo(()=>roster.filter(p=>!p.removed&&p.status==="Active"),[roster]);
  const poolsByDiv=useMemo(()=>{
    const res={};
    DIVS.forEach(div=>{
      const pmFTE=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="FTE"&&p.division===div).length;
      const pmFL=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="Freelance"&&p.division===div).length;
      const desFTE=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE"&&p.division===div).length;
      const desFL=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance"&&p.division===div).length;
      res[div]={pm:{fte:pmFTE,fl:pmFL,total:pmFTE+pmFL},des:{fte:desFTE,fl:desFL,total:desFTE+desFL}};
    });
    res["All"]={
      pm:{fte:DIVS.reduce((s,d)=>s+res[d].pm.fte,0),fl:DIVS.reduce((s,d)=>s+res[d].pm.fl,0),total:DIVS.reduce((s,d)=>s+res[d].pm.total,0)},
      des:{fte:DIVS.reduce((s,d)=>s+res[d].des.fte,0),fl:DIVS.reduce((s,d)=>s+res[d].des.fl,0),total:DIVS.reduce((s,d)=>s+res[d].des.total,0)},
    };
    return res;
  },[capacityRoster]);

  const activePools=useMemo(()=>{
    const res={};
    [...DIVS,"All"].forEach(div=>{const hc=poolsByDiv[div]||poolsByDiv["All"];res[div]={pm:Math.round(hc.pm.total*WD*(utilPM/100)),des:Math.round(hc.des.total*WD*(utilDes/100))};});
    return res;
  },[poolsByDiv,WD,utilPM,utilDes]);

  const resolveDay=(ptId,key,def)=>slaOv[ptId]?.[key]!==undefined?slaOv[ptId][key]:def;
  const slaMaps=useMemo(()=>{
    const maps={};
    DIVS.forEach(div=>{
      const{band,mid}=resolveAssetConfig(divAsset[div]);
      const m={};
      PT.forEach(pt=>{
        const defs=getDefaultDays(pt.id,complexity,band,eanBand,syndCplx,clientDays);
        const bd={};let total=0;
        SK.forEach(k=>{const d=resolveDay(pt.id,k,defs[k]??0);bd[k]=d;total+=d;});
        const w=getWeights(pt.id);
        m[pt.id]={total,breakdown:bd,defaults:defs,pmDays:Math.round(total*w.pm),desDays:Math.round(total*w.des),avgAssets:mid};
      });
      maps[div]=m;
    });
    return maps;
  },[complexity,divAsset,eanBand,syndCplx,clientDays,slaOv]);

  const calcSlaMap=slaMaps[calcDiv]||slaMaps["LDB"];

  const mixAnalysis=useMemo(()=>DIVS.map(div=>{
    let tPM=0,tDes=0,tProj=0,tAssets=0;
    const slaM=slaMaps[div];
    const rows=mix.map(m=>{
      const pt=PT.find(p=>p.id===m.id),sla=slaM[m.id],cnt=m[div]||0;
      tPM+=sla.pmDays*cnt;tDes+=sla.desDays*cnt;tProj+=cnt;tAssets+=sla.avgAssets*cnt;
      return{id:m.id,label:pt.label,count:cnt,assets:sla.avgAssets*cnt,slaDays:sla.total,color:pt.color};
    });
    return{div,rows,tPM,tDes,tProj,tAssets};
  }),[mix,slaMaps]);

  const combined=useMemo(()=>{
    const a={div:"All",tPM:0,tDes:0,tProj:0,tAssets:0};
    mixAnalysis.forEach(d=>{a.tPM+=d.tPM;a.tDes+=d.tDes;a.tProj+=d.tProj;a.tAssets+=d.tAssets;});
    return a;
  },[mixAnalysis]);

  const getA=d=>d==="All"?combined:(mixAnalysis.find(x=>x.div===d)||combined);
  const cur=getA(divFilter),ap=activePools[divFilter]||activePools["All"];
  const uc=(d,a)=>a>0?Math.round((d/a)*100):0;
  const uPM=uc(cur.tPM,ap.pm),uDes=uc(cur.tDes,ap.des);
  const rag=u=>u<=85?{dot:"🟢",bg:"bg-green-50",brd:"border-green-200",tx:"text-green-700",bar:"bg-green-500"}:u<=100?{dot:"🟡",bg:"bg-amber-50",brd:"border-amber-200",tx:"text-amber-700",bar:"bg-amber-400"}:{dot:"🔴",bg:"bg-red-50",brd:"border-red-200",tx:"text-red-700",bar:"bg-red-500"};

  const monthlyProj=Math.round(combined.tProj/period.months);
  const monthlyAssets=Math.round(combined.tAssets/period.months);
  const globalHC=poolsByDiv["All"];
  const fteDes=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE").length;
  const flDes=capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance").length;
  const ftePM=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="FTE").length;
  const flPM=capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="Freelance").length;
  const fteAssetCap=Math.round(fteDes*21*(utilDes/100)*ASSETS_PER_DESIGNER_DAY);
  const flAssetCap=Math.round(flDes*21*(utilDes/100)*ASSETS_PER_DESIGNER_DAY);
  const totalAssetCap=fteAssetCap+flAssetCap;
  const divAssetCap=useMemo(()=>{const t=globalHC.des.total||1;return{LDB:Math.round((poolsByDiv["LDB"].des.total/t)*totalAssetCap),PPD:Math.round((poolsByDiv["PPD"].des.total/t)*totalAssetCap),LLD:Math.round((poolsByDiv["LLD"].des.total/t)*totalAssetCap)};},[poolsByDiv,totalAssetCap]);

  const forecastChartData=FORECAST_MONTHS.map((fm,i)=>{
    const a=actuals[i];
    return{...fm,fteCapacity:fteAssetCap,flCapacity:flAssetCap,totalCapacity:totalAssetCap,ldbCapacity:divAssetCap.LDB,ppdCapacity:divAssetCap.PPD,lldCapacity:divAssetCap.LLD,actualAssets:a.actualAssets||null,actualProjects:a.actualProjects||null,actualLdb:a.actualLdb||null,actualPpd:a.actualPpd||null,actualLld:a.actualLld||null,totalPMProjects:fm.permPM+fm.flyPM};
  });

  const activeForecastData=useMemo(()=>forecastChartData.map(d=>{
    if(forecastDiv==="LDB")return{...d,targetAssets:d.ldb,capacityLine:d.ldbCapacity,actualAssets:d.actualLdb,coverPct:Math.round((d.ldbCapacity/d.ldb)*100)};
    if(forecastDiv==="PPD")return{...d,targetAssets:d.ppd,capacityLine:d.ppdCapacity,actualAssets:d.actualPpd,coverPct:Math.round((d.ppdCapacity/d.ppd)*100)};
    if(forecastDiv==="LLD")return{...d,targetAssets:d.lld,capacityLine:d.lldCapacity,actualAssets:d.actualLld,coverPct:Math.round((d.lldCapacity/d.lld)*100)};
    return{...d,targetAssets:d.gt,capacityLine:totalAssetCap,actualAssets:d.actualAssets,coverPct:Math.round((totalAssetCap/d.gt)*100)};
  }),[forecastChartData,forecastDiv,totalAssetCap]);

  const divSummaryData=DIVS.map(div=>{const a=mixAnalysis.find(x=>x.div===div),p=activePools[div],hc=poolsByDiv[div];return{name:div,Projects:a.tProj,Assets:Math.round(a.tAssets),PMUtil:uc(a.tPM,p.pm),DesUtil:uc(a.tDes,p.des)};});
  const calcPt=PT.find(p=>p.id===calcType),calcSla=calcSlaMap[calcType];
  const tmFiltered=useMemo(()=>roster.filter(p=>{if(tmDiv!=="All"&&p.division!==tmDiv)return false;if(tmType!=="All"&&p.type!==tmType)return false;if(tmRole!=="All"&&p.role!==tmRole)return false;if(tmSearch&&!p.name.toLowerCase().includes(tmSearch.toLowerCase()))return false;return true;}),[roster,tmSearch,tmDiv,tmType,tmRole]);
  const updateActual=(i,field,val)=>setActuals(prev=>prev.map((a,idx)=>idx===i?{...a,[field]:Math.max(0,parseInt(val)||0)}:a));

  // Division project key lookup
  const DIV_PROJ_KEY = { LDB:"ldbProj", PPD:"ppdProj", LLD:"lldProj" };

  const DivAssetPanel=({div})=>{
    const cfg=divAsset[div];const{mid}=resolveAssetConfig(cfg);const color=DIV_COLORS[div];
    return(
      <div className="rounded-xl border p-3" style={{background:color+"0d",borderColor:color+"44"}}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black uppercase" style={{color}}>{div}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-semibold">Preset</span>
            <button onClick={()=>updateDivAsset(div,"custom",!cfg.custom)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.custom?"bg-indigo-600":"bg-gray-300"}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.custom?"translate-x-4":"translate-x-0.5"}`}/>
            </button>
            <span className="text-xs text-gray-400 font-semibold">Custom</span>
          </div>
        </div>
        {!cfg.custom?(
          <div className="flex gap-1 flex-wrap">
            {ASSET_BANDS.map(b=>(<button key={b} onClick={()=>updateDivAsset(div,"band",b)} className={`px-2 py-0.5 text-xs rounded font-semibold transition-all ${cfg.band===b?"text-white":"bg-white border"}`} style={cfg.band===b?{background:color,borderColor:color}:{borderColor:color+"66",color}}>{b}</button>))}
          </div>
        ):(
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input type="range" min={1} max={500} value={cfg.customCount} onChange={e=>updateDivAsset(div,"customCount",+e.target.value)} className="w-full accent-indigo-600"/>
              <div className="flex justify-between text-xs text-indigo-400 mt-0.5"><span>1</span><span>250</span><span>500</span></div>
            </div>
            <div className="rounded-lg px-3 py-1 text-center text-white text-xs font-black min-w-14" style={{background:color}}>{cfg.customCount}</div>
          </div>
        )}
        <p className="text-xs mt-1.5 font-semibold" style={{color}}>Avg {mid} assets/brief · Prod base: <strong>{PROD_DAYS[complexity]?.[resolveAssetConfig(cfg).band]??9}d</strong></p>
      </div>
    );
  };

  return(
    <div className="bg-gray-50 min-h-screen font-sans">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">L'Oréal eCommerce Programme · Global Programme Director</p>
            <h1 className="text-xl font-black mt-0.5">Capacity & Volume Planning Tool</h1>
            <p className="text-xs text-gray-400 mt-0.5">PM Pool: {globalHC.pm.total} ({ftePM} FTE + {flPM} FL) · Designer Pool: {globalHC.des.total} ({fteDes} FTE + {flDes} FL) · Asset cap: {totalAssetCap.toLocaleString()}/mo</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${dbStatus==="connected"?"bg-green-100 text-green-700":dbStatus==="loading"?"bg-blue-100 text-blue-700":dbStatus==="offline"?"bg-gray-100 text-gray-500":"bg-red-100 text-red-600"}`}>
            <div className={`w-2 h-2 rounded-full ${dbStatus==="connected"?"bg-green-500":dbStatus==="loading"?"bg-blue-400":dbStatus==="offline"?"bg-gray-400":"bg-red-400"}`}/>
            {dbStatus==="connected"?"🟢 Supabase — auto-save":dbStatus==="loading"?"Connecting…":dbStatus==="offline"?"⚪ Offline":"❌ DB error"}
            {saving&&<span className="ml-1 opacity-70">Saving…</span>}
          </div>
        </div>
      </div>

      {/* GLOBAL SETTINGS */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">⚙️ Global Settings</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div><p className="text-xs font-bold text-blue-700 uppercase mb-0.5">📅 Planning Period</p><p className="text-xs text-blue-500">All capacity figures shown for this period.</p></div>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map((p,i)=>(<button key={p.label} onClick={()=>{setPeriodIdx(i);saveSettings({periodIdx:i});}} className={`px-4 py-2 rounded-lg text-sm font-bold border ${periodIdx===i?"bg-blue-600 text-white border-blue-600":"bg-white text-blue-600 border-blue-300"}`}>{p.label}</button>))}
            </div>
            <div className="text-right bg-white border border-blue-200 rounded-xl px-4 py-2"><p className="text-xs text-blue-500">Working Days</p><p className="text-2xl font-black text-blue-700">{WD}</p></div>
          </div>
          {period.months>1&&<p className="text-xs text-blue-600 mt-2 font-semibold">ℹ️ Monthly equivalent: <strong>{monthlyProj} projects/month</strong> · <strong>~{monthlyAssets.toLocaleString()} assets/month</strong></p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-3">
          {[{label:`PM Util: ${utilPM}%`,val:utilPM,set:v=>{setUtilPM(v);saveSettings({utilPM:v});},c:"blue"},{label:`Designer Util: ${utilDes}%`,val:utilDes,set:v=>{setUtilDes(v);saveSettings({utilDes:v});},c:"purple"}].map(s=>(<div key={s.label}><label className="text-xs font-semibold text-gray-700 block mb-0.5">{s.label}</label><input type="range" min={60} max={95} value={s.val} onChange={e=>s.set(+e.target.value)} className={`w-full accent-${s.c}-600`}/></div>))}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Client Feedback</label>
            <div className="flex gap-1">{[{l:"Realistic",v:true},{l:"Best Case",v:false}].map(o=>(<button key={o.l} onClick={()=>{setClientDays(o.v);saveSettings({clientDays:o.v});}} className={`px-2 py-1 text-xs rounded font-semibold ${clientDays===o.v?"bg-amber-500 text-white":"bg-gray-100 text-gray-600"}`}>{o.l}</button>))}</div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Complexity</label>
            <div className="flex gap-1 flex-wrap">{["Simple","Complex","Creation","Bespoke"].map(c=>(<button key={c} onClick={()=>{setComplexity(c);saveSettings({complexity:c});}} className={`px-2 py-0.5 text-xs rounded font-semibold ${complexity===c?"bg-purple-600 text-white":"bg-gray-100 text-gray-600"}`}>{c}</button>))}</div>
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2"><p className="text-xs font-bold text-gray-700 uppercase tracking-wide">📦 Asset Volume per Brief — by Division</p><span className="text-xs text-gray-400">Each division can have a different asset band or custom count</span></div>
          <div className="grid grid-cols-3 gap-3">{DIVS.map(div=><DivAssetPanel key={div} div={div}/>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div><label className="text-xs font-semibold text-gray-700 block mb-1">EAN Band</label><div className="flex gap-1">{["1-5 EANs","5-10 EANs","10-15 EANs"].map(b=>(<button key={b} onClick={()=>{setEanBand(b);saveSettings({eanBand:b});}} className={`px-2 py-0.5 text-xs rounded font-semibold ${eanBand===b?"bg-teal-600 text-white":"bg-gray-100 text-gray-600"}`}>{b.replace(" EANs","")}</button>))}</div></div>
          <div><label className="text-xs font-semibold text-gray-700 block mb-1">Syndication Complexity</label><div className="flex gap-1">{["Simple","Mid","Complex"].map(c=>(<button key={c} onClick={()=>{setSyndCplx(c);saveSettings({syndCplx:c});}} className={`px-2 py-0.5 text-xs rounded font-semibold ${syndCplx===c?"bg-green-600 text-white":"bg-gray-100 text-gray-600"}`}>{c}</button>))}</div></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DIVS.map(div=>{const hc=poolsByDiv[div],pools=activePools[div];const{mid}=resolveAssetConfig(divAsset[div]);return(
            <div key={div} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-black uppercase mb-2" style={{color:DIV_COLORS[div]}}>{div} — {period.label}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center"><p className="text-xs text-blue-500 font-semibold">PMs</p><p className="text-lg font-black text-blue-700">{hc.pm.total}</p><p className="text-xs text-blue-400">{hc.pm.fte}F·{hc.pm.fl}FL</p><p className="text-xs font-bold text-blue-600">{pools.pm}d</p></div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center"><p className="text-xs text-purple-500 font-semibold">Designers</p><p className="text-lg font-black text-purple-700">{hc.des.total}</p><p className="text-xs text-purple-400">{hc.des.fte}F·{hc.des.fl}FL</p><p className="text-xs font-bold text-purple-600">{pools.des}d</p></div>
              </div>
              <p className="text-xs text-center mt-1.5 font-semibold text-gray-500">~{mid} assets/brief</p>
            </div>
          );})}
        </div>
      </div>

      {/* TABS */}
      <div className="px-5 pt-3 flex gap-2 flex-wrap border-b border-gray-200 bg-white">
        {TABS.map(t=>(<button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab===t?"bg-blue-600 text-white":"text-gray-600 hover:text-gray-900"}`}>{t}</button>))}
      </div>

      <div className="p-4 space-y-4 max-w-6xl mx-auto">

        {(activeTab==="📊 Capacity"||activeTab==="🗂 Volume")&&(
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-gray-500 uppercase">Division:</p>
            {["All","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setDivFilter(d)} className={`px-3 py-1 rounded-full text-xs font-bold ${divFilter===d?"bg-gray-900 text-white":"bg-white text-gray-600 border border-gray-300"}`}>{d}</button>))}
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">📅 {period.label}</span>
          </div>
        )}

        {/* ══ CAPACITY ══ */}
        {activeTab==="📊 Capacity"&&(
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold text-blue-800">📅 All figures for <span className="underline">{period.label}</span> ({WD} working days)</p>
              {period.months>1&&<p className="text-xs text-blue-600">Monthly: <strong>{monthlyProj} projects/mo</strong> · <strong>~{monthlyAssets.toLocaleString()} assets/mo</strong></p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {DIVS.map(div=>{const{mid}=resolveAssetConfig(divAsset[div]);const da=mixAnalysis.find(x=>x.div===div);const p=activePools[div];const uP=uc(da.tPM,p.pm),uD=uc(da.tDes,p.des),rP=rag(uP),rD=rag(uD);return(
                <div key={div} className="bg-white rounded-xl border border-gray-200 p-3">
                  <div className="flex justify-between items-start mb-2"><span className="text-xs font-black uppercase" style={{color:DIV_COLORS[div]}}>{div}</span><span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">{divAssetLabel(div)}</span></div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div><span className="text-gray-500">Projects: </span><span className="font-bold text-blue-700">{da.tProj}</span></div>
                    <div><span className="text-gray-500">Assets: </span><span className="font-bold text-indigo-700">{da.tAssets.toLocaleString()}</span></div>
                    <div className={`font-bold ${rP.tx}`}>PM: {uP}%</div>
                    <div className={`font-bold ${rD.tx}`}>Des: {uD}%</div>
                  </div>
                </div>
              );})}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[{label:`Projects (${divFilter})`,val:cur.tProj,unit:"projects",bg:"bg-blue-600 text-white"},{label:`Assets (${divFilter})`,val:cur.tAssets.toLocaleString(),unit:"assets",bg:"bg-indigo-600 text-white"},{label:`PM Util — ${divFilter}`,val:`${uPM}%`,unit:rag(uPM).dot,bg:`${rag(uPM).bg} ${rag(uPM).tx} border ${rag(uPM).brd}`},{label:`Designer Util — ${divFilter}`,val:`${uDes}%`,unit:rag(uDes).dot,bg:`${rag(uDes).bg} ${rag(uDes).tx} border ${rag(uDes).brd}`}].map(k=>(<div key={k.label} className={`rounded-xl p-3 text-center ${k.bg}`}><p className="text-xs font-semibold opacity-80 leading-tight">{k.label}</p><p className="text-2xl font-black">{k.val}</p><p className="text-xs opacity-70">{k.unit}</p></div>))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Utilisation — {divFilter} · {period.label} · {complexity}</h2>
              {[{label:"Project Managers",demand:cur.tPM,avail:ap.pm,u:uPM,hc:poolsByDiv[divFilter==="All"?"All":divFilter].pm},{label:"Integrated Designers",demand:cur.tDes,avail:ap.des,u:uDes,hc:poolsByDiv[divFilter==="All"?"All":divFilter].des}].map(r=>{const rg=rag(r.u);return(<div key={r.label} className="mb-5"><div className="flex justify-between mb-1"><span className="text-sm font-semibold text-gray-700">{r.label} <span className="text-xs text-gray-400">({r.hc.total} · {r.hc.fte} FTE + {r.hc.fl} FL · {r.avail}d avail)</span></span><span className={`text-sm font-black ${rg.tx}`}>{rg.dot} {r.u}% · {r.demand}d used</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${rg.bar}`} style={{width:`${Math.min(r.u,100)}%`}}/></div>{r.u>100&&<p className="text-xs text-red-600 mt-0.5">⚠️ Over capacity by {r.u-100}%</p>}{r.avail>=r.demand&&<p className="text-xs text-gray-400 mt-0.5">Headroom: {r.avail-r.demand}d</p>}</div>);})}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"><h2 className="text-sm font-bold text-gray-800 mb-3">Projects & Assets by Division</h2><ResponsiveContainer width="100%" height={200}><BarChart data={divSummaryData} margin={{top:5,right:10,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/><Bar dataKey="Projects" fill="#3b82f6" radius={[3,3,0,0]}/><Bar dataKey="Assets" fill="#8b5cf6" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"><h2 className="text-sm font-bold text-gray-800 mb-3">Utilisation % by Division</h2><ResponsiveContainer width="100%" height={200}><BarChart data={divSummaryData} margin={{top:5,right:10,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="name" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}} unit="%"/><Tooltip formatter={v=>`${v}%`}/><Legend/><Bar dataKey="PMUtil" name="PM %" fill="#3b82f6" radius={[3,3,0,0]}/><Bar dataKey="DesUtil" name="Designer %" fill="#8b5cf6" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
            </div>
          </div>
        )}

        {/* ══ FORECAST ══ */}
        {activeTab==="📈 Forecast"&&(
          <div className="space-y-4">
            <div className="bg-gray-900 text-white rounded-xl px-4 py-3 flex flex-wrap gap-4 items-center">
              <div><p className="text-xs text-gray-400 uppercase font-bold mb-0.5">Data Source</p><p className="text-xs text-gray-300">Oliver tab · GRAND TOTAL LLD 50% March · Jan–Dec 2026 · Mar LLD = 5,348</p></div>
              <div className="flex gap-3 ml-auto flex-wrap">
                {[{l:"Total cap/mo",v:totalAssetCap.toLocaleString(),c:"green"},{l:"LDB cap/mo",v:divAssetCap.LDB.toLocaleString(),c:"amber"},{l:"PPD cap/mo",v:divAssetCap.PPD.toLocaleString(),c:"purple"},{l:"LLD cap/mo",v:divAssetCap.LLD.toLocaleString(),c:"blue"}].map(s=>(<div key={s.l} className="bg-gray-800 rounded-lg px-3 py-1.5 text-center"><p className="text-xs text-gray-400">{s.l}</p><p className={`text-sm font-black text-${s.c}-400`}>{s.v}</p></div>))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-gray-500 uppercase">Asset chart view:</p>
              {["Total","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setForecastDiv(d)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${forecastDiv===d?"text-white":"bg-white text-gray-600 border border-gray-300"}`} style={forecastDiv===d?{background:d==="Total"?"#1f2937":DIV_COLORS[d]}:{}}>{d}</button>))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-1">Asset Volume — {forecastDiv==="Total"?"All Divisions":forecastDiv} · Jan–Dec 2026</h2>
              <p className="text-xs text-gray-400 mb-4">Target vs capacity ({totalAssetCap.toLocaleString()}/mo) vs actuals</p>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={activeForecastData} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <Tooltip formatter={(v,n)=>[typeof v==="number"?v.toLocaleString():v,n]}/><Legend/>
                  <Bar dataKey="targetAssets" name="Asset Target" fill={forecastDiv==="LDB"?DIV_COLORS.LDB:forecastDiv==="PPD"?DIV_COLORS.PPD:forecastDiv==="LLD"?DIV_COLORS.LLD:"#6366f1"} radius={[3,3,0,0]} opacity={0.75}/>
                  <ReferenceLine y={activeForecastData[0]?.capacityLine} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{value:`Cap: ${(activeForecastData[0]?.capacityLine||0).toLocaleString()}`,fontSize:10,fill:"#22c55e",position:"insideTopRight"}}/>
                  <Line type="monotone" dataKey="actualAssets" name="Actuals" stroke="#f59e0b" strokeWidth={2.5} dot={{r:4}} connectNulls={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-1">Asset Target by Division — Jan–Dec 2026 (Stacked)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={forecastChartData} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <Tooltip formatter={(v,n)=>[v.toLocaleString()+" assets",n]}/><Legend/>
                  <Bar dataKey="ldb" name="LDB" fill={DIV_COLORS.LDB} stackId="div"/><Bar dataKey="ppd" name="PPD" fill={DIV_COLORS.PPD} stackId="div"/><Bar dataKey="lld" name="LLD" fill={DIV_COLORS.LLD} stackId="div" radius={[3,3,0,0]}/>
                  <ReferenceLine y={totalAssetCap} stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" label={{value:`Cap: ${totalAssetCap.toLocaleString()}`,fontSize:10,fill:"#22c55e",position:"insideTopRight"}}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* ── 4 CARDS: 3 division asset coverage + 1 project forecast ── */}
            <div className="grid grid-cols-2 gap-4">

              {/* Division asset coverage cards */}
              {[{div:"LDB",cap:divAssetCap.LDB},{div:"PPD",cap:divAssetCap.PPD},{div:"LLD",cap:divAssetCap.LLD}].map(({div,cap})=>(
                <div key={div} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-gray-900 text-sm">{div} — Asset Coverage</h3>
                    <span className="text-xs px-2 py-1 rounded-full font-bold text-white" style={{background:DIV_COLORS[div]}}>Cap: {cap.toLocaleString()}/mo</span>
                  </div>
                  {/* Column headers */}
                  <div className="grid grid-cols-4 gap-1 mb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Month</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Target</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Capacity</p>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Cover %</p>
                  </div>
                  <div className="h-px bg-gray-100 mb-2"/>
                  <div className="space-y-1.5">
                    {forecastChartData.map(row=>{
                      const target=row[div.toLowerCase()],pct=Math.round((cap/target)*100),gap=cap-target;
                      const ragTx=pct>=100?"text-green-600":pct>=75?"text-amber-600":"text-red-600";
                      const barC =pct>=100?"bg-green-500":pct>=75?"bg-amber-400":"bg-red-400";
                      return(
                        <div key={row.month}>
                          <div className="grid grid-cols-4 gap-1 items-center text-xs">
                            <span className="font-semibold text-gray-700">{row.month}</span>
                            <span className="text-right text-gray-600">{target.toLocaleString()}</span>
                            <span className="text-right text-gray-600">{cap.toLocaleString()}</span>
                            <span className={`text-right font-bold ${ragTx}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded h-1 mt-0.5"><div className={`h-1 rounded ${barC}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                          {gap<0&&<p className="text-xs text-red-500 text-right">–{Math.abs(gap).toLocaleString()} shortfall</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-700">
                    <span>Year total</span>
                    <span>{FORECAST_MONTHS.reduce((s,m)=>s+m[div.toLowerCase()],0).toLocaleString()} assets</span>
                  </div>
                </div>
              ))}

              {/* ── Project forecast card — per division toggle ── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-black text-gray-900 text-sm">Project Volume — Forecast</h3>
                  <div className="flex gap-1">
                    {["Total","LDB","PPD","LLD"].map(d=>(
                      <button key={d} onClick={()=>setProjView(d)}
                        className={`px-2.5 py-1 text-xs rounded-full font-bold transition-all ${projView===d?"text-white":"bg-gray-100 text-gray-600"}`}
                        style={projView===d?{background:d==="Total"?"#1f2937":DIV_COLORS[d]}:{}}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {projView==="Total" ? (
                  <>
                    <div className="grid grid-cols-5 gap-1 mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Month</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Forecast</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Perm PM</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Flying PM</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Cover %</p>
                    </div>
                    <div className="h-px bg-gray-100 mb-2"/>
                    <div className="space-y-1.5">
                      {FORECAST_MONTHS.map(row=>{
                        const pmTotal=row.permPM+row.flyPM,pct=Math.round((pmTotal/row.forecastProjects)*100),gap=pmTotal-row.forecastProjects;
                        const ragTx=pct>=100?"text-green-600":pct>=85?"text-amber-600":"text-red-600";
                        const barC =pct>=100?"bg-green-500":pct>=85?"bg-amber-400":"bg-red-400";
                        return(
                          <div key={row.month}>
                            <div className="grid grid-cols-5 gap-1 items-center text-xs">
                              <span className="font-semibold text-gray-700">{row.month}</span>
                              <span className="text-right font-bold text-blue-700">{row.forecastProjects}</span>
                              <span className="text-right text-gray-600">{row.permPM}</span>
                              <span className="text-right text-gray-500">{row.flyPM>0?`+${row.flyPM}`:"—"}</span>
                              <span className={`text-right font-bold ${ragTx}`}>{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded h-1 mt-0.5"><div className={`h-1 rounded ${barC}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                            {gap<0&&<p className="text-xs text-red-500 text-right">{Math.abs(gap)} gap</p>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-1 text-xs font-bold text-gray-700">
                      <div className="flex justify-between"><span>Year total forecast</span><span className="text-blue-700">{FORECAST_MONTHS.reduce((s,m)=>s+m.forecastProjects,0).toLocaleString()} projects</span></div>
                      <div className="flex justify-between text-gray-400 font-normal"><span>Perm PM capacity</span><span>{FORECAST_MONTHS.reduce((s,m)=>s+m.permPM,0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-gray-400 font-normal"><span>Flying PM capacity</span><span>+{FORECAST_MONTHS.reduce((s,m)=>s+m.flyPM,0).toLocaleString()}</span></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full" style={{background:DIV_COLORS[projView]}}/>
                      <p className="text-xs text-gray-500">{projView} · {PM_BY_DIV[projView]} PMs · ~{PM_BY_DIV[projView]*PROJECTS_PER_PM} concurrent project capacity</p>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mb-1">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Month</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Forecast</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">PM Cap</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide text-right">Cover %</p>
                    </div>
                    <div className="h-px bg-gray-100 mb-2"/>
                    <div className="space-y-1.5">
                      {FORECAST_MONTHS.map(row=>{
                        const forecast=row[DIV_PROJ_KEY[projView]];
                        const pmCap=PM_BY_DIV[projView]*PROJECTS_PER_PM;
                        const pct=Math.round((pmCap/forecast)*100);
                        const gap=pmCap-forecast;
                        const ragTx=pct>=100?"text-green-600":pct>=75?"text-amber-600":"text-red-600";
                        const barC =pct>=100?"bg-green-500":pct>=75?"bg-amber-400":"bg-red-400";
                        return(
                          <div key={row.month}>
                            <div className="grid grid-cols-4 gap-1 items-center text-xs">
                              <span className="font-semibold text-gray-700">{row.month}</span>
                              <span className="text-right font-bold" style={{color:DIV_COLORS[projView]}}>{forecast}</span>
                              <span className="text-right text-gray-600">{pmCap}</span>
                              <span className={`text-right font-bold ${ragTx}`}>{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded h-1 mt-0.5"><div className={`h-1 rounded ${barC}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                            {gap<0&&<p className="text-xs text-red-500 text-right">{Math.abs(gap)} gap</p>}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-1 text-xs font-bold text-gray-700">
                      <div className="flex justify-between"><span>Year total ({projView})</span><span style={{color:DIV_COLORS[projView]}}>{FORECAST_MONTHS.reduce((s,m)=>s+m[DIV_PROJ_KEY[projView]],0).toLocaleString()} projects</span></div>
                      <div className="flex justify-between text-gray-400 font-normal"><span>{PM_BY_DIV[projView]} PMs × {PROJECTS_PER_PM} concurrent</span><span>{PM_BY_DIV[projView]*PROJECTS_PER_PM} projects/mo capacity</span></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Monthly detail table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-800">Monthly Detail — Forecast vs Capacity vs Actuals</h2><p className="text-xs text-gray-400">Enter actuals in amber cells</p></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{tableLayout:"fixed"}}>
                  <colgroup><col style={{width:"44px"}}/><col style={{width:"72px"}}/><col style={{width:"60px"}}/><col style={{width:"60px"}}/><col style={{width:"58px"}}/><col style={{width:"60px"}}/><col style={{width:"58px"}}/><col style={{width:"60px"}}/><col style={{width:"58px"}}/><col style={{width:"30px"}}/></colgroup>
                  <thead>
                    <tr className="text-gray-500 uppercase text-xs bg-gray-50">
                      <th className="py-2 text-left pl-2">Mo</th>
                      <th className="py-2 text-center bg-blue-50 text-blue-600" colSpan={2}>Total</th>
                      <th className="py-2 text-center" style={{background:DIV_COLORS.LDB+"22",color:DIV_COLORS.LDB}} colSpan={2}>LDB</th>
                      <th className="py-2 text-center" style={{background:DIV_COLORS.PPD+"22",color:DIV_COLORS.PPD}} colSpan={2}>PPD</th>
                      <th className="py-2 text-center" style={{background:DIV_COLORS.LLD+"22",color:DIV_COLORS.LLD}} colSpan={2}>LLD</th>
                      <th className="py-2"></th>
                    </tr>
                    <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50">
                      <th className="py-1 pl-2"></th>
                      <th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th>
                      <th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th>
                      <th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th>
                      <th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastChartData.map((row,i)=>{
                      const a=actuals[i],totalPct=Math.round((totalAssetCap/row.gt)*100),ragDot=totalPct>=100?"🟢":totalPct>=75?"🟡":"🔴",actPct=a.actualAssets?Math.round((a.actualAssets/row.gt)*100):null;
                      return(
                        <tr key={row.month} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-2 pl-2 font-bold text-gray-900">{row.month}</td>
                          <td className="py-2 text-center bg-blue-50"><div className="font-semibold text-blue-700">{row.gt.toLocaleString()}</div><div className={`text-xs font-bold ${totalPct>=100?"text-green-600":totalPct>=75?"text-amber-500":"text-red-500"}`}>{totalPct}%</div></td>
                          <td className="py-2 text-center"><input type="number" min="0" value={a.actualAssets||""} onChange={e=>updateActual(i,"actualAssets",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/>{actPct!==null&&<div className={`text-xs font-bold ${actPct>=100?"text-green-600":actPct>=75?"text-amber-500":"text-red-500"}`}>{actPct}%</div>}</td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.LDB+"0d"}}><div className="font-semibold" style={{color:DIV_COLORS.LDB}}>{row.ldb.toLocaleString()}</div></td>
                          <td className="py-2 text-center"><input type="number" min="0" value={a.actualLdb||""} onChange={e=>updateActual(i,"actualLdb",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.PPD+"0d"}}><div className="font-semibold" style={{color:DIV_COLORS.PPD}}>{row.ppd.toLocaleString()}</div></td>
                          <td className="py-2 text-center"><input type="number" min="0" value={a.actualPpd||""} onChange={e=>updateActual(i,"actualPpd",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.LLD+"0d"}}><div className="font-semibold" style={{color:DIV_COLORS.LLD}}>{row.lld.toLocaleString()}</div></td>
                          <td className="py-2 text-center"><input type="number" min="0" value={a.actualLld||""} onChange={e=>updateActual(i,"actualLld",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center">{ragDot}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                      <td className="py-2 pl-2">Total</td>
                      <td className="py-2 text-center text-blue-700 bg-blue-50">{FORECAST_MONTHS.reduce((s,m)=>s+m.gt,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualAssets||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.LDB}}>{FORECAST_MONTHS.reduce((s,m)=>s+m.ldb,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLdb||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.PPD}}>{FORECAST_MONTHS.reduce((s,m)=>s+m.ppd,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualPpd||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.LLD}}>{FORECAST_MONTHS.reduce((s,m)=>s+m.lld,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLld||0),0).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-400 mt-2">✎ Enter actuals in amber cells · % = team capacity coverage of target</p>
            </div>
          </div>
        )}

        {/* ══ VOLUME ══ */}
        {activeTab==="🗂 Volume"&&(
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5"><p className="text-sm font-bold text-blue-800">📅 Setting intake for <span className="underline">{period.label}</span></p><p className="text-xs text-blue-500 mt-0.5">LDB: {divAssetLabel("LDB")} · PPD: {divAssetLabel("PPD")} · LLD: {divAssetLabel("LLD")}</p></div>
            <div className="grid grid-cols-3 gap-4">
              {DIVS.map(div=>{const da=mixAnalysis.find(x=>x.div===div),p=activePools[div];const uP=uc(da.tPM,p.pm),uD=uc(da.tDes,p.des),rP=rag(uP),rD=rag(uD);const{mid}=resolveAssetConfig(divAsset[div]);return(
                <div key={div} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex justify-between mb-1"><div><h3 className="font-black text-gray-900">{div}</h3><span className="text-xs text-gray-400">{divAssetLabel(div)} · avg {mid} assets/brief</span></div><div className="text-right"><p className="text-2xl font-black text-blue-700">{da.tProj}</p><p className="text-xs text-gray-400">~{Math.round(da.tProj/period.months)}/mo</p></div></div>
                  <p className="text-xs text-indigo-700 font-bold mb-3">~{da.tAssets.toLocaleString()} assets</p>
                  {[{l:"PM",u:uP,r:rP},{l:"Designer",u:uD,r:rD}].map(x=>(<div key={x.l} className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600">{x.l}</span><span className={`font-bold ${x.r.tx}`}>{x.u}%</span></div><div className="w-full bg-gray-100 rounded h-2"><div className={`h-2 rounded ${x.r.bar}`} style={{width:`${Math.min(x.u,100)}%`}}/></div></div>))}
                  <div className="mt-3 space-y-1">{da.rows.filter(r=>r.count>0).map(r=>(<div key={r.id} className="flex justify-between text-xs"><span className="text-gray-700 truncate max-w-28">{r.label.replace("Country ","").replace("Global ","G.").replace("Local ","L.")}</span><span className="font-bold text-gray-900">{r.count}× <span className="text-gray-400 font-normal">{r.assets} assets</span></span></div>))}</div>
                </div>
              );})}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-800">Adjust Intake — {period.label}</h2>{hasSupabase&&<span className="text-xs text-green-600 font-semibold">✓ Auto-saved</span>}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 text-gray-500 uppercase"><th className="px-3 py-2 text-left">Project Type</th><th className="px-3 py-2 text-center">SLA</th><th className="px-3 py-2 text-center">LDB ({divAssetLabel("LDB")})</th><th className="px-3 py-2 text-center">PPD ({divAssetLabel("PPD")})</th><th className="px-3 py-2 text-center">LLD ({divAssetLabel("LLD")})</th><th className="px-3 py-2 text-center">Total</th><th className="px-3 py-2 text-center">/mo</th><th className="px-3 py-2 text-center">Assets</th></tr></thead>
                  <tbody>
                    {mix.map(m=>{const pt=PT.find(p=>p.id===m.id),rowTot=m.LDB+m.PPD+m.LLD,rowAssets=DIVS.reduce((s,div)=>s+(slaMaps[div][m.id].avgAssets*(m[div]||0)),0),repSla=slaMaps["LDB"][m.id].total;return(
                      <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:pt.color}}/><span className="font-semibold">{pt.label}</span>{hasOv(m.id)&&<span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full">custom</span>}</div></td>
                        <td className="px-3 py-2 text-center font-black text-gray-900">{repSla}</td>
                        {DIVS.map(div=>{const sla=slaMaps[div][m.id];return(<td key={div} className="px-3 py-2 text-center"><div className="flex items-center justify-center gap-1 mb-0.5"><button onClick={()=>updateMix(m.id,div,m[div]-1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">−</button><span className="w-5 text-center font-black text-blue-700">{m[div]}</span><button onClick={()=>updateMix(m.id,div,m[div]+1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">+</button></div><div className="text-xs text-gray-400">{(sla.avgAssets*(m[div]||0)).toLocaleString()}</div></td>);})}
                        <td className="px-3 py-2 text-center font-black text-blue-700">{rowTot}</td>
                        <td className="px-3 py-2 text-center text-blue-500">~{Math.round(rowTot/period.months)}</td>
                        <td className="px-3 py-2 text-center font-bold text-indigo-700">{rowAssets.toLocaleString()}</td>
                      </tr>
                    );})}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold"><td colSpan={2} className="px-3 py-2">TOTAL</td>{DIVS.map(div=>{const da=mixAnalysis.find(x=>x.div===div);return<td key={div} className="px-3 py-2 text-center text-blue-700">{da.tProj}<div className="text-xs font-normal text-indigo-500">{da.tAssets.toLocaleString()} assets</div></td>;})}
                    <td className="px-3 py-2 text-center text-blue-700">{combined.tProj}</td><td className="px-3 py-2 text-center text-blue-500">~{monthlyProj}</td><td className="px-3 py-2 text-center text-indigo-700">{combined.tAssets.toLocaleString()}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ SLA CALC ══ */}
        {activeTab==="🔢 SLA Calc"&&(
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3"><h2 className="text-sm font-bold text-gray-800">Select Project Type</h2>
                <div className="flex items-center gap-2"><span className="text-xs text-gray-500 font-semibold">Using settings for:</span>{DIVS.map(d=>(<button key={d} onClick={()=>setCalcDiv(d)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${calcDiv===d?"text-white":"bg-white border"}`} style={calcDiv===d?{background:DIV_COLORS[d]}:{borderColor:DIV_COLORS[d]+"66",color:DIV_COLORS[d]}}>{d} · {divAssetLabel(d)}</button>))}</div>
              </div>
              <div className="flex gap-2 flex-wrap">{PT.map(pt=>(<button key={pt.id} onClick={()=>setCalcType(pt.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${calcType===pt.id?"text-white border-transparent":"bg-gray-50 text-gray-600 border-gray-200"}`} style={calcType===pt.id?{background:pt.color}:{}}>{pt.label}{hasOv(pt.id)&&<span className="ml-1 opacity-70">✎</span>}</button>))}</div>
            </div>
            {calcPt&&calcSla&&(
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div><h2 className="text-base font-black" style={{color:calcPt.color}}>{calcPt.label}</h2><p className="text-xs text-gray-500">Total: <strong>{calcSla.total}d</strong> · {complexity} · {divAssetLabel(calcDiv)} · {calcDiv}{hasOv(calcType)&&<span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-semibold">Custom SLA</span>}</p></div>
                  <div className="flex gap-2 items-center">{hasOv(calcType)&&<button onClick={()=>resetOv(calcType)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-200">↩ Reset</button>}<div className="bg-blue-600 text-white rounded-xl px-4 py-2 text-center"><p className="text-xs opacity-80">Total SLA</p><p className="text-2xl font-black leading-none">{calcSla.total}</p><p className="text-xs opacity-70">days/project</p></div></div>
                </div>
                <div className="space-y-2">
                  {STAGE_META.map(sm=>{const active=stageActive(calcPt,sm.key),defVal=calcSla.defaults[sm.key]??0,curVal=calcSla.breakdown[sm.key]??0,isOved=slaOv[calcType]?.[sm.key]!==undefined;return(
                    <div key={sm.key} className={`rounded-xl border p-3 ${active?"border-blue-200 bg-blue-50":"border-gray-100 bg-gray-50 opacity-50"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active?"bg-blue-500 text-white":"bg-gray-200 text-gray-400"}`}>{active?"✓":"–"}</div>
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold ${active?"text-blue-900":"text-gray-400"}`}>{sm.label}</span>{isOved&&<span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">custom</span>}</div><p className="text-xs text-gray-500 mt-0.5">{sm.desc}</p></div>
                        {active?(<div className="flex items-center gap-2 flex-shrink-0">{isOved&&<span className="text-xs text-gray-400 line-through">{defVal}d</span>}<div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm"><button onClick={()=>setOv(calcType,sm.key,curVal-1)} className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center">−</button><input type="number" min="0" value={curVal} onChange={e=>setOv(calcType,sm.key,e.target.value)} className={`w-12 text-center font-black text-lg border-none outline-none bg-transparent ${isOved?"text-orange-600":"text-blue-700"}`}/><button onClick={()=>setOv(calcType,sm.key,curVal+1)} className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center">+</button></div><span className="text-xs text-gray-400">days</span>{isOved&&<button onClick={()=>setOv(calcType,sm.key,defVal)} className="text-xs text-orange-500 font-semibold">↩</button>}</div>):(<span className="text-xs text-gray-300 bg-gray-100 rounded-lg px-3 py-1.5 font-semibold flex-shrink-0">Not Required</span>)}
                      </div>
                    </div>
                  );})}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-blue-600 rounded-xl p-3 text-white text-center"><p className="text-xs opacity-80">Total SLA</p><p className="text-2xl font-black">{calcSla.total}d</p></div>
                  {[{l:"PM Days",v:calcSla.pmDays,c:"blue"},{l:"Designer Days",v:calcSla.desDays,c:"purple"}].map(r=>(<div key={r.l} className={`bg-${r.c}-50 border border-${r.c}-200 rounded-xl p-3 text-center`}><p className={`text-xs text-${r.c}-500`}>{r.l}</p><p className={`text-2xl font-black text-${r.c}-700`}>{r.v}</p></div>))}
                </div>
                <div className="mt-4 bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-700 mb-2">SLA comparison across divisions</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DIVS.map(div=>{const s=slaMaps[div][calcType];return(<div key={div} className="bg-white rounded-lg p-2 text-center border" style={{borderColor:DIV_COLORS[div]+"44"}}><p className="text-xs font-black" style={{color:DIV_COLORS[div]}}>{div}</p><p className="text-xs text-gray-400">{divAssetLabel(div)}</p><p className="text-lg font-black text-gray-900">{s.total}d</p><p className="text-xs text-gray-400">PM: {s.pmDays}d · Des: {s.desDays}d</p></div>);})}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ TEAM MANAGER ══ */}
        {activeTab==="👥 Team Manager"&&(
          <div className="space-y-4">
            {!hasSupabase&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-semibold">⚠️ Offline mode — add Supabase credentials to persist changes.</div>}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-900 text-white rounded-xl p-3 text-center"><p className="text-xs opacity-70 uppercase">Active</p><p className="text-3xl font-black">{capacityRoster.length}</p><p className="text-xs opacity-50">{roster.filter(p=>p.removed).length} removed</p></div>
              {DIVS.map(div=>{const hc=poolsByDiv[div];return(<div key={div} className="rounded-xl border border-gray-200 bg-white p-3"><p className="text-xs font-black uppercase mb-2" style={{color:DIV_COLORS[div]}}>{div}</p><div className="grid grid-cols-2 gap-1 text-center"><div className="bg-blue-50 rounded-lg p-1.5"><p className="text-xs text-blue-500">PMs</p><p className="font-black text-blue-700 text-lg">{hc.pm.total}</p><p className="text-xs text-blue-400">{hc.pm.fte}F·{hc.pm.fl}FL</p></div><div className="bg-purple-50 rounded-lg p-1.5"><p className="text-xs text-purple-500">Designers</p><p className="font-black text-purple-700 text-lg">{hc.des.total}</p><p className="text-xs text-purple-400">{hc.des.fte}F·{hc.des.fl}FL</p></div></div></div>);})}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <input value={tmSearch} onChange={e=>setTmSearch(e.target.value)} placeholder="Search name…" className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-blue-400"/>
                  {[{val:tmDiv,set:setTmDiv,opts:["All","LDB","PPD","LLD"]},{val:tmType,set:setTmType,opts:["All","FTE","Freelance"]},{val:tmRole,set:setTmRole,opts:["All","Project Manager","Integrated Designer"]}].map((s,i)=>(<select key={i} value={s.val} onChange={e=>s.set(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">{s.opts.map(o=><option key={o}>{o}</option>)}</select>))}
                  <span className="text-xs text-gray-400">{tmFiltered.length} shown</span>
                </div>
                <button onClick={()=>setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">+ Add Person</button>
              </div>
              {showAdd&&(
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-800 mb-3">➕ Add New Team Member</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div><label className="text-xs font-semibold text-gray-700 block mb-1">Full Name *</label><input value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))} placeholder="e.g. Jane Smith" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"/></div>
                    {[{label:"Role",val:newP.role,set:v=>setNewP(p=>({...p,role:v})),opts:ROLE_OPTIONS},{label:"Function",val:newP.family,set:v=>setNewP(p=>({...p,family:v})),opts:FAMILY_OPTIONS},{label:"Contract",val:newP.type,set:v=>setNewP(p=>({...p,type:v})),opts:["FTE","Freelance"]},{label:"Division",val:newP.division,set:v=>setNewP(p=>({...p,division:v})),opts:["LDB","PPD","LLD","ALL"]},{label:"Status",val:newP.status,set:v=>setNewP(p=>({...p,status:v})),opts:STATUS_OPTIONS}].map(f=>(<div key={f.label}><label className="text-xs font-semibold text-gray-700 block mb-1">{f.label}</label><select value={f.val} onChange={e=>f.set(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none">{f.opts.map(o=><option key={o}>{o}</option>)}</select></div>))}
                  </div>
                  <div className="flex gap-2"><button onClick={addPerson} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">✓ Add to Team</button><button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">Cancel</button></div>
                </div>
              )}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200"><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-center">Type</th><th className="px-3 py-2 text-center">Div</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Actions</th></tr></thead>
                  <tbody>
                    {tmFiltered.map(p=>{const removed=p.removed,isEd=editingId===p.id;return(
                      <tr key={p.id} className={`border-t border-gray-100 ${removed?"opacity-40 bg-red-50":isEd?"bg-yellow-50":"hover:bg-gray-50"}`}>
                        <td className="px-3 py-2">{isEd?<input value={editData.name||""} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} className="border border-blue-300 rounded px-2 py-0.5 text-xs w-full"/>:<span className={`font-semibold ${removed?"line-through text-gray-400":"text-gray-900"}`}>{p.name}</span>}</td>
                        <td className="px-3 py-2">{isEd?<select value={editData.role||""} onChange={e=>setEditData(d=>({...d,role:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs w-full bg-white">{ROLE_OPTIONS.map(r=><option key={r}>{r}</option>)}</select>:<span className="text-gray-600">{p.role}</span>}</td>
                        <td className="px-3 py-2 text-center">{isEd?<select value={editData.type||""} onChange={e=>setEditData(d=>({...d,type:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white"><option>FTE</option><option>Freelance</option></select>:<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.type==="FTE"?"bg-blue-100 text-blue-700":"bg-indigo-100 text-indigo-700"}`}>{p.type}</span>}</td>
                        <td className="px-3 py-2 text-center">{isEd?<select value={editData.division||""} onChange={e=>setEditData(d=>({...d,division:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white">{["LDB","PPD","LLD","ALL"].map(d=><option key={d}>{d}</option>)}</select>:<span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:(DIV_COLORS[p.division]||"#6b7280")+"22",color:DIV_COLORS[p.division]||"#6b7280"}}>{p.division}</span>}</td>
                        <td className="px-3 py-2 text-center">{isEd?<select value={editData.status||""} onChange={e=>setEditData(d=>({...d,status:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white">{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>:<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${removed?"bg-red-100 text-red-600":p.status==="To Hire"?"bg-yellow-100 text-yellow-700":"bg-green-100 text-green-700"}`}>{removed?"Removed":p.status}</span>}</td>
                        <td className="px-3 py-2"><div className="flex items-center justify-center gap-1">
                          {!removed&&!isEd&&<><button onClick={()=>startEdit(p)} className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-600 border border-blue-200">✎</button><button onClick={()=>removePerson(p.id)} className="px-2 py-1 text-xs font-semibold rounded bg-red-50 text-red-600 border border-red-200">✕</button></>}
                          {isEd&&<><button onClick={saveEdit} className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">✓ Save</button><button onClick={()=>setEditingId(null)} className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">Cancel</button></>}
                          {removed&&<button onClick={()=>restorePerson(p.id)} className="px-2 py-1 text-xs font-semibold rounded bg-green-50 text-green-600 border border-green-200">↩ Restore</button>}
                        </div></td>
                      </tr>
                    );})}
                  </tbody>
                </table>
              </div>
            </div>
            {roster.filter(p=>p.removed).length>0&&(<div className="bg-red-50 border border-red-200 rounded-2xl p-4"><h3 className="text-sm font-bold text-red-700 mb-2">🗑 Removed ({roster.filter(p=>p.removed).length})</h3><div className="flex flex-wrap gap-2">{roster.filter(p=>p.removed).map(p=>(<div key={p.id} className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5"><span className="text-xs font-semibold">{p.name}</span><span className="text-xs text-gray-400">{p.division}</span><button onClick={()=>restorePerson(p.id)} className="text-xs text-green-600 font-bold">↩</button></div>))}</div></div>)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 py-4">
        L'Oréal eComm · {globalHC.des.total} designers · Asset cap: {totalAssetCap.toLocaleString()}/mo · LDB: {divAssetLabel("LDB")} · PPD: {divAssetLabel("PPD")} · LLD: {divAssetLabel("LLD")} · {dbStatus==="connected"?"🟢 Supabase":"⚪ Offline"}
      </p>
    </div>
  );
}
