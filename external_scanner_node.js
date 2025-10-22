// external_scanner_node.js
// Escanea servidores públicos de Roblox para un placeId y reporta JobIDs REALES a tu API.

const API_BASE = "https://brainrot-api-m9u2.onrender.com"; // tu API en Render
const API_KEY  = "changeme"; // misma clave que en Render
const PLACE_ID = "109983668079237"; // tu placeId

const LIMIT_PER_PAGE = 100;
const MAX_PAGES      = 3;
const SCAN_INTERVAL_MS = 15000; // cada 15s
const IGNORE_IF_PLAYERS_GE = 7;

async function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

function robloxUrl(placeId,cursor){
  const base = `https://games.roblox.com/v1/games/${placeId}/servers/Public?sortOrder=Asc&limit=${LIMIT_PER_PAGE}`;
  return cursor ? `${base}&cursor=${encodeURIComponent(cursor)}` : base;
}

async function fetchRobloxServers(placeId){
  let all=[], cursor=null;
  for(let i=0;i<MAX_PAGES;i++){
    const res=await fetch(robloxUrl(placeId,cursor));
    if(!res.ok) throw new Error("Roblox API "+res.status);
    const json=await res.json();
    if(Array.isArray(json.data)){
      for(const s of json.data){
        if(s.playing<IGNORE_IF_PLAYERS_GE && s.playing<s.maxPlayers){
          all.push({
            jobId:s.id,
            players:s.playing,
            maxPlayers:s.maxPlayers,
            region:s.region||"unknown"
          });
        }
      }
    }
    cursor=json.nextPageCursor;
    if(!cursor) break;
    await sleep(600);
  }
  return all;
}

async function reportToAPI(server){
  const res=await fetch(`${API_BASE}/report`,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-api-key":API_KEY
    },
    body:JSON.stringify({
      placeId:PLACE_ID,
      jobId:server.jobId,
      players:server.players,
      maxPlayers:server.maxPlayers,
      restricted:false,
      region:server.region
    })
  });
  const txt = await res.text();
  console.log("[report]", res.status, txt.slice(0,100));
}

async function runOnce(){
  const servers=await fetchRobloxServers(PLACE_ID);
  console.log(`[scan] servers: ${servers.length}`);
  for(const s of servers){await reportToAPI(s); await sleep(50);}
  console.log(`[report] done ${servers.length} jobIds`);
}

(async()=>{
  console.log(`[external-scanner] running every 15s...`);
  while(true){
    try{await runOnce();}catch(e){console.log("error",e);}
    await sleep(SCAN_INTERVAL_MS);
  }
})();
