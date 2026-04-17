var g=Object.defineProperty;var N=e=>{throw TypeError(e)};var b=(e,s,i)=>s in e?g(e,s,{enumerable:!0,configurable:!0,writable:!0,value:i}):e[s]=i;var T=(e,s,i)=>b(e,typeof s!="symbol"?s+"":s,i),p=(e,s,i)=>s.has(e)||N("Cannot "+i);var t=(e,s,i)=>(p(e,s,"read from private field"),i?i.call(e):s.get(e)),a=(e,s,i)=>s.has(e)?N("Cannot add the same private member more than once"):s instanceof WeakSet?s.add(e):s.set(e,i),h=(e,s,i,S)=>(p(e,s,"write to private field"),S?S.call(e,i):s.set(e,i),i),E=(e,s,i)=>(p(e,s,"access private method"),i);let O;var l,o,c,d,r,u,n,m,v,L;class y{constructor(s,i){a(this,v);a(this,l);a(this,o);a(this,c);a(this,d);a(this,r);a(this,u,!1);a(this,n,0);a(this,m,0);T(this,"togglePlay",()=>{h(this,u,!t(this,u)),t(this,u)?(t(this,c).value="STOP",h(this,m,Date.now()/1e3)):t(this,c).value="PLAY"});T(this,"seek",()=>{const s=Number.parseFloat(t(this,o).value)/10;h(this,n,s)});O&&O.dispose(),O=this,h(this,r,i??[0,10]),h(this,n,s),h(this,l,document.createElement("div")),t(this,l).className="timer",t(this,l).innerHTML=`
            <div class="row">
                <input class="btn" type="button" value="PLAY"/>
                <input class="seek" type="range"
                    min="${t(this,r)[0]*10}"
                    max="${t(this,r)[1]*10}"
                    value="${s*10}"/>
            </div>
            <div class="row">
                <span class="label"></span>
            </div>
        `,h(this,c,t(this,l).querySelector(".btn")),t(this,c).addEventListener("click",this.togglePlay),h(this,o,t(this,l).querySelector(".seek")),t(this,o).addEventListener("input",this.seek),h(this,d,t(this,l).querySelector(".label")),E(this,v,L).call(this),window.timer=this}get element(){return t(this,l)}get time(){if(t(this,u)){const s=Date.now()/1e3,i=s-t(this,m);h(this,n,t(this,n)+i),t(this,n)>t(this,r)[1]&&h(this,n,t(this,n)-(t(this,r)[1]-t(this,r)[0])),t(this,o).value=(t(this,n)*10).toString(),E(this,v,L).call(this),h(this,m,s)}return t(this,n)}dispose(){t(this,l).remove()}}l=new WeakMap,o=new WeakMap,c=new WeakMap,d=new WeakMap,r=new WeakMap,u=new WeakMap,n=new WeakMap,m=new WeakMap,v=new WeakSet,L=function(){t(this,d).innerText=`Time: ${t(this,n).toFixed(1)} / ${t(this,r)[1]}`};export{y as T};
