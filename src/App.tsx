import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// PLANNING PERIOD OPTIONS
// ─────────────────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: '1 Month', months: 1, workingDays: 21 },
  { label: '3 Months', months: 3, workingDays: 63 },
  { label: '6 Months', months: 6, workingDays: 126 },
  { label: '12 Months', months: 12, workingDays: 252 },
];

// ─────────────────────────────────────────────────────────────────────────────
// INITIAL ROSTER
// ─────────────────────────────────────────────────────────────────────────────
const INITIAL_ROSTER = [
  {
    id: 1,
    name: 'Rong Chen',
    role: 'Managing Director',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 2,
    name: 'Taylor Iglesias-Fernandez',
    role: 'Group Account Director',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 3,
    name: 'Marta',
    role: 'Account Director',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 4,
    name: 'Valeria',
    role: 'Account Director',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 5,
    name: 'Circé Langrée Le Coq',
    role: 'Account Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 6,
    name: 'Alex',
    role: 'Programme Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 7,
    name: 'Joel',
    role: 'Delivery Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 8,
    name: 'Sonia',
    role: 'Project Director',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 9,
    name: 'Ana',
    role: 'Division Project Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 10,
    name: 'Analisa',
    role: 'Division Project Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 11,
    name: 'Jef Lima',
    role: 'Division Project Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 12,
    name: 'Vedant',
    role: 'Studio Operations Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 13,
    name: 'Trusha Parekh',
    role: 'Studio Operations Lead',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 14,
    name: 'Carly Josias',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 15,
    name: 'Busi Nako',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 16,
    name: 'Seatile Molotsane',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 17,
    name: 'Keerthika Manogharan',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 18,
    name: 'Jaimin',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 19,
    name: 'Meghna Moza',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 20,
    name: 'Abhishek Khare',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 21,
    name: 'Mernoly Simba',
    role: 'Project Manager (FR)',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 22,
    name: 'Sriza',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 23,
    name: 'Lisa Peignon',
    role: 'Project Manager (FR)',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 24,
    name: 'Linda',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 25,
    name: 'Veena Yadav',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 26,
    name: 'Eva Sachdeva',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 27,
    name: 'Nishtha Sharma',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 28,
    name: 'Aniket Sawant',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 29,
    name: 'Sahil Pujari',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 30,
    name: 'Megha Sarin',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 31,
    name: 'Sarah',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 32,
    name: 'Deepanjan Sarkar',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 33,
    name: 'Anushka',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 34,
    name: 'Mansi Vasani',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 35,
    name: 'Ankit Dobhal',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 36,
    name: 'Ashwini Patil',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 37,
    name: 'Jahanvi Jain',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 38,
    name: 'Ruchika Saini',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 39,
    name: 'Robin Singh',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 40,
    name: 'Denisa Demian',
    role: 'Transcreation Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 41,
    name: 'Marta F.',
    role: 'Transcreation Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 42,
    name: 'Agata Pankow',
    role: 'Transcreation Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 43,
    name: 'Żaneta Kośla',
    role: 'Transcreation Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 44,
    name: 'Volha Schastnaya',
    role: 'Transcreation Executive',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 45,
    name: 'Maggie Tran',
    role: 'Creative Lead',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 46,
    name: 'Alessandro B',
    role: 'Automation & Tech Lead',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 47,
    name: 'Ross Arroyo Wheeldon',
    role: 'Transcreation Lead',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 48,
    name: 'Sneha Iyer',
    role: 'GenAI Creative Director',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 49,
    name: 'Joao',
    role: 'Art Director',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 50,
    name: 'Ruben Roa',
    role: 'Art Director',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 51,
    name: 'Sameer Kumar',
    role: 'Art Director',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 52,
    name: 'Nosipho Nyide',
    role: 'Copywriter',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 53,
    name: 'Muhammed Ameen KT',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 54,
    name: 'Melissa',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 55,
    name: 'Pravin',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 56,
    name: 'Tarana Purohit',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 57,
    name: 'Derick Baretto',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 58,
    name: 'Paula',
    role: 'Automation Designer/Editor',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 59,
    name: 'Cynthia',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 60,
    name: 'Lindsay',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 61,
    name: 'Akshat (DACH)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 62,
    name: 'Samruddhi',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 63,
    name: 'Kushagra Tayal',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 64,
    name: 'Aadesh Khale',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 65,
    name: 'Akshat Bhatnagar',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 66,
    name: 'Sreekumar VS',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 67,
    name: 'Rupali Patel',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 68,
    name: 'Deepshika Das',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 69,
    name: 'Liam Chetty',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 70,
    name: 'Vedant Rode',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 71,
    name: 'Denvour Dcruz',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 72,
    name: 'Monika Singh',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 73,
    name: 'Ameya Thakur',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 74,
    name: 'Vyomica Vasistha',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 75,
    name: 'Rhea Seth',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 76,
    name: 'Chinmay Sawant',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 77,
    name: 'Bhakti Doshi',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 78,
    name: 'Yashashree Gaonkar',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 79,
    name: 'Karan Kadam',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 80,
    name: 'Shefali Shingre',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 81,
    name: 'Akshaya K',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 82,
    name: 'Amir',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 83,
    name: 'Yves',
    role: 'Director Global Client Ecom',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 84,
    name: 'Sreosheer',
    role: 'Data Analyst/Engineer',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 85,
    name: 'Pooja',
    role: 'Content Lead',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 86,
    name: 'Neelema',
    role: 'Content Lead',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 87,
    name: 'Drupti',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 88,
    name: 'Celina (Synd)',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 89,
    name: 'Insiya',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 90,
    name: 'Zehra',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'ALL',
  },
  {
    id: 91,
    name: 'Akshata Tandel',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 92,
    name: 'Saakshi Kudtarkar',
    role: 'Content Manager',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 93,
    name: 'Shubhashish Sarkar',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LDB',
  },
  {
    id: 94,
    name: 'Karan Kapur',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 95,
    name: 'Dharini Jain',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 96,
    name: 'Franklin Elango',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'LLD',
  },
  {
    id: 97,
    name: 'Celina Fernandes',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'FTE',
    division: 'PPD',
  },
  {
    id: 100,
    name: 'Medhavi Thakur',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 101,
    name: 'Mahima Bhatia',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 102,
    name: 'Mbuluelo Jili',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 103,
    name: 'Thando Ndashe',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 104,
    name: 'Raghav Agarwal',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 105,
    name: 'Sanjana',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 106,
    name: 'Gareth Adams',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 107,
    name: 'Rhea Seth (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 108,
    name: 'Chinmay Sawant (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 109,
    name: 'Vyomica (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 110,
    name: 'Nate Mzobe',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 111,
    name: 'Vinayak Padkil',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'PPD',
  },
  {
    id: 112,
    name: 'Amy Zhang',
    role: 'Divisional AM',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 113,
    name: 'Bhavana Sukhija',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 114,
    name: 'Wamika Chopra',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 115,
    name: 'Khyati Bagadia',
    role: 'Project Lead',
    family: 'PM / Delivery',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 116,
    name: 'Jermain',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 117,
    name: 'Nico Gatica',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
  {
    id: 118,
    name: 'Liam (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 119,
    name: 'Keegan',
    role: 'Motion Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'ALL',
  },
  {
    id: 120,
    name: 'Celina Fernandes (FL)',
    role: 'Data Wrangler',
    family: 'Syndication / Data',
    type: 'Freelance',
    division: 'PPD',
  },
  {
    id: 121,
    name: 'Priya (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LDB',
  },
  {
    id: 122,
    name: 'Sarthak (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LDB',
  },
  {
    id: 123,
    name: 'Tanvi (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'PPD',
  },
  {
    id: 124,
    name: 'Rohan (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'PPD',
  },
  {
    id: 125,
    name: 'Ishaan (FL)',
    role: 'Integrated Designer',
    family: 'Creative / Design',
    type: 'Freelance',
    division: 'LLD',
  },
];

const ROLE_OPTIONS = [
  'Managing Director',
  'Group Account Director',
  'Account Director',
  'Account Manager',
  'Programme Lead',
  'Delivery Lead',
  'Project Director',
  'Division Project Lead',
  'Studio Operations Lead',
  'Project Manager',
  'Project Manager (FR)',
  'Project Lead',
  'Divisional AM',
  'Transcreation Manager',
  'Transcreation Executive',
  'Transcreation Lead',
  'Creative Lead',
  'Automation & Tech Lead',
  'GenAI Creative Director',
  'Art Director',
  'Copywriter',
  'Motion Designer',
  'Automation Designer/Editor',
  'Integrated Designer',
  'Integrated Designer (FR)',
  'Director Global Client Ecom',
  'Data Analyst/Engineer',
  'Content Lead',
  'Content Manager',
  'Content Manager (FR)',
  'Data Wrangler',
  'Amazon Specialist',
  'Digital Program Manager',
];
const FAMILY_OPTIONS = [
  'PM / Delivery',
  'Creative / Design',
  'Syndication / Data',
];
const DIV_OPTIONS = ['ALL', 'LDB', 'PPD', 'LLD'];
const FAMILY_COLORS = {
  'PM / Delivery': '#3b82f6',
  'Creative / Design': '#8b5cf6',
  'Syndication / Data': '#22c55e',
};
const DIV_SPLIT = {
  LDB: { pm: 0.35, des: 0.35, sup: 0.3 },
  PPD: { pm: 0.35, des: 0.35, sup: 0.3 },
  LLD: { pm: 0.3, des: 0.3, sup: 0.4 },
};

// SLA tables
const PROD_DAYS = {
  Simple: { '0-30': 4, '30-50': 7, '50-100': 10 },
  Complex: { '0-30': 5, '30-50': 9, '50-100': 13 },
  Creation: { '0-30': 6, '30-50': 11, '50-100': 15 },
  Bespoke: { '0-30': 10, '30-50': 18, '50-100': 25 },
};
const PROD_REVS = { Simple: 1, Complex: 2, Creation: 4, Bespoke: 4 };
const OPERA_DAYS = { '0-30': 1, '30-50': 1, '50-100': 2 };
const SYND_DAYS = {
  Simple: { '1-5 EANs': 4, '5-10 EANs': 6, '10-15 EANs': 8 },
  Mid: { '1-5 EANs': 6, '5-10 EANs': 9, '10-15 EANs': 12 },
  Complex: { '1-5 EANs': 10, '5-10 EANs': 15, '10-15 EANs': 20 },
};
const ASSET_MID = { '0-30': 15, '30-50': 40, '50-100': 75 };

const PT = [
  {
    id: 'cp-simple',
    label: 'Country Pull – Simple',
    stages: [false, false, false, true, true, true, true, false],
    color: '#3b82f6',
  },
  {
    id: 'cp-adaptation',
    label: 'Country Pull – Adaptation',
    stages: [false, true, false, true, true, true, true, false],
    color: '#6366f1',
  },
  {
    id: 'cp-creation',
    label: 'Country Pull – Creation',
    stages: [true, true, false, true, true, true, true, false],
    color: '#8b5cf6',
  },
  {
    id: 'retailer',
    label: 'Country Retailer Request',
    stages: [false, false, false, false, false, false, false, true],
    color: '#22c55e',
  },
  {
    id: 'gp-eventing',
    label: 'Global Push – Eventing',
    stages: [false, true, true, false, false, false, true, false],
    color: '#f59e0b',
  },
  {
    id: 'gp-pdp',
    label: 'Global Push – PDP',
    stages: [false, true, true, false, false, false, true, false],
    color: '#f97316',
  },
  {
    id: 'lp-eventing',
    label: 'Local Push – Eventing',
    stages: [false, false, false, true, true, true, true, true],
    color: '#ef4444',
  },
  {
    id: 'lp-pdp',
    label: 'Local Push – PDP',
    stages: [false, false, false, true, true, true, true, true],
    color: '#ec4899',
  },
  {
    id: 'urgent',
    label: 'Urgent Brief',
    stages: [false, false, false, false, false, true, true, false],
    color: '#14b8a6',
  },
];

const SK = [
  'missingDMI',
  'mastering',
  'globalRollout',
  'translation',
  'production',
  'operaUpload',
  'syndication',
];
const SK_IDX = {
  missingDMI: [0],
  mastering: [1],
  globalRollout: [2],
  translation: [3, 4],
  production: [5],
  operaUpload: [6],
  syndication: [7],
};
function stageActive(pt, key) {
  return SK_IDX[key].some((i) => pt.stages[i]);
}

function getDefaultDays(ptId, cplx, aBand, eanBand, syndCplx, withCF) {
  const pt = PT.find((p) => p.id === ptId);
  return {
    missingDMI: pt.stages[0] ? 6 + (withCF ? 5 : 0) : 0,
    mastering: pt.stages[1] ? 2 : 0,
    globalRollout: pt.stages[2] ? 2 : 0,
    translation: pt.stages[3] || pt.stages[4] ? 3 + (withCF ? 6 : 0) : 0,
    production: pt.stages[5]
      ? (PROD_DAYS[cplx]?.[aBand] ?? 9) + (withCF ? PROD_REVS[cplx] * 4 : 0)
      : 0,
    operaUpload: pt.stages[6] ? OPERA_DAYS[aBand] ?? 1 : 0,
    syndication: pt.stages[7] ? SYND_DAYS[syndCplx]?.[eanBand] ?? 4 : 0,
  };
}
function getWeights(ptId) {
  const w = {
    'cp-simple': { pm: 0.25, des: 0.65, sup: 0.1 },
    'cp-adaptation': { pm: 0.28, des: 0.62, sup: 0.1 },
    'cp-creation': { pm: 0.25, des: 0.65, sup: 0.1 },
    retailer: { pm: 0.2, des: 0.15, sup: 0.65 },
    'gp-eventing': { pm: 0.35, des: 0.45, sup: 0.2 },
    'gp-pdp': { pm: 0.35, des: 0.45, sup: 0.2 },
    'lp-eventing': { pm: 0.28, des: 0.52, sup: 0.2 },
    'lp-pdp': { pm: 0.28, des: 0.52, sup: 0.2 },
    urgent: { pm: 0.3, des: 0.65, sup: 0.05 },
  };
  return w[ptId] || { pm: 0.28, des: 0.62, sup: 0.1 };
}

const STAGE_META = [
  {
    key: 'missingDMI',
    label: '1. Missing DMI Asset Creation',
    desc: 'Creation complexity · market approval & revision',
  },
  {
    key: 'mastering',
    label: '2. Mastering / Copy Creation',
    desc: 'Mid complexity · DMI re-master & copy extraction',
  },
  {
    key: 'globalRollout',
    label: '3. Global Rollout Invitation',
    desc: 'Country rollout scheduling',
  },
  {
    key: 'translation',
    label: '4+5. Translation',
    desc: 'Salsify PDP + Asset (concurrent) · market approval & revision',
  },
  {
    key: 'production',
    label: '6. Production',
    desc: 'Complexity × asset volume · revision rounds',
  },
  {
    key: 'operaUpload',
    label: '7. Opera Upload',
    desc: 'Upload assets to Opera DAM',
  },
  {
    key: 'syndication',
    label: '8. Syndication',
    desc: 'Salsify enrichment · EAN count × complexity',
  },
];

const TABS = ['📊 Capacity', '🗂 Volume', '🔢 SLA Calc', '👥 Team Manager'];
let _nextId = 200;

export default function App() {
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [removedIds, setRemovedIds] = useState(new Set());
  const [utilPM, setUtilPM] = useState(82);
  const [utilDes, setUtilDes] = useState(82);
  const [utilSup, setUtilSup] = useState(80);
  const [periodIdx, setPeriodIdx] = useState(0); // ← planning period
  const [complexity, setComplexity] = useState('Complex');
  const [assetBand, setAssetBand] = useState('30-50');
  const [eanBand, setEanBand] = useState('1-5 EANs');
  const [syndCplx, setSyndCplx] = useState('Simple');
  const [clientDays, setClientDays] = useState(true);
  const [activeTab, setActiveTab] = useState('📊 Capacity');
  const [divFilter, setDivFilter] = useState('All');
  const [calcType, setCalcType] = useState('cp-adaptation');
  const [slaOv, setSlaOv] = useState({});
  const [tmSearch, setTmSearch] = useState('');
  const [tmFamily, setTmFamily] = useState('All');
  const [tmType, setTmType] = useState('All');
  const [tmDiv, setTmDiv] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newP, setNewP] = useState({
    name: '',
    role: 'Project Manager',
    family: 'PM / Delivery',
    type: 'FTE',
    division: 'ALL',
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const period = PERIODS[periodIdx];
  const WD = period.workingDays; // ← key: all capacity calcs use THIS

  const activeRoster = useMemo(
    () => roster.filter((p) => !removedIds.has(p.id)),
    [roster, removedIds]
  );
  const hc = useMemo(() => {
    const pm = activeRoster.filter((p) => p.family === 'PM / Delivery');
    const des = activeRoster.filter((p) => p.family === 'Creative / Design');
    const sup = activeRoster.filter((p) => p.family === 'Syndication / Data');
    return {
      pm: {
        total: pm.length,
        fte: pm.filter((p) => p.type === 'FTE').length,
        fl: pm.filter((p) => p.type === 'Freelance').length,
      },
      des: {
        total: des.length,
        fte: des.filter((p) => p.type === 'FTE').length,
        fl: des.filter((p) => p.type === 'Freelance').length,
      },
      sup: {
        total: sup.length,
        fte: sup.filter((p) => p.type === 'FTE').length,
        fl: sup.filter((p) => p.type === 'Freelance').length,
      },
    };
  }, [activeRoster]);

  const pools = useMemo(
    () => ({
      pm: Math.round(hc.pm.total * WD * (utilPM / 100)),
      des: Math.round(hc.des.total * WD * (utilDes / 100)),
      sup: Math.round(hc.sup.total * WD * (utilSup / 100)),
    }),
    [hc, WD, utilPM, utilDes, utilSup]
  );

  const resolveDay = (ptId, key, def) =>
    slaOv[ptId]?.[key] !== undefined ? slaOv[ptId][key] : def;
  const slaMap = useMemo(() => {
    const m = {};
    PT.forEach((pt) => {
      const defs = getDefaultDays(
        pt.id,
        complexity,
        assetBand,
        eanBand,
        syndCplx,
        clientDays
      );
      const bd = {};
      let total = 0;
      SK.forEach((k) => {
        const d = resolveDay(pt.id, k, defs[k] ?? 0);
        bd[k] = d;
        total += d;
      });
      const w = getWeights(pt.id);
      m[pt.id] = {
        total,
        breakdown: bd,
        defaults: defs,
        pmDays: Math.round(total * w.pm),
        desDays: Math.round(total * w.des),
        supDays: Math.round(total * w.sup),
        avgAssets: ASSET_MID[assetBand] || 40,
      };
    });
    return m;
  }, [complexity, assetBand, eanBand, syndCplx, clientDays, slaOv]);

  // Mix: projects per period (not per month — user sets how many over the chosen period)
  const initMix = () =>
    PT.map((pt) => ({
      id: pt.id,
      LDB:
        pt.id === 'cp-adaptation'
          ? 3 * period.months
          : pt.id === 'cp-simple'
          ? 2 * period.months
          : pt.id === 'lp-eventing'
          ? 2 * period.months
          : 1 * period.months,
      PPD:
        pt.id === 'cp-adaptation'
          ? 3 * period.months
          : pt.id === 'cp-simple'
          ? 2 * period.months
          : pt.id === 'lp-eventing'
          ? 2 * period.months
          : 1 * period.months,
      LLD:
        pt.id === 'cp-adaptation'
          ? 4 * period.months
          : pt.id === 'cp-simple'
          ? 3 * period.months
          : pt.id === 'lp-eventing'
          ? 3 * period.months
          : pt.id === 'urgent'
          ? 2 * period.months
          : 1 * period.months,
    }));
  const [mix, setMix] = useState(() => initMix());
  const updMix = (id, div, val) =>
    setMix((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [div]: Math.max(0, val) } : m))
    );

  // When period changes, rescale the mix
  const [prevMonths, setPrevMonths] = useState(1);
  useMemo(() => {
    if (period.months !== prevMonths) {
      const scale = period.months / prevMonths;
      setMix((prev) =>
        prev.map((m) => ({
          ...m,
          LDB: Math.round(m.LDB * scale),
          PPD: Math.round(m.PPD * scale),
          LLD: Math.round(m.LLD * scale),
        }))
      );
      setPrevMonths(period.months);
    }
  }, [period.months]);

  const mixAnalysis = useMemo(
    () =>
      ['LDB', 'PPD', 'LLD'].map((div) => {
        let tPM = 0,
          tDes = 0,
          tSup = 0,
          tProj = 0,
          tAssets = 0;
        const rows = mix.map((m) => {
          const pt = PT.find((p) => p.id === m.id),
            sla = slaMap[m.id],
            cnt = m[div] || 0;
          tPM += sla.pmDays * cnt;
          tDes += sla.desDays * cnt;
          tSup += sla.supDays * cnt;
          tProj += cnt;
          tAssets += sla.avgAssets * cnt;
          return {
            id: m.id,
            label: pt.label,
            count: cnt,
            assets: sla.avgAssets * cnt,
            slaDays: sla.total,
            color: pt.color,
          };
        });
        return { div, rows, tPM, tDes, tSup, tProj, tAssets };
      }),
    [mix, slaMap]
  );

  const combined = useMemo(() => {
    const a = { div: 'All', tPM: 0, tDes: 0, tSup: 0, tProj: 0, tAssets: 0 };
    mixAnalysis.forEach((d) => {
      a.tPM += d.tPM;
      a.tDes += d.tDes;
      a.tSup += d.tSup;
      a.tProj += d.tProj;
      a.tAssets += d.tAssets;
    });
    return a;
  }, [mixAnalysis]);

  const divPools = useMemo(() => {
    const r = {};
    ['LDB', 'PPD', 'LLD'].forEach((d) => {
      const s = DIV_SPLIT[d];
      r[d] = {
        pm: Math.round(pools.pm * s.pm),
        des: Math.round(pools.des * s.des),
        sup: Math.round(pools.sup * s.sup),
      };
    });
    r['All'] = pools;
    return r;
  }, [pools]);

  const getA = (d) =>
    d === 'All' ? combined : mixAnalysis.find((x) => x.div === d) || combined;
  const cur = getA(divFilter),
    ap = divPools[divFilter] || pools;
  const uc = (d, a) => (a > 0 ? Math.round((d / a) * 100) : 0);
  const uPM = uc(cur.tPM, ap.pm),
    uDes = uc(cur.tDes, ap.des),
    uSup = uc(cur.tSup, ap.sup);
  const rag = (u) =>
    u <= 85
      ? {
          dot: '🟢',
          bg: 'bg-green-50',
          brd: 'border-green-200',
          tx: 'text-green-700',
          bar: 'bg-green-500',
        }
      : u <= 100
      ? {
          dot: '🟡',
          bg: 'bg-amber-50',
          brd: 'border-amber-200',
          tx: 'text-amber-700',
          bar: 'bg-amber-400',
        }
      : {
          dot: '🔴',
          bg: 'bg-red-50',
          brd: 'border-red-200',
          tx: 'text-red-700',
          bar: 'bg-red-500',
        };

  // Monthly equivalents for display
  const monthlyProj =
    period.months > 0 ? Math.round(combined.tProj / period.months) : 0;
  const monthlyAssets =
    period.months > 0 ? Math.round(combined.tAssets / period.months) : 0;

  const divCompData = ['LDB', 'PPD', 'LLD'].map((d) => {
    const a = mixAnalysis.find((x) => x.div === d),
      p = divPools[d];
    return {
      name: d,
      Projects: a.tProj,
      Assets: Math.round(a.tAssets),
      PMUtil: uc(a.tPM, p.pm),
      DesUtil: uc(a.tDes, p.des),
    };
  });

  const addPerson = () => {
    if (!newP.name.trim()) return;
    setRoster((prev) => [...prev, { ...newP, id: ++_nextId }]);
    setNewP({
      name: '',
      role: 'Project Manager',
      family: 'PM / Delivery',
      type: 'FTE',
      division: 'ALL',
    });
    setShowAdd(false);
  };
  const removePerson = (id) => setRemovedIds((prev) => new Set([...prev, id]));
  const restorePerson = (id) =>
    setRemovedIds((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  const startEdit = (p) => {
    setEditingId(p.id);
    setEditData({ ...p });
  };
  const saveEdit = () => {
    setRoster((prev) =>
      prev.map((p) => (p.id === editingId ? { ...editData } : p))
    );
    setEditingId(null);
  };

  const tmFiltered = useMemo(
    () =>
      roster.filter((p) => {
        if (tmFamily !== 'All' && p.family !== tmFamily) return false;
        if (tmType !== 'All' && p.type !== tmType) return false;
        if (tmDiv !== 'All' && p.division !== tmDiv && p.division !== 'ALL')
          return false;
        if (
          tmSearch &&
          !p.name.toLowerCase().includes(tmSearch.toLowerCase()) &&
          !p.role.toLowerCase().includes(tmSearch.toLowerCase())
        )
          return false;
        return true;
      }),
    [roster, tmSearch, tmFamily, tmType, tmDiv]
  );

  const hasOv = (id) => !!slaOv[id] && Object.keys(slaOv[id]).length > 0;
  const setOv = (ptId, key, val) =>
    setSlaOv((prev) => ({
      ...prev,
      [ptId]: { ...(prev[ptId] || {}), [key]: Math.max(0, parseInt(val) || 0) },
    }));
  const resetOv = (id) =>
    setSlaOv((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
  const calcPt = PT.find((p) => p.id === calcType),
    calcSla = slaMap[calcType];

  const hcBarData = [
    { name: 'PMs', FTE: hc.pm.fte, Freelance: hc.pm.fl },
    { name: 'Designers', FTE: hc.des.fte, Freelance: hc.des.fl },
    { name: 'Content', FTE: hc.sup.fte, Freelance: hc.sup.fl },
  ];

  // Period badge component
  const PeriodBadge = () => (
    <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
      📅 {period.label}
    </span>
  );

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-5 py-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          L'Oréal eCommerce Programme · Global Programme Director
        </p>
        <h1 className="text-xl font-black mt-0.5">
          Capacity & Volume Planning Tool
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {activeRoster.length} active team members · {hc.pm.total} PMs ·{' '}
          {hc.des.total} Designers · {hc.sup.total} Content/Support
        </p>
      </div>

      {/* GLOBAL SETTINGS */}
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          ⚙️ Global Settings — all figures update instantly
        </p>

        {/* ── PLANNING PERIOD — prominently at the top ── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-0.5">
                📅 Planning Period
              </p>
              <p className="text-xs text-blue-500">
                All project counts, asset volumes and capacity figures shown are
                for this period.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {PERIODS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setPeriodIdx(i)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                    periodIdx === i
                      ? 'bg-blue-600 text-white border-blue-600 shadow'
                      : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-right bg-white border border-blue-200 rounded-xl px-4 py-2">
              <p className="text-xs text-blue-500">Working Days</p>
              <p className="text-2xl font-black text-blue-700">{WD}</p>
              <p className="text-xs text-blue-400">days in period</p>
            </div>
          </div>
          {period.months > 1 && (
            <p className="text-xs text-blue-600 mt-2 font-semibold">
              ℹ️ Monthly equivalent:{' '}
              <strong>{monthlyProj} projects/month</strong> ·{' '}
              <strong>~{monthlyAssets.toLocaleString()} assets/month</strong> —
              based on current mix
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-3">
          {[
            {
              label: `PM Util: ${utilPM}%`,
              val: utilPM,
              set: setUtilPM,
              c: 'blue',
            },
            {
              label: `Designer: ${utilDes}%`,
              val: utilDes,
              set: setUtilDes,
              c: 'purple',
            },
            {
              label: `Support: ${utilSup}%`,
              val: utilSup,
              set: setUtilSup,
              c: 'green',
            },
          ].map((s) => (
            <div key={s.label}>
              <label className="text-xs font-semibold text-gray-700 block mb-0.5">
                {s.label}
              </label>
              <input
                type="range"
                min={60}
                max={95}
                value={s.val}
                onChange={(e) => s.set(+e.target.value)}
                className={`w-full accent-${s.c}-600`}
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Client Feedback
            </label>
            <div className="flex gap-1">
              {[
                { l: 'Realistic', v: true },
                { l: 'Best Case', v: false },
              ].map((o) => (
                <button
                  key={o.l}
                  onClick={() => setClientDays(o.v)}
                  className={`px-2 py-1 text-xs rounded font-semibold ${
                    clientDays === o.v
                      ? 'bg-amber-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Complexity
            </label>
            <div className="flex gap-1 flex-wrap">
              {['Simple', 'Complex', 'Creation', 'Bespoke'].map((c) => (
                <button
                  key={c}
                  onClick={() => setComplexity(c)}
                  className={`px-2 py-0.5 text-xs rounded font-semibold ${
                    complexity === c
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Asset Volume
            </label>
            <div className="flex gap-1">
              {['0-30', '30-50', '50-100'].map((b) => (
                <button
                  key={b}
                  onClick={() => setAssetBand(b)}
                  className={`px-2 py-0.5 text-xs rounded font-semibold ${
                    assetBand === b
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              EAN Band
            </label>
            <div className="flex gap-1">
              {['1-5 EANs', '5-10 EANs', '10-15 EANs'].map((b) => (
                <button
                  key={b}
                  onClick={() => setEanBand(b)}
                  className={`px-2 py-0.5 text-xs rounded font-semibold ${
                    eanBand === b
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {b.replace(' EANs', '')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Syndication Complexity
            </label>
            <div className="flex gap-1">
              {['Simple', 'Mid', 'Complex'].map((c) => (
                <button
                  key={c}
                  onClick={() => setSyndCplx(c)}
                  className={`px-2 py-0.5 text-xs rounded font-semibold ${
                    syndCplx === c
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capacity pool strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: 'PM Pool',
              days: pools.pm,
              hc: hc.pm,
              color: 'blue',
              sub: `${hc.pm.fte} FTE + ${hc.pm.fl} FL`,
            },
            {
              label: 'Designer Pool',
              days: pools.des,
              hc: hc.des,
              color: 'purple',
              sub: `${hc.des.fte} FTE + ${hc.des.fl} FL`,
            },
            {
              label: 'Content/Supp',
              days: pools.sup,
              hc: hc.sup,
              color: 'green',
              sub: `${hc.sup.fte} FTE + ${hc.sup.fl} FL`,
            },
          ].map((p) => (
            <div
              key={p.label}
              className={`bg-${p.color}-50 border border-${p.color}-200 rounded-xl px-3 py-2 flex justify-between items-center`}
            >
              <div>
                <p className={`text-xs font-bold text-${p.color}-700`}>
                  {p.label}{' '}
                  <span className="font-normal opacity-60">
                    over {period.label}
                  </span>
                </p>
                <p className={`text-xs text-${p.color}-500`}>
                  {p.hc.total} people · {p.sub}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-black text-${p.color}-700`}>
                  {p.days}
                </p>
                <p className={`text-xs text-${p.color}-400`}>days</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="px-5 pt-3 flex gap-2 flex-wrap border-b border-gray-200 bg-white">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-all ${
              activeTab === t
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4 max-w-6xl mx-auto">
        {/* Div filter */}
        {(activeTab === '📊 Capacity' || activeTab === '🗂 Volume') && (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-bold text-gray-500 uppercase">
              Division:
            </p>
            {['All', 'LDB', 'PPD', 'LLD'].map((d) => (
              <button
                key={d}
                onClick={() => setDivFilter(d)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  divFilter === d
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-300'
                }`}
              >
                {d}
              </button>
            ))}
            <PeriodBadge />
          </div>
        )}

        {/* ══ CAPACITY TAB ══ */}
        {activeTab === '📊 Capacity' && (
          <div className="space-y-4">
            {/* Period callout */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold text-blue-800">
                📅 All figures below are for a{' '}
                <span className="underline">{period.label}</span> planning
                period ({WD} working days)
              </p>
              {period.months > 1 && (
                <p className="text-xs text-blue-600">
                  Monthly rate: <strong>{monthlyProj} projects/mo</strong> ·{' '}
                  <strong>~{monthlyAssets.toLocaleString()} assets/mo</strong>
                </p>
              )}
            </div>

            <div className="grid grid-cols-5 gap-3">
              {[
                {
                  label: `Total Projects (${period.label})`,
                  val: cur.tProj,
                  unit: 'projects',
                  bg: 'bg-blue-600 text-white',
                },
                {
                  label: `Total Assets (${period.label})`,
                  val: cur.tAssets.toLocaleString(),
                  unit: 'assets',
                  bg: 'bg-indigo-600 text-white',
                },
                {
                  label: `PM Util — ${divFilter}`,
                  val: `${uPM}%`,
                  unit: rag(uPM).dot,
                  bg: `${rag(uPM).bg}  ${rag(uPM).tx}  border ${rag(uPM).brd}`,
                },
                {
                  label: `Design Util — ${divFilter}`,
                  val: `${uDes}%`,
                  unit: rag(uDes).dot,
                  bg: `${rag(uDes).bg} ${rag(uDes).tx} border ${rag(uDes).brd}`,
                },
                {
                  label: `Content Util — ${divFilter}`,
                  val: `${uSup}%`,
                  unit: rag(uSup).dot,
                  bg: `${rag(uSup).bg} ${rag(uSup).tx} border ${rag(uSup).brd}`,
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className={`rounded-xl p-3 text-center ${k.bg}`}
                >
                  <p className="text-xs font-semibold opacity-80 leading-tight">
                    {k.label}
                  </p>
                  <p className="text-2xl font-black">{k.val}</p>
                  <p className="text-xs opacity-70">{k.unit}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-4">
                Capacity Utilisation — {divFilter} ·{' '}
                <span className="text-blue-600">{period.label}</span> ·{' '}
                {complexity} · {assetBand} assets
              </h2>
              <div className="space-y-4">
                {[
                  {
                    label: 'Project Managers',
                    demand: cur.tPM,
                    avail: ap.pm,
                    u: uPM,
                  },
                  {
                    label: 'Designers',
                    demand: cur.tDes,
                    avail: ap.des,
                    u: uDes,
                  },
                  {
                    label: 'Content/Support',
                    demand: cur.tSup,
                    avail: ap.sup,
                    u: uSup,
                  },
                ].map((r) => {
                  const rg = rag(r.u);
                  return (
                    <div key={r.label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold text-gray-700">
                          {r.label}
                          <span className="text-xs text-gray-400 ml-1">
                            ({r.avail}d available over {period.label})
                          </span>
                        </span>
                        <span className={`text-sm font-black ${rg.tx}`}>
                          {rg.dot} {r.u}% · {r.demand}d used
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${rg.bar}`}
                          style={{ width: `${Math.min(r.u, 100)}%` }}
                        />
                      </div>
                      {r.u > 100 && (
                        <p className="text-xs text-red-600 mt-0.5">
                          ⚠️ Over capacity by {r.u - 100}% over {period.label} —
                          reduce intake or add resource
                        </p>
                      )}
                      {r.avail >= r.demand && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Headroom: {r.avail - r.demand}d over {period.label}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  Projects & Assets by Division
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Over {period.label}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={divCompData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="Projects"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="Assets"
                      fill="#8b5cf6"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-1">
                  Utilisation % by Division
                </h2>
                <p className="text-xs text-gray-400 mb-3">
                  Based on {period.label} capacity
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={divCompData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Legend />
                    <Bar
                      dataKey="PMUtil"
                      name="PM %"
                      fill="#3b82f6"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="DesUtil"
                      name="Design %"
                      fill="#8b5cf6"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">
                Division Summary — {period.label}
              </h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="px-3 py-2 text-left">Division</th>
                    <th className="px-3 py-2 text-center">Projects</th>
                    <th className="px-3 py-2 text-center">Projects/Mo</th>
                    <th className="px-3 py-2 text-center">Assets</th>
                    <th className="px-3 py-2 text-center">Assets/Mo</th>
                    <th className="px-3 py-2 text-center">PM Pool</th>
                    <th className="px-3 py-2 text-center">PM Util</th>
                    <th className="px-3 py-2 text-center">Des Pool</th>
                    <th className="px-3 py-2 text-center">Des Util</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mixAnalysis, combined].map((d) => {
                    const p = divPools[d.div] || pools;
                    const rP = rag(uc(d.tPM, p.pm)),
                      rD = rag(uc(d.tDes, p.des));
                    const isTot = d.div === 'All';
                    return (
                      <tr
                        key={d.div}
                        className={`border-t border-gray-100 ${
                          isTot ? 'bg-gray-50 font-bold' : ''
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold">
                          {isTot ? '▶ TOTAL' : d.div}
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-blue-700">
                          {d.tProj}
                        </td>
                        <td className="px-3 py-2 text-center text-blue-500 text-xs">
                          ~{Math.round(d.tProj / period.months)}/mo
                        </td>
                        <td className="px-3 py-2 text-center font-bold text-indigo-700">
                          {d.tAssets.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center text-indigo-500 text-xs">
                          ~
                          {Math.round(
                            d.tAssets / period.months
                          ).toLocaleString()}
                          /mo
                        </td>
                        <td className="px-3 py-2 text-center">{p.pm}d</td>
                        <td
                          className={`px-3 py-2 text-center font-bold ${rP.tx}`}
                        >
                          {uc(d.tPM, p.pm)}%
                        </td>
                        <td className="px-3 py-2 text-center">{p.des}d</td>
                        <td
                          className={`px-3 py-2 text-center font-bold ${rD.tx}`}
                        >
                          {uc(d.tDes, p.des)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ VOLUME TAB ══ */}
        {activeTab === '🗂 Volume' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm font-bold text-blue-800">
                📅 Setting project intake for a{' '}
                <span className="underline">{period.label}</span> period
              </p>
              <p className="text-xs text-blue-600">
                Adjust the counts to reflect how many projects of each type you
                expect to handle across this entire period.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {['LDB', 'PPD', 'LLD'].map((div) => {
                const da = mixAnalysis.find((x) => x.div === div),
                  p = divPools[div];
                const uP = uc(da.tPM, p.pm),
                  uD = uc(da.tDes, p.des),
                  rP = rag(uP),
                  rD = rag(uD);
                return (
                  <div
                    key={div}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4"
                  >
                    <div className="flex justify-between mb-1">
                      <h3 className="font-black text-gray-900">{div}</h3>
                      <div className="text-right">
                        <p className="text-2xl font-black text-blue-700">
                          {da.tProj}
                        </p>
                        <p className="text-xs text-gray-400">
                          {period.label} · ~
                          {Math.round(da.tProj / period.months)}/mo
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-700 font-bold mb-1">
                      ~{da.tAssets.toLocaleString()} assets · ~
                      {Math.round(da.tAssets / period.months).toLocaleString()}
                      /mo
                    </p>
                    <p className="text-xs text-gray-400 mb-3">
                      {period.workingDays}d capacity period
                    </p>
                    {[
                      { l: 'PM', u: uP, r: rP },
                      { l: 'Design', u: uD, r: rD },
                    ].map((x) => (
                      <div key={x.l} className="mb-2">
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-gray-600">{x.l}</span>
                          <span className={`font-bold ${x.r.tx}`}>{x.u}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded h-2">
                          <div
                            className={`h-2 rounded ${x.r.bar}`}
                            style={{ width: `${Math.min(x.u, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 space-y-1">
                      {da.rows
                        .filter((r) => r.count > 0)
                        .map((r) => (
                          <div
                            key={r.id}
                            className="flex justify-between text-xs"
                          >
                            <span className="text-gray-700 truncate max-w-28">
                              {r.label
                                .replace('Country ', '')
                                .replace('Global ', 'G.')
                                .replace('Local ', 'L.')}
                            </span>
                            <span className="font-bold text-gray-900">
                              {r.count}×{' '}
                              <span className="text-gray-400 font-normal">
                                {r.assets} assets
                              </span>
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800">
                  Adjust Intake — <PeriodBadge />
                </h2>
                <p className="text-xs text-gray-400">
                  Enter total projects for the {period.label} period. Monthly
                  rate shown automatically.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase">
                      <th className="px-3 py-2 text-left">Project Type</th>
                      <th className="px-3 py-2 text-center">SLA Days</th>
                      <th className="px-3 py-2 text-center">Avg Assets</th>
                      <th className="px-3 py-2 text-center">LDB</th>
                      <th className="px-3 py-2 text-center">PPD</th>
                      <th className="px-3 py-2 text-center">LLD</th>
                      <th className="px-3 py-2 text-center">
                        Total ({period.label})
                      </th>
                      <th className="px-3 py-2 text-center">Per Month</th>
                      <th className="px-3 py-2 text-center">
                        Assets ({period.label})
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {mix.map((m) => {
                      const pt = PT.find((p) => p.id === m.id),
                        sla = slaMap[m.id];
                      const rowTot = m.LDB + m.PPD + m.LLD;
                      return (
                        <tr
                          key={m.id}
                          className="border-t border-gray-100 hover:bg-gray-50"
                        >
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: pt.color }}
                              />
                              <span className="font-semibold text-gray-800">
                                {pt.label}
                              </span>
                              {hasOv(m.id) && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full">
                                  custom SLA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center font-black text-gray-900">
                            {sla.total}
                          </td>
                          <td className="px-3 py-2 text-center text-gray-500">
                            {sla.avgAssets}
                          </td>
                          {['LDB', 'PPD', 'LLD'].map((div) => (
                            <td key={div} className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => updMix(m.id, div, m[div] - 1)}
                                  className="w-5 h-5 rounded bg-gray-200 text-xs font-bold"
                                >
                                  −
                                </button>
                                <span className="w-5 text-center font-black text-blue-700">
                                  {m[div]}
                                </span>
                                <button
                                  onClick={() => updMix(m.id, div, m[div] + 1)}
                                  className="w-5 h-5 rounded bg-gray-200 text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-black text-blue-700">
                            {rowTot}
                          </td>
                          <td className="px-3 py-2 text-center text-blue-500 font-semibold">
                            ~{Math.round(rowTot / period.months)}/mo
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-indigo-700">
                            {(rowTot * sla.avgAssets).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                      <td colSpan={3} className="px-3 py-2 text-gray-700">
                        TOTAL
                      </td>
                      {['LDB', 'PPD', 'LLD'].map((div) => {
                        const da = mixAnalysis.find((x) => x.div === div);
                        return (
                          <td
                            key={div}
                            className="px-3 py-2 text-center text-blue-700"
                          >
                            {da.tProj}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center text-blue-700">
                        {combined.tProj}
                      </td>
                      <td className="px-3 py-2 text-center text-blue-500">
                        ~{monthlyProj}/mo
                      </td>
                      <td className="px-3 py-2 text-center text-indigo-700">
                        {combined.tAssets.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ SLA CALC TAB ══ */}
        {activeTab === '🔢 SLA Calc' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">
                Select Project Type
              </h2>
              <div className="flex gap-2 flex-wrap">
                {PT.map((pt) => (
                  <button
                    key={pt.id}
                    onClick={() => setCalcType(pt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      calcType === pt.id
                        ? 'text-white border-transparent'
                        : 'bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                    style={calcType === pt.id ? { background: pt.color } : {}}
                  >
                    {pt.label}
                    {hasOv(pt.id) && <span className="ml-1 opacity-70">✎</span>}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2
                    className="text-base font-black"
                    style={{ color: calcPt.color }}
                  >
                    {calcPt.label}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Total: <strong>{calcSla.total}d</strong> ·{' '}
                    {calcPt.stages.filter(Boolean).length}/8 stages
                    {hasOv(calcType) && (
                      <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                        Custom SLA
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2 items-center">
                  {hasOv(calcType) && (
                    <button
                      onClick={() => resetOv(calcType)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-50 text-orange-600 border border-orange-200"
                    >
                      ↩ Reset All
                    </button>
                  )}
                  <div className="bg-blue-600 text-white rounded-xl px-4 py-2 text-center">
                    <p className="text-xs opacity-80">Total SLA</p>
                    <p className="text-2xl font-black leading-none">
                      {calcSla.total}
                    </p>
                    <p className="text-xs opacity-70">days per project</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {STAGE_META.map((sm) => {
                  const active = stageActive(calcPt, sm.key);
                  const defVal = calcSla.defaults[sm.key] ?? 0;
                  const curVal = calcSla.breakdown[sm.key] ?? 0;
                  const isOved = slaOv[calcType]?.[sm.key] !== undefined;
                  return (
                    <div
                      key={sm.key}
                      className={`rounded-xl border p-3 ${
                        active
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-100 bg-gray-50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            active
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {active ? '✓' : '–'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-bold ${
                                active ? 'text-blue-900' : 'text-gray-400'
                              }`}
                            >
                              {sm.label}
                            </span>
                            {isOved && (
                              <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-semibold">
                                custom
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {sm.desc}
                          </p>
                        </div>
                        {active ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isOved && (
                              <span className="text-xs text-gray-400 line-through">
                                {defVal}d
                              </span>
                            )}
                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm">
                              <button
                                onClick={() =>
                                  setOv(calcType, sm.key, curVal - 1)
                                }
                                className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center"
                              >
                                −
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={curVal}
                                onChange={(e) =>
                                  setOv(calcType, sm.key, e.target.value)
                                }
                                className={`w-12 text-center font-black text-lg border-none outline-none bg-transparent ${
                                  isOved ? 'text-orange-600' : 'text-blue-700'
                                }`}
                              />
                              <button
                                onClick={() =>
                                  setOv(calcType, sm.key, curVal + 1)
                                }
                                className="w-6 h-6 rounded bg-gray-100 text-sm font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-xs text-gray-400">days</span>
                            {isOved && (
                              <button
                                onClick={() => setOv(calcType, sm.key, defVal)}
                                className="text-xs text-orange-500 font-semibold"
                              >
                                ↩
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 bg-gray-100 rounded-lg px-3 py-1.5 font-semibold flex-shrink-0">
                            Not Required
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                <div className="bg-blue-600 rounded-xl p-3 text-white text-center">
                  <p className="text-xs opacity-80">Total SLA</p>
                  <p className="text-2xl font-black">{calcSla.total}d</p>
                  <p className="text-xs opacity-70">per project</p>
                </div>
                {[
                  { l: 'PM Days', v: calcSla.pmDays, c: 'blue' },
                  { l: 'Designer Days', v: calcSla.desDays, c: 'purple' },
                  { l: 'Support Days', v: calcSla.supDays, c: 'green' },
                ].map((r) => (
                  <div
                    key={r.l}
                    className={`bg-${r.c}-50 border border-${r.c}-200 rounded-xl p-3 text-center`}
                  >
                    <p className={`text-xs text-${r.c}-500`}>{r.l}</p>
                    <p className={`text-2xl font-black text-${r.c}-700`}>
                      {r.v}
                    </p>
                    <p className={`text-xs text-${r.c}-400`}>per project</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">
                All Types Reference — Max projects over {period.label}
              </h2>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase">
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-center">SLA Days</th>
                    <th className="px-3 py-2 text-center">PM Days</th>
                    <th className="px-3 py-2 text-center">Des Days</th>
                    <th className="px-3 py-2 text-center">
                      Max ({period.label})
                    </th>
                    <th className="px-3 py-2 text-center">Max /mo</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {PT.map((pt) => {
                    const sla = slaMap[pt.id];
                    const maxP = Math.min(
                      sla.pmDays > 0 ? Math.floor(pools.pm / sla.pmDays) : 999,
                      sla.desDays > 0
                        ? Math.floor(pools.des / sla.desDays)
                        : 999,
                      sla.supDays > 0
                        ? Math.floor(pools.sup / sla.supDays)
                        : 999
                    );
                    const maxPmo =
                      period.months > 0
                        ? Math.round(maxP / period.months)
                        : maxP;
                    return (
                      <tr
                        key={pt.id}
                        className={`border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${
                          calcType === pt.id ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setCalcType(pt.id)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: pt.color }}
                            />
                            <span className="font-semibold">{pt.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center font-black text-gray-900">
                          {sla.total}d
                        </td>
                        <td className="px-3 py-2 text-center text-blue-600 font-semibold">
                          {sla.pmDays}
                        </td>
                        <td className="px-3 py-2 text-center text-purple-600 font-semibold">
                          {sla.desDays}
                        </td>
                        <td
                          className="px-3 py-2 text-center font-black"
                          style={{
                            color:
                              maxP >= 8
                                ? '#22c55e'
                                : maxP >= 3
                                ? '#f59e0b'
                                : '#ef4444',
                          }}
                        >
                          {maxP === 999 ? '∞' : maxP}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500 font-semibold">
                          ~{maxP === 999 ? '∞' : maxPmo}/mo
                        </td>
                        <td className="px-3 py-2 text-right">
                          {hasOv(pt.id) ? (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-semibold">
                              Custom ✎
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-2">
                Max = if entire team worked only on that type for the full{' '}
                {period.label}. In a mixed portfolio these combine.
              </p>
            </div>
          </div>
        )}

        {/* ══ TEAM MANAGER TAB ══ */}
        {activeTab === '👥 Team Manager' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-600 text-white rounded-xl p-3 text-center">
                <p className="text-xs opacity-80">Active Team</p>
                <p className="text-3xl font-black">{activeRoster.length}</p>
                <p className="text-xs opacity-70">{removedIds.size} removed</p>
              </div>
              {[
                { l: 'PMs', h: hc.pm, c: 'blue' },
                { l: 'Designers', h: hc.des, c: 'purple' },
                { l: 'Content', h: hc.sup, c: 'green' },
              ].map((s) => (
                <div
                  key={s.l}
                  className={`bg-${s.c}-50 border border-${s.c}-200 rounded-xl p-3 text-center`}
                >
                  <p className={`text-xs font-bold text-${s.c}-600 uppercase`}>
                    {s.l}
                  </p>
                  <p className={`text-3xl font-black text-${s.c}-700`}>
                    {s.h.total}
                  </p>
                  <p className={`text-xs text-${s.c}-500`}>
                    {s.h.fte} FTE · {s.h.fl} FL
                  </p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    value={tmSearch}
                    onChange={(e) => setTmSearch(e.target.value)}
                    placeholder="Search name or role…"
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  {[
                    {
                      val: tmFamily,
                      set: setTmFamily,
                      opts: ['All', ...FAMILY_OPTIONS],
                    },
                    {
                      val: tmType,
                      set: setTmType,
                      opts: ['All', 'FTE', 'Freelance'],
                    },
                    {
                      val: tmDiv,
                      set: setTmDiv,
                      opts: ['All', ...DIV_OPTIONS],
                    },
                  ].map((s, i) => (
                    <select
                      key={i}
                      value={s.val}
                      onChange={(e) => s.set(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {s.opts.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ))}
                  <span className="text-xs text-gray-400">
                    {tmFiltered.length} shown
                  </span>
                </div>
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                >
                  + Add Person
                </button>
              </div>

              {showAdd && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-blue-800 mb-3">
                    ➕ Add New Team Member
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Full Name *
                      </label>
                      <input
                        value={newP.name}
                        onChange={(e) =>
                          setNewP((p) => ({ ...p, name: e.target.value }))
                        }
                        placeholder="e.g. Jane Smith"
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                      />
                    </div>
                    {[
                      {
                        label: 'Role',
                        val: newP.role,
                        set: (v) => setNewP((p) => ({ ...p, role: v })),
                        opts: ROLE_OPTIONS,
                      },
                      {
                        label: 'Function',
                        val: newP.family,
                        set: (v) => setNewP((p) => ({ ...p, family: v })),
                        opts: FAMILY_OPTIONS,
                      },
                      {
                        label: 'Contract',
                        val: newP.type,
                        set: (v) => setNewP((p) => ({ ...p, type: v })),
                        opts: ['FTE', 'Freelance'],
                      },
                      {
                        label: 'Division',
                        val: newP.division,
                        set: (v) => setNewP((p) => ({ ...p, division: v })),
                        opts: DIV_OPTIONS,
                      },
                    ].map((f) => (
                      <div key={f.label}>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">
                          {f.label}
                        </label>
                        <select
                          value={f.val}
                          onChange={(e) => f.set(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        >
                          {f.opts.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addPerson}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700"
                    >
                      ✓ Add to Team
                    </button>
                    <button
                      onClick={() => setShowAdd(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 text-gray-500 uppercase border-b border-gray-200">
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Function</th>
                      <th className="px-3 py-2 text-center">Type</th>
                      <th className="px-3 py-2 text-center">Division</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tmFiltered.map((p) => {
                      const removed = removedIds.has(p.id),
                        isEd = editingId === p.id;
                      return (
                        <tr
                          key={p.id}
                          className={`border-t border-gray-100 ${
                            removed
                              ? 'opacity-40 bg-red-50'
                              : isEd
                              ? 'bg-yellow-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-2">
                            {isEd ? (
                              <input
                                value={editData.name}
                                onChange={(e) =>
                                  setEditData((d) => ({
                                    ...d,
                                    name: e.target.value,
                                  }))
                                }
                                className="border border-blue-300 rounded px-2 py-0.5 text-xs w-full focus:outline-none"
                              />
                            ) : (
                              <span
                                className={`font-semibold ${
                                  removed
                                    ? 'line-through text-gray-400'
                                    : 'text-gray-900'
                                }`}
                              >
                                {p.name}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEd ? (
                              <select
                                value={editData.role}
                                onChange={(e) =>
                                  setEditData((d) => ({
                                    ...d,
                                    role: e.target.value,
                                  }))
                                }
                                className="border border-blue-300 rounded px-1 py-0.5 text-xs w-full bg-white focus:outline-none"
                              >
                                {ROLE_OPTIONS.map((r) => (
                                  <option key={r}>{r}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-600">{p.role}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {isEd ? (
                              <select
                                value={editData.family}
                                onChange={(e) =>
                                  setEditData((d) => ({
                                    ...d,
                                    family: e.target.value,
                                  }))
                                }
                                className="border border-blue-300 rounded px-1 py-0.5 text-xs w-full bg-white focus:outline-none"
                              >
                                {FAMILY_OPTIONS.map((f) => (
                                  <option key={f}>{f}</option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                style={{
                                  background: FAMILY_COLORS[p.family] + '22',
                                  color: FAMILY_COLORS[p.family],
                                }}
                              >
                                {p.family.split(' / ')[0]}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEd ? (
                              <select
                                value={editData.type}
                                onChange={(e) =>
                                  setEditData((d) => ({
                                    ...d,
                                    type: e.target.value,
                                  }))
                                }
                                className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
                              >
                                <option>FTE</option>
                                <option>Freelance</option>
                              </select>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  p.type === 'FTE'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {p.type}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isEd ? (
                              <select
                                value={editData.division}
                                onChange={(e) =>
                                  setEditData((d) => ({
                                    ...d,
                                    division: e.target.value,
                                  }))
                                }
                                className="border border-blue-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
                              >
                                {DIV_OPTIONS.map((d) => (
                                  <option key={d}>{d}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-gray-600 font-medium">
                                {p.division}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                removed
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {removed ? 'Removed' : 'Active'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-center gap-1">
                              {!removed && !isEd && (
                                <>
                                  <button
                                    onClick={() => startEdit(p)}
                                    className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-600 border border-blue-200"
                                  >
                                    ✎
                                  </button>
                                  <button
                                    onClick={() => removePerson(p.id)}
                                    className="px-2 py-1 text-xs font-semibold rounded bg-red-50 text-red-600 border border-red-200"
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                              {isEd && (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white"
                                  >
                                    ✓ Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {removed && (
                                <button
                                  onClick={() => restorePerson(p.id)}
                                  className="px-2 py-1 text-xs font-semibold rounded bg-green-50 text-green-600 border border-green-200"
                                >
                                  ↩ Restore
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {removedIds.size > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                <h3 className="text-sm font-bold text-red-700 mb-2">
                  🗑 Removed ({removedIds.size}) — excluded from all capacity
                  calculations
                </h3>
                <div className="flex flex-wrap gap-2">
                  {roster
                    .filter((p) => removedIds.has(p.id))
                    .map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-xs font-semibold text-gray-700">
                          {p.name}
                        </span>
                        <span className="text-xs text-gray-400">{p.role}</span>
                        <button
                          onClick={() => restorePerson(p.id)}
                          className="text-xs text-green-600 font-bold"
                        >
                          ↩
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">
                FTE vs Freelance Distribution
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={hcBarData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="FTE" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar
                    dataKey="Freelance"
                    fill="#a5b4fc"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-400 py-4">
        L'Oréal eComm Programme · Planning Period: {period.label} ({WD} working
        days) · {activeRoster.length} active team members
      </p>
    </div>
  );
}
