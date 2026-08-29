'use client';

import { useState, useEffect } from 'react';
import { Participant, Badge, SkillBadge } from '@/lib/db';
import { CheckIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import ActivityChart from '@/components/ActivityChart';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import AccessCodeModal, { type TrackInfo } from '@/components/AccessCodeModal';
import { useLang } from '@/lib/LanguageContext';

const ACTIVE_START = '2026-07-01';

/* ─── ARCADE DATA ─────────────────────────────────────────── */
const TIERS = [
  { key: 'tier.legend',   min: 120, color: '#f9ab00', bg: 'rgba(249,171,0,0.10)',   border: 'rgba(249,171,0,0.28)',   emoji: '🏆' },
  { key: 'tier.champion', min: 95,  color: '#a56ef5', bg: 'rgba(165,110,245,0.10)', border: 'rgba(165,110,245,0.28)', emoji: '👑' },
  { key: 'tier.ranger',   min: 75,  color: '#4285f4', bg: 'rgba(66,133,244,0.10)',  border: 'rgba(66,133,244,0.28)',  emoji: '🎯' },
  { key: 'tier.trooper',  min: 50,  color: '#34a853', bg: 'rgba(52,168,83,0.10)',   border: 'rgba(52,168,83,0.28)',   emoji: '🛡️' },
];

const MILESTONES = [
  { id: 1, label: 'Milestone 1', games: 6,  badge: 14,  bonus: 7,  color: '#4ade80', bg: 'rgba(74,222,128,0.2)', border:'rgba(34,211,238,0.22)' },
  { id: 2, label: 'Milestone 2', games: 8,  badge: 28, bonus: 18, color: '#4ade80', bg: 'rgba(34,211,238,0.2)', border:'rgba(34,211,238,0.22)' },
  { id: 3, label: 'Milestone 3', games: 3,  badge: 42, bonus: 29, color: '#4ade80', bg: 'rgba(34,211,238,0.2)', border:'rgba(34,211,238,0.22)' },
  { id: 4, label: 'Ultimate Milestone', games: 12,  badge: 56, bonus: 40, color: '#4ade80', bg: 'rgba(251,191,36,0.2)', border:'rgba(251,191,36,0.22)' },
];

/* ─── JULY 2026 GAME TRACKS (corrected from skills.google) ─ */
const JULY_TRACKS = [
  {
    id: 1, name: 'Arcade Base Camp', type: 'Base Camp', level: 'Beginner',
    fullName: 'Arcade Base Camp August 2026',
    url: 'https://www.skills.google/games/7394',
    accessCode: '1q-basecamp-10219',
    desc: 'Develop key Google Cloud skills. No prior experience needed. Available in Spanish & Portuguese.',
    img: 'https://cdn.qwiklabs.com/nXo%2Bc%2FLavbtJXZma1hYLmBxApy6Cr6CZiR1Bnukj5dk%3D',
    levelColor: '#34a853',
  },  
  {
    id: 2, name: 'Arcade Trail', type: 'Trail', level: 'Beginner',
    fullName: 'Arcade Trail: Cloud Delivery Systems',
    url: 'https://www.skills.google/games/7396',
    accessCode: '1q-delivery-31058',
    desc: 'Admin Console, user provisioning, Google Meet and Google Classroom setup.',
    img: 'https://cdn.qwiklabs.com/fRCfiQc6gVA%2BSEUkSvc7agSfPUGUiHmYaI4kslS9mSw%3D',
    levelColor: '#34a853',
  },
  {
    id: 3, name: 'Arcade Voyage', type: 'Voyage', level: 'Intermediate',
    fullName: 'Arcade Voyage: Google Sheets',
    url: 'https://www.skills.google/games/7398',
    accessCode: '1q-sheets-29185',
    desc: 'Master Cloud Storage, Bucket Lock, and Sensitive Data Protection discovery at scale.',
    img: 'https://cdn.qwiklabs.com/yn3KXIRZy6Md4qAEmKiYk6SEuHg0a7gDEaqc2H4o1Cs%3D',
    levelColor: '#4285f4',
  },
  {
    id: 4, name: 'Arcade Adventure', type: 'Adventure', level: 'Intermediate',
    fullName: 'Arcade Adventure: Data Vault',
    url: 'https://www.skills.google/games/7395',
    accessCode: '1q-datamgt-92372',
    desc: 'Build apps with AppSheet and deploy Cloud Run Functions — no heavy code required.',
    img: 'https://cdn.qwiklabs.com/vQwBzyge8g7JI%2Fs9rWfu%2BvXJurcIOnP0A9wKR7U4i14%3D',
    levelColor: '#4285f4',
  },
  {
    id: 5, name: 'Arcade Simulator', type: 'Simulator', level: 'Advanced',
    fullName: 'Arcade Simulator: Network Security Engineer',
    url: 'https://www.skills.google/games/7397',
    accessCode: '1q-network-51470',
    desc: 'BigQuery partitioned tables, Dataplex Knowledge Catalog, and decentralized data governance.',
    img: 'https://cdn.qwiklabs.com/KU0Jp50XMAj26Vmx1iNYlmxJUltgvVVAa3YI0Xgssjg%3D',
    levelColor: '#ea4335',
  },
  {
    id: 6, name: 'Spans and Plans', type: 'Special', level: 'Advanced',
    fullName: 'Spans and Plans',
    url: 'https://www.skills.google/games/7399',
    accessCode: '1q-schema-27083',
    desc: 'Security Command Center threat detection, GKE multi-tenant namespaces, and autoscaling.',
    img: 'https://cdn.qwiklabs.com/jf0VYLPQlpqie%2FRI4cjTeBwtiL3xPto3PBIM5b8iSzI%3D',
    levelColor: '#ea4335',
  },
];

/* ─── FASTTRACK CATALOG ─────────────────────────────────── */
const CAT_LABELS: Record<string, string> = {
  all:'All', genai:'Gen AI', aiml:'AI / ML', data:'Data',
  infra:'Infrastructure', appdev:'App Dev', security:'Security', network:'Networking', workspace:'Workspace',
};
const CAT_ICONS: Record<string, string> = {
  all:'', genai:'', aiml:'', data:'', infra:'', appdev:'', security:'', network:'', workspace:'',
};
const DIFF_COLORS: Record<string, string> = {
  Introductory: '#34a853', Intermediate: '#FFFF00', Advanced: '#ea4335',
};

const CATALOG_BADGES: (SkillBadge & { cat: string })[] = [
  /* ── GCAF 2026 — Beginner ── */
  { id:1,  name:'Create Your First Gemini Enterprise Application',                           url:'https://www.skills.google/course_templates/1586', difficulty:'Introductory', cat:'genai',     labs:1,  duration:'1h',    credits:0  },
  { id:2,  name:'Develop AI-Powered Prototypes in Google AI Studio',                         url:'https://www.skills.google/course_templates/1426', difficulty:'Introductory', cat:'genai',     labs:4,  duration:'4h',    credits:0  },
  { id:3,  name:'The Basics of Google Cloud Compute',                                        url:'https://www.skills.google/course_templates/754',  difficulty:'Introductory', cat:'infra',     labs:4,  duration:'4h',    credits:4  },
  { id:4,  name:'Implement Event-Driven Messaging and Automation Workflows',                 url:'https://www.skills.google/course_templates/728',  difficulty:'Introductory', cat:'appdev',    labs:3,  duration:'3h',    credits:2  },
  { id:5,  name:'Implement Cloud Storage and Data Protection Solutions',                     url:'https://www.skills.google/course_templates/725',  difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:4  },
  { id:6,  name:'Create a Streaming Data Lake on Cloud Storage',                             url:'https://www.skills.google/course_templates/705',  difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:3  },
  { id:7,  name:'Deploy and Manage Applications on Google App Engine',                       url:'https://skills.google/course_templates/671',      difficulty:'Introductory', cat:'appdev',    labs:4,  duration:'4h',    credits:4  },
  { id:8,  name:'Implement Speech and Language Solutions with Pre-trained APIs',             url:'https://www.skills.google/course_templates/700',  difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:4  },
  { id:9,  name:'Using the Google Cloud Speech API',                                         url:'https://www.skills.google/course_templates/756',  difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:4  },
  { id:10, name:'Analyze Speech and Language with Google APIs',                              url:'https://www.skills.google/course_templates/634',  difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:8  },
  { id:11, name:'Store, Process, and Manage Data on Google Cloud - Console',                 url:'https://skills.google/course_templates/658',      difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:3  },
  { id:12, name:'Store, Process, and Manage Data on Google Cloud - Command Line',            url:'https://www.skills.google/course_templates/659',  difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:3  },
  { id:13, name:'Migrate MySQL Data to Cloud SQL Using Database Migration Service',          url:'https://skills.google/course_templates/629',      difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:5  },
  { id:14, name:'Get Started with Sensitive Data Protection',                                url:'https://www.skills.google/course_templates/750',  difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:4  },
  { id:15, name:'Analyze Images with the Cloud Vision API',                                  url:'https://www.skills.google/course_templates/633',  difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:12 },
  { id:16, name:'Build Event-Driven Applications with Eventarc',                             url:'https://skills.google/course_templates/727',      difficulty:'Introductory', cat:'appdev',    labs:4,  duration:'4h',    credits:3  },
  { id:17, name:'Configure Service Accounts and IAM Roles for Google Cloud',                 url:'https://skills.google/course_templates/702',      difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:4  },
  { id:18, name:'Prepare Data for Looker Dashboards and Reports',                            url:'https://www.skills.google/course_templates/628',  difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:0  },
  { id:19, name:'Analyze Sentiment with Natural Language API',                               url:'https://skills.google/course_templates/667',      difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:12 },
  { id:20, name:'Use APIs to Work with Cloud Storage',                                       url:'https://skills.google/course_templates/755',      difficulty:'Introductory', cat:'infra',     labs:4,  duration:'4h',    credits:4  },
  { id:21, name:'Derive Insights from BigQuery Data',                                        url:'https://www.skills.google/course_templates/623',  difficulty:'Introductory', cat:'data',      labs:7,  duration:'7h',    credits:6  },
  { id:22, name:'Share Data Using Google Data Cloud',                                        url:'https://skills.google/course_templates/657',      difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:9  },
  { id:23, name:'Implement Cloud Collaboration and Productivity Workflows',                  url:'https://www.skills.google/course_templates/676',  difficulty:'Introductory', cat:'appdev',    labs:7,  duration:'7h',    credits:0  },
  { id:24, name:'Monitor Environments with Google Cloud Managed Service for Prometheus',     url:'https://www.skills.google/course_templates/761',  difficulty:'Introductory', cat:'security',  labs:5,  duration:'5h',    credits:13 },
  { id:25, name:'Organize and Govern Data with Knowledge Catalog',                           url:'https://skills.google/course_templates/726',      difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:4  },
  { id:26, name:'Integrate BigQuery Data and Google Workspace using Apps Script',            url:'https://www.skills.google/course_templates/737',  difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:2  },
  { id:27, name:'Build a Data Mesh with Knowledge Catalog',                                  url:'https://www.skills.google/course_templates/681',  difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:5  },
  { id:28, name:'Develop with Apps Script and AppSheet',                                     url:'https://skills.google/course_templates/715',      difficulty:'Introductory', cat:'appdev',    labs:4,  duration:'4h',    credits:3  },
  { id:29, name:'Secure Lakehouse Data',                                                     url:'https://www.skills.google/course_templates/751',  difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:3  },
  { id:30, name:'Enrich Metadata and Discovery of Lakehouse Data',                           url:'https://skills.google/course_templates/753',      difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:2  },
  { id:31, name:'Create a Secure Data Lake on Cloud Storage',                                url:'https://skills.google/course_templates/704',      difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:4  },
  { id:32, name:'Monitoring in Google Cloud',                                                url:'https://www.skills.google/course_templates/747',  difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:4  },
  { id:33, name:'Set Up a Google Cloud Network',                                             url:'https://skills.google/course_templates/641',      difficulty:'Introductory', cat:'network',   labs:7,  duration:'7h',    credits:15 },
  { id:34, name:'Create and Manage AlloyDB Instances',                                       url:'https://skills.google/course_templates/642',      difficulty:'Introductory', cat:'data',      labs:6,  duration:'6h',    credits:1  },
  { id:35, name:'Build LookML Objects in Looker',                                            url:'https://skills.google/course_templates/639',      difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:0  },
  { id:36, name:'Monitor and Log with Google Cloud Observability',                           url:'https://skills.google/course_templates/749',      difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:9  },
  { id:37, name:'Set Up an App Dev Environment on Google Cloud',                             url:'https://www.skills.google/course_templates/637',  difficulty:'Introductory', cat:'appdev',    labs:10, duration:'10h',   credits:8  },
  { id:38, name:'Prepare Data for ML APIs on Google Cloud',                                  url:'https://skills.google/course_templates/631',      difficulty:'Introductory', cat:'aiml',      labs:10, duration:'10h',   credits:13 },
  { id:39, name:'Build Serverless Applications with Cloud Run Functions',                    url:'https://www.skills.google/course_templates/696',  difficulty:'Introductory', cat:'infra',     labs:4,  duration:'4h',    credits:4  },
  { id:40, name:'Streaming Analytics into BigQuery',                                         url:'https://skills.google/course_templates/752',      difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:2  },
  { id:41, name:'Deploy and Secure Serverless APIs with API Gateway',                        url:'https://www.skills.google/course_templates/662',  difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:3  },
  { id:42, name:'App Building with AppSheet',                                                url:'https://www.skills.google/course_templates/635',  difficulty:'Introductory', cat:'appdev',    labs:4,  duration:'4h',    credits:0  },
  { id:43, name:'Analyze BigQuery Data in Connected Sheets',                                 url:'https://skills.google/course_templates/632',      difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:0  },
  { id:44, name:'Create and Manage Bigtable Instances',                                      url:'https://www.skills.google/course_templates/650',  difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:5  },
  { id:45, name:'Create and Manage Cloud Spanner Instances',                                 url:'https://www.skills.google/course_templates/643',  difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:5  },
  { id:46, name:'Automate Data Capture at Scale with Document AI',                           url:'https://skills.google/course_templates/674',      difficulty:'Introductory', cat:'aiml',      labs:4,  duration:'4h',    credits:7  },
  { id:47, name:'Prompt Design in Agent Platform',                                           url:'https://www.skills.google/course_templates/976',  difficulty:'Introductory', cat:'genai',     labs:4,  duration:'4h',    credits:4  },
  { id:48, name:'Orchestrate Multi-agent Workflows with Gemini Enterprise',                  url:'https://skills.google/course_templates/1682',     difficulty:'Introductory', cat:'genai',     labs:0,  duration:'0h',    credits:0  },
  { id:49, name:'Develop AI-Powered Prototypes in Google AI Studio Challenge Labs',          url:'https://skills.google/course_templates/1426',     difficulty:'Introductory', cat:'genai',     labs:4,  duration:'4h',    credits:0  },
  { id:50, name:'Create and Manage Cloud SQL for PostgreSQL Instances',                      url:'https://www.skills.google/course_templates/652',  difficulty:'Introductory', cat:'data',      labs:5,  duration:'5h',    credits:5  },
  { id:51, name:'Deploy and Manage Apigee X',                                                url:'https://www.skills.google/course_templates/661',  difficulty:'Introductory', cat:'appdev',    labs:5,  duration:'5h',    credits:9  },
  { id:52, name:'Build a Website on Google Cloud',                                           url:'https://skills.google/course_templates/638',      difficulty:'Introductory', cat:'infra',     labs:5,  duration:'5h',    credits:13 },
  { id:53, name:'Monitor and Manage Google Cloud Resources',                                 url:'https://skills.google/course_templates/653',      difficulty:'Introductory', cat:'security',  labs:4,  duration:'4h',    credits:4  },
  { id:54, name:'Implementing Cloud Load Balancing for Compute Engine',                      url:'https://www.skills.google/course_templates/648',  difficulty:'Introductory', cat:'infra',     labs:5,  duration:'5h',    credits:5  },
  { id:55, name:'Implement Cloud Collaboration and Productivity Workflows',                  url:'https://www.skills.google/course_templates/676',  difficulty:'Introductory', cat:'workspace', labs:7,  duration:'7h',    credits:0  },
  { id:56, name:'Analyze BigQuery Data in Connected Sheets',                                 url:'https://skills.google/course_templates/632',      difficulty:'Introductory', cat:'data',      labs:4,  duration:'4h',    credits:0  },

  /* ── GCAF 2026 — Intermediate  ── */
  { id:57, name:'Engineer AI Agents with Agent Development Kit (ADK)',                       url:'https://skills.google/course_templates/1596',     difficulty:'Intermediate', cat:'genai',    labs:1,  duration:'1h',  credits:5  },
  { id:58, name:'Build Real World AI Applications with Gemini and Imagen',                   url:'https://www.skills.google/course_templates/1076', difficulty:'Intermediate', cat:'genai',    labs:4,  duration:'4h',  credits:0  },
  { id:59, name:'Build a Smart Cloud Application with Vibe Coding and MCP',                  url:'https://skills.google/course_templates/1459',     difficulty:'Intermediate', cat:'genai',    labs:4,  duration:'4h',  credits:4  },
  { id:60, name:'Engineer Data for Predictive Modeling with BigQuery ML',                    url:'https://skills.google/course_templates/627',      difficulty:'Intermediate', cat:'aiml',     labs:4,  duration:'4h',  credits:15 },
  { id:61, name:'Implement DevOps Workflows in Google Cloud',                                url:'https://skills.google/course_templates/716',      difficulty:'Intermediate', cat:'infra',    labs:4,  duration:'4h',  credits:16 },
  { id:62, name:'Create ML Models with BigQuery ML',                                         url:'https://www.skills.google/course_templates/626',  difficulty:'Intermediate', cat:'aiml',     labs:5,  duration:'5h',  credits:11 },
  { id:63, name:'Inspect Rich Documents with Gemini Multimodality and Multimodal RAG',       url:'https://skills.google/course_templates/981',      difficulty:'Intermediate', cat:'genai',    labs:4,  duration:'4h',  credits:20 },
  { id:64, name:'Manage Kubernetes in Google Cloud',                                         url:'https://www.skills.google/course_templates/783',  difficulty:'Intermediate', cat:'infra',    labs:4,  duration:'4h',  credits:20 },
  { id:65, name:'Deploy Kubernetes Applications on Google Cloud',                            url:'https://www.skills.google/course_templates/663',  difficulty:'Intermediate', cat:'infra',    labs:4,  duration:'4h',  credits:12 },
  { id:66, name:'Implement Cloud Security Fundamentals on Google Cloud',                     url:'https://www.skills.google/course_templates/645',  difficulty:'Intermediate', cat:'security', labs:8,  duration:'8h',  credits:20 },
  { id:67, name:'Develop and Secure APIs with Apigee X',                                     url:'https://www.skills.google/course_templates/714',  difficulty:'Intermediate', cat:'appdev',   labs:6,  duration:'6h',  credits:26 },
  { id:68, name:'Use Machine Learning APIs on Google Cloud',                                 url:'https://skills.google/course_templates/630',      difficulty:'Intermediate', cat:'aiml',     labs:7,  duration:'7h',  credits:26 },
  { id:69, name:'Explore Generative AI in Agent Platform',                                   url:'https://www.skills.google/course_templates/959',  difficulty:'Intermediate', cat:'genai',    labs:4,  duration:'4h',  credits:16 },
  { id:70, name:'Protect Cloud Traffic with Chrome Enterprise Premium Security',             url:'https://skills.google/course_templates/784',      difficulty:'Intermediate', cat:'security', labs:4,  duration:'4h',  credits:1  },
  { id:71, name:'Discover and Protect Sensitive Data Across Your Ecosystem',                 url:'https://skills.google/course_templates/1177',     difficulty:'Intermediate', cat:'security', labs:4,  duration:'4h',  credits:20 },
  { id:72, name:'Secure Software Delivery',                                                  url:'https://www.skills.google/course_templates/1164', difficulty:'Intermediate', cat:'security', labs:4,  duration:'4h',  credits:5  },
  { id:73, name:'Optimize Costs for Google Kubernetes Engine',                               url:'https://skills.google/course_templates/655',      difficulty:'Intermediate', cat:'infra',    labs:5,  duration:'5h',  credits:25 },
  { id:74, name:'Develop Serverless Apps with Firebase',                                     url:'https://www.skills.google/course_templates/649',  difficulty:'Intermediate', cat:'infra',    labs:4,  duration:'4h',  credits:16 },
  { id:75, name:'Develop Serverless Applications on Cloud Run',                              url:'https://www.skills.google/course_templates/741',  difficulty:'Intermediate', cat:'appdev',   labs:5,  duration:'5h',  credits:25 },
  { id:75, name:'Build a Data Warehouse with BigQuery',                                      url:'https://www.skills.google/course_templates/624',  difficulty:'Intermediate', cat:'data',     labs:5,  duration:'5h',  credits:25 },
  { id:76, name:'Build a Secure Google Cloud Network',                                       url:'https://skills.google/course_templates/654',      difficulty:'Intermediate', cat:'security', labs:6,  duration:'6h',  credits:25 },
  { id:77, name:'Develop Your Google Cloud Network',                                         url:'https://skills.google/course_templates/625',      difficulty:'Intermediate', cat:'network',  labs:6,  duration:'6h',  credits:18 },
  { id:78, name:'Use Functions, Formulas, and Charts in Google Sheets',                      url:'https://skills.google/course_templates/776',      difficulty:'Intermediate', cat:'data',     labs:6,  duration:'6h',  credits:0  },
  { id:79, name:'Build Infrastructure with Terraform on Google Cloud',                       url:'https://www.skills.google/course_templates/636',  difficulty:'Intermediate', cat:'infra',    labs:5,  duration:'5h',  credits:21 },
  { id:80, name:'Perform Predictive Data Analysis in BigQuery',                              url:'https://www.skills.google/course_templates/656',  difficulty:'Intermediate', cat:'data',     labs:5,  duration:'5h',  credits:23 },
  { id:81, name:'Manage Data Models in Looker',                                              url:'https://skills.google/course_templates/651',      difficulty:'Intermediate', cat:'data',     labs:6,  duration:'6h',  credits:0  },
  { id:82, name:'Mitigate Threats and Vulnerabilities with Security Command Center',         url:'https://skills.google/course_templates/759',      difficulty:'Intermediate', cat:'security', labs:5,  duration:'5h',  credits:5  },
  { id:83, name:'Engineer AI Agents with Agent Development Kit (ADK) Challenge Labs',        url:'https://www.skills.google/course_templates/1596', difficulty:'Intermediate', cat:'genai',    labs:1,  duration:'1h',  credits:5  },
  { id:84, name:'Perform Predictive Data Analysis in BigQuery',                              url:'https://www.skills.google/course_templates/656',  difficulty:'Intermediate', cat:'data',     labs:5,  duration:'5h',  credits:23 },
  { id:85, name:'Build Global and Regional Load Balancing Solutions',                        url:'https://skills.google/course_templates/1558',     difficulty:'Intermediate', cat:'network',  labs:4,  duration:'4h',  credits:20 },
  { id:86, name:'Kickstarting Application Development with Gemini Code Assist',              url:'https://www.skills.google/course_templates/1399', difficulty:'Intermediate', cat:'genai',    labs:4,  duration:'4h',  credits:5  },
  { id:87, name:'Connecting Cloud Networks with NCC',                                        url:'https://skills.google/course_templates/1364',     difficulty:'Intermediate', cat:'network',  labs:4,  duration:'4h',  credits:16 },
  { id:88, name:'Privileged Access with IAM',                                                url:'https://skills.google/course_templates/1337',     difficulty:'Intermediate', cat:'security', labs:5,  duration:'5h',  credits:17 },
  { id:89, name:'Enhance Gemini Model Capabilities',                                         url:'https://skills.google/course_templates/1241',     difficulty:'Intermediate', cat:'genai',    labs:6,  duration:'6h',  credits:14 },
  { id:90, name:'Analyze and Reason on Multimodal Data with Gemini',                         url:'https://skills.google/course_templates/1240',     difficulty:'Intermediate', cat:'genai',    labs:5,  duration:'5h',  credits:8  },
  { id:91, name:'Implement Multimodal Vector Search with BigQuery',                          url:'https://skills.google/course_templates/1232',     difficulty:'Intermediate', cat:'data',     labs:4,  duration:'4h',  credits:16 },
  { id:92, name:'Develop Gen AI Apps with Gemini and Streamlit',                             url:'https://skills.google/course_templates/978',      difficulty:'Intermediate', cat:'genai',    labs:5,  duration:'5h',  credits:21 },
  { id:93, name:'Cloud Architecture: Design, Implement, and Manage',                         url:'https://skills.google/course_templates/640',      difficulty:'Intermediate', cat:'infra',    labs:6,  duration:'6h',  credits:32 },
  { id:94, name:'Build Google Cloud Infrastructure for AWS Professionals',                   url:'https://skills.google/course_templates/687',      difficulty:'Intermediate', cat:'infra',    labs:4,  duration:'4h',  credits:15 },
  { id:95, name:'Implement CI/CD Pipelines on Google Cloud',                                 url:'https://skills.google/course_templates/691',      difficulty:'Intermediate', cat:'infra',    labs:5,  duration:'5h',  credits:25 },

  /* ── GCAF 2026 — Advanced ── */
  { id:96, name:'Explore Generative AI in Agent Platform',                                   url:'https://www.skills.google/course_templates/959',  difficulty:'Advanced',  cat:'genai',       labs:4,  duration:'4h', credits:16 },
  { id:97, name:'Google DeepMind: Train A Small Language Model',                             url:'https://www.skills.google/course_templates/1453', difficulty:'Advanced',  cat:'genai',       labs:1,  duration:'1h', credits:0  },
  { id:98, name:'Deploy Multi-Agent Architectures',                                          url:'https://www.skills.google/course_templates/1445', difficulty:'Advanced',  cat:'genai',       labs:4,  duration:'4h', credits:5  },
  { id:99, name:'[DEPRECATED] Designing Network Security in Google Cloud',                   url:'https://www.skills.google/course_templates/1412', difficulty:'Advanced',  cat:'security',    labs:5,  duration:'5h', credits:0  },
].map(b => ({ ...b, cost: undefined, created_at: undefined }));

/* ─── HELPERS ───────────────────────────────────────────── */
function norm(s: string) { return s.toLowerCase().replace(/[\s\-:&]+/g,''); }
function isEarned(badge: { name: string }, earned: Badge[]) {
  const bn = norm(badge.name);
  return earned.some(b => { const en = norm(b.badge_name); return en === bn || en.includes(bn) || bn.includes(en); });
}
function trackDone(track: typeof JULY_TRACKS[0], games: Badge[]) {
  const tn = norm(track.name);
  const fn = norm(track.fullName);
  return games.some(g => {
    const gn = norm(g.badge_name);
    return gn.includes(tn) || tn.includes(gn) || gn.includes(fn) || fn.includes(gn);
  });
}

/* ─── MAIN COMPONENT ────────────────────────────────────── */
interface Props { participant: Participant; badges: Badge[]; }
type SubTab = 'overview' | 'catalog' | 'badges';

export default function Dashboard({ participant, badges }: Props) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [dbSkills, setDbSkills]   = useState<SkillBadge[]>([]);
  const [search,   setSearch]     = useState('');
  const [diff,     setDiff]       = useState('all');
  const [cat,      setCat]        = useState('all');
  const [status,   setStatus]     = useState<'all'|'done'|'pending'>('all');
  const [page,     setPage]       = useState(1);
  const PAGE_SIZE = 12;

  const monthly  = badges.filter(b => b.earned_date >= ACTIVE_START);
  const games    = monthly.filter(b => b.category === 'game');
  const skills   = monthly.filter(b => b.category === 'skill_badge');
  const arcPts   = games.length + skills.length * 0.5;
  const m1Done   = games.length >= 1 && skills.length >= 7;
  const m2Done   = games.length >= 3 && skills.length >= 14;
  const m3Done   = games.length >= 8 && skills.length >= 28;
  const facBonus = m3Done ? 25 : m2Done ? 15 : m1Done ? 5 : 0;
  const total    = arcPts + facBonus;
  const currentTier = TIERS.find(t => total >= t.min) ?? null;
  const nextTier    = TIERS[currentTier ? TIERS.indexOf(currentTier) - 1 : TIERS.length - 1];

  useEffect(() => {
    if (activeTab !== 'catalog') return;
    fetch('/api/skills').then(r => r.json()).then(d => {
      if (d.skills?.length > 0) setDbSkills(d.skills);
    }).catch(() => {});
  }, [activeTab]);

  const catalogSource = (dbSkills.length > 0 ? dbSkills.map(s => ({ ...s, cat: 'general' })) : CATALOG_BADGES) as (SkillBadge & { cat: string })[];
  const earnedSkills  = badges.filter(b => b.category === 'skill_badge');

  /* Base filter — search + diff + cat, WITHOUT status.
     Used for button counts so they reflect the search context,
     not the currently active status tab. */
  const baseFiltered = catalogSource.filter(s => {
    const ms = !search || s.name.toLowerCase().includes(search.toLowerCase());
    const md = diff === 'all' || (s.difficulty?.toLowerCase() ?? '') === diff.toLowerCase();
    const mc = cat === 'all' || (s as any).cat === cat;
    return ms && md && mc;
  });
  const baseDoneCount    = baseFiltered.filter(s => isEarned(s, earnedSkills)).length;
  const basePendingCount = baseFiltered.length - baseDoneCount;

  /* Full filter — base + status. Used for the actual badge grid. */
  const filtered = status === 'all'
    ? baseFiltered
    : baseFiltered.filter(s => {
        const earned = isEarned(s, earnedSkills);
        return status === 'done' ? earned : !earned;
      });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <div className="space-y-3 animate-fade-slide-up" style={{ position:'relative', zIndex:1 }}>
      {/* Sub-tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border-md)' }}>
        {([['overview', `⫶☰ ${t('dash.tab.overview')}`],['catalog', `ᯓ➤ ${t('dash.tab.fasttrack')}`],['badges', `🜲 ${t('dash.tab.mybadges')}`]] as [SubTab,string][]).map(([id,label]) => {
          const active = activeTab === id;
          return (
            <button key={id} onClick={() => { setActiveTab(id); setPage(1); }}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200"
              style={active ? { background:'var(--blue)', color:'#fff', boxShadow:'0 1px 4px rgba(0,0,0,0.25)' } : { color:'var(--text-muted)' }}>
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && <OverviewTab games={games} skills={skills} arcPts={arcPts} facBonus={facBonus} total={total} currentTier={currentTier} nextTier={nextTier} m1Done={m1Done} m2Done={m2Done} m3Done={m3Done} monthly={monthly} allBadges={badges} />}
      {activeTab === 'catalog'  && <CatalogTab paged={paged} filtered={filtered} baseTotal={baseFiltered.length} baseDoneCount={baseDoneCount} basePendingCount={basePendingCount} search={search} setSearch={s=>{setSearch(s);setPage(1);}} diff={diff} setDiff={d=>{setDiff(d);setPage(1);}} cat={cat} setCat={c=>{setCat(c);setPage(1);}} status={status} setStatus={st=>{setStatus(st);setPage(1);}} page={page} setPage={setPage} totalPages={totalPages} monthly={monthly} earnedSkills={earnedSkills} />}
      {activeTab === 'badges'   && <BadgesTab badges={badges} monthly={monthly} />}
    </div>
  );
}

/* ─── OVERVIEW TAB ────────────────────────────────────────── */
function OverviewTab({ games, skills, arcPts, facBonus, total, currentTier, nextTier, m1Done, m2Done, m3Done, monthly, allBadges }: {
  games:Badge[]; skills:Badge[]; arcPts:number; facBonus:number; total:number;
  currentTier:typeof TIERS[0]|null; nextTier:typeof TIERS[0]|undefined;
  m1Done:boolean; m2Done:boolean; m3Done:boolean; monthly:Badge[]; allBadges:Badge[];
}) {
  const [selectedTrack, setSelectedTrack] = useState<TrackInfo | null>(null);
  const { t } = useLang();
  const tierPct = nextTier ? Math.min(100, (total / nextTier.min) * 100) : 100;
  return (
    <div className="space-y-4">
      {/* Access code modal — only mounted when a track is selected */}
      {selectedTrack && <AccessCodeModal track={selectedTrack} onClose={() => setSelectedTrack(null)} />}
      {/* Points + Tier row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Points */}
        <div className="glass-neon-cyan stagger-1 animate-fade-slide-up">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color:'var(--blue)' }}>{t('dash.points_aug')}</p>
          <div className="flex items-end gap-2 mb-4">
            <span className="font-black text-5xl leading-none" style={{ color:'var(--yellow)', fontFamily:'var(--font-mono)' }}>{total.toFixed(1)}</span>
            <span className="text-sm font-medium mb-1" style={{ color:'var(--text-muted)' }}>{t("dash.pts_total")}</span>
          </div>
          <div className="space-y-1.5">
            <PtRow label={t("dash.label.game")} count={games.length} pts={games.length} color="var(--primary)" note={t("dash.label.each_one")} />
            <PtRow label={t("dash.label.skill")} count={skills.length} pts={skills.length * 0.5} color="var(--purple)" note={t("dash.label.half_each")} />
            {facBonus > 0 && <PtRow label={t("dash.label.fac_bonus")} count={undefined} pts={facBonus} color="var(--yellow)" note={t("dash.label.ms_bonus")} />}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop:'1px solid var(--border)' }}>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color:'var(--text-muted)' }}>{t("dash.pts_only")}</span>
              <span style={{ color:'var(--yellow)', fontWeight:700 }}>{arcPts.toFixed(1)} pts</span>
            </div>
          </div>
        </div>

        {/* Tier */}
        <div className="animate-fade-slide-up stagger-2 rounded-xl p-5 flex flex-col justify-between"
          style={{ background: currentTier?.bg ?? 'var(--surface)', border:`1px solid ${currentTier?.border ?? 'var(--border-md)'}` }}>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-2" style={{ color: currentTier?.color ?? 'var(--text-muted)' }}>{t('dash.tiers_title')}</p>
            {currentTier ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl">{currentTier.emoji}</span>
                <div>
                  <div className="font-black text-2xl tracking-tight" style={{ color: currentTier.color }}>{t(currentTier.key)}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color:'var(--text-muted)' }}>{currentTier.min}+ {t('common.points_short')} {t('dash.pts_required')}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-bold text-xl" style={{ color:'var(--text-muted)' }}>{t('tier.unranked')}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color:'var(--text-muted)' }}>{t('dash.pts_for_trooper')}</div>
              </div>
            )}
          </div>
          {nextTier && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono font-bold mb-1">
                <span style={{ color:'var(--text-muted)' }}>{t('tier.next_tier_at')} {t(nextTier.key)}</span>
                <span style={{ color:'var(--foreground)', fontWeight:800 }}>{total.toFixed(1)} / {nextTier.min}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--surface-hover)' }}>
                <div className="h-full rounded-full animate-progress" style={{ width:`${tierPct}%`, background:'var(--green)' }} />
              </div>
              <p className="text-[10px] font-mono mt-1" style={{ color:'var(--text-muted)' }}>
                {Math.max(0, nextTier.min - total).toFixed(1)} {t('tier.pts_to_go')}
              </p>
            </div>
          )}
          {!nextTier && currentTier?.min === 120 && (
            <p className="text-sm font-semibold mt-2" style={{ color:'var(--yellow)' }}>{t('tier.already_max')}</p>
          )}
          <div className="mt-3 pt-3 space-y-1" style={{ borderTop:'1px solid var(--border)' }}>
            {TIERS.map(tier => (
              <div key={tier.key} className="flex items-center justify-between text-[10px] font-mono">
                <span style={{ color: total >= tier.min ? tier.color : 'var(--text-dim)', fontWeight: total >= tier.min ? 700 : 400 }}>{tier.emoji} {t(tier.key)}</span>
                <span style={{ color: total >= tier.min ? tier.color : 'var(--text-dim)' }}>{tier.min}+ {t('common.points_short')}{total >= tier.min ? ' ✓' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Milestones (left 2 cols) + Activity Charts (right 1 col) ── */}
      <div>
        <SectionLabel label={t("dash.section.milestones_full")} />

        {/* Outer 3-col grid: milestones span 2, charts span 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Milestones: inner 2-col grid, takes 2 of 3 outer columns */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            {MILESTONES.map((m, i) => {
              const done  = i===0 ? m1Done : i===1 ? m2Done : i===2 ? m3Done : m3Done;
              const gDone = Math.min(games.length, m.games);
              const sDone = Math.min(skills.length, m.badge);
              const pct   = Math.round(((gDone + sDone) / (m.games + m.badge)) * 100);
              return (
                <div key={m.id}
                  className={`animate-fade-slide-up stagger-${i+2} rounded-xl p-4 relative overflow-hidden`}
                  style={{ background: done ? m.bg : 'var(--surface)', border:`1px solid ${done ? m.border : 'var(--border-md)'}` }}>

                  {done && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: m.color }}>
                      <CheckIcon className="w-3 h-3" style={{ color:'#fff' }} />
                    </div>
                  )}

                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest mb-1"
                    style={{ color: done ? m.color : 'var(--text-muted)' }}>{m.label}</p>
                  <p className="font-black text-3xl font-mono mb-3"
                    style={{ color: done ? m.color : 'var(--foreground)' }}>
                    {done ? `+${m.bonus} pts` : `${pct}%`}
                  </p>
                  <div className="space-y-2 mb-3">
                    <ProgressRow label={t("dash.label.game")}  done={gDone} total={m.games} color={m.color} />
                    <ProgressRow label={t("dash.label.skill")} done={sDone} total={m.badge} color={m.color} />
                  </div>
                  <p className="text-[10px] font-mono"
                    style={{ color: done ? m.color : 'var(--text-dim)' }}>
                    {done ? 'Milestone bonus unlocked!' : `+${m.bonus} ${t("dash.ms.on_compl")}`}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Activity Charts: stacked in the 3rd column */}
          <div className="flex flex-col gap-3">
            <ActivityChart
              badges={monthly}
              embedded
            />
            <ActivityHeatmap
              badges={allBadges}
              embedded
            />
          </div>

        </div>
      </div>

      {/* Active July 2026 Game Tracks — WITH real badge images */}
      <div>
        <SectionLabel label={t("dash.section.tracks_aug")} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {JULY_TRACKS.map((track, i) => {
            const done = trackDone(track, games);
            return (
              <button
                key={track.id}
                onClick={() => setSelectedTrack(track as TrackInfo)}
                className={`group animate-fade-slide-up stagger-${i+1} rounded-xl overflow-hidden flex flex-col text-left w-full cursor-pointer transition-all duration-200`}
                style={{ background: done ? `${track.levelColor}0d` : 'var(--surface)', border:`1px solid ${done ? track.levelColor+'50' : 'var(--border-md)'}`, boxShadow: done ? `0 2px 12px ${track.levelColor}20` : '0 1px 4px rgba(0,0,0,0.15)' }}
              >
                {/* Badge image strip */}
                <div className="relative overflow-hidden flex items-center justify-center"
                  style={{ background:`linear-gradient(135deg, ${track.levelColor}18 0%, ${track.levelColor}08 100%)`, height:120, borderBottom:`1px solid ${done ? track.levelColor+'40' : 'var(--border)'}` }}>
                  <img
                    src={track.img}
                    alt={`${track.name} badge`}
                    className="h-20 w-20 object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                  />
                  {/* Level pill */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider"
                    style={{ background:`${track.levelColor}25`, color:track.levelColor, border:`1px solid ${track.levelColor}50` }}>
                    {track.level}
                  </div>
                  {/* Done / Start indicator */}
                  {done ? (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background:track.levelColor }}>
                      <CheckIcon className="w-3 h-3" style={{ color:'#fff' }} />
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background:'rgba(0,0,0,0.5)', color:'#fff' }}>
                      View the code
                    </div>
                  )}
                  {/* Type tag */}
                  <div className="absolute bottom-2 right-2">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background:'rgba(0,0,0,0.35)', color:'rgba(255,255,255,0.7)' }}>
                      {track.type}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm leading-snug" style={{ color: done ? track.levelColor : 'var(--foreground)' }}>{track.name}</h4>
                      <p className="text-[10px] font-mono mt-0.5 leading-snug" style={{ color:'var(--text-muted)' }}>{track.fullName}</p>
                    </div>
                    <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-30 group-hover:opacity-70 transition-opacity" style={{ color:'var(--text-muted)' }} />
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color:'var(--text-muted)' }}>{track.desc}</p>
                  {/* Access code preview */}
                  <div className="mt-auto pt-2" style={{ borderTop:'1px solid var(--border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[9px] font-mono font-bold uppercase tracking-widest mb-0.5" style={{ color:'var(--text-dim)' }}>{t("dash.track.access_code")}</p>
                        <code className="text-[10px] font-mono font-bold" style={{ color: done ? track.levelColor : 'var(--blue)' }}>{track.accessCode}</code>
                      </div>
                      <span className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg transition-all"
                        style={{ background:`${track.levelColor}18`, color:track.levelColor, border:`1px solid ${track.levelColor}40` }}>
                        Open →
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] font-mono mt-2 text-center" style={{ color:'var(--text-dim)' }}>
          {t('dash.pts_each_game')} · {games.length} / {JULY_TRACKS.length} {t('dash.of_month')}
        </p>
      </div>

      {/* Recent achievements */}
      {monthly.length > 0 && (
        <div>
          <SectionLabel label={t("dash.section.recent_aug")} />
          <div className="glass-card" style={{ padding:'1rem' }}>
            <div className="space-y-1.5 max-h-64 overflow-y-auto no-scrollbar">
              {monthly.sort((a,b) => new Date(b.earned_date).getTime()-new Date(a.earned_date).getTime()).slice(0,12).map((b,i) => {
                const isGame = b.category === 'game';
                const bc = isGame ? 'var(--blue)' : 'var(--purple)';
                return (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg" style={{ background:'var(--surface-alt)', border:'1px solid var(--border)' }}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      {b.image_url
                        ? <img src={b.image_url} alt="" className="w-7 h-7 object-contain shrink-0 rounded" />
                        : <div className="w-7 h-7 rounded shrink-0 flex items-center justify-center font-mono text-xs font-bold" style={{ background:`${bc}18`, color:bc }}>{isGame?'G':'S'}</div>
                      }
                      <span className="font-medium text-xs truncate" style={{ color:'var(--foreground)' }}>{b.badge_name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tag" style={{ background:`${bc}18`, color:bc, border:`1px solid ${bc}40` }}>+{b.points} {t('dash.pt_label')}</span>
                      <span className="text-[9px] font-mono" style={{ color:'var(--text-muted)' }}>{b.earned_date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── CATALOG TAB ───────────────────────────────────────── */
function CatalogTab({ paged, filtered, baseTotal, baseDoneCount, basePendingCount, search, setSearch, diff, setDiff, cat, setCat, status, setStatus, page, setPage, totalPages, monthly, earnedSkills }: {
  paged:(SkillBadge&{cat:string})[]; filtered:(SkillBadge&{cat:string})[]; baseTotal:number; baseDoneCount:number; basePendingCount:number; search:string; setSearch:(s:string)=>void;
  diff:string; setDiff:(d:string)=>void; cat:string; setCat:(c:string)=>void;
  status:'all'|'done'|'pending'; setStatus:(s:'all'|'done'|'pending')=>void;
  page:number; setPage:(p:number)=>void; totalPages:number; monthly:Badge[]; earnedSkills:Badge[];
}) {
  const { t } = useLang();
  /* Counts in status-button badges always reflect base filter (search+cat+diff)
     NOT the active status — so clicking Done → Pending → All is always consistent */
  const STATUS_OPTS: { key:'all'|'done'|'pending'; label:string; count:number; color:string; bg:string }[] = [
    { key:'all',     label:t('catalog.status.all'),   count: baseTotal,          color:'#fff',  bg:'var(--blue)'  },
    { key:'done',    label:t('catalog.status.done'),    count: baseDoneCount,    color:'#fff',  bg:'var(--green)' },
    { key:'pending', label:t('catalog.status.pending'), count: basePendingCount, color:'#fff',  bg:'var(--red)'   },
  ];

  return (
    <div className="space-y-3 animate-fade-slide-up">

      {/* ── Banner with arcade track badges ── */}
      <div className="rounded-xl overflow-hidden"
        style={{ background:'linear-gradient(135deg, var(--blue-dim) 0%, var(--green-dim) 100%)', border:'1px solid var(--blue-border)' }}>
        <div className="flex items-center gap-3 p-4 overflow-x-auto no-scrollbar">
          <div className="shrink-0">
            <p className="text-xs font-bold mb-0.5" style={{ color:'var(--blue)' }}>{t('catalog.banner.title')}</p>
            <p className="text-[10px] font-mono" style={{ color:'var(--text-muted)' }}>{t('catalog.banner.desc')}</p>
          </div>
          <div className="flex gap-2 ml-auto shrink-0">
            {JULY_TRACKS.map(track => (
              <a key={track.id} href={track.url} target="_blank" rel="noopener noreferrer" title={track.fullName}>
                <img src={track.img} alt={track.name}
                  className="w-9 h-9 object-contain rounded-lg transition-transform hover:scale-110"
                  style={{ background:`${track.levelColor}18`, border:`${track.levelColor}40` }}
                  loading="lazy"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }} />
              </a>
            ))}
          </div>
        </div>
        {/* Stats bar */}
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 py-2.5 text-[10px] font-mono font-bold"
          style={{ borderTop:'1px solid var(--blue-border)', background:'rgba(0,0,0,0.12)' }}>
          <span style={{ color:'var(--foreground)' }}>{baseTotal} {t('catalog.stat.badges')}</span>
          <span style={{ color:'var(--green)' }}>✓ {baseDoneCount} {t('catalog.stat.done')}</span>
          <span style={{ color:'var(--red)' }}>⟳ {basePendingCount} {t('catalog.stat.pending')}</span>
          <span style={{ color:'var(--yellow)' }}>+{(baseDoneCount * 0.5).toFixed(1)} {t('catalog.stat.pts_earned')}</span>
        </div>
      </div>

      <div className="glass-card" style={{ padding:'1rem' }}>

        {/* ── Status filter (Done / Pending) — most prominent ── */}
        <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background:'var(--surface-alt)', border:'1px solid var(--border-md)' }}>
          {STATUS_OPTS.map(opt => {
            const active = status === opt.key;
            return (
              <button key={opt.key} onClick={() => setStatus(opt.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-mono font-bold text-[10px] uppercase tracking-wider transition-all duration-200"
                style={active
                  ? { background: opt.bg, color: opt.color, boxShadow:'0 1px 4px rgba(0,0,0,0.25)' }
                  : { color:'var(--text-muted)' }}>
                {opt.key === 'done'    && <span>✓</span>}
                {opt.key === 'pending' && <span>⟳</span>}
                {opt.label}
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[8px]"
                  style={{ background: active ? 'rgba(255,255,255,0.25)' : 'var(--border-md)', color: active ? opt.color : 'var(--text-muted)' }}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Search + level filter ── */}
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={t("catalog.search")} className="glass-input py-2 text-xs flex-1" />
          <select value={diff} onChange={e=>setDiff(e.target.value)} className="glass-select w-full md:w-36">
            <option value="all">{t("catalog.all_levels")}</option>
            <option value="introductory">{t("catalog.intro")}</option>
            <option value="intermediate">{t("catalog.inter")}</option>
            <option value="advanced">{t("catalog.adv")}</option>
          </select>
        </div>

        {/* ── Category pills ── */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(CAT_LABELS).map(([k,v]) => {
            const active = cat === k;
            return (
              <button key={k} onClick={() => setCat(k)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider transition-all"
                style={{
                  background: active ? 'var(--blue)' : 'var(--surface-alt)',
                  color:      active ? '#fff'      : 'var(--text-muted)',
                  border:     active ? 'none'        : '1px solid var(--border-md)',
                  boxShadow:  active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}>
                {CAT_ICONS[k]} {v}
              </button>
            );
          })}
        </div>

        {/* ── Badge grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
          {paged.map((s, i) => {
            const done = isEarned(s, earnedSkills);
            const dc   = DIFF_COLORS[s.difficulty ?? ''] ?? 'var(--text-muted)';
            const ci   = CAT_ICONS[(s as any).cat] ?? '📦';

            return (
              <div key={s.id}
                className={`rounded-xl p-4 flex flex-col gap-3 animate-fade-slide-up stagger-${Math.min(i%6+1,6)}`}
                style={{
                  background: done ? 'rgba(52,168,83,0.07)' : 'var(--surface-alt)',
                  border: `1px solid ${done ? 'rgba(52,168,83,0.28)' : 'var(--border-md)'}`,
                  boxShadow: done ? '0 1px 6px rgba(52,168,83,0.12)' : '0 1px 3px rgba(0,0,0,0.1)',
                }}>

                {/* Top row: icon + name + STATUS PILL */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className="text-lg shrink-0 leading-none mt-0.5">{ci}</span>
                    <h4 className="font-semibold text-[11px] leading-snug"
                      style={{ color: done ? 'var(--green)' : 'var(--foreground)' }}>
                      {s.name}
                    </h4>
                  </div>
                  {/* ── PROMINENT STATUS BADGE ── */}
                  {done
                    ? <span className="status-done shrink-0">{t("catalog.done_pill")}</span>
                    : <span className="status-pending shrink-0">{t("catalog.pending_pill")}</span>
                  }
                </div>

                {/* Tags row */}
                <div className="flex flex-wrap gap-1">
                  {s.difficulty && (
                    <span className="tag text-[8px]"
                      style={{ background:`${dc}18`, color:dc, border:`1px solid ${dc}30` }}>
                      {s.difficulty}
                    </span>
                  )}
                  {(s as any).cat && (s as any).cat !== 'general' && (
                    <span className="tag tag-gray text-[8px]">{CAT_LABELS[(s as any).cat] ?? (s as any).cat}</span>
                  )}
                  {s.labs !== undefined && s.labs > 0 && (
                    <span className="tag tag-gray text-[8px]">⚠︎ {s.labs} labs</span>
                  )}
                  {s.duration && (
                    <span className="tag tag-gray text-[8px]">⏱ {s.duration}</span>
                  )}
                  {(s as any).credits !== undefined && (s as any).credits > 0 && (
                    <span className="tag text-[8px]" style={{ background:'rgba(249,171,0,0.12)', color:'var(--yellow)', border:'1px solid rgba(249,171,0,0.28)' }}>
                      ⓘ {(s as any).credits} cr
                    </span>
                  )}
                  {(s as any).credits === 0 && (
                    <span className="tag tag-green text-[8px]">{t("catalog.free")}</span>
                  )}
                </div>

                {/* Bottom row: pts + CTA */}
                <div className="flex items-center justify-between pt-1"
                  style={{ borderTop:'1px solid var(--border)' }}>
                  <span className="text-[10px] font-mono font-bold" style={{ color:'var(--yellow)' }}>
                    +0.5 pts
                  </span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: done ? 'var(--green-dim)'  : 'var(--blue-dim)',
                      color:      done ? 'var(--green)'       : 'var(--blue)',
                      border:     `1px solid ${done ? 'var(--green-border)' : 'var(--blue-border)'}`,
                    }}>
                    {done ? 'Revisit ↗' : 'Start ↗'}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {paged.length === 0 && (
          <div className="py-14 text-center rounded-xl" style={{ border:'1px dashed var(--border-md)' }}>
            <p className="text-2xl mb-2">{status === 'done' ? '🎉' : status === 'pending' ? '📋' : '🔍'}</p>
            <p className="text-sm font-semibold mb-1" style={{ color:'var(--foreground)' }}>
              {status === 'done' ? t('catalog.empty.no_done') : status === 'pending' ? t('catalog.empty.all_done') : t('catalog.empty.not_found')}
            </p>
            <p className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{t('catalog.empty.hint')}</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-4 pt-3"
            style={{ borderTop:'1px solid var(--border)' }}>
            <button onClick={()=>setPage(Math.max(1,page-1))} disabled={page===1}
              className="btn-ghost px-3 py-1.5 text-[10px]" style={{ opacity: page===1 ? 0.3 : 1 }}>{t('catalog.prev')}</button>
            <span className="text-xs font-mono font-bold" style={{ color:'var(--foreground)' }}>
              Page {page} / {totalPages}
            </span>
            <button onClick={()=>setPage(Math.min(totalPages,page+1))} disabled={page===totalPages}
              className="btn-ghost px-3 py-1.5 text-[10px]" style={{ opacity: page===totalPages ? 0.3 : 1 }}>{t('catalog.next')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── BADGES TAB ────────────────────────────────────────── */
function BadgesTab({ badges, monthly }: { badges:Badge[]; monthly:Badge[] }) {
  const { t } = useLang();
  const [filter, setFilter] = useState<'current'|'all'|'historical'>('current');
  const historical = badges.filter(b => b.earned_date < ACTIVE_START);
  const display = filter==='current' ? monthly : filter==='historical' ? historical : badges;

  return (
    <div className="glass-card animate-fade-slide-up space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color:'var(--blue)' }}>{t("badges.title")}</p>
        <div className="flex p-1 rounded-lg gap-1" style={{ background:'var(--surface-alt)', border:'1px solid var(--border-md)' }}>
          {([['current', `${t('badges.tab.current')} (${monthly.length})`],['all', `${t('badges.tab.all')} (${badges.length})`],['historical', `${t('badges.tab.archive')} (${historical.length})`]] as const).map(([k,l]) => (
            <button key={k} onClick={()=>setFilter(k)} className="px-3 py-1.5 rounded-md text-[10px] font-mono font-bold transition-all"
              style={{ background:filter===k?'var(--blue)':'transparent', color:filter===k?'#fff':'var(--text-muted)' }}>{l}</button>
          ))}
        </div>
      </div>

      {display.length === 0 ? (
        <div className="py-12 text-center rounded-xl" style={{ border:'1px dashed var(--border-md)' }}>
          <p className="text-xs font-mono" style={{ color:'var(--text-muted)' }}>{t('badges.empty')}</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto no-scrollbar">
          {display.sort((a,b)=>new Date(b.earned_date).getTime()-new Date(a.earned_date).getTime()).map((b,i) => {
            const isActive = b.earned_date >= ACTIVE_START;
            const isGame   = b.category === 'game';
            const bc       = isGame ? 'var(--blue)' : 'var(--purple)';
            return (
              <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-lg" style={{ background:'var(--surface-alt)', border:'1px solid var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  {b.image_url
                    ? <img src={b.image_url} alt="" className="w-9 h-9 object-contain shrink-0 rounded" />
                    : <div className="w-9 h-9 rounded shrink-0 flex items-center justify-center font-mono text-xs font-bold" style={{ background:`${bc}18`, color:bc }}>{isGame?'G':'S'}</div>
                  }
                  <div className="min-w-0">
                    <p className="font-semibold text-xs truncate" style={{ color: isActive ? 'var(--foreground)' : 'var(--text-muted)' }}>{b.badge_name}</p>
                    <p className="text-[10px] font-mono mt-0.5" style={{ color:'var(--text-muted)' }}>Earned: {b.earned_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="tag text-[9px]" style={{ background:`${bc}18`, color:bc, border:`1px solid ${bc}40` }}>{isGame?'Game':'Skill'}</span>
                  {isActive
                    ? <span className="tag tag-gold text-[9px]">+{b.points} {t('dash.pt_label')}</span>
                    : <span className="tag tag-gray text-[9px]">Archive</span>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── SUB-COMPONENTS ────────────────────────────────────── */
function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest whitespace-nowrap" style={{ color:'var(--text-muted)' }}>{label}</p>
      <div className="flex-1 h-px" style={{ background:'var(--border)' }} />
    </div>
  );
}

function PtRow({ label, count, pts, color, note }: { label:string; count?:number; pts:number; color:string; note:string }) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)' }}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium" style={{ color:'var(--foreground)' }}>{label}</span>
        {count !== undefined && <span className="tag tag-gray text-[8px]">×{count}</span>}
        <span className="text-[9px] font-mono" style={{ color:'var(--text-muted)' }}>{note}</span>
      </div>
      <span className="font-mono text-sm font-black" style={{ color }}>{pts > 0 ? `+${pts.toFixed(1)}` : '0'}</span>
    </div>
  );
}

function ProgressRow({ label, done, total, color }: { label:string; done:number; total:number; color:string }) {
  const pct = Math.round((done/total)*100);
  const allDone = done >= total;
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono mb-1">
        <span style={{ color: allDone ? color : 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: allDone ? color : 'var(--foreground)', fontWeight:700 }}>{done}/{total} {allDone && '✓'}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--surface-hover)' }}>
        <div className="h-full rounded-full animate-progress" style={{ width:`${pct}%`, background: allDone ? color : `${color}88` }} />
      </div>
    </div>
  );
}
