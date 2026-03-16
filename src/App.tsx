import { useState, useMemo, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Line } from "recharts";

const SUPABASE_URL = "https://zezyfyyiijqvgplivrgl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplenlmeXlpaWpxdmdwbGl2cmdsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MTUxODgsImV4cCI6MjA4ODk5MTE4OH0.mWZzylhc1b9AY_P4Zvrx2F5_P4mb1cmKOuXB2kqG_tc";
const hasSupabase = !!(SUPABASE_URL && SUPABASE_KEY);

async function sbSelect(t) {
  if (!hasSupabase) return { data: null };
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    return { data: await r.json() };
  } catch { return { data: null }; }
}
async function sbUpsert(t, rows) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${t}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(Array.isArray(rows) ? rows : [rows])
    });
  } catch {}
}
async function sbPatch(t, f, d) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`, {
      method: "PATCH",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(d)
    });
  } catch {}
}
async function sbDelete(t, f) {
  if (!hasSupabase) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${t}?${f}`, {
      method: "DELETE",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" }
    });
  } catch {}
}

const MONTH_LIST = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_IDX  = Object.fromEntries(MONTH_LIST.map((m,i)=>[m,i]));
const GO_LIVE_OPTIONS = ["Off",...MONTH_LIST];

function isAutoLive(div, month, cfg) {
  const gl = cfg[div]?.goLiveMonth;
  if (!gl || gl === "Off") return false;
  return MONTH_IDX[month] >= MONTH_IDX[gl];
}
function blendedRate(div, month, cfg, qcRate, manualRate) {
  if (!isAutoLive(div, month, cfg)) return manualRate;
  const sp = cfg[div]?.simplePct ?? 0;
  return Math.round(sp * qcRate + (1 - sp) * manualRate);
}

function generateWeeks() {
  const out = [{ label:"Available Now", value:"now" }];
  const cur = new Date("2026-01-05");
  const end = new Date("2026-12-28");
  while (cur <= end) {
    out.push({ label:`w/c ${cur.getDate()} ${cur.toLocaleString("en-GB",{month:"short"})} '26`, value: cur.toISOString().split("T")[0] });
    cur.setDate(cur.getDate() + 7);
  }
  return out;
}
const WEEK_OPTIONS = generateWeeks();

function availFrac(startDate, endDate, wd) {
  let f = 1;
  const today = new Date();
  if (startDate && startDate !== "now") {
    const s = new Date(startDate);
    if (s > today) f = Math.min(f, Math.max(0, (wd - (s-today)/86400000*(5/7)) / wd));
  }
  if (endDate && endDate !== "never") {
    const e = new Date(endDate);
    if (e > today) f = Math.min(f, Math.max(0, (e-today)/86400000*(5/7) / wd));
  }
  return Math.max(0, Math.min(1, f));
}
function startLbl(v) { return (!v||v==="now")?"Now":(WEEK_OPTIONS.find(w=>w.value===v)?.label??v); }
function endLbl(v)   { return (!v||v==="never")?"—":(WEEK_OPTIONS.find(w=>w.value===v)?.label??v); }

const FM = [
  { month:"Jan", ldb:3865,  ppd:3097,  lld:3481,  gt:10443, weeksInMonth:4, weeklyForecast:162, monthlyForecast:648,  permPMMonthly:620,  flyPMMonthly:0,   ldbProj:54,  ppdProj:50,  lldProj:58  },
  { month:"Feb", ldb:1953,  ppd:1695,  lld:3306,  gt:6954,  weeksInMonth:4, weeklyForecast:85,  monthlyForecast:340,  permPMMonthly:570,  flyPMMonthly:120, ldbProj:23,  ppdProj:20,  lldProj:42  },
  { month:"Mar", ldb:2548,  ppd:2357,  lld:5348,  gt:10253, weeksInMonth:5, weeklyForecast:272, monthlyForecast:1360, permPMMonthly:1360, flyPMMonthly:380, ldbProj:67,  ppdProj:62,  lldProj:143 },
  { month:"Apr", ldb:2855,  ppd:2742,  lld:11230, gt:16827, weeksInMonth:4, weeklyForecast:391, monthlyForecast:1564, permPMMonthly:1647, flyPMMonthly:380, ldbProj:66,  ppdProj:64,  lldProj:261 },
  { month:"May", ldb:2688,  ppd:2796,  lld:11492, gt:16976, weeksInMonth:4, weeklyForecast:395, monthlyForecast:1580, permPMMonthly:1988, flyPMMonthly:0,   ldbProj:62,  ppdProj:65,  lldProj:268 },
  { month:"Jun", ldb:4257,  ppd:4267,  lld:16748, gt:25272, weeksInMonth:5, weeklyForecast:588, monthlyForecast:2940, permPMMonthly:3038, flyPMMonthly:450, ldbProj:99,  ppdProj:99,  lldProj:390 },
  { month:"Jul", ldb:4334,  ppd:4237,  lld:15737, gt:24308, weeksInMonth:4, weeklyForecast:565, monthlyForecast:2260, permPMMonthly:2432, flyPMMonthly:300, ldbProj:101, ppdProj:99,  lldProj:365 },
  { month:"Aug", ldb:724,   ppd:777,   lld:3223,  gt:4724,  weeksInMonth:4, weeklyForecast:140, monthlyForecast:560,  permPMMonthly:2432, flyPMMonthly:0,   ldbProj:21,  ppdProj:23,  lldProj:96  },
  { month:"Sep", ldb:3326,  ppd:3234,  lld:11774, gt:18334, weeksInMonth:4, weeklyForecast:420, monthlyForecast:1680, permPMMonthly:2432, flyPMMonthly:0,   ldbProj:76,  ppdProj:74,  lldProj:270 },
  { month:"Oct", ldb:4034,  ppd:3950,  lld:14471, gt:22455, weeksInMonth:4, weeklyForecast:480, monthlyForecast:1920, permPMMonthly:2432, flyPMMonthly:0,   ldbProj:86,  ppdProj:84,  lldProj:310 },
  { month:"Nov", ldb:2993,  ppd:2949,  lld:10902, gt:16844, weeksInMonth:4, weeklyForecast:380, monthlyForecast:1520, permPMMonthly:2432, flyPMMonthly:0,   ldbProj:67,  ppdProj:66,  lldProj:247 },
  { month:"Dec", ldb:2285,  ppd:2251,  lld:8336,  gt:12872, weeksInMonth:4, weeklyForecast:290, monthlyForecast:1160, permPMMonthly:2432, flyPMMonthly:0,   ldbProj:51,  ppdProj:50,  lldProj:189 },
];

const PERIODS = [
  { label:"1 Month",   months:1,  workingDays:21  },
  { label:"3 Months",  months:3,  workingDays:63  },
  { label:"6 Months",  months:6,  workingDays:126 },
  { label:"12 Months", months:12, workingDays:252 },
];

const DEFAULT_ROSTER = [
  { id:1,  name:"Ruchika Saini",        role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:2,  name:"Carly Josias",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:3,  name:"Busi Nako",            role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:4,  name:"Seatile Molotsane",    role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:5,  name:"Abhishek Khare",       role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:6,  name:"Sriza",                role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:7,  name:"Linda",                role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:8,  name:"Veena Yadav",          role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:9,  name:"Deepanjan Sarkar",     role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:10, name:"Minal Dhumak",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:11, name:"Vaishali Singh",       role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:12, name:"Meghav Bhatt",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:13, name:"Priya Chaurasia",      role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:14, name:"Mansi Vasani",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:15, name:"Ankit Dobhal",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:16, name:"Robin Singh",          role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:19, name:"Keerthika Manogharan", role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:20, name:"Mernoly Simba",        role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:21, name:"Eva Sachdeva",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:22, name:"Sahil Pujari",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:23, name:"Sarah",                role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:24, name:"Ankita Hazra",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:25, name:"Ashwini Patil",        role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:26, name:"Jahanvi Jain",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:27, name:"Jaimin",               role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:28, name:"Meghna Moza",          role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:29, name:"Lisa Peignon",         role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:30, name:"Nishtha Sharma",       role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:31, name:"Aniket Sawant",        role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:32, name:"Megha Sarin",          role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:33, name:"Anushka Sariya",       role:"Project Manager", family:"PM / Delivery", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:40, name:"Medhavi Thakur",       role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:41, name:"Mahima Bhatia",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:42, name:"Mbuluelo Jili",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:43, name:"Thando Ndashe",        role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:44, name:"Raghav Agarwal",       role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:45, name:"Sanjana",              role:"Project Manager", family:"PM / Delivery", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:60, name:"Sneha Pathak",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:61, name:"Akshat Bhatnagar",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:62, name:"Denvour Dcruz",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:63, name:"Cynthia",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:64, name:"Antony Varghese",      role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:65, name:"Deepshika Das",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:66, name:"Kushagra Tayal",       role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:67, name:"Aadesh Khale",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:68, name:"Monika Singh",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:69, name:"Lindsay",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:70, name:"Annu Singh",           role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:71, name:"Sreekumar V S",        role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:72, name:"Rupali Patel",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:73, name:"Liam Chetty",          role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:74, name:"Vedant Rode",          role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:75, name:"Ameya Thakur",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:76, name:"Vyomica Vasistha",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:77, name:"Rhea Seth",            role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:78, name:"Chinmay Sawant",       role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:79, name:"Bhakti Doshi",         role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:80, name:"Nate Mzobe",           role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:81, name:"Narelle",              role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:82, name:"Gabriella Bakjai",     role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:83, name:"Akshaya K",            role:"Integrated Designer", family:"Creative / Design", type:"FTE",       division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:100,name:"Kah Yean",             role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:101,name:"Prajakta Giri",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:102,name:"Noah Lee",             role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:103,name:"Siva Kumar",           role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:104,name:"Balaji Kamraj",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:105,name:"Naveen Kumar",         role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:106,name:"Chinna Anto",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:107,name:"Michael Cheang",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:108,name:"Eric Ting",            role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LDB", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:109,name:"Zwivhuya Maise",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:110,name:"Jayce Davin",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:111,name:"Michelle Ng",          role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:112,name:"Leke Ho",              role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"LLD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:113,name:"Farid",                role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:114,name:"Rajni Goswami",        role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:115,name:"Akanksha Gupta",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:116,name:"Jyoti Negi",           role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:117,name:"Mohd Anas Siddiqui",   role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
  { id:118,name:"Diksha Panchal",       role:"Integrated Designer", family:"Creative / Design", type:"Freelance", division:"PPD", status:"Active", removed:false, startDate:"now", endDate:"never" },
];

const DEFAULT_MIX = [
  { id:"cp-simple",     LDB:2, PPD:2, LLD:3, assetsLDB:60,  assetsPPD:50,  assetsLLD:150, autoEligible:true  },
  { id:"cp-adaptation", LDB:3, PPD:3, LLD:4, assetsLDB:40,  assetsPPD:35,  assetsLLD:50,  autoEligible:false },
  { id:"cp-creation",   LDB:1, PPD:1, LLD:1, assetsLDB:12,  assetsPPD:10,  assetsLLD:15,  autoEligible:false },
  { id:"retailer",      LDB:1, PPD:1, LLD:1, assetsLDB:30,  assetsPPD:25,  assetsLLD:40,  autoEligible:true  },
  { id:"gp-eventing",   LDB:1, PPD:1, LLD:1, assetsLDB:20,  assetsPPD:20,  assetsLLD:25,  autoEligible:false },
  { id:"gp-pdp",        LDB:1, PPD:1, LLD:1, assetsLDB:15,  assetsPPD:15,  assetsLLD:20,  autoEligible:false },
  { id:"lp-eventing",   LDB:2, PPD:2, LLD:3, assetsLDB:35,  assetsPPD:30,  assetsLLD:45,  autoEligible:false },
  { id:"lp-pdp",        LDB:1, PPD:1, LLD:1, assetsLDB:20,  assetsPPD:18,  assetsLLD:25,  autoEligible:false },
  { id:"urgent",        LDB:1, PPD:1, LLD:2, assetsLDB:25,  assetsPPD:20,  assetsLLD:30,  autoEligible:true  },
];

const ROLE_OPTIONS   = ["Project Manager","Project Manager (FR)","Integrated Designer","Managing Director","Group Account Director","Account Director","Account Manager","Programme Lead","Delivery Lead","Project Director","Division Project Lead","Studio Operations Lead","Creative Lead","Automation & Tech Lead","GenAI Creative Director","Art Director","Copywriter","Motion Designer","Automation Designer/Editor","Director Global Client Ecom","Data Analyst/Engineer","Content Lead","Content Manager","Data Wrangler"];
const FAMILY_OPTIONS = ["PM / Delivery","Creative / Design","Syndication / Data"];
const STATUS_OPTIONS = ["Active","To Hire","On Hold"];
const DIV_COLORS = { LDB:"#f59e0b", PPD:"#8b5cf6", LLD:"#3b82f6" };
const DIVS = ["LDB","PPD","LLD"];
const ASSET_KEY = { LDB:"assetsLDB", PPD:"assetsPPD", LLD:"assetsLLD" };

const PROD_DAYS = {
  Simple:  {"0-30":4,"30-50":7,"50-100":10,"100-200":18,"200-300":28,"300-500":42},
  Complex: {"0-30":5,"30-50":9,"50-100":13,"100-200":22,"200-300":34,"300-500":52},
  Creation:{"0-30":6,"30-50":11,"50-100":15,"100-200":26,"200-300":40,"300-500":62},
  Bespoke: {"0-30":10,"30-50":18,"50-100":25,"100-200":42,"200-300":65,"300-500":100},
};
const PROD_REVS  = { Simple:1, Complex:2, Creation:4, Bespoke:4 };
const OPERA_DAYS = {"0-30":1,"30-50":1,"50-100":2,"100-200":3,"200-300":5,"300-500":8};
const SYND_DAYS  = {
  Simple: {"1-5 EANs":4,"5-10 EANs":6,"10-15 EANs":8},
  Mid:    {"1-5 EANs":6,"5-10 EANs":9,"10-15 EANs":12},
  Complex:{"1-5 EANs":10,"5-10 EANs":15,"10-15 EANs":20},
};
const ASSET_BANDS = ["0-30","30-50","50-100","100-200","200-300","300-500"];

const PT_BASE = [
  { id:"cp-simple",     label:"Country Pull – Simple",     stages:[false,false,false,true, true, true, true, false], color:"#3b82f6" },
  { id:"cp-adaptation", label:"Country Pull – Adaptation", stages:[false,true, false,true, true, true, true, false], color:"#6366f1" },
  { id:"cp-creation",   label:"Country Pull – Creation",   stages:[true, true, false,true, true, true, true, false], color:"#8b5cf6" },
  { id:"retailer",      label:"Country Retailer Request",  stages:[false,false,false,false,false,false,false,true],  color:"#22c55e" },
  { id:"gp-eventing",   label:"Global Push – Eventing",    stages:[false,true, true, false,false,false,true, false], color:"#f59e0b" },
  { id:"gp-pdp",        label:"Global Push – PDP",         stages:[false,true, true, false,false,false,true, false], color:"#f97316" },
  { id:"lp-eventing",   label:"Local Push – Eventing",     stages:[false,false,false,true, true, true, true, true],  color:"#ef4444" },
  { id:"lp-pdp",        label:"Local Push – PDP",          stages:[false,false,false,true, true, true, true, true],  color:"#ec4899" },
  { id:"urgent",        label:"Urgent Brief",              stages:[false,false,false,false,false,true, true, false], color:"#14b8a6" },
];

const SK = ["missingDMI","mastering","globalRollout","translation","production","operaUpload","syndication"];
const SK_IDX = { missingDMI:[0],mastering:[1],globalRollout:[2],translation:[3,4],production:[5],operaUpload:[6],syndication:[7] };
const STAGE_META = [
  { key:"missingDMI",    label:"1. Missing DMI Asset Creation", desc:"Creation complexity · approval & revision" },
  { key:"mastering",     label:"2. Mastering / Copy Creation",  desc:"Mid complexity · re-master & copy extraction" },
  { key:"globalRollout", label:"3. Global Rollout Invitation",  desc:"Country rollout scheduling" },
  { key:"translation",   label:"4+5. Translation",              desc:"Salsify PDP + Asset (concurrent)" },
  { key:"production",    label:"6. Production",                 desc:"Complexity × asset volume · revision rounds" },
  { key:"operaUpload",   label:"7. Opera Upload",               desc:"Upload assets to Opera DAM" },
  { key:"syndication",   label:"8. Syndication",                desc:"Salsify enrichment · EAN count × complexity" },
];

const TABS = ["📊 Capacity","📈 Forecast","🤖 Automation","🗂 Volume","🔢 SLA Calc","👥 Team Manager"];
const DEFAULT_AUTO = { LLD:{simplePct:0.70,goLiveMonth:"Apr"}, LDB:{simplePct:0.50,goLiveMonth:"Jun"}, PPD:{simplePct:0.50,goLiveMonth:"Jun"} };

function stageActive(pt, key) { return (SK_IDX[key]||[]).some(i=>pt.stages[i]); }
function getDefaultDays(ptId, cplx, aBand, eanBand, syndCplx, withCF) {
  const pt = PT_BASE.find(p=>p.id===ptId); if (!pt) return {};
  return {
    missingDMI:   pt.stages[0]?(6+(withCF?5:0)):0,
    mastering:    pt.stages[1]?2:0,
    globalRollout:pt.stages[2]?2:0,
    translation:  (pt.stages[3]||pt.stages[4])?(3+(withCF?6:0)):0,
    production:   pt.stages[5]?((PROD_DAYS[cplx]?.[aBand]??9)+(withCF?(PROD_REVS[cplx]??2)*4:0)):0,
    operaUpload:  pt.stages[6]?(OPERA_DAYS[aBand]??1):0,
    syndication:  pt.stages[7]?(SYND_DAYS[syndCplx]?.[eanBand]??4):0,
  };
}
function getWeights(ptId) {
  const w = {"cp-simple":{pm:0.25,des:0.65},"cp-adaptation":{pm:0.28,des:0.62},"cp-creation":{pm:0.25,des:0.65},"retailer":{pm:0.20,des:0.15},"gp-eventing":{pm:0.35,des:0.45},"gp-pdp":{pm:0.35,des:0.45},"lp-eventing":{pm:0.28,des:0.52},"lp-pdp":{pm:0.28,des:0.52},"urgent":{pm:0.30,des:0.65}};
  return w[ptId]||{pm:0.28,des:0.62};
}

let _nextId = 400;

export default function App() {
  const [roster,           setRoster]          = useState(DEFAULT_ROSTER);
  const [mix,              setMix]             = useState(DEFAULT_MIX);
  const [slaOv,            setSlaOv]           = useState({});
  const [utilPM,           setUtilPM]          = useState(82);
  const [utilDes,          setUtilDes]         = useState(82);
  const [manualRate,       setManualRate]      = useState(25);
  // ── CHANGE: two new inputs replace the old projectsPerPM slider ──────────
  const [pmHoursPerWeek,   setPmHoursPerWeek]  = useState(40);   // total working hours/week
  const [hoursPerProject,  setHoursPerProject] = useState(2.5);  // avg hrs a PM spends per project per week
  // projectsPerPM is now DERIVED — not stored as state
  // ─────────────────────────────────────────────────────────────────────────
  const [periodIdx,        setPeriodIdx]       = useState(0);
  const [calcCplx,         setCalcCplx]        = useState("Complex");
  const [eanBand,          setEanBand]         = useState("1-5 EANs");
  const [syndCplx,         setSyndCplx]        = useState("Simple");
  const [clientDays,       setClientDays]      = useState(true);
  const [activeTab,        setActiveTab]       = useState("📊 Capacity");
  const [divFilter,        setDivFilter]       = useState("All");
  const [calcType,         setCalcType]        = useState("cp-adaptation");
  const [calcAssetBand,    setCalcAssetBand]   = useState("30-50");
  const [tmSearch,         setTmSearch]        = useState("");
  const [tmDiv,            setTmDiv]           = useState("All");
  const [tmType,           setTmType]          = useState("All");
  const [tmRole,           setTmRole]          = useState("All");
  const [showAdd,          setShowAdd]         = useState(false);
  const [newP,             setNewP]            = useState({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",startDate:"now",endDate:"never"});
  const [editId,           setEditId]          = useState(null);
  const [editData,         setEditData]        = useState({});
  const [dbStatus,         setDbStatus]        = useState(hasSupabase?"loading":"offline");
  const [saving,           setSaving]          = useState(false);
  const [prevMonths,       setPrevMonths]      = useState(1);
  const [forecastDiv,      setForecastDiv]     = useState("Total");
  const [projView,         setProjView]        = useState("Total");
  const [actuals,          setActuals]         = useState(FM.map(m=>({month:m.month,actualAssets:0,actualLdb:0,actualPpd:0,actualLld:0})));
  const [autoEnabled,      setAutoEnabled]     = useState(true);
  const [autoConfig,       setAutoConfig]      = useState(DEFAULT_AUTO);
  const [autoQCRate,       setAutoQCRate]      = useState(200);
  const [autoScenario,     setAutoScenario]    = useState("with");

  const period = PERIODS[periodIdx];
  const WD = period.workingDays;

  // ── DERIVED: concurrent projects per PM ───────────────────────────────────
  // Formula: floor( (hours/week × utilisation%) ÷ hours per project )
  // Minimum 1 to avoid division issues
  const projectsPerPM = useMemo(()=>{
    const available = pmHoursPerWeek * (utilPM / 100);
    return Math.max(1, Math.floor(available / hoursPerProject));
  },[pmHoursPerWeek, hoursPerProject, utilPM]);

  // Available productive hours per PM per week (for display)
  const availableHoursPerPM = +(pmHoursPerWeek * (utilPM/100)).toFixed(1);

  const updateAuto = (div,field,val) => setAutoConfig(p=>({...p,[div]:{...p[div],[field]:val}}));
  const PT = useMemo(()=>PT_BASE.map(pt=>({...pt, autoEligible: mix.find(x=>x.id===pt.id)?.autoEligible??false})),[mix]);

  const saveSettings = useCallback(async updates => {
    if (!hasSupabase) return;
    await sbUpsert("settings", Object.entries(updates).map(([key,value])=>({key,value:String(value)})));
  },[]);

  useEffect(()=>{
    if (!hasSupabase) { setDbStatus("offline"); return; }
    (async()=>{
      setDbStatus("loading");
      try {
        const{data:rD}=await sbSelect("roster");
        if(rD&&rD.length) setRoster(rD.map(p=>({...p,startDate:p.startDate||"now",endDate:p.endDate||"never"})));
        else await sbUpsert("roster",DEFAULT_ROSTER);
        const{data:mD}=await sbSelect("project_mix");
        if(mD&&mD.length) setMix(mD.map(m=>({...m,
          assetsLDB:m.assetsLDB??DEFAULT_MIX.find(d=>d.id===m.id)?.assetsLDB??40,
          assetsPPD:m.assetsPPD??DEFAULT_MIX.find(d=>d.id===m.id)?.assetsPPD??40,
          assetsLLD:m.assetsLLD??DEFAULT_MIX.find(d=>d.id===m.id)?.assetsLLD??50,
          autoEligible:m.autoEligible??DEFAULT_MIX.find(d=>d.id===m.id)?.autoEligible??false,
        })));
        else await sbUpsert("project_mix",DEFAULT_MIX);
        const{data:sD}=await sbSelect("sla_overrides");
        if(sD&&sD.length){const ov={};sD.forEach(r=>{if(!ov[r.pt_id])ov[r.pt_id]={};ov[r.pt_id][r.stage_key]=r.days;});setSlaOv(ov);}
        const{data:stD}=await sbSelect("settings");
        if(stD&&stD.length) stD.forEach(s=>{
          if(s.key==="utilPM")setUtilPM(+s.value);
          if(s.key==="utilDes")setUtilDes(+s.value);
          if(s.key==="manualRate")setManualRate(+s.value);
          if(s.key==="pmHoursPerWeek")setPmHoursPerWeek(+s.value);
          if(s.key==="hoursPerProject")setHoursPerProject(+s.value);
          if(s.key==="periodIdx")setPeriodIdx(+s.value);
          if(s.key==="eanBand")setEanBand(s.value);
          if(s.key==="syndCplx")setSyndCplx(s.value);
          if(s.key==="clientDays")setClientDays(s.value==="true");
          if(s.key==="autoQCRate")setAutoQCRate(+s.value);
        });
        setDbStatus("connected");
      } catch { setDbStatus("error"); }
    })();
  },[]);

  useMemo(()=>{
    if(period.months!==prevMonths){
      const sc=period.months/prevMonths;
      setMix(prev=>{const u=prev.map(m=>({...m,LDB:Math.round(m.LDB*sc),PPD:Math.round(m.PPD*sc),LLD:Math.round(m.LLD*sc)}));if(hasSupabase)sbUpsert("project_mix",u);return u;});
      setPrevMonths(period.months);
    }
  },[period.months]);

  const updateMixCount  = async(id,div,val)=>{const u=mix.map(m=>m.id===id?{...m,[div]:Math.max(0,val)}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const updateMixAssets = async(id,dk,val)=>{const u=mix.map(m=>m.id===id?{...m,[dk]:Math.max(1,val)}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const toggleAuto      = async id=>{const u=mix.map(m=>m.id===id?{...m,autoEligible:!m.autoEligible}:m);setMix(u);if(hasSupabase){setSaving(true);await sbUpsert("project_mix",u.find(m=>m.id===id));setSaving(false);}};
  const addPerson       = async()=>{if(!newP.name.trim())return;const p={...newP,id:++_nextId,removed:false};setRoster(prev=>[...prev,p]);setShowAdd(false);setNewP({name:"",role:"Project Manager",family:"PM / Delivery",type:"FTE",division:"LDB",status:"Active",startDate:"now",endDate:"never"});if(hasSupabase){setSaving(true);await sbUpsert("roster",[p]);setSaving(false);}};
  const removePerson    = async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:true}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:true});setSaving(false);}};
  const restorePerson   = async id=>{setRoster(prev=>prev.map(p=>p.id===id?{...p,removed:false}:p));if(hasSupabase){setSaving(true);await sbPatch("roster",`id=eq.${id}`,{removed:false});setSaving(false);}};
  const startEdit       = p=>{setEditId(p.id);setEditData({...p,startDate:p.startDate||"now",endDate:p.endDate||"never"});};
  const saveEdit        = async()=>{setRoster(prev=>prev.map(p=>p.id===editId?{...p,...editData}:p));setEditId(null);if(hasSupabase){setSaving(true);await sbUpsert("roster",[editData]);setSaving(false);}};
  const setOv           = async(ptId,key,val)=>{const d=Math.max(0,parseInt(String(val))||0);setSlaOv(prev=>({...prev,[ptId]:{...(prev[ptId]||{}),[key]:d}}));if(hasSupabase){setSaving(true);await sbUpsert("sla_overrides",[{pt_id:ptId,stage_key:key,days:d}]);setSaving(false);}};
  const resetOv         = async id=>{setSlaOv(prev=>{const n={...prev};delete n[id];return n;});if(hasSupabase){setSaving(true);await sbDelete("sla_overrides",`pt_id=eq.${id}`);setSaving(false);}};
  const hasOv           = id=>!!(slaOv[id]&&Object.keys(slaOv[id]).length);
  const updateActualFn  = (i,field,val)=>setActuals(prev=>prev.map((a,idx)=>idx===i?{...a,[field]:Math.max(0,parseInt(val)||0)}:a));

  const capacityRoster = useMemo(()=>roster.filter(p=>!p.removed&&p.status==="Active"),[roster]);

  const poolsByDiv = useMemo(()=>{
    const res={};
    DIVS.forEach(div=>{
      const sum=arr=>arr.reduce((s,p)=>s+availFrac(p.startDate,p.endDate,WD),0);
      const pmF  =capacityRoster.filter(p=>p.role==="Project Manager"    &&p.type==="FTE"      &&p.division===div);
      const pmFL =capacityRoster.filter(p=>p.role==="Project Manager"    &&p.type==="Freelance"&&p.division===div);
      const dF   =capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE"      &&p.division===div);
      const dFL  =capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance"&&p.division===div);
      res[div]={
        pm:  {fte:pmF.length, fl:pmFL.length, total:pmF.length+pmFL.length, efte:sum(pmF)+sum(pmFL)},
        des: {fte:dF.length,  fl:dFL.length,  total:dF.length+dFL.length,  efteFTE:sum(dF), efteFL:sum(dFL), efte:sum(dF)+sum(dFL)},
      };
    });
    res["All"]={
      pm:  {fte:DIVS.reduce((s,d)=>s+res[d].pm.fte,0), fl:DIVS.reduce((s,d)=>s+res[d].pm.fl,0), total:DIVS.reduce((s,d)=>s+res[d].pm.total,0), efte:DIVS.reduce((s,d)=>s+res[d].pm.efte,0)},
      des: {fte:DIVS.reduce((s,d)=>s+res[d].des.fte,0),fl:DIVS.reduce((s,d)=>s+res[d].des.fl,0),total:DIVS.reduce((s,d)=>s+res[d].des.total,0),efteFTE:DIVS.reduce((s,d)=>s+res[d].des.efteFTE,0),efteFL:DIVS.reduce((s,d)=>s+res[d].des.efteFL,0),efte:DIVS.reduce((s,d)=>s+res[d].des.efte,0)},
    };
    return res;
  },[capacityRoster,WD]);

  const activePools = useMemo(()=>{
    const res={};
    [...DIVS,"All"].forEach(div=>{
      const hc=poolsByDiv[div];
      res[div]={pm:Math.round((hc.pm.efte||0)*WD*(utilPM/100)), des:Math.round((hc.des.efte||0)*WD*(utilDes/100))};
    });
    return res;
  },[poolsByDiv,WD,utilPM,utilDes]);

  const calcSlaMap = useMemo(()=>{
    const m={};
    PT_BASE.forEach(pt=>{
      const defs=getDefaultDays(pt.id,calcCplx,calcAssetBand,eanBand,syndCplx,clientDays);
      const bd={};let total=0;
      SK.forEach(k=>{const d=slaOv[pt.id]?.[k]!==undefined?slaOv[pt.id][k]:defs[k]??0;bd[k]=d;total+=d;});
      const w=getWeights(pt.id);
      m[pt.id]={total,breakdown:bd,defaults:defs,pmDays:Math.round(total*w.pm),desDays:Math.round(total*w.des)};
    });
    return m;
  },[calcCplx,calcAssetBand,eanBand,syndCplx,clientDays,slaOv]);

  const mixAnalysis = useMemo(()=>DIVS.map(div=>{
    let tPM=0,tDes=0,tProj=0,tAssets=0;
    const rows=mix.map(m=>{
      const pt=PT.find(p=>p.id===m.id);
      const cnt=m[div]||0, assets=m[ASSET_KEY[div]]||0, sla=calcSlaMap[m.id];
      tPM+=(sla?.pmDays||0)*cnt; tDes+=(sla?.desDays||0)*cnt; tProj+=cnt; tAssets+=assets*cnt;
      return{id:m.id,label:pt?.label||m.id,count:cnt,assets:assets*cnt,color:pt?.color||"#666",autoEligible:m.autoEligible};
    });
    return{div,rows,tPM,tDes,tProj,tAssets};
  }),[mix,calcSlaMap,PT]);

  const combined = useMemo(()=>{
    const a={div:"All",tPM:0,tDes:0,tProj:0,tAssets:0};
    mixAnalysis.forEach(d=>{a.tPM+=d.tPM;a.tDes+=d.tDes;a.tProj+=d.tProj;a.tAssets+=d.tAssets;});
    return a;
  },[mixAnalysis]);

  const rag = u => u<=85?{dot:"🟢",bg:"bg-green-50",brd:"border-green-200",tx:"text-green-700",bar:"bg-green-500"}
                  :u<=100?{dot:"🟡",bg:"bg-amber-50",brd:"border-amber-200",tx:"text-amber-700",bar:"bg-amber-400"}
                  :       {dot:"🔴",bg:"bg-red-50",  brd:"border-red-200",  tx:"text-red-700",  bar:"bg-red-500"};
  const uc   = (d,a) => a>0?Math.round((d/a)*100):0;
  const getA = d => d==="All"?combined:(mixAnalysis.find(x=>x.div===d)||combined);
  const cur=getA(divFilter), ap=activePools[divFilter]||activePools["All"];
  const uPM=uc(cur.tPM,ap.pm), uDes=uc(cur.tDes,ap.des);

  const globalHC  = poolsByDiv["All"];
  const totalPMs  = globalHC.pm.efte||0;
  const fteDes    = capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="FTE").length;
  const flDes     = capacityRoster.filter(p=>p.role==="Integrated Designer"&&p.type==="Freelance").length;
  const ftePM     = capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="FTE").length;
  const flPM      = capacityRoster.filter(p=>p.role==="Project Manager"&&p.type==="Freelance").length;
  const manualCap = Math.round((globalHC.des.efte||0)*21*(utilDes/100)*manualRate);
  const totalTeamPMCap = Math.round(totalPMs * projectsPerPM * (utilPM/100));

  const monthlyCap = useMemo(()=>FM.map(fm=>{
    const ua=autoEnabled&&autoScenario==="with";
    const lr=ua?blendedRate("LLD",fm.month,autoConfig,autoQCRate,manualRate):manualRate;
    const br=ua?blendedRate("LDB",fm.month,autoConfig,autoQCRate,manualRate):manualRate;
    const pr=ua?blendedRate("PPD",fm.month,autoConfig,autoQCRate,manualRate):manualRate;
    const lld=Math.round((poolsByDiv["LLD"].des.efte||0)*21*(utilDes/100)*lr);
    const ldb=Math.round((poolsByDiv["LDB"].des.efte||0)*21*(utilDes/100)*br);
    const ppd=Math.round((poolsByDiv["PPD"].des.efte||0)*21*(utilDes/100)*pr);
    const lldM=Math.round((poolsByDiv["LLD"].des.efte||0)*21*(utilDes/100)*manualRate);
    const ldbM=Math.round((poolsByDiv["LDB"].des.efte||0)*21*(utilDes/100)*manualRate);
    const ppdM=Math.round((poolsByDiv["PPD"].des.efte||0)*21*(utilDes/100)*manualRate);
    const anyAuto=isAutoLive("LLD",fm.month,autoConfig)||isAutoLive("LDB",fm.month,autoConfig)||isAutoLive("PPD",fm.month,autoConfig);
    const manT=lldM+ldbM+ppdM, autoT=lld+ldb+ppd;
    return{month:fm.month,total:autoT,lld,ldb,ppd,manualTotal:manT,
      lldAuto:isAutoLive("LLD",fm.month,autoConfig),ldbAuto:isAutoLive("LDB",fm.month,autoConfig),ppdAuto:isAutoLive("PPD",fm.month,autoConfig),
      anyAuto,uplift:Math.round((autoT/manT-1)*100),
      preAutoCapacity:anyAuto?null:manT, postAutoCapacity:anyAuto?autoT:null};
  }),[poolsByDiv,utilDes,autoEnabled,autoScenario,autoConfig,autoQCRate,manualRate]);

  const pmAnalysis = useMemo(()=>FM.map(fm=>{
    const teamCap = Math.round(totalPMs * projectsPerPM * (utilPM/100));
    const demand = fm.monthlyForecast;
    const oliverTotalCap = fm.permPMMonthly + fm.flyPMMonthly;
    const teamCoverPct   = demand>0?Math.round((teamCap/demand)*100):0;
    const oliverCoverPct = demand>0?Math.round((oliverTotalCap/demand)*100):0;
    const teamGap = teamCap - demand;
    const teamReqPerPM = totalPMs>0?(demand/totalPMs).toFixed(1):"—";
    return{...fm, teamCap, demand, oliverTotalCap, teamCoverPct, oliverCoverPct, teamGap, teamReqPerPM};
  }),[totalPMs,projectsPerPM,utilPM]);

  const forecastChartData = FM.map((fm,i)=>{
    const a=actuals[i], mc=monthlyCap[i];
    return{...fm,
      capacityTotal:mc?.total||0, capacityLdb:mc?.ldb||0, capacityPpd:mc?.ppd||0, capacityLld:mc?.lld||0,
      manualCapacity:mc?.manualTotal||0, lldAuto:mc?.lldAuto, ldbAuto:mc?.ldbAuto, ppdAuto:mc?.ppdAuto,
      anyAuto:mc?.anyAuto, preAutoCapacity:mc?.preAutoCapacity, postAutoCapacity:mc?.postAutoCapacity,
      actualAssets:a.actualAssets||null, actualLdb:a.actualLdb||null, actualPpd:a.actualPpd||null, actualLld:a.actualLld||null,
    };
  });

  const activeForecastData = useMemo(()=>forecastChartData.map(d=>{
    if(forecastDiv==="LDB") return{...d,targetAssets:d.ldb,capacityLine:d.capacityLdb,actualAssets:d.actualLdb};
    if(forecastDiv==="PPD") return{...d,targetAssets:d.ppd,capacityLine:d.capacityPpd,actualAssets:d.actualPpd};
    if(forecastDiv==="LLD") return{...d,targetAssets:d.lld,capacityLine:d.capacityLld,actualAssets:d.actualLld};
    return{...d,targetAssets:d.gt,capacityLine:d.capacityTotal,actualAssets:d.actualAssets};
  }),[forecastChartData,forecastDiv]);

  const divSummaryData = DIVS.map(div=>{const a=mixAnalysis.find(x=>x.div===div),p=activePools[div];return{name:div,Projects:a.tProj,Assets:Math.round(a.tAssets),PMUtil:uc(a.tPM,p.pm),DesUtil:uc(a.tDes,p.des)};});
  const calcPt  = PT.find(p=>p.id===calcType);
  const calcSla = calcSlaMap[calcType];

  const tmFiltered = useMemo(()=>roster.filter(p=>{
    if(tmDiv!=="All"&&p.division!==tmDiv) return false;
    if(tmType!=="All"&&p.type!==tmType) return false;
    if(tmRole!=="All"&&p.role!==tmRole) return false;
    if(tmSearch&&!p.name.toLowerCase().includes(tmSearch.toLowerCase())) return false;
    return true;
  }),[roster,tmSearch,tmDiv,tmType,tmRole]);

  const DIV_PROJ_KEY = {LDB:"ldbProj",PPD:"ppdProj",LLD:"lldProj"};
  const pendingStarters = useMemo(()=>capacityRoster.filter(p=>p.startDate&&p.startDate!=="now"&&new Date(p.startDate)>new Date()).sort((a,b)=>new Date(a.startDate)-new Date(b.startDate)),[capacityRoster]);
  const pendingLeavers  = useMemo(()=>capacityRoster.filter(p=>p.endDate&&p.endDate!=="never"&&new Date(p.endDate)>new Date()).sort((a,b)=>new Date(a.endDate)-new Date(b.endDate)),[capacityRoster]);

  return (
    <div className="bg-gray-50 min-h-screen font-sans">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-4">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">L'Oréal eCommerce Programme · Global Programme Director</p>
            <h1 className="text-xl font-black mt-0.5">Capacity & Volume Planning Tool</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              PMs: {globalHC.pm.total} ({ftePM}F+{flPM}FL) · Designers: {globalHC.des.total} ({fteDes}F+{flDes}FL)
              · {manualRate}/day · {availableHoursPerPM}h/PM/wk ÷ {hoursPerProject}h/proj = <span className="text-blue-300 font-bold">{projectsPerPM} concurrent</span>
              {pendingStarters.length>0&&<span className="text-amber-400"> · ⏳{pendingStarters.length}</span>}
              {pendingLeavers.length>0&&<span className="text-red-400"> · 🔴{pendingLeavers.length}</span>}
            </p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${dbStatus==="connected"?"bg-green-100 text-green-700":dbStatus==="offline"?"bg-gray-100 text-gray-500":"bg-red-100 text-red-600"}`}>
            <div className={`w-2 h-2 rounded-full ${dbStatus==="connected"?"bg-green-500":dbStatus==="offline"?"bg-gray-400":"bg-red-400"}`}/>
            {dbStatus==="connected"?"🟢 Supabase":dbStatus==="offline"?"⚪ Offline":"❌ DB error"}
            {saving&&<span className="ml-1 opacity-70">Saving…</span>}
          </div>
        </div>
      </div>

      {/* GLOBAL SETTINGS */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">⚙️ Global Settings</p>

        {/* Period */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-bold text-blue-700 uppercase">📅 Planning Period</p>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map((p,i)=>(
                <button key={p.label} onClick={()=>{setPeriodIdx(i);saveSettings({periodIdx:i});}}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border ${periodIdx===i?"bg-blue-600 text-white border-blue-600":"bg-white text-blue-600 border-blue-300"}`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-right bg-white border border-blue-200 rounded-xl px-4 py-2">
              <p className="text-xs text-blue-500">Working Days</p>
              <p className="text-2xl font-black text-blue-700">{WD}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 mb-3">
          {/* PM Utilisation */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-0.5">PM Util: {utilPM}%</label>
            <input type="range" min={60} max={95} value={utilPM} onChange={e=>{setUtilPM(+e.target.value);saveSettings({utilPM:+e.target.value});}} className="w-full accent-blue-600"/>
          </div>

          {/* Designer Utilisation */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-0.5">Designer Util: {utilDes}%</label>
            <input type="range" min={60} max={95} value={utilDes} onChange={e=>{setUtilDes(+e.target.value);saveSettings({utilDes:+e.target.value});}} className="w-full accent-purple-600"/>
          </div>

          {/* Manual Throughput */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
            <label className="text-xs font-bold text-orange-700 block mb-0.5">Manual Throughput: <span className="font-black">{manualRate}/day</span></label>
            <input type="range" min={10} max={50} value={manualRate} onChange={e=>{setManualRate(+e.target.value);saveSettings({manualRate:+e.target.value});}} className="w-full accent-orange-600"/>
            <div className="flex justify-between text-xs text-orange-400 mt-0.5"><span>10</span><span>25</span><span>50</span></div>
            <p className="text-xs text-orange-600 mt-1">Asset cap: <strong>{manualCap.toLocaleString()}/mo</strong></p>
          </div>

          {/* ── CHANGE: PM Capacity model — replaces old concurrent projects slider ── */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 row-span-2">
            <p className="text-xs font-bold text-blue-700 mb-2 uppercase">PM Capacity Model</p>

            {/* Working hours per week */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-blue-700 block mb-0.5">
                Working hours/week: <span className="font-black">{pmHoursPerWeek}h</span>
              </label>
              <input type="range" min={35} max={45} step={0.5} value={pmHoursPerWeek}
                onChange={e=>{setPmHoursPerWeek(+e.target.value);saveSettings({pmHoursPerWeek:+e.target.value});}}
                className="w-full accent-blue-600"/>
              <div className="flex justify-between text-xs text-blue-400 mt-0.5"><span>35h</span><span>40h</span><span>45h</span></div>
            </div>

            {/* Hours per project per week */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-blue-700 block mb-0.5">
                Hrs/project/week: <span className="font-black">{hoursPerProject}h</span>
              </label>
              <input type="range" min={0.5} max={8} step={0.5} value={hoursPerProject}
                onChange={e=>{setHoursPerProject(+e.target.value);saveSettings({hoursPerProject:+e.target.value});}}
                className="w-full accent-blue-600"/>
              <div className="flex justify-between text-xs text-blue-400 mt-0.5"><span>0.5h</span><span>2.5h</span><span>8h</span></div>
            </div>

            {/* Derived result — prominent display */}
            <div className="bg-blue-600 rounded-xl p-3 text-white text-center">
              <p className="text-xs opacity-80 mb-1">Concurrent projects/PM</p>
              <p className="text-3xl font-black leading-none">{projectsPerPM}</p>
              <p className="text-xs opacity-70 mt-1">= {availableHoursPerPM}h available ÷ {hoursPerProject}h/proj</p>
              <div className="mt-2 pt-2 border-t border-blue-500">
                <p className="text-xs opacity-80">Team PM cap/mo</p>
                <p className="text-xl font-black">{totalTeamPMCap.toLocaleString()}</p>
                <p className="text-xs opacity-60">{Math.round(totalPMs)} PMs × {projectsPerPM} × {utilPM}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-6 mb-3 flex-wrap">
          <div><label className="text-xs font-semibold text-gray-700 block mb-1">Client Feedback</label><div className="flex gap-1">{[{l:"Realistic",v:true},{l:"Best Case",v:false}].map(o=>(<button key={o.l} onClick={()=>{setClientDays(o.v);saveSettings({clientDays:o.v});}} className={`px-2 py-1 text-xs rounded font-semibold ${clientDays===o.v?"bg-amber-500 text-white":"bg-gray-100 text-gray-600"}`}>{o.l}</button>))}</div></div>
          <div><label className="text-xs font-semibold text-gray-700 block mb-1">EAN Band</label><div className="flex gap-1">{["1-5 EANs","5-10 EANs","10-15 EANs"].map(b=>(<button key={b} onClick={()=>{setEanBand(b);saveSettings({eanBand:b});}} className={`px-2 py-0.5 text-xs rounded font-semibold ${eanBand===b?"bg-teal-600 text-white":"bg-gray-100 text-gray-600"}`}>{b.replace(" EANs","")}</button>))}</div></div>
          <div><label className="text-xs font-semibold text-gray-700 block mb-1">Syndication Complexity</label><div className="flex gap-1">{["Simple","Mid","Complex"].map(c=>(<button key={c} onClick={()=>{setSyndCplx(c);saveSettings({syndCplx:c});}} className={`px-2 py-0.5 text-xs rounded font-semibold ${syndCplx===c?"bg-green-600 text-white":"bg-gray-100 text-gray-600"}`}>{c}</button>))}</div></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {DIVS.map(div=>{
            const hc=poolsByDiv[div], mc=monthlyCap[0];
            const dc=div==="LDB"?mc?.ldb:div==="PPD"?mc?.ppd:mc?.lld;
            return(
              <div key={div} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-black uppercase mb-2" style={{color:DIV_COLORS[div]}}>{div} — {period.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center"><p className="text-xs text-blue-500">PMs</p><p className="text-lg font-black text-blue-700">{hc.pm.total}</p><p className="text-xs text-blue-400">{hc.pm.fte}F·{hc.pm.fl}FL</p></div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center"><p className="text-xs text-purple-500">Designers</p><p className="text-lg font-black text-purple-700">{hc.des.total}</p><p className="text-xs text-purple-400">{hc.des.fte}F·{hc.des.fl}FL</p></div>
                </div>
                <p className="text-xs text-center mt-1.5 text-gray-500 font-semibold">Cap: {(dc||0).toLocaleString()}/mo assets</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* TABS */}
      <div className="px-5 pt-3 flex gap-2 flex-wrap border-b border-gray-200 bg-white">
        {TABS.map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} className={`px-4 py-2 text-sm font-semibold rounded-t-lg ${activeTab===t?"bg-blue-600 text-white":"text-gray-600 hover:text-gray-900"}`}>{t}</button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-w-6xl mx-auto">

        {(activeTab==="📊 Capacity"||activeTab==="🗂 Volume")&&(
          <div className="flex items-center gap-2 flex-wrap">
            {["All","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setDivFilter(d)} className={`px-3 py-1 rounded-full text-xs font-bold ${divFilter===d?"bg-gray-900 text-white":"bg-white text-gray-600 border border-gray-300"}`}>{d}</button>))}
            <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">📅 {period.label}</span>
          </div>
        )}

        {/* ══ CAPACITY ══ */}
        {activeTab==="📊 Capacity"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[{label:`Projects (${divFilter})`,val:cur.tProj,unit:"projects",bg:"bg-blue-600 text-white"},{label:`Assets (${divFilter})`,val:cur.tAssets.toLocaleString(),unit:"assets",bg:"bg-indigo-600 text-white"},{label:`PM Util — ${divFilter}`,val:`${uPM}%`,unit:rag(uPM).dot,bg:`${rag(uPM).bg} ${rag(uPM).tx} border ${rag(uPM).brd}`},{label:`Designer Util — ${divFilter}`,val:`${uDes}%`,unit:rag(uDes).dot,bg:`${rag(uDes).bg} ${rag(uDes).tx} border ${rag(uDes).brd}`}].map(k=>(
                <div key={k.label} className={`rounded-xl p-3 text-center ${k.bg}`}><p className="text-xs font-semibold opacity-80 leading-tight">{k.label}</p><p className="text-2xl font-black">{k.val}</p><p className="text-xs opacity-70">{k.unit}</p></div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">Utilisation — {divFilter} · {period.label}</h2>
              {[{label:"Project Managers",demand:cur.tPM,avail:ap.pm,u:uPM,hc:poolsByDiv[divFilter==="All"?"All":divFilter].pm},{label:"Integrated Designers",demand:cur.tDes,avail:ap.des,u:uDes,hc:poolsByDiv[divFilter==="All"?"All":divFilter].des}].map(r=>{
                const rg=rag(r.u);
                return(<div key={r.label} className="mb-5"><div className="flex justify-between mb-1"><span className="text-sm font-semibold text-gray-700">{r.label} <span className="text-xs text-gray-400">({r.hc.total} · {r.avail}d avail)</span></span><span className={`text-sm font-black ${rg.tx}`}>{rg.dot} {r.u}%</span></div><div className="w-full bg-gray-100 rounded-full h-3"><div className={`h-3 rounded-full ${rg.bar}`} style={{width:`${Math.min(r.u,100)}%`}}/></div>{r.u>100&&<p className="text-xs text-red-600 mt-0.5">⚠️ Over by {r.u-100}%</p>}</div>);
              })}
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
              <div>
                <p className="text-xs text-gray-400 uppercase font-bold mb-0.5">Data Source</p>
                <p className="text-xs text-gray-300">Oliver tab · GRAND TOTAL LLD 50% March · Jan–Dec 2026</p>
                <p className="text-xs text-gray-500 mt-0.5">Monthly projects = Oliver weekly × weeks · PM cap = {Math.round(totalPMs)} PMs × {projectsPerPM} concurrent ({availableHoursPerPM}h ÷ {hoursPerProject}h/proj) × {utilPM}%</p>
              </div>
              <div className="flex gap-3 ml-auto flex-wrap">
                {[{l:"Manual cap/mo",v:manualCap.toLocaleString(),c:"orange"},{l:"Apr cap",v:(monthlyCap[3]?.total||0).toLocaleString(),c:"green"},{l:"Jun cap",v:(monthlyCap[5]?.total||0).toLocaleString(),c:"green"},{l:"Team PM cap/mo",v:totalTeamPMCap.toLocaleString(),c:"blue"}].map(s=>(
                  <div key={s.l} className="bg-gray-800 rounded-lg px-3 py-1.5 text-center"><p className="text-xs text-gray-400">{s.l}</p><p className={`text-sm font-black text-${s.c}-400`}>{s.v}</p></div>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs font-bold text-gray-500 uppercase">Scenario:</p>
              {[{l:"🤖 With Automation",v:"with"},{l:"Manual Baseline",v:"without"}].map(s=>(<button key={s.v} onClick={()=>setAutoScenario(s.v)} className={`px-4 py-2 text-xs font-bold rounded-lg border ${autoScenario===s.v?"bg-gray-900 text-white border-gray-900":"bg-white text-gray-600 border-gray-300"}`}>{s.l}</button>))}
              <p className="text-xs font-bold text-gray-500 uppercase ml-4">Asset view:</p>
              {["Total","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setForecastDiv(d)} className={`px-3 py-1 rounded-full text-xs font-bold ${forecastDiv===d?"text-white":"bg-white text-gray-600 border border-gray-300"}`} style={forecastDiv===d?{background:d==="Total"?"#1f2937":DIV_COLORS[d]}:{}}>{d}</button>))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-1">Asset Volume — {forecastDiv==="Total"?"All Divisions":forecastDiv} · Jan–Dec 2026</h2>
              <p className="text-xs text-gray-400 mb-3">{autoScenario==="with"?`🤖 Capacity steps up at go-live · Manual: ${manualRate}/day → QC: ${autoQCRate}/day`:`Manual baseline — ${manualRate}/day`}</p>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={activeForecastData} margin={{top:5,right:20,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/>
                  <Tooltip formatter={(v,n)=>[typeof v==="number"?v.toLocaleString():v,n]}/><Legend/>
                  <Bar dataKey="targetAssets" name="Asset Target" fill={forecastDiv==="LDB"?DIV_COLORS.LDB:forecastDiv==="PPD"?DIV_COLORS.PPD:forecastDiv==="LLD"?DIV_COLORS.LLD:"#6366f1"} radius={[3,3,0,0]} opacity={0.75}/>
                  {autoScenario==="with"&&<Line type="stepAfter" dataKey="manualCapacity" name={`Manual (${manualRate}/day)`} stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 4" dot={false}/>}
                  <Line type="stepAfter" dataKey="capacityLine" name={autoScenario==="with"?"Capacity with Automation":`Manual (${manualRate}/day)`} stroke="#22c55e" strokeWidth={2.5} dot={false}/>
                  <Line type="monotone" dataKey="actualAssets" name="Actuals" stroke="#f59e0b" strokeWidth={2.5} dot={{r:4}} connectNulls={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* PROJECT VOLUME CARD */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                <div>
                  <h2 className="text-sm font-bold text-gray-800">Project Volume — Oliver Forecast vs PM Capacity</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Monthly demand = Oliver weekly (line 31) × weeks &nbsp;·&nbsp;
                    {projView==="Total"
                      ? `Your team cap = ${Math.round(totalPMs)} PMs × ${projectsPerPM} concurrent × ${utilPM}% util`
                      : `Your team cap = ${Math.round(poolsByDiv[projView]?.pm.efte||0)} ${projView} PMs × ${projectsPerPM} concurrent × ${utilPM}% util`
                    }
                  </p>
                </div>
                <div className="flex gap-1">
                  {["Total","LDB","PPD","LLD"].map(d=>(<button key={d} onClick={()=>setProjView(d)} className={`px-2.5 py-1 text-xs rounded-full font-bold ${projView===d?"text-white":"bg-gray-100 text-gray-600"}`} style={projView===d?{background:d==="Total"?"#1f2937":DIV_COLORS[d]}:{}}>{d}</button>))}
                </div>
              </div>

              {/* Capacity model summary */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 font-semibold">Oliver Forecast Demand</p>
                  <p className="text-lg font-black text-blue-700">Weekly × Weeks</p>
                  <p className="text-xs text-blue-400">from client forecast (line 31)</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-semibold">Oliver PM Capacity</p>
                  <p className="text-lg font-black text-green-700">Perm + Flying (from file)</p>
                  <p className="text-xs text-green-400">Oliver's own capacity projection</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-purple-600 font-semibold">Your Team Capacity</p>
                  <p className="text-lg font-black text-purple-700">
                    {projView==="Total"
                      ? `${Math.round(totalPMs)} PMs × ${projectsPerPM}`
                      : `${Math.round(poolsByDiv[projView]?.pm.efte||0)} ${projView} PMs × ${projectsPerPM}`
                    }
                  </p>
                  <p className="text-xs text-purple-400">{availableHoursPerPM}h avail ÷ {hoursPerProject}h/proj = {projectsPerPM} concurrent</p>
                </div>
              </div>

              {projView==="Total"?(
                <>
                  <div className="grid gap-1 mb-1 text-xs font-bold text-gray-400 uppercase" style={{gridTemplateColumns:"3rem 2rem 4.5rem 4.5rem 3.5rem 4.5rem 3.5rem 3.5rem 4rem"}}>
                    <p>Month</p><p className="text-center">Wks</p>
                    <p className="text-right text-blue-500">Demand</p>
                    <p className="text-right text-green-500">Oliver cap</p>
                    <p className="text-right text-green-400">Oliver%</p>
                    <p className="text-right text-purple-500">Team cap</p>
                    <p className="text-right text-purple-400">Team%</p>
                    <p className="text-right">Req/PM</p>
                    <p className="text-right">Gap</p>
                  </div>
                  <div className="h-px bg-gray-100 mb-2"/>
                  <div className="space-y-2">
                    {pmAnalysis.map(row=>{
                      const oliverRag=row.oliverCoverPct>=100?"text-green-600":row.oliverCoverPct>=75?"text-amber-600":"text-red-600";
                      const teamRag  =row.teamCoverPct>=100?"text-green-600":row.teamCoverPct>=75?"text-amber-600":"text-red-600";
                      const reqRag   =+row.teamReqPerPM>projectsPerPM?"text-red-600":+row.teamReqPerPM>projectsPerPM*0.85?"text-amber-500":"text-green-600";
                      const barC     =row.teamCoverPct>=100?"bg-green-500":row.teamCoverPct>=75?"bg-amber-400":"bg-red-400";
                      return(
                        <div key={row.month}>
                          <div className="grid gap-1 items-center text-xs" style={{gridTemplateColumns:"3rem 2rem 4.5rem 4.5rem 3.5rem 4.5rem 3.5rem 3.5rem 4rem"}}>
                            <span className="font-semibold text-gray-700">{row.month}</span>
                            <span className="text-center text-gray-400">{row.weeksInMonth}w</span>
                            <span className="text-right font-black text-blue-700">{row.demand.toLocaleString()}</span>
                            <span className="text-right font-semibold text-green-600">{row.oliverTotalCap.toLocaleString()}</span>
                            <span className={`text-right font-bold ${oliverRag}`}>{row.oliverCoverPct}%</span>
                            <span className="text-right font-semibold text-purple-600">{row.teamCap.toLocaleString()}</span>
                            <span className={`text-right font-bold ${teamRag}`}>{row.teamCoverPct}%</span>
                            <span className={`text-right font-bold ${reqRag}`}>{row.teamReqPerPM}</span>
                            <span className={`text-right font-bold ${row.teamGap>=0?"text-green-600":"text-red-500"}`}>{row.teamGap>=0?`+${row.teamGap.toLocaleString()}`:row.teamGap.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded h-1.5 mt-0.5"><div className={`h-1.5 rounded ${barC}`} style={{width:`${Math.min(row.teamCoverPct,100)}%`}}/></div>
                          {row.teamGap<0&&<p className="text-xs text-red-500 text-right mt-0.5">Shortfall: {Math.abs(row.teamGap).toLocaleString()} · need ~{Math.ceil(Math.abs(row.teamGap)/projectsPerPM)} more PMs</p>}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-gray-600">PM capacity model</p>
                      <p>{pmHoursPerWeek}h/week × {utilPM}% util = <strong>{availableHoursPerPM}h productive</strong></p>
                      <p>{availableHoursPerPM}h ÷ {hoursPerProject}h/project = <strong className="text-blue-600">{projectsPerPM} concurrent projects/PM</strong></p>
                      <p>{Math.round(totalPMs)} PMs × {projectsPerPM} = <strong className="text-purple-600">{totalTeamPMCap.toLocaleString()} projects/mo cap</strong></p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-600">Jun peak</p>
                      <p>Weekly demand: <strong className="text-blue-600">{FM[5].weeklyForecast} projects</strong></p>
                      <p>Monthly: <strong className="text-blue-600">{FM[5].monthlyForecast.toLocaleString()}</strong> ({FM[5].weeksInMonth} weeks)</p>
                      <p>Req/PM: <strong className={+((FM[5].monthlyForecast/totalPMs)||0).toFixed(1)>projectsPerPM?"text-red-600":"text-green-600"}>{totalPMs>0?(FM[5].monthlyForecast/totalPMs).toFixed(1):"—"}</strong> vs your threshold of <strong>{projectsPerPM}</strong></p>
                    </div>
                  </div>
                </>
              ):(
                <>
                  <div className="grid grid-cols-5 gap-1 mb-1 text-xs font-bold text-gray-400 uppercase">
                    <p>Month</p><p className="text-right">Wkly/Req</p><p className="text-right text-blue-500">Monthly</p>
                    <p className="text-right text-purple-500">Team cap</p><p className="text-right">Cover %</p>
                  </div>
                  <div className="h-px bg-gray-100 mb-2"/>
                  <div className="space-y-1.5">
                    {FM.map(row=>{
                      const divPMs = poolsByDiv[projView]?.pm.efte||0;
                      const monthlyDiv = Math.round(row[DIV_PROJ_KEY[projView]] * row.weeksInMonth);
                      const divTeamCap = Math.round(divPMs * projectsPerPM * (utilPM/100));
                      const pct = monthlyDiv>0?Math.round((divTeamCap/monthlyDiv)*100):0;
                      const reqPerPM = divPMs>0?(monthlyDiv/divPMs).toFixed(1):"—";
                      const ragTx=pct>=100?"text-green-600":pct>=75?"text-amber-600":"text-red-600";
                      const reqRag=+reqPerPM>projectsPerPM?"text-red-600":"text-green-600";
                      const barC=pct>=100?"bg-green-500":pct>=75?"bg-amber-400":"bg-red-400";
                      return(
                        <div key={row.month}>
                          <div className="grid grid-cols-5 gap-1 items-center text-xs">
                            <span className="font-semibold text-gray-700">{row.month}</span>
                            <span className={`text-right font-bold ${reqRag}`}>{row[DIV_PROJ_KEY[projView]]}/wk · {reqPerPM}/PM</span>
                            <span className="text-right font-black" style={{color:DIV_COLORS[projView]}}>{monthlyDiv.toLocaleString()}</span>
                            <span className="text-right font-semibold text-purple-600">{divTeamCap.toLocaleString()}</span>
                            <span className={`text-right font-bold ${ragTx}`}>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded h-1 mt-0.5"><div className={`h-1 rounded ${barC}`} style={{width:`${Math.min(pct,100)}%`}}/></div>
                          {divTeamCap<monthlyDiv&&<p className="text-xs text-red-500 text-right mt-0.5">Gap: {(monthlyDiv-divTeamCap).toLocaleString()}</p>}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    {projView}: {Math.round(poolsByDiv[projView]?.pm.efte||0)} PMs × {projectsPerPM} concurrent ({availableHoursPerPM}h ÷ {hoursPerProject}h/proj) × {utilPM}% = {Math.round((poolsByDiv[projView]?.pm.efte||0)*projectsPerPM*(utilPM/100)).toLocaleString()} cap/mo
                  </p>
                </>
              )}
            </div>

            {/* Asset coverage cards */}
            <div className="grid grid-cols-3 gap-4">
              {[{div:"LDB",capKey:"capacityLdb"},{div:"PPD",capKey:"capacityPpd"},{div:"LLD",capKey:"capacityLld"}].map(({div,capKey})=>(
                <div key={div} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-black text-gray-900 text-sm">{div} — Asset Coverage</h3><span className="text-xs px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">🤖 {autoConfig[div].goLiveMonth}</span></div>
                  <div className="grid grid-cols-4 gap-1 mb-1 text-xs font-bold text-gray-400 uppercase"><p>Mo</p><p className="text-right">Target</p><p className="text-right">Cap</p><p className="text-right">%</p></div>
                  <div className="h-px bg-gray-100 mb-2"/>
                  <div className="space-y-1.5">
                    {forecastChartData.map(row=>{
                      const target=row[div.toLowerCase()],cap=row[capKey],pct=Math.round((cap/target)*100);
                      const isAuto=div==="LLD"?row.lldAuto:div==="LDB"?row.ldbAuto:row.ppdAuto;
                      const ragTx=pct>=200?"text-green-600":pct>=100?"text-green-500":pct>=75?"text-amber-600":"text-red-600";
                      const barC=pct>=100?"bg-green-500":pct>=75?"bg-amber-400":"bg-red-400";
                      return(<div key={row.month}><div className="grid grid-cols-4 gap-1 items-center text-xs"><span className="font-semibold text-gray-700 flex items-center gap-1">{row.month}{isAuto&&autoScenario==="with"&&<span className="text-green-500">🤖</span>}</span><span className="text-right text-gray-500">{target.toLocaleString()}</span><span className="text-right font-semibold text-gray-700">{cap.toLocaleString()}</span><span className={`text-right font-bold ${ragTx}`}>{pct}%</span></div><div className="w-full bg-gray-100 rounded h-1 mt-0.5"><div className={`h-1 rounded ${barC}`} style={{width:`${Math.min(pct,100)}%`}}/></div></div>);
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly detail table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-800">Monthly Detail — Asset Forecast vs Capacity vs Actuals</h2><p className="text-xs text-gray-400">Enter actuals in amber cells</p></div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" style={{tableLayout:"fixed"}}>
                  <colgroup><col style={{width:"44px"}}/><col style={{width:"66px"}}/><col style={{width:"58px"}}/><col style={{width:"56px"}}/><col style={{width:"56px"}}/><col style={{width:"56px"}}/><col style={{width:"56px"}}/><col style={{width:"56px"}}/><col style={{width:"56px"}}/><col style={{width:"28px"}}/></colgroup>
                  <thead>
                    <tr className="text-gray-500 uppercase text-xs bg-gray-50"><th className="py-2 text-left pl-2">Mo</th><th className="py-2 text-center bg-blue-50 text-blue-600" colSpan={2}>Total</th><th className="py-2 text-center" style={{background:DIV_COLORS.LDB+"22",color:DIV_COLORS.LDB}} colSpan={2}>LDB</th><th className="py-2 text-center" style={{background:DIV_COLORS.PPD+"22",color:DIV_COLORS.PPD}} colSpan={2}>PPD</th><th className="py-2 text-center" style={{background:DIV_COLORS.LLD+"22",color:DIV_COLORS.LLD}} colSpan={2}>LLD</th><th></th></tr>
                    <tr className="text-gray-400 text-xs border-b border-gray-200 bg-gray-50"><th className="py-1 pl-2"></th><th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th><th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th><th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th><th className="py-1 text-center">Tgt</th><th className="py-1 text-center text-amber-500">Act</th><th></th></tr>
                  </thead>
                  <tbody>
                    {forecastChartData.map((row,i)=>{
                      const a=actuals[i], cov=Math.round((row.capacityTotal/row.gt)*100);
                      const rd=cov>=200?"🟢🟢":cov>=100?"🟢":cov>=75?"🟡":"🔴";
                      const ap2=a.actualAssets?Math.round((a.actualAssets/row.gt)*100):null;
                      return(
                        <tr key={row.month} className={`border-t border-gray-100 hover:bg-gray-50 ${row.anyAuto&&autoScenario==="with"?"bg-green-50":""}`}>
                          <td className="py-2 pl-2 font-bold text-gray-900">{row.month}{row.anyAuto&&autoScenario==="with"&&<span className="ml-1 text-green-500 text-xs">🤖</span>}</td>
                          <td className="py-2 text-center bg-blue-50"><div className="font-semibold text-blue-700 text-xs">{row.gt.toLocaleString()}</div><div className={`text-xs font-bold ${cov>=100?"text-green-600":cov>=75?"text-amber-500":"text-red-500"}`}>{cov}%</div></td>
                          <td className="py-2"><input type="number" min="0" value={a.actualAssets||""} onChange={e=>updateActualFn(i,"actualAssets",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/>{ap2!==null&&<div className="text-xs font-bold text-amber-600 text-center">{ap2}%</div>}</td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.LDB+"0d"}}><span className="font-semibold text-xs" style={{color:DIV_COLORS.LDB}}>{row.ldb.toLocaleString()}</span></td>
                          <td className="py-2"><input type="number" min="0" value={a.actualLdb||""} onChange={e=>updateActualFn(i,"actualLdb",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.PPD+"0d"}}><span className="font-semibold text-xs" style={{color:DIV_COLORS.PPD}}>{row.ppd.toLocaleString()}</span></td>
                          <td className="py-2"><input type="number" min="0" value={a.actualPpd||""} onChange={e=>updateActualFn(i,"actualPpd",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center" style={{background:DIV_COLORS.LLD+"0d"}}><span className="font-semibold text-xs" style={{color:DIV_COLORS.LLD}}>{row.lld.toLocaleString()}</span></td>
                          <td className="py-2"><input type="number" min="0" value={a.actualLld||""} onChange={e=>updateActualFn(i,"actualLld",e.target.value)} placeholder="—" className="w-full text-center text-xs font-bold border border-amber-300 rounded px-1 py-1 bg-amber-50 text-amber-700 focus:outline-none"/></td>
                          <td className="py-2 text-center text-xs">{rd}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                      <td className="py-2 pl-2">Total</td>
                      <td className="py-2 text-center text-blue-700 bg-blue-50">{FM.reduce((s,m)=>s+m.gt,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualAssets||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.LDB}}>{FM.reduce((s,m)=>s+m.ldb,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLdb||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.PPD}}>{FM.reduce((s,m)=>s+m.ppd,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualPpd||0),0).toLocaleString()}</td>
                      <td className="py-2 text-center" style={{color:DIV_COLORS.LLD}}>{FM.reduce((s,m)=>s+m.lld,0).toLocaleString()}</td>
                      <td className="py-2 text-center text-amber-600">{actuals.reduce((s,a)=>s+(a.actualLld||0),0).toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ AUTOMATION ══ */}
        {activeTab==="🤖 Automation"&&(
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[{label:"Jan–Mar",sub:"Manual only",cap:monthlyCap[0]?.manualTotal||0,color:"bg-gray-600",note:`${manualRate} assets/day`},{label:"Apr–May",sub:"LLD automated",cap:monthlyCap[3]?.total||0,color:"bg-green-600",note:`LLD blended: ${Math.round(autoConfig.LLD.simplePct*autoQCRate+(1-autoConfig.LLD.simplePct)*manualRate)}/day`},{label:"Jun–Dec",sub:"All automated",cap:monthlyCap[5]?.total||0,color:"bg-emerald-600",note:"All divisions blended"}].map(s=>(<div key={s.label} className={`${s.color} text-white rounded-2xl p-5`}><p className="text-xs font-bold uppercase opacity-70 mb-1">{s.label}</p><p className="text-xs opacity-60 mb-2">{s.sub}</p><p className="text-3xl font-black">{s.cap.toLocaleString()}</p><p className="text-xs opacity-70 mt-1">assets/month</p><p className="text-xs opacity-50 mt-2">{s.note}</p></div>))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-gray-800">🤖 Automation Settings</h2><div className="flex items-center gap-3"><span className="text-xs text-gray-500">Automation</span><button onClick={()=>setAutoEnabled(v=>!v)} className={`relative inline-flex h-6 w-11 items-center rounded-full ${autoEnabled?"bg-green-500":"bg-gray-300"}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoEnabled?"translate-x-6":"translate-x-1"}`}/></button><span className={`text-xs font-bold ${autoEnabled?"text-green-600":"text-gray-400"}`}>{autoEnabled?"Enabled":"Disabled"}</span></div></div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4"><div className="flex items-center justify-between mb-2"><div><p className="text-sm font-bold text-green-800">QC Rate</p><p className="text-xs text-green-600">Assets/designer/day via canvas · vs manual: {manualRate}/day · {(autoQCRate/manualRate).toFixed(1)}×</p></div><div className="bg-green-600 text-white rounded-xl px-5 py-2 text-center"><p className="text-xs opacity-80">QC/day</p><p className="text-3xl font-black">{autoQCRate}</p></div></div><input type="range" min={50} max={500} step={25} value={autoQCRate} onChange={e=>{setAutoQCRate(+e.target.value);saveSettings({autoQCRate:+e.target.value});}} className="w-full accent-green-600"/></div>
              <div className="grid grid-cols-3 gap-4">{DIVS.map(div=>{const cfg=autoConfig[div],br=Math.round(cfg.simplePct*autoQCRate+(1-cfg.simplePct)*manualRate);return(<div key={div} className="rounded-xl border border-gray-200 p-4" style={{borderColor:DIV_COLORS[div]+"66"}}><div className="flex items-center justify-between mb-3"><p className="text-sm font-black" style={{color:DIV_COLORS[div]}}>{div}</p>{cfg.goLiveMonth!=="Off"&&<span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{background:DIV_COLORS[div]}}>Go-live: {cfg.goLiveMonth}</span>}</div><div className="mb-3"><label className="text-xs font-semibold text-gray-600 block mb-1">Go-Live Month</label><div className="flex gap-1 flex-wrap">{GO_LIVE_OPTIONS.map(m=>(<button key={m} onClick={()=>updateAuto(div,"goLiveMonth",m)} className={`px-2 py-0.5 text-xs rounded font-semibold ${cfg.goLiveMonth===m?"text-white":"bg-gray-100 text-gray-500"}`} style={cfg.goLiveMonth===m?{background:DIV_COLORS[div]}:{}}>{m}</button>))}</div></div><div className="mb-3"><div className="flex justify-between mb-1"><label className="text-xs font-semibold text-gray-600">Simple %</label><span className="text-sm font-black" style={{color:DIV_COLORS[div]}}>{Math.round(cfg.simplePct*100)}%</span></div><input type="range" min={0} max={1} step={0.05} value={cfg.simplePct} onChange={e=>updateAuto(div,"simplePct",+e.target.value)} className="w-full" style={{accentColor:DIV_COLORS[div]}}/></div><div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-xs text-gray-500 mb-1">Blended rate</p><p className="text-2xl font-black" style={{color:DIV_COLORS[div]}}>{br}</p><p className="text-xs text-gray-400">assets/day</p></div></div>);})}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"><h2 className="text-sm font-bold text-gray-800 mb-4">Project Type — Automation Eligibility</h2><div className="grid grid-cols-3 gap-3">{mix.map(m=>{const pt=PT_BASE.find(p=>p.id===m.id);if(!pt)return null;return(<div key={m.id} className={`rounded-xl border p-3 ${m.autoEligible?"border-green-200 bg-green-50":"border-gray-200 bg-gray-50"}`}><div className="flex items-center justify-between"><div className="flex items-center gap-2 flex-1 min-w-0"><div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:pt.color}}/><span className="text-xs font-semibold text-gray-800 truncate">{pt.label}</span></div><div className="flex items-center gap-1.5 ml-2 flex-shrink-0"><span className={`text-xs font-bold ${m.autoEligible?"text-green-600":"text-gray-400"}`}>{m.autoEligible?"🤖":"Manual"}</span><button onClick={()=>toggleAuto(m.id)} className={`relative inline-flex h-5 w-9 items-center rounded-full ${m.autoEligible?"bg-green-500":"bg-gray-300"}`}><span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${m.autoEligible?"translate-x-4":"translate-x-0.5"}`}/></button></div></div></div>);})}</div></div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"><h2 className="text-sm font-bold text-gray-800 mb-1">Capacity Step-Change — Jan–Dec 2026</h2><p className="text-xs text-gray-400 mb-3">Grey = manual (stops at go-live) · Green = with automation (starts at go-live)</p><ResponsiveContainer width="100%" height={280}><ComposedChart data={forecastChartData} margin={{top:5,right:20,left:0,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="month" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?`${(v/1000).toFixed(0)}k`:v}/><Tooltip formatter={(v,n)=>[typeof v==="number"?v.toLocaleString():v,n]}/><Legend/><Bar dataKey="gt" name="Asset Target" fill="#6366f1" opacity={0.6} radius={[3,3,0,0]}/><Line type="stepAfter" dataKey="preAutoCapacity" name={`Manual (${manualRate}/day)`} stroke="#9ca3af" strokeWidth={2.5} strokeDasharray="5 5" dot={false} connectNulls={false}/><Line type="stepAfter" dataKey="postAutoCapacity" name="Capacity with Automation" stroke="#22c55e" strokeWidth={2.5} dot={false} connectNulls={false}/></ComposedChart></ResponsiveContainer></div>
          </div>
        )}

        {/* ══ VOLUME ══ */}
        {activeTab==="🗂 Volume"&&(
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5"><p className="text-sm font-bold text-blue-800">📅 Project intake — {period.label}</p><p className="text-xs text-blue-500 mt-0.5">Adjust project counts and assets/brief per division. Toggle automation eligibility in the 🤖 tab.</p></div>
            <div className="grid grid-cols-3 gap-4">
              {DIVS.map(div=>{const da=mixAnalysis.find(x=>x.div===div),p=activePools[div];const uP=uc(da.tPM,p.pm),uD=uc(da.tDes,p.des),rP=rag(uP),rD=rag(uD);return(<div key={div} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"><div className="flex justify-between mb-2"><h3 className="font-black text-gray-900">{div}</h3><div className="text-right"><p className="text-2xl font-black text-blue-700">{da.tProj}</p><p className="text-xs text-gray-400">~{Math.round(da.tProj/period.months)}/mo</p></div></div><p className="text-xs text-indigo-700 font-bold mb-3">~{da.tAssets.toLocaleString()} assets</p>{[{l:"PM",u:uP,r:rP},{l:"Designer",u:uD,r:rD}].map(x=>(<div key={x.l} className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600">{x.l}</span><span className={`font-bold ${x.r.tx}`}>{x.u}%</span></div><div className="w-full bg-gray-100 rounded h-2"><div className={`h-2 rounded ${x.r.bar}`} style={{width:`${Math.min(x.u,100)}%`}}/></div></div>))}</div>);})}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-800">Adjust Intake & Asset Counts — {period.label}</h2>{hasSupabase&&<span className="text-xs text-green-600 font-semibold">✓ Auto-saved</span>}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 text-gray-500 uppercase"><th className="px-3 py-2 text-left">Project Type</th><th className="px-3 py-2 text-center">Auto?</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.LDB}}>LDB proj</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.LDB}}>LDB assets</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.PPD}}>PPD proj</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.PPD}}>PPD assets</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.LLD}}>LLD proj</th><th className="px-3 py-2 text-center" style={{color:DIV_COLORS.LLD}}>LLD assets</th><th className="px-3 py-2 text-center">Total</th><th className="px-3 py-2 text-center">Assets</th></tr></thead>
                  <tbody>
                    {mix.map(m=>{
                      const pt=PT_BASE.find(p=>p.id===m.id);
                      const rowTot=m.LDB+m.PPD+m.LLD;
                      const rowAssets=(m.assetsLDB*m.LDB)+(m.assetsPPD*m.PPD)+(m.assetsLLD*m.LLD);
                      return(
                        <tr key={m.id} className={`border-t border-gray-100 hover:bg-gray-50 ${m.autoEligible?"bg-green-50":""}`}>
                          <td className="px-3 py-2"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:pt?.color||"#666"}}/><span className="font-semibold">{pt?.label||m.id}</span></div></td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${m.autoEligible?"bg-green-100 text-green-700":"bg-gray-100 text-gray-400"}`}>{m.autoEligible?"🤖":"Manual"}</span></td>
                          <td className="px-3 py-2 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"LDB",m.LDB-1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">−</button><span className="w-6 text-center font-black" style={{color:DIV_COLORS.LDB}}>{m.LDB}</span><button onClick={()=>updateMixCount(m.id,"LDB",m.LDB+1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">+</button></div></td>
                          <td className="px-3 py-2 text-center"><input type="number" min="1" value={m.assetsLDB} onChange={e=>updateMixAssets(m.id,"assetsLDB",+e.target.value)} className="w-16 text-center text-xs font-bold border rounded px-1 py-1 focus:outline-none" style={{borderColor:DIV_COLORS.LDB+"66",color:DIV_COLORS.LDB}}/><p className="text-xs text-gray-400">{(m.assetsLDB*m.LDB).toLocaleString()}</p></td>
                          <td className="px-3 py-2 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"PPD",m.PPD-1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">−</button><span className="w-6 text-center font-black" style={{color:DIV_COLORS.PPD}}>{m.PPD}</span><button onClick={()=>updateMixCount(m.id,"PPD",m.PPD+1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">+</button></div></td>
                          <td className="px-3 py-2 text-center"><input type="number" min="1" value={m.assetsPPD} onChange={e=>updateMixAssets(m.id,"assetsPPD",+e.target.value)} className="w-16 text-center text-xs font-bold border rounded px-1 py-1 focus:outline-none" style={{borderColor:DIV_COLORS.PPD+"66",color:DIV_COLORS.PPD}}/><p className="text-xs text-gray-400">{(m.assetsPPD*m.PPD).toLocaleString()}</p></td>
                          <td className="px-3 py-2 text-center"><div className="flex items-center justify-center gap-1"><button onClick={()=>updateMixCount(m.id,"LLD",m.LLD-1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">−</button><span className="w-6 text-center font-black" style={{color:DIV_COLORS.LLD}}>{m.LLD}</span><button onClick={()=>updateMixCount(m.id,"LLD",m.LLD+1)} className="w-5 h-5 rounded bg-gray-200 text-xs font-bold">+</button></div></td>
                          <td className="px-3 py-2 text-center"><input type="number" min="1" value={m.assetsLLD} onChange={e=>updateMixAssets(m.id,"assetsLLD",+e.target.value)} className="w-16 text-center text-xs font-bold border rounded px-1 py-1 focus:outline-none" style={{borderColor:DIV_COLORS.LLD+"66",color:DIV_COLORS.LLD}}/><p className="text-xs text-gray-400">{(m.assetsLLD*m.LLD).toLocaleString()}</p></td>
                          <td className="px-3 py-2 text-center font-black text-blue-700">{rowTot}</td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-700">{rowAssets.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-xs">
                      <td colSpan={2} className="px-3 py-2">TOTAL</td>
                      <td className="px-3 py-2 text-center" style={{color:DIV_COLORS.LDB}}>{mix.reduce((s,m)=>s+m.LDB,0)}</td><td className="px-3 py-2 text-center text-gray-400">—</td>
                      <td className="px-3 py-2 text-center" style={{color:DIV_COLORS.PPD}}>{mix.reduce((s,m)=>s+m.PPD,0)}</td><td className="px-3 py-2 text-center text-gray-400">—</td>
                      <td className="px-3 py-2 text-center" style={{color:DIV_COLORS.LLD}}>{mix.reduce((s,m)=>s+m.LLD,0)}</td><td className="px-3 py-2 text-center text-gray-400">—</td>
                      <td className="px-3 py-2 text-center text-blue-700">{combined.tProj}</td>
                      <td className="px-3 py-2 text-center text-indigo-700">{combined.tAssets.toLocaleString()}</td>
                    </tr>
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
              <h2 className="text-sm font-bold text-gray-800 mb-4">Single Project SLA Estimator</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3"><label className="text-xs font-bold text-purple-700 block mb-2">Complexity</label><div className="flex gap-1 flex-wrap">{["Simple","Complex","Creation","Bespoke"].map(c=>(<button key={c} onClick={()=>setCalcCplx(c)} className={`px-2 py-0.5 text-xs rounded font-semibold ${calcCplx===c?"bg-purple-600 text-white":"bg-white text-purple-600 border border-purple-200"}`}>{c}</button>))}</div></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-2">Asset Volume</label><div className="flex gap-1 flex-wrap">{ASSET_BANDS.map(b=>(<button key={b} onClick={()=>setCalcAssetBand(b)} className={`px-2 py-0.5 text-xs rounded font-semibold ${calcAssetBand===b?"bg-indigo-600 text-white":"bg-gray-100 text-gray-600"}`}>{b}</button>))}</div></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-2">Client Feedback</label><div className="flex gap-1">{[{l:"Realistic",v:true},{l:"Best Case",v:false}].map(o=>(<button key={o.l} onClick={()=>setClientDays(o.v)} className={`px-2 py-1 text-xs rounded font-semibold ${clientDays===o.v?"bg-amber-500 text-white":"bg-gray-100 text-gray-600"}`}>{o.l}</button>))}</div></div>
                <div><label className="text-xs font-bold text-gray-700 block mb-2">EAN Band</label><div className="flex gap-1">{["1-5 EANs","5-10 EANs","10-15 EANs"].map(b=>(<button key={b} onClick={()=>setEanBand(b)} className={`px-2 py-0.5 text-xs rounded font-semibold ${eanBand===b?"bg-teal-600 text-white":"bg-gray-100 text-gray-600"}`}>{b.replace(" EANs","")}</button>))}</div></div>
              </div>
              <div><label className="text-xs font-bold text-gray-700 block mb-2">Project Type</label><div className="flex gap-2 flex-wrap">{PT.map(pt=>(<button key={pt.id} onClick={()=>setCalcType(pt.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${calcType===pt.id?"text-white border-transparent":"bg-gray-50 text-gray-600 border-gray-200"}`} style={calcType===pt.id?{background:pt.color}:{}}>{pt.label}{pt.autoEligible&&" 🤖"}{hasOv(pt.id)&&<span className="ml-1 opacity-70">✎</span>}</button>))}</div></div>
            </div>
            {calcPt&&calcSla&&(
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-black" style={{color:calcPt.color}}>{calcPt.label}</h2><div className="flex items-center gap-2 mt-0.5"><p className="text-xs text-gray-500"><strong>{calcCplx}</strong> · <strong>{calcAssetBand}</strong></p><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${calcPt.autoEligible?"bg-green-100 text-green-700":"bg-gray-100 text-gray-500"}`}>{calcPt.autoEligible?"🤖 Auto eligible":"Manual only"}</span>{hasOv(calcType)&&<span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs">Custom SLA</span>}</div></div><div className="flex gap-2 items-center">{hasOv(calcType)&&<button onClick={()=>resetOv(calcType)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-200">↩ Reset</button>}<div className="bg-blue-600 text-white rounded-xl px-4 py-2 text-center"><p className="text-xs opacity-80">Total SLA</p><p className="text-2xl font-black">{calcSla.total}</p><p className="text-xs opacity-70">days</p></div></div></div>
                <div className="space-y-2">{STAGE_META.map(sm=>{const active=stageActive(calcPt,sm.key),defVal=calcSla.defaults[sm.key]??0,curVal=calcSla.breakdown[sm.key]??0,isOv=slaOv[calcType]?.[sm.key]!==undefined;return(<div key={sm.key} className={`rounded-xl border p-3 ${active?"border-blue-200 bg-blue-50":"border-gray-100 bg-gray-50 opacity-50"}`}><div className="flex items-center gap-3"><div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active?"bg-blue-500 text-white":"bg-gray-200 text-gray-400"}`}>{active?"✓":"–"}</div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`text-sm font-bold ${active?"text-blue-900":"text-gray-400"}`}>{sm.label}</span>{isOv&&<span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">custom</span>}</div><p className="text-xs text-gray-500 mt-0.5">{sm.desc}</p></div>{active?(<div className="flex items-center gap-2 flex-shrink-0">{isOv&&<span className="text-xs text-gray-400 line-through">{defVal}d</span>}<div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1"><button onClick={()=>setOv(calcType,sm.key,curVal-1)} className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center">−</button><input type="number" min="0" value={curVal} onChange={e=>setOv(calcType,sm.key,e.target.value)} className={`w-12 text-center font-black text-lg border-none outline-none bg-transparent ${isOv?"text-orange-600":"text-blue-700"}`}/><button onClick={()=>setOv(calcType,sm.key,curVal+1)} className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center">+</button></div><span className="text-xs text-gray-400">days</span>{isOv&&<button onClick={()=>setOv(calcType,sm.key,defVal)} className="text-xs text-orange-500">↩</button>}</div>):(<span className="text-xs text-gray-300 bg-gray-100 rounded-lg px-3 py-1.5 flex-shrink-0">Not Required</span>)}</div></div>);})}</div>
                <div className="mt-4 grid grid-cols-3 gap-3"><div className="bg-blue-600 rounded-xl p-3 text-white text-center"><p className="text-xs opacity-80">Total SLA</p><p className="text-2xl font-black">{calcSla.total}d</p></div><div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center"><p className="text-xs text-blue-500">PM Days</p><p className="text-2xl font-black text-blue-700">{calcSla.pmDays}</p></div><div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center"><p className="text-xs text-purple-500">Designer Days</p><p className="text-2xl font-black text-purple-700">{calcSla.desDays}</p></div></div>
              </div>
            )}
          </div>
        )}

        {/* ══ TEAM MANAGER ══ */}
        {activeTab==="👥 Team Manager"&&(
          <div className="space-y-4">
            {!hasSupabase&&<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-semibold">⚠️ Offline mode — add Supabase credentials to persist changes.</div>}
            {pendingStarters.length>0&&(<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4"><h3 className="text-sm font-bold text-amber-700 mb-2">⏳ Pending Starters — {pendingStarters.length}</h3><table className="w-full text-xs"><thead><tr className="text-amber-600 uppercase"><th className="px-3 py-1 text-left">Name</th><th className="px-3 py-1 text-left">Role</th><th className="px-3 py-1 text-center">Div</th><th className="px-3 py-1 text-center">Start</th><th className="px-3 py-1 text-center">Cap %</th></tr></thead><tbody>{pendingStarters.map(p=>{const f=availFrac(p.startDate,p.endDate,WD);return(<tr key={p.id} className="border-t border-amber-100"><td className="px-3 py-1.5 font-semibold">{p.name}</td><td className="px-3 py-1.5 text-gray-600">{p.role}</td><td className="px-3 py-1.5 text-center"><span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{background:DIV_COLORS[p.division]+"22",color:DIV_COLORS[p.division]}}>{p.division}</span></td><td className="px-3 py-1.5 text-center font-bold text-amber-700">{startLbl(p.startDate)}</td><td className="px-3 py-1.5 text-center font-bold text-green-600">{Math.round(f*100)}%</td></tr>);})}</tbody></table></div>)}
            {pendingLeavers.length>0&&(<div className="bg-red-50 border border-red-200 rounded-2xl p-4"><h3 className="text-sm font-bold text-red-700 mb-2">🔴 Planned Leavers — {pendingLeavers.length}</h3><table className="w-full text-xs"><thead><tr className="text-red-600 uppercase"><th className="px-3 py-1 text-left">Name</th><th className="px-3 py-1 text-left">Role</th><th className="px-3 py-1 text-center">Div</th><th className="px-3 py-1 text-center">Exit</th><th className="px-3 py-1 text-center">Remaining %</th></tr></thead><tbody>{pendingLeavers.map(p=>{const f=availFrac(p.startDate,p.endDate,WD);return(<tr key={p.id} className="border-t border-red-100"><td className="px-3 py-1.5 font-semibold">{p.name}</td><td className="px-3 py-1.5 text-gray-600">{p.role}</td><td className="px-3 py-1.5 text-center"><span className="font-bold text-xs px-2 py-0.5 rounded-full" style={{background:DIV_COLORS[p.division]+"22",color:DIV_COLORS[p.division]}}>{p.division}</span></td><td className="px-3 py-1.5 text-center font-bold text-red-700">{endLbl(p.endDate)}</td><td className="px-3 py-1.5 text-center font-bold text-amber-600">{Math.round(f*100)}%</td></tr>);})}</tbody></table></div>)}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-gray-900 text-white rounded-xl p-3 text-center"><p className="text-xs opacity-70 uppercase">Active</p><p className="text-3xl font-black">{capacityRoster.length}</p><p className="text-xs opacity-50">{roster.filter(p=>p.removed).length} removed · {pendingStarters.length} joining · {pendingLeavers.length} leaving</p></div>
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
                    <div className="bg-blue-100 rounded-xl p-3"><label className="text-xs font-bold text-blue-800 block mb-1">📅 Start Date</label><select value={newP.startDate} onChange={e=>setNewP(p=>({...p,startDate:e.target.value}))} className="w-full border border-blue-300 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-semibold">{WEEK_OPTIONS.map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select>{newP.startDate&&newP.startDate!=="now"&&<p className="text-xs text-blue-600 mt-1 font-semibold">→ {Math.round(availFrac(newP.startDate,newP.endDate,WD)*100)}% of {period.label}</p>}</div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3"><label className="text-xs font-bold text-red-700 block mb-1">🔴 Exit Date</label><select value={newP.endDate} onChange={e=>setNewP(p=>({...p,endDate:e.target.value}))} className="w-full border border-red-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none font-semibold"><option value="never">No planned exit</option>{WEEK_OPTIONS.filter(w=>w.value!=="now").map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select></div>
                  </div>
                  <div className="flex gap-2"><button onClick={addPerson} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg">✓ Add to Team</button><button onClick={()=>setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg">Cancel</button></div>
                </div>
              )}
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10"><tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200"><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Role</th><th className="px-3 py-2 text-center">Type</th><th className="px-3 py-2 text-center">Div</th><th className="px-3 py-2 text-center">Start</th><th className="px-3 py-2 text-center">Exit</th><th className="px-3 py-2 text-center">Cap%</th><th className="px-3 py-2 text-center">Status</th><th className="px-3 py-2 text-center">Actions</th></tr></thead>
                  <tbody>
                    {tmFiltered.map(p=>{
                      const removed=p.removed, isEd=editId===p.id;
                      const frac=availFrac(p.startDate,p.endDate,WD);
                      const isPending=p.startDate&&p.startDate!=="now"&&new Date(p.startDate)>new Date();
                      const isLeaving=p.endDate&&p.endDate!=="never"&&new Date(p.endDate)>new Date();
                      return(
                        <tr key={p.id} className={`border-t border-gray-100 ${removed?"opacity-40 bg-red-50":isLeaving?"bg-red-50":isPending?"bg-amber-50":isEd?"bg-yellow-50":"hover:bg-gray-50"}`}>
                          <td className="px-3 py-2">{isEd?<input value={editData.name||""} onChange={e=>setEditData(d=>({...d,name:e.target.value}))} className="border border-blue-300 rounded px-2 py-0.5 text-xs w-full"/>:<span className={`font-semibold ${removed?"line-through text-gray-400":"text-gray-900"}`}>{p.name}</span>}</td>
                          <td className="px-3 py-2">{isEd?<select value={editData.role||""} onChange={e=>setEditData(d=>({...d,role:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs w-full bg-white">{ROLE_OPTIONS.map(r=><option key={r}>{r}</option>)}</select>:<span className="text-gray-600">{p.role}</span>}</td>
                          <td className="px-3 py-2 text-center">{isEd?<select value={editData.type||""} onChange={e=>setEditData(d=>({...d,type:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white"><option>FTE</option><option>Freelance</option></select>:<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.type==="FTE"?"bg-blue-100 text-blue-700":"bg-indigo-100 text-indigo-700"}`}>{p.type}</span>}</td>
                          <td className="px-3 py-2 text-center">{isEd?<select value={editData.division||""} onChange={e=>setEditData(d=>({...d,division:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white">{["LDB","PPD","LLD","ALL"].map(d=><option key={d}>{d}</option>)}</select>:<span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{background:(DIV_COLORS[p.division]||"#6b7280")+"22",color:DIV_COLORS[p.division]||"#6b7280"}}>{p.division}</span>}</td>
                          <td className="px-3 py-2 text-center">{isEd?<select value={editData.startDate||"now"} onChange={e=>setEditData(d=>({...d,startDate:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white w-24">{WEEK_OPTIONS.map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select>:<span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isPending?"bg-amber-100 text-amber-700":"bg-gray-100 text-gray-500"}`}>{isPending?"⏳ ":""}{startLbl(p.startDate)}</span>}</td>
                          <td className="px-3 py-2 text-center">{isEd?<select value={editData.endDate||"never"} onChange={e=>setEditData(d=>({...d,endDate:e.target.value}))} className="border border-red-300 rounded px-1 py-0.5 text-xs bg-white w-24"><option value="never">No exit</option>{WEEK_OPTIONS.filter(w=>w.value!=="now").map(w=>(<option key={w.value} value={w.value}>{w.label}</option>))}</select>:<span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${isLeaving?"bg-red-100 text-red-700":"bg-gray-100 text-gray-400"}`}>{isLeaving?"🔴 ":""}{endLbl(p.endDate)}</span>}</td>
                          <td className="px-3 py-2 text-center"><span className={`text-xs font-bold ${frac>=0.9?"text-green-600":frac>=0.5?"text-amber-600":"text-red-500"}`}>{Math.round(frac*100)}%</span></td>
                          <td className="px-3 py-2 text-center">{isEd?<select value={editData.status||""} onChange={e=>setEditData(d=>({...d,status:e.target.value}))} className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white">{STATUS_OPTIONS.map(s=><option key={s}>{s}</option>)}</select>:<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${removed?"bg-red-100 text-red-600":p.status==="To Hire"?"bg-yellow-100 text-yellow-700":"bg-green-100 text-green-700"}`}>{removed?"Removed":p.status}</span>}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              {!removed&&!isEd&&<><button onClick={()=>startEdit(p)} className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-600 border border-blue-200">✎</button><button onClick={()=>removePerson(p.id)} className="px-2 py-1 text-xs font-semibold rounded bg-red-50 text-red-600 border border-red-200">✕</button></>}
                              {isEd&&<div className="flex gap-1"><button onClick={saveEdit} className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">✓</button><button onClick={()=>setEditId(null)} className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600">✕</button></div>}
                              {removed&&<button onClick={()=>restorePerson(p.id)} className="px-2 py-1 text-xs font-semibold rounded bg-green-50 text-green-600 border border-green-200">↩</button>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {roster.filter(p=>p.removed).length>0&&(<div className="bg-red-50 border border-red-200 rounded-2xl p-4"><h3 className="text-sm font-bold text-red-700 mb-2">Removed ({roster.filter(p=>p.removed).length})</h3><div className="flex flex-wrap gap-2">{roster.filter(p=>p.removed).map(p=>(<div key={p.id} className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5"><span className="text-xs font-semibold">{p.name}</span><span className="text-xs text-gray-400">{p.division}</span><button onClick={()=>restorePerson(p.id)} className="text-xs text-green-600 font-bold">↩</button></div>))}</div></div>)}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-gray-400 py-4">
        L'Oréal eComm · {globalHC.des.total} designers · {manualRate}/day
        · {availableHoursPerPM}h ÷ {hoursPerProject}h/proj = {projectsPerPM} concurrent · PM cap: {totalTeamPMCap.toLocaleString()}/mo
        · {dbStatus==="connected"?"🟢 Supabase":"⚪ Offline"}
      </p>
    </div>
  );
}
