import{n as e}from"./rolldown-runtime-sJBDdmOt.js";var t,n,r;function i(){return(i=e((()=>{t=10,r=class{#e;#t;#n;#r;#i;#a=!1;#o=0;#s=0;constructor(e,r){n&&n.dispose(),n=this,this.#i=r??[0,10],this.#o=e,this.#e=document.createElement(`div`),this.#e.className=`timer`,this.#e.innerHTML=`
            <div class="row">
                <input class="btn" type="button" value="PLAY"/>
                <input class="seek" type="range"
                    min="${this.#i[0]*t}"
                    max="${this.#i[1]*t}"
                    value="${e*t}"/>
            </div>
            <div class="row">
                <span class="label"></span>
            </div>
        `,this.#n=this.#e.querySelector(`.btn`),this.#n.addEventListener(`click`,this.togglePlay),this.#t=this.#e.querySelector(`.seek`),this.#t.addEventListener(`input`,this.seek),this.#r=this.#e.querySelector(`.label`),this.#c(),window.timer=this}get element(){return this.#e}get time(){if(this.#a){let e=Date.now()/1e3,n=e-this.#s;this.#o+=n,this.#o>this.#i[1]&&(this.#o-=this.#i[1]-this.#i[0]),this.#t.value=(this.#o*t).toString(),this.#c(),this.#s=e}return this.#o}dispose(){this.#e.remove()}togglePlay=()=>{this.#a=!this.#a,this.#a?(this.#n.value=`STOP`,this.#s=Date.now()/1e3):this.#n.value=`PLAY`};seek=()=>{let e=Number.parseFloat(this.#t.value)/t;this.#o=e};#c(){this.#r.textContent=`Time: ${this.#o.toFixed(1)} / ${this.#i[1]}`}}})))()}export{i as n,r as t};