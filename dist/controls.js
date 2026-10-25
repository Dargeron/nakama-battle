// Single click selects immediately; a second click/tap opens read-only details.
export class AbilityGesture {
  constructor({select,inspect,now=()=>performance.now(),threshold=330}){Object.assign(this,{select,inspect,now,threshold});this.last=null;}
  click(key,payload,detail=1){
    const time=this.now(), twice=detail>=2 || (this.last?.key===key && time-this.last.time<=this.threshold);
    this.last=twice?null:{key,time};
    if(twice)this.inspect(payload);else this.select(payload);
    return twice?'inspect':'select';
  }
  clear(){this.last=null;}
}
export function allocateFlexible(pool,cost,extra=null){
  const keys=['F','R','P','E'], left=keys.map(k=>(pool[k]||0)-(cost[k]||0));
  if(left.some(n=>n<0))return null;
  const need=cost.C||0;
  if(extra){
    if(extra.length!==4||extra.some((n,i)=>!Number.isInteger(n)||n<0||n>left[i])||extra.reduce((a,b)=>a+b,0)!==need)return null;
    return extra.slice();
  }
  const out=[0,0,0,0];
  for(let n=0;n<need;n++){const i=left.indexOf(Math.max(...left));if(left[i]<=0)return null;left[i]--;out[i]++;}
  return out;
}
