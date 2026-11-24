import{n as e}from"./rolldown-runtime-sJBDdmOt.js";function t(e,n=[],r=new Set){if(typeof e!=`object`||!e||r.has(e))return n;if(r.add(e),ArrayBuffer.isView(e))return e.buffer instanceof ArrayBuffer&&!n.includes(e.buffer)&&n.push(e.buffer),n;if(e instanceof ArrayBuffer)return n.includes(e)||n.push(e),n;for(let i of Array.isArray(e)?e:Object.values(e))t(i,n,r);return n}var n,r;function i(){return(i=e((()=>{n=class{factory;worker=null;url=``;failed=!1;disposed=!1;local=null;id=0;jobs=new Map;source;constructor(e,t){this.factory=e,this.source=t??e.toString()}async run(e,t,n=[]){if(this.disposed)throw Error(`kernel worker disposed`);let i=this.ensure();if(i)try{return await new Promise((a,o)=>{let s=++this.id;this.jobs.set(s,{resolve:a,reject:o});try{i.postMessage({id:s,fn:e,arg:t},n)}catch(e){this.jobs.delete(s),o(new r(String(e))),this.fail()}})}catch(e){if(!(e instanceof r)||this.disposed)throw e}this.local??=this.factory();let a=this.local[e];if(typeof a!=`function`)throw Error(`kernel has no function ${e}`);return a(t)}dispose(){this.disposed=!0,this.fail(),this.failed=!0}fail(){this.worker?.terminate(),this.worker=null,this.url&&URL.revokeObjectURL(this.url),this.url=``;for(let e of this.jobs.values())e.reject(new r(`worker unavailable`));this.jobs.clear()}ensure(){if(this.failed)return null;if(this.worker)return this.worker;try{if(typeof Worker>`u`||typeof Blob>`u`)throw Error(`no workers`);let e=`"use strict";
const K = (${this.source})();
function tr(v, out, seen) {
  if (v === null || typeof v !== "object" || seen.has(v)) return out;
  seen.add(v);
  if (ArrayBuffer.isView(v)) { if (out.indexOf(v.buffer) < 0) out.push(v.buffer); return out; }
  if (v instanceof ArrayBuffer) { if (out.indexOf(v) < 0) out.push(v); return out; }
  for (const x of (Array.isArray(v) ? v : Object.values(v))) tr(x, out, seen);
  return out;
}
self.onmessage = (e) => {
  const d = e.data;
  try {
    const r = K[d.fn](d.arg);
    self.postMessage({ id: d.id, r }, tr(r, [], new Set()));
  } catch (err) {
    self.postMessage({ id: d.id, error: String((err && err.stack) || err) });
  }
};`;this.url=URL.createObjectURL(new Blob([e],{type:`text/javascript`}));let t=new Worker(this.url);t.onmessage=e=>{let t=e.data,n=this.jobs.get(t.id);n&&(this.jobs.delete(t.id),t.error===void 0?n.resolve(t.r):n.reject(Error(t.error)))},t.onerror=e=>{e.preventDefault(),this.failed=!0,this.fail()},this.worker=t}catch{this.failed=!0,this.worker=null}return this.worker}},r=class extends Error{}})))()}export{i as n,t as r,n as t};