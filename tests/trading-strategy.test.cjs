'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {getLastDigit,evaluateSignal,updateMartingale}=require('../lib/trading/strategy.cjs');

test('extracts last decimal digit using the market pip size',()=>{
  assert.equal(getLastDigit('123.45',2),5);
  assert.equal(getLastDigit('123.456',3),6);
  assert.equal(getLastDigit('not-a-price',2),null);
});

test('ProParity requires at least four of the latest five ticks',()=>{
  assert.equal(evaluateSignal('ProParity',[2,4,6,8,1].map(quote=>({quote,pip_size:0}))).type,'EVEN');
  assert.equal(evaluateSignal('ProParity',[2,4,6,1,3].map(quote=>({quote,pip_size:0}))),null);
});

test('Octawin preserves OVER 5 and UNDER 4 barriers',()=>{
  const over=evaluateSignal('Octawin',[6,7,8,9,1].map(quote=>({quote,pip_size:0})));
  const under=evaluateSignal('Octawin',[0,1,2,3,8].map(quote=>({quote,pip_size:0})));
  assert.deepEqual(over,{type:'OVER',confidence:80,barrier:5});
  assert.deepEqual(under,{type:'UNDER',confidence:80,barrier:4});
});

test('Martingale doubles once per loss and resets after non-loss',()=>{
  assert.deepEqual(updateMartingale(0.35,0,-0.35),{level:1,stake:0.70});
  assert.deepEqual(updateMartingale(0.35,1,-0.70),{level:2,stake:1.40});
  assert.deepEqual(updateMartingale(0.35,2,0.28),{level:0,stake:0.35});
});
