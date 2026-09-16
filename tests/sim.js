// sim.js — replicate cross100 game logic for expected-board computation
// Mirrors apk/assets/index.html: mulberry32, gen(), tap() grid rules.
'use strict';

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}

function gen(seed,N,MAX){
  const rng=mulberry32(seed);
  const g=[],seq=[];
  for(let r=0;r<N;r++){g[r]=[];for(let c=0;c<N;c++)g[r][c]=-1}
  while(true){
    const r=Math.floor(rng()*N),c=Math.floor(rng()*N);
    let exceed=false;
    for(let i=0;i<N;i++){if(g[r][i]>=MAX||g[i][c]>=MAX){exceed=true;break}}
    if(exceed)break;
    for(let i=0;i<N;i++){g[r][i]++;if(i!==r)g[i][c]++}
    seq.push({r,c});
  }
  return{grid:g,sol:seq.reverse()};
}

// apply one tap's grid rule (synchronous part of tap()): returns new board
function applyTap(b,N,r,c){
  const g=b.map(row=>row.slice());
  for(let cc=0;cc<N;cc++)if(g[r][cc]>=0)g[r][cc]--;
  for(let rr=0;rr<N;rr++)if(rr!==r&&g[rr][c]>=0)g[rr][c]--;
  for(let i=0;i<N;i++)for(let j=0;j<N;j++)if(g[i][j]<-1)g[i][j]=-1;
  return g;
}

// full expected timeline for a seed: boards[0]=initial ... boards[len]=final
function expectedBoards(seed,N,MAX){
  const {grid,sol}=gen(seed,N,MAX);
  const boards=[grid.map(row=>row.slice())];
  let b=boards[0];
  for(const s of sol){
    b=applyTap(b,N,s.r,s.c);
    boards.push(b);
  }
  return {boards, sol};
}

function boardKey(b){ return b.flat().join(','); }

// deterministic RNG for seed selection (so the matrix is reproducible)
function makeSeedGen(seed){
  let s=seed>>>0;
  return function(){
    s=(s*1664525+1013904223)>>>0;
    return s;
  };
}

// 10 seeds per tier
function pickSeeds(){
  const next=makeSeedGen(20260917);
  const out={};
  for(const tier of [4,6,8,10]){
    out[tier]=[];
    const seen=new Set();
    while(out[tier].length<10){
      const s=next();
      if(seen.has(s))continue;
      seen.add(s);
      out[tier].push(s);
    }
  }
  return out;
}

module.exports={mulberry32,gen,applyTap,expectedBoards,boardKey,pickSeeds};

if(require.main===module){
  const seeds=pickSeeds();
  const fs=require('fs');
  const matrix={};
  let totalMs=0;
  for(const tier of [4,6,8,10]){
    const N=tier,MAX=tier===4?2:tier===6?4:tier===8?6:8;
    matrix[tier]=seeds[tier].map(seed=>{
      const {boards,sol}=expectedBoards(seed,N,MAX);
      const durMs=sol.length*1150+3200; // crack cadence estimate
      totalMs+=durMs;
      return {
        seedHex:seed.toString(16).padStart(8,'0'),
        steps:sol.length,
        sol,
        boards:boards.map(boardKey),
        durMs
      };
    });
  }
  fs.writeFileSync(__dirname+'/matrix.json',JSON.stringify(matrix,null,1));
  for(const tier of [4,6,8,10]){
    const steps=matrix[tier].map(r=>r.steps);
    console.log(`tier ${tier}x${tier}: steps min=${Math.min(...steps)} max=${Math.max(...steps)} avg=${(steps.reduce((a,b)=>a+b)/10).toFixed(0)} | est runtime ${(matrix[tier].reduce((a,r)=>a+r.durMs,0)/1000).toFixed(0)}s`);
  }
  console.log(`TOTAL est runtime: ${(totalMs/1000/60).toFixed(1)} min`);
}
