'use strict';

const SYMBOLS = Object.freeze({
  V10:'R_10', V15:'1HZ15V', V25:'R_25', V30:'1HZ30V',
  V50:'R_50', V75:'R_75', V90:'1HZ90V', V100:'R_100',
  V150:'1HZ150V', V250:'1HZ250V', V10_1S:'1HZ10V',
  V25_1S:'1HZ25V', V50_1S:'1HZ50V', V75_1S:'1HZ75V', V100_1S:'1HZ100V',
});
const BOTS = Object.freeze(['ProParity','Octawin']);
const CONTRACTS = Object.freeze({ EVEN:'DIGITEVEN', ODD:'DIGITODD', OVER:'DIGITOVER', UNDER:'DIGITUNDER' });

function getLastDigit(quote, pipSize=2) {
  const n=Number(quote);
  if(!Number.isFinite(n)) return null;
  const p=Number.isInteger(Number(pipSize)) ? Math.max(0,Math.min(10,Number(pipSize))) : 2;
  const d=Number(n.toFixed(p).slice(-1));
  return Number.isInteger(d)&&d>=0&&d<=9?d:null;
}

function evaluateSignal(bot,ticks) {
  if(!BOTS.includes(bot)||!Array.isArray(ticks)||ticks.length<5) return null;
  const digits=ticks.slice(-5).map(t=>getLastDigit(t.quote,t.pip_size));
  if(digits.some(d=>d===null)) return null;
  if(bot==='ProParity') {
    const even=digits.filter(d=>d%2===0).length*20;
    const odd=digits.filter(d=>d%2!==0).length*20;
    if(even>=65) return {type:'EVEN',confidence:even};
    if(odd>=65) return {type:'ODD',confidence:odd};
    return null;
  }
  const over=digits.filter(d=>d>5).length*20;
  const under=digits.filter(d=>d<4).length*20;
  if(over>=65) return {type:'OVER',confidence:over,barrier:5};
  if(under>=65) return {type:'UNDER',confidence:under,barrier:4};
  return null;
}

function updateMartingale(baseStake, level, profitLoss) {
  const nextLevel=profitLoss<0?Math.min(20,level+1):0;
  return {
    level:nextLevel,
    stake:Number((profitLoss<0?baseStake*Math.pow(2,nextLevel):baseStake).toFixed(2)),
  };
}

module.exports={SYMBOLS,BOTS,CONTRACTS,getLastDigit,evaluateSignal,updateMartingale};
