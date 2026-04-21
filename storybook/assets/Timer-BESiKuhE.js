import{n as e}from"./chunk-BneVvdWh.js";var t=e((()=>{})),n,r,i,a=e((()=>{t(),n=10,i=class{#e;#t;#n;#r;#i;#a=!1;#o=0;#s=0;constructor(e,t){r&&r.dispose(),r=this,this.#i=t??[0,10],this.#o=e,this.#e=document.createElement(`div`),this.#e.className=`timer`,this.#e.innerHTML=`
            <div class="row">
                <input class="btn" type="button" value="PLAY"/>
                <input class="seek" type="range"
                    min="${this.#i[0]*n}"
                    max="${this.#i[1]*n}"
                    value="${e*n}"/>
            </div>
            <div class="row">
                <span class="label"></span>
            </div>
        `,this.#n=this.#e.querySelector(`.btn`),this.#n.addEventListener(`click`,this.togglePlay),this.#t=this.#e.querySelector(`.seek`),this.#t.addEventListener(`input`,this.seek),this.#r=this.#e.querySelector(`.label`),this.#c(),window.timer=this}get element(){return this.#e}get time(){if(this.#a){let e=Date.now()/1e3,t=e-this.#s;this.#o+=t,this.#o>this.#i[1]&&(this.#o-=this.#i[1]-this.#i[0]),this.#t.value=(this.#o*n).toString(),this.#c(),this.#s=e}return this.#o}dispose(){this.#e.remove()}togglePlay=()=>{this.#a=!this.#a,this.#a?(this.#n.value=`STOP`,this.#s=Date.now()/1e3):this.#n.value=`PLAY`};seek=()=>{this.#o=Number.parseFloat(this.#t.value)/n};#c(){this.#r.innerText=`Time: ${this.#o.toFixed(1)} / ${this.#i[1]}`}}}));export{a as n,i as t};