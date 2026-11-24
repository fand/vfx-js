import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,t as n}from"./_kernel-worker-CeymSVyA.js";import{a as r,i,r as a,t as o}from"./cmf-But6OZM1.js";import{n as s,t as c}from"./logo-640w-20p-22Elz6NL.js";import{n as l}from"./_pad-1r8DowwE.js";import{A as u,I as d,R as f,U as p,W as m,g as h,h as g,j as _,k as v,m as y,n as b,z as x}from"./utils-AjYcdxV6.js";import{a as S,c as C,d as w,f as T,i as E,l as D,o as O,r as k,s as A,t as j,u as M}from"./glass-CbOKDWfd.js";import{n as N,r as P,t as F}from"./_simplex3--pabs44y.js";import"./preset-DFGAZ5Mi.js";import{n as I,t as L}from"./amagi-rvGYqYQ3.js";import{n as R,t as z}from"./jellyfish-DtC6VyHr.js";function B(){let e=1024,t=4096,n=.3/.7,r=.3,i=.3,a=.8,o=1<<21;function s(e){return{protrude:r*e.cellSize,bulgeZ:i*e.cellSize}}function c(e,t,n){return e=Math.imul(e,1664525)+1013904223>>>0,t=Math.imul(t,1664525)+1013904223>>>0,n=Math.imul(n,1664525)+1013904223>>>0,e=e+Math.imul(t,n)>>>0,t=t+Math.imul(n,e)>>>0,n=n+Math.imul(e,t)>>>0,e=(e^e>>>16)>>>0,t=(t^t>>>16)>>>0,n=(n^n>>>16)>>>0,e=e+Math.imul(t,n)>>>0,t=t+Math.imul(n,e)>>>0,n=n+Math.imul(e,t)>>>0,[e,t,n]}function l(e,t,n,r){let i=e>>>0,[a,o,s]=c((t^i)>>>0,(n^Math.imul(i,7))>>>0,(r^Math.imul(i,13))>>>0),l=Math.imul(a^o>>>11^s<<7,747796405)>>>0;l=(l^l>>>16)>>>0;let u=1/4294967295;return[a*u,o*u,s*u,l*u]}function u(e){let t=e>>>0;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function d(e,t,n){let[r,i,a,o]=e.sdfRect,s=e.sdfW,c=e.sdfH,l=(t-r)/a,u=(n-i)/o,d=Math.min(Math.max(l,0),1),f=Math.min(Math.max(u,0),1),p=(l-d)*a,m=(u-f)*o,h=Math.hypot(p,m),g=Math.min(Math.max(d*s-.5,0),s-1),_=Math.min(Math.max(f*c-.5,0),c-1),v=Math.floor(g),y=Math.floor(_),b=Math.min(v+1,s-1),x=Math.min(y+1,c-1),S=g-v,C=_-y,w=e.sdf,T=(y*s+v)*4,E=(y*s+b)*4,D=(x*s+v)*4,O=(x*s+b)*4,k=(1-S)*(1-C),A=S*(1-C),j=(1-S)*C,M=S*C,N=w[T]*k+w[E]*A+w[D]*j+w[O]*M,P=w[T+1]*k+w[E+1]*A+w[D+1]*j+w[O+1]*M,F=w[T+2]*k+w[E+2]*A+w[D+2]*j+w[O+2]*M;h>0&&(P=p/h+P*.05,F=m/h+F*.05);let I=Math.hypot(P,F);return I>1e-5?[N+h,P/I,F/I]:[N+h,0,1]}function f(e,t,n,r,i){return Math.min(-d(e,n,r)[0],t-Math.abs(i))}function p(e,t,n){let r=e+n,i=t+n;return r>0&&i>0?Math.hypot(r,i)-n:Math.max(r,i)-n}function m(e,t,n,r,i,a){let o=d(e,r,i)[0];return p(o,Math.abs(a)-t,n)}class h{#e;#t=new Map;constructor(e){this.#e=e}#n(e,t,n){return((e+1024)*2048+(t+1024))*2048+(n+1024)}add(e,t,n,r){let i=this.#e,a=this.#n(Math.floor(t/i),Math.floor(n/i),Math.floor(r/i)),o=this.#t.get(a);o?o.push(e):this.#t.set(a,[e])}near(e,t,n,r,i){let a=this.#e,o=Math.floor((e-r)/a),s=Math.floor((e+r)/a),c=Math.floor((t-r)/a),l=Math.floor((t+r)/a),u=Math.floor((n-r)/a),d=Math.floor((n+r)/a);for(let e=u;e<=d;e++)for(let t=c;t<=l;t++)for(let n=o;n<=s;n++){let r=this.#t.get(this.#n(n,t,e));if(r)for(let e of r)i(e)}}}function g(e,t){let n=Math.max(t.cellSize,.001);for(let r=0;r<40;r++){let r=_(e,t,n,!0);if(r)return r;n*=1.12}return _(e,t,n,!1)}function _(e,r,i,a){let o=Math.max(r.halfDepth,.001),c=Math.min(Math.max(r.bevel??0,0),o),l=Math.min(Math.max(r.roundness,0),1),f=Math.min(Math.max(r.cellSizeRandomness,0),1),g=r.seed>>>0,_=Math.min(Math.max(Math.floor(r.maxCount??t),0),t),v=r.minSize<1?Math.max(Math.floor(_/2),1):_,{protrude:y,bulgeZ:b}=s({...r,cellSize:i}),x=.86*i,S=2*x*(.3+.7*l),C=.1*i,w=Math.max(o-.35*i,0),T=w<.5*S,[E,D,O,k]=e.sdfRect,A=u(Math.imul(g,668265261)^374761393),j=(t,n,r)=>Math.abs(r)<=w&&d(e,t,n)[0]<=-C,M=S/Math.sqrt(3),N=Math.max(1,Math.ceil(O/M)),P=Math.max(1,Math.ceil(k/M)),F=Math.max(1,Math.ceil(2*w/M)),I=new Int32Array(N*P*F).fill(-1),L=(e,t,n)=>Math.min(n-1,Math.max(0,Math.floor((e-t)/M))),R=[],z=(e,t,n)=>{let r=L(e,E,N),i=L(t,D,P),a=L(n,-w,F);for(let o=Math.max(0,a-2);o<=Math.min(F-1,a+2);o++)for(let a=Math.max(0,i-2);a<=Math.min(P-1,i+2);a++)for(let i=Math.max(0,r-2);i<=Math.min(N-1,r+2);i++){let r=I[(o*P+a)*N+i];if(r<0)continue;let s=R[r*3]-e,c=R[r*3+1]-t,l=R[r*3+2]-n;if(s*s+c*c+l*l<S*S)return!1}return!0},B=[],V=(e,t,n)=>{let r=R.length/3;R.push(e,t,n),I[(L(n,-w,F)*P+L(t,D,P))*N+L(e,E,N)]=r,B.push(r)},ee=e=>{let t=A()*Math.PI*2;if(T){let n=S*Math.sqrt(1+3*A());return[R[e*3]+n*Math.cos(t),R[e*3+1]+n*Math.sin(t),(2*A()-1)*w]}let n=S*Math.cbrt(1+7*A()),r=2*A()-1,i=Math.sqrt(1-r*r);return[R[e*3]+n*i*Math.cos(t),R[e*3+1]+n*i*Math.sin(t),R[e*3+2]+n*r]},H=[];for(let e=D+S/2;e<D+k;e+=S)for(let t=E+S/2;t<E+O;t+=S)H.push(t,e);for(let e=H.length/2-1;e>0;e--){let t=Math.floor(A()*(e+1));for(let n=0;n<2;n++){let r=H[e*2+n];H[e*2+n]=H[t*2+n],H[t*2+n]=r}}for(let e=0;e<H.length/2&&R.length/3<v;e++){let t=H[e*2],n=H[e*2+1],r=(2*A()-1)*w;if(j(t,n,r)&&z(t,n,r)){for(V(t,n,r);B.length>0&&R.length/3<v;){let e=Math.floor(A()*B.length),t=B[e],n=!1;for(let e=0;e<30;e++){let[e,r,i]=ee(t);if(j(e,r,i)&&z(e,r,i)){V(e,r,i),n=!0;break}}n||(B[e]=B[B.length-1],B.pop())}B.length=0}}if(a&&_>0&&R.length/3>=v)return null;let U=[];for(let t=0;t<R.length/3;t++){let n=R[t*3],r=R[t*3+1],i=R[t*3+2],a=d(e,n,r)[0],s=x*(1-f*A());s=Math.min(s,y-p(a,Math.abs(i)-o-b,c)),s>0&&U.push(n,r,i,s)}let te=new h(i),W=U.length/4,G=0;for(let e=0;e<W;e++)te.add(e,U[e*4],U[e*4+1],U[e*4+2]),G=Math.max(G,U[e*4+3]);let K=[];for(let e=0;e<W&&K.length/4<_;e++){let t=U[e*4],n=U[e*4+1],r=U[e*4+2],i=-U[e*4+3]*U[e*4+3],a=!0;te.near(t,n,r,G,o=>{if(o===e)return;let s=t-U[o*4],c=n-U[o*4+1],l=r-U[o*4+2],u=s*s+c*c+l*l-U[o*4+3]**2;(u<i||u===i&&o<e)&&(a=!1)}),a&&K.push(t,n,r,U[e*4+3])}let ne=K.length/4,q=.5*Math.max(r.minSize,0)*i,re=0,J=0;if(r.minSize<1&&q>0&&K.length/4<_){let t=1.8+-.74*l,r=u(Math.imul(g,2654435761)^2654435769),a=1/0,s=-1/0,f=1/0,m=-1/0;{let t=e.sdfW,n=e.sdfH;for(let r=0;r<n;r++)for(let i=0;i<t;i++)if(e.sdf[(r*t+i)*4]<0){let e=E+(i+.5)/t*O,o=D+(r+.5)/n*k;a=Math.min(a,e),s=Math.max(s,e),f=Math.min(f,o),m=Math.max(m,o)}}if(a<=s){let l=[s-a,m-f,2*o],u=Math.max(q,i*.0625);u=Math.max(u,Math.cbrt(l[0]*l[1]*l[2]/2097152));let g=Math.max(1,Math.ceil(l[0]/u)),v=Math.max(1,Math.ceil(l[1]/u)),x=Math.max(1,Math.ceil(l[2]/u)),S=(a+s)/2-(g-1)*u/2,C=(f+m)/2-(v-1)*u/2,w=-((x-1)*u)/2,T=g*v;re=u,J=T*x;let A=new Float32Array(T);for(let t=0;t<v;t++)for(let n=0;n<g;n++)A[t*g+n]=-d(e,S+n*u,C+t*u)[0];let j=new Float32Array(J),M=new Float32Array(J).fill(1/0),N=new Float32Array(J).fill(-1),P=0;for(let e=0;e<x;e++){let t=o-Math.abs(w+e*u);for(let r=0;r<T;r++){let i=e*T+r,a=-p(-A[r],-t,c);a>0?(j[i]=Math.min(A[r]+Math.min(y,n*A[r]),t+Math.min(y+b,n*t),a+Math.min(y,n*a)),P=Math.max(P,j[i])):j[i]=-1}}let F=(e,t,n,r,i,a)=>{let o=r+i,s=Math.max(0,Math.ceil((e-o-S)/u)),c=Math.min(g-1,Math.floor((e+o-S)/u)),l=Math.max(0,Math.ceil((t-o-C)/u)),d=Math.min(v-1,Math.floor((t+o-C)/u)),f=Math.max(0,Math.ceil((n-o-w)/u)),p=Math.min(x-1,Math.floor((n+o-w)/u)),m=o*o;for(let i=f;i<=p;i++){let o=w+i*u-n;for(let n=l;n<=d;n++){let l=C+n*u-t,d=l*l+o*o;if(d>m)continue;let f=i*T+n*g;for(let t=s;t<=c;t++){let n=f+t;if(j[n]<0)continue;let i=S+t*u-e,o=i*i+d;if(o>m)continue;let s=Math.sqrt(o)-r;s<M[n]&&(M[n]=s,a?.(n))}}}};for(let e=0;e<ne;e++)F(K[e*4],K[e*4+1],K[e*4+2],K[e*4+3],P);let I=Math.max(P-q,1e-9),L=e=>Math.min(255,Math.floor((e-q)/I*256)),R=[];for(let e=0;e<256;e++)R.push([]);for(let e=0;e<J;e++){if(j[e]<0)continue;let t=Math.min(M[e],j[e]);N[e]=t,t>=q&&R[L(t)].push(e)}let z=new h(i);for(let e=0;e<ne;e++)z.add(e,K[e*4],K[e*4+1],K[e*4+2]);let B=255,V=e=>{let t=Math.min(M[e],j[e]),n=N[e];t<n&&(N[e]=t,t>=q&&L(t)!==L(n)&&R[L(t)].push(e))};for(;K.length/4<_;){for(;B>=0&&R[B].length===0;)B--;if(B<0)break;let e=R[B],n=Math.floor(r()*e.length),i=e[n];e[n]=e[e.length-1],e.pop();let a=N[i];if(a<q||L(a)!==B)continue;let o=Math.floor(i/T),s=Math.floor((i-o*T)/g),c=S+(i-o*T-s*g)*u,l=C+s*u,d=w+o*u,f=M[i]===1/0,p=M[i];f&&z.near(c,l,d,j[i]+q+G,e=>{let t=Math.hypot(c-K[e*4],l-K[e*4+1],d-K[e*4+2])-K[e*4+3];p=Math.min(p,t)});let m=Math.min(t*p,j[i]),h=1.15*p;if(m<h&&h<=j[i]+q&&(m=h),m<=p&&!f){N[i]=-1;continue}let _=K.length/4;z.near(c,l,d,m,e=>{let t=c-K[e*4],n=l-K[e*4+1],r=d-K[e*4+2],i=.98*Math.sqrt(t*t+n*n+r*r+K[e*4+3]**2);i<m&&(m=i)}),K.push(c,l,d,m),z.add(_,c,l,d),G=Math.max(G,m);let v=q+(B+1)/256*I;F(c,l,d,m,v,V),N[i]=Math.min(N[i],-m)}let ee=K.length/4,H=e.sdfW,U=e.sdfH,te=Math.max(O/H,k/U),W=(t,n)=>e.sdf[(n*H+t)*4],Y=[];for(let t=1;t<U-1;t++)for(let r=1;r<H-1;r++){let i=W(r,t);if(!(i<0)||i>W(r-1,t)||i>W(r+1,t)||i>W(r,t-1)||i>W(r,t+1)||i>W(r-1,t-1)||i>W(r+1,t-1)||i>W(r-1,t+1)||i>W(r+1,t+1))continue;let a=E+(r+.5)/H*O,s=D+(t+.5)/U*k,l=-d(e,a,s)[0],u=-p(-l,-o,c);if(!(u>0))continue;let f=Math.min(l+Math.min(y,n*l),o+Math.min(y+b,n*o),u+Math.min(y,n*u));f<q&&f>=1.5*te&&Y.push([a,s,f])}Y.sort((e,t)=>t[2]-e[2]);let X=new Uint8Array(Y.length),Z=!0;for(let e=0;e<8&&Z;e++){Z=!1;for(let e=0;e<Y.length&&!(K.length/4>=_);e++){if(X[e])continue;let[t,n,r]=Y[e],i=1/0,a=-1;if(z.near(t,n,0,2*q+G,e=>{let r=Math.hypot(t-K[e*4],n-K[e*4+1],K[e*4+2])-K[e*4+3];r<i&&(i=r,a=e)}),i<.25*r){X[e]=1;continue}if(!(i>2*q)&&!(a>=ee&&i<r))continue;let o=r;z.near(t,n,0,o,e=>{let r=t-K[e*4],i=n-K[e*4+1],a=K[e*4+2],s=.98*Math.sqrt(r*r+i*i+a*a+K[e*4+3]**2);s<o&&(o=s)}),z.add(K.length/4,t,n,0),K.push(t,n,0,o),G=Math.max(G,o),X[e]=1,Z=!0}}}}let Y=new Float32Array(K),X=Y.length/4,Z=0;for(let t=0;t<X;t++){let n=m(e,o,c,Y[t*4],Y[t*4+1],Y[t*4+2]);Z=Math.max(Z,n+Y[t*4+3])}return{spheres:Y,count:X,latticeCount:ne,capped:X>=_,cellSize:i,reach:Z,voxel:re,voxels:J}}function v(e,t,n,r=0){let i=e,a=0;for(;;){let e=y(i,Math.max(t,0),Math.max(n,1e-4),Math.max(r,0));if(e.ok)return{...e.grid,dropped:a};let o=new Set(e.drop),s=[];for(let e=0;e<i.length/4;e++)o.has(e)||s.push(...i.subarray(e*4,e*4+4));a+=o.size,i=new Float32Array(s)}}function y(t,n,r,i){let s=t.length/4,c=e=>t[e*4+3]*(1+n),l=e=>{let r=t[e*4+3];return Math.sqrt(r*r+i)+n*r},u=[1/0,1/0,1/0],d=[-1/0,-1/0,-1/0];for(let e=0;e<s;e++){let n=l(e);for(let r=0;r<3;r++)u[r]=Math.min(u[r],t[e*4+r]-n),d[r]=Math.max(d[r],t[e*4+r]+n)}s===0&&(u.fill(0),d.fill(.001));let f=[d[0]-u[0],d[1]-u[1],d[2]-u[2]],p=Math.max(r,Math.cbrt(f[0]*f[1]*f[2]/o)),m=0;for(;;){let r=[Math.max(1,Math.ceil(f[0]/p)),Math.max(1,Math.ceil(f[1]/p)),Math.max(1,Math.ceil(f[2]/p))],d=r[0]*r[1]*r[2],h=new Int32Array(d),g=0,_=e=>{for(let n=0;n<s;n++){let i=t[n*4],a=t[n*4+1],o=t[n*4+2],s=l(n),c=[i,a,o],d=c.map((e,t)=>Math.max(0,Math.floor((e-s-u[t])/p))),f=c.map((e,t)=>Math.min(r[t]-1,Math.floor((e+s-u[t])/p)));for(let t=d[2];t<=f[2];t++){let c=u[2]+t*p,l=Math.max(c-o,0,o-c-p),m=Math.max(Math.abs(c-o),Math.abs(c+p-o));for(let o=d[1];o<=f[1];o++){let c=u[1]+o*p,h=Math.max(c-a,0,a-c-p),g=Math.max(Math.abs(c-a),Math.abs(c+p-a));for(let a=d[0];a<=f[0];a++){let c=u[0]+a*p,d=Math.max(c-i,0,i-c-p),f=d*d+h*h+l*l;if(f>s*s)continue;let _=Math.max(Math.abs(c-i),Math.abs(c+p-i));e(n,a+r[0]*(o+r[1]*t),Math.sqrt(f),Math.sqrt(_*_+g*g+m*m))}}}}},v=null;if(i>0){let e=new Float64Array(d).fill(1/0);_((r,i,a,o)=>{let s=t[r*4+3],c=(o+n*s)**2-s*s;c<e[i]&&(e[i]=c)}),v=e}let y=e=>{_((r,i,a)=>{if(v&&a>c(r)){let e=t[r*4+3];if(Math.max(a-n*e,0)**2-e*e>v[i])return}e(r,i)})};y((e,t)=>{h[t]++});for(let e=0;e<d;e++)g=Math.max(g,h[e]);if(g>24){let e=p*a,n=d/(a*a*a)>o;if(m<16&&!n){p=e,m++;continue}let r=new Int32Array(d).fill(-1);y((e,n)=>{if(h[n]<=24)return;let i=r[n];(i<0||t[e*4+3]<t[i*4+3])&&(r[n]=e)});let i=new Set;for(let e of r)e>=0&&i.add(e);return{ok:!1,drop:[...i]}}let b=new Int32Array(d),x=0;for(let e=0;e<d;e++)b[e]=x,x+=h[e];let S=Math.max(1,Math.ceil(d/e)),C=new Float32Array(e*S*4);for(let e=0;e<d;e++)C[e*4]=b[e],C[e*4+1]=h[e];let w=Math.max(1,Math.ceil(x/4/e)),T=new Float32Array(e*w*4),E=new Int32Array(d);y((e,t)=>{T[b[t]+E[t]++]=e});let D=Math.max(1,Math.ceil(s/e)),O=new Float32Array(e*D*4);return O.set(t),{ok:!0,grid:{spheres:t,count:s,origin:[u[0],u[1],u[2]],cell:p,dims:r,cellData:C,cellTexH:S,index:T,indexTexH:w,sphereData:O,sphereTexH:D,maxList:g,refinements:m}}}}let b=null;function x(e){let t=JSON.stringify([e.shapeKey,e.fill]);(e.shapeKey===void 0||b?.key!==t)&&(b={key:t,fill:g(e.shape,e.fill)});let n={...b.fill,spheres:b.fill.spheres.slice()},r=n.cellSize,i=n.spheres,a=0;if(e.containment>0){let t=0;for(let e=0;e<n.count;e++)t=Math.max(t,n.spheres[e*4+3]);let o=.5*e.fill.minSize*r,s=e.containment*.3*(2*t*o+o*o);i=n.spheres.slice();for(let e=0;e<n.count;e++){let t=i[e*4+3],n=Math.sqrt(t*t+s);i[e*4+3]=n,a=Math.max(a,n-t)}}let o=0;if(e.containment>0){let t=0;for(let e=0;e<i.length/4;e++)t=Math.max(t,i[e*4+3]);let n=1.4*Math.min(e.fill.minSize,1)*r;o=e.containment*(2*t*n+n*n)}let s=v(i,e.wobble,r,o),c=null;if(o>0){let t=v(s.spheres,e.wobble,r);t.dropped===0&&(c=t)}let u=new Float32Array(s.count*6);for(let t=0;t<s.count;t++){let[n,r,i,a]=l(e.fill.seed,t,977,31);u.set([.6+.8*r,.6+.8*i,.6+.8*a,i,a,n],t*6)}return{fill:n,grow:a,fillG:o,grid:s,edgeGrid:c,drift:u}}return{BUBBLE_TEX_W:e,BUBBLE_LIST_MAX:24,BUBBLE_MAX_COUNT:t,SPHERE_PROTRUDE:r,SPHERE_BULGE_Z:i,fillShape:s,hash4:l,sampleSd2:d,insideDistance:f,placeBubbles:g,buildSphereGrid:v,buildFoam:x}}var V,ee,H,U,te,W,G,K,ne,q,re,J;function Y(){return(Y=e((()=>{({BUBBLE_TEX_W:V,BUBBLE_LIST_MAX:ee,BUBBLE_MAX_COUNT:H,SPHERE_PROTRUDE:U,SPHERE_BULGE_Z:te,fillShape:W,hash4:G,sampleSd2:K,insideDistance:ne,placeBubbles:q,buildSphereGrid:re,buildFoam:J}=B())})))()}var X;function Z(){return(Z=e((()=>{X=`function bubbleKernel() {
    const BUBBLE_TEX_W = 1024;
    const BUBBLE_LIST_MAX = 24;
    const BUBBLE_MAX_COUNT = 4096;
    const SPHERE_R = 0.86;
    const SPACING_FLAT = 0.3;
    const SPACING_ROUND = 1.0;
    const FILL_K_FLAT = 1.8;
    const FILL_K_ROUND = 1.06;
    const FILL_POKE = 0.3;
    const FILL_POKE_K = FILL_POKE / (1 - FILL_POKE);
    const FILL_REACH = 1.15;
    const SPHERE_PROTRUDE = 0.3;
    const SPHERE_BULGE_Z = 0.3;
    const CENTRE_DEPTH = 0.1;
    const CENTRE_Z_MARGIN = 0.35;
    const POISSON_TRIES = 30;
    const FILL_VOXELS_MAX = 1 << 21;
    const FILL_VOXEL_MIN = 1 / 16;
    const BUCKETS = 256;
    const GRID_SHRINK = 0.8;
    const GRID_TRIES = 16;
    const GRID_MAX_CELLS = 1 << 21;
    function fillShape(o) {
        return {
            protrude: SPHERE_PROTRUDE * o.cellSize,
            bulgeZ: SPHERE_BULGE_Z * o.cellSize,
        };
    }
    function pcg3d(x, y, z) {
        x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
        y = (Math.imul(y, 1664525) + 1013904223) >>> 0;
        z = (Math.imul(z, 1664525) + 1013904223) >>> 0;
        x = (x + Math.imul(y, z)) >>> 0;
        y = (y + Math.imul(z, x)) >>> 0;
        z = (z + Math.imul(x, y)) >>> 0;
        x = (x ^ (x >>> 16)) >>> 0;
        y = (y ^ (y >>> 16)) >>> 0;
        z = (z ^ (z >>> 16)) >>> 0;
        x = (x + Math.imul(y, z)) >>> 0;
        y = (y + Math.imul(z, x)) >>> 0;
        z = (z + Math.imul(x, y)) >>> 0;
        return [x, y, z];
    }
    function hash4(seed, x, y, z) {
        const s = seed >>> 0;
        const [a, b, c] = pcg3d((x ^ s) >>> 0, (y ^ Math.imul(s, 7)) >>> 0, (z ^ Math.imul(s, 13)) >>> 0);
        let w = Math.imul(a ^ (b >>> 11) ^ (c << 7), 747796405) >>> 0;
        w = (w ^ (w >>> 16)) >>> 0;
        const n = 1 / 4294967295;
        return [a * n, b * n, c * n, w * n];
    }
    function mulberry32(seed) {
        let a = seed >>> 0;
        return () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function sampleSd2(shape, x, y) {
        const [rx, ry, rw, rh] = shape.sdfRect;
        const W = shape.sdfW;
        const H = shape.sdfH;
        const u = (x - rx) / rw;
        const v = (y - ry) / rh;
        const cu = Math.min(Math.max(u, 0), 1);
        const cv = Math.min(Math.max(v, 0), 1);
        const ox = (u - cu) * rw;
        const oy = (v - cv) * rh;
        const out = Math.hypot(ox, oy);
        const fx = Math.min(Math.max(cu * W - 0.5, 0), W - 1);
        const fy = Math.min(Math.max(cv * H - 0.5, 0), H - 1);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(x0 + 1, W - 1);
        const y1 = Math.min(y0 + 1, H - 1);
        const tx = fx - x0;
        const ty = fy - y0;
        const s = shape.sdf;
        const i00 = (y0 * W + x0) * 4;
        const i10 = (y0 * W + x1) * 4;
        const i01 = (y1 * W + x0) * 4;
        const i11 = (y1 * W + x1) * 4;
        const w00 = (1 - tx) * (1 - ty);
        const w10 = tx * (1 - ty);
        const w01 = (1 - tx) * ty;
        const w11 = tx * ty;
        const d = s[i00] * w00 + s[i10] * w10 + s[i01] * w01 + s[i11] * w11;
        let gx = s[i00 + 1] * w00 +
            s[i10 + 1] * w10 +
            s[i01 + 1] * w01 +
            s[i11 + 1] * w11;
        let gy = s[i00 + 2] * w00 +
            s[i10 + 2] * w10 +
            s[i01 + 2] * w01 +
            s[i11 + 2] * w11;
        if (out > 0) {
            gx = ox / out + gx * 0.05;
            gy = oy / out + gy * 0.05;
        }
        const gl = Math.hypot(gx, gy);
        return gl > 1e-5 ? [d + out, gx / gl, gy / gl] : [d + out, 0, 1];
    }
    function insideDistance(shape, halfDepth, x, y, z) {
        return Math.min(-sampleSd2(shape, x, y)[0], halfDepth - Math.abs(z));
    }
    function extrudeSd(a, b, bevel) {
        const wx = a + bevel;
        const wy = b + bevel;
        return wx > 0 && wy > 0
            ? Math.hypot(wx, wy) - bevel
            : Math.max(wx, wy) - bevel;
    }
    function sd3(shape, halfDepth, bevel, x, y, z) {
        const a = sampleSd2(shape, x, y)[0];
        return extrudeSd(a, Math.abs(z) - halfDepth, bevel);
    }
    class CentreGrid {
        #cell;
        #map = new Map();
        constructor(cell) {
            this.#cell = cell;
        }
        #key(i, j, k) {
            return ((i + 1024) * 2048 + (j + 1024)) * 2048 + (k + 1024);
        }
        add(id, x, y, z) {
            const c = this.#cell;
            const key = this.#key(Math.floor(x / c), Math.floor(y / c), Math.floor(z / c));
            const list = this.#map.get(key);
            if (list) {
                list.push(id);
            }
            else {
                this.#map.set(key, [id]);
            }
        }
        near(x, y, z, r, f) {
            const c = this.#cell;
            const i0 = Math.floor((x - r) / c);
            const i1 = Math.floor((x + r) / c);
            const j0 = Math.floor((y - r) / c);
            const j1 = Math.floor((y + r) / c);
            const k0 = Math.floor((z - r) / c);
            const k1 = Math.floor((z + r) / c);
            for (let k = k0; k <= k1; k++) {
                for (let j = j0; j <= j1; j++) {
                    for (let i = i0; i <= i1; i++) {
                        const list = this.#map.get(this.#key(i, j, k));
                        if (list) {
                            for (const id of list) {
                                f(id);
                            }
                        }
                    }
                }
            }
        }
    }
    const CELL_GROW = 1.12;
    const CELL_GROW_TRIES = 40;
    const THIN_FAR = 2;
    const THIN_COVERED = 0.25;
    const THIN_TEXELS = 1.5;
    const THIN_PASSES = 8;
    function placeBubbles(shape, o) {
        let cell = Math.max(o.cellSize, 1e-3);
        for (let i = 0; i < CELL_GROW_TRIES; i++) {
            const fill = placeAt(shape, o, cell, true);
            if (fill) {
                return fill;
            }
            cell *= CELL_GROW;
        }
        return placeAt(shape, o, cell, false);
    }
    function placeAt(shape, o, cell, fit) {
        const halfDepth = Math.max(o.halfDepth, 1e-3);
        const bevel = Math.min(Math.max(o.bevel ?? 0, 0), halfDepth);
        const roundness = Math.min(Math.max(o.roundness, 0), 1);
        const radiusVar = Math.min(Math.max(o.cellSizeRandomness, 0), 1);
        const seed = o.seed >>> 0;
        const maxCount = Math.min(Math.max(Math.floor(o.maxCount ?? BUBBLE_MAX_COUNT), 0), BUBBLE_MAX_COUNT);
        const latticeMax = o.minSize < 1 ? Math.max(Math.floor(maxCount / 2), 1) : maxCount;
        const { protrude, bulgeZ } = fillShape({ ...o, cellSize: cell });
        const sphereR = SPHERE_R * cell;
        const spacing = 2 *
            sphereR *
            (SPACING_FLAT + (SPACING_ROUND - SPACING_FLAT) * roundness);
        const centreDepth = CENTRE_DEPTH * cell;
        const zLim = Math.max(halfDepth - CENTRE_Z_MARGIN * cell, 0);
        const flat = zLim < 0.5 * spacing;
        const [rx, ry, rw, rh] = shape.sdfRect;
        const rand = mulberry32(Math.imul(seed, 0x27d4eb2d) ^ 0x165667b1);
        const valid = (x, y, z) => Math.abs(z) <= zLim && sampleSd2(shape, x, y)[0] <= -centreDepth;
        const g = spacing / Math.sqrt(3);
        const gnx = Math.max(1, Math.ceil(rw / g));
        const gny = Math.max(1, Math.ceil(rh / g));
        const gnz = Math.max(1, Math.ceil((2 * zLim) / g));
        const owner = new Int32Array(gnx * gny * gnz).fill(-1);
        const gi = (v, o, n) => Math.min(n - 1, Math.max(0, Math.floor((v - o) / g)));
        const pts = [];
        const free = (x, y, z) => {
            const i = gi(x, rx, gnx);
            const j = gi(y, ry, gny);
            const k = gi(z, -zLim, gnz);
            for (let kk = Math.max(0, k - 2); kk <= Math.min(gnz - 1, k + 2); kk++) {
                for (let jj = Math.max(0, j - 2); jj <= Math.min(gny - 1, j + 2); jj++) {
                    for (let ii = Math.max(0, i - 2); ii <= Math.min(gnx - 1, i + 2); ii++) {
                        const q = owner[(kk * gny + jj) * gnx + ii];
                        if (q < 0) {
                            continue;
                        }
                        const dx = pts[q * 3] - x;
                        const dy = pts[q * 3 + 1] - y;
                        const dz = pts[q * 3 + 2] - z;
                        if (dx * dx + dy * dy + dz * dz < spacing * spacing) {
                            return false;
                        }
                    }
                }
            }
            return true;
        };
        const active = [];
        const add = (x, y, z) => {
            const n = pts.length / 3;
            pts.push(x, y, z);
            owner[(gi(z, -zLim, gnz) * gny + gi(y, ry, gny)) * gnx +
                gi(x, rx, gnx)] = n;
            active.push(n);
        };
        const around = (q) => {
            const a = rand() * Math.PI * 2;
            if (flat) {
                const d = spacing * Math.sqrt(1 + 3 * rand());
                return [
                    pts[q * 3] + d * Math.cos(a),
                    pts[q * 3 + 1] + d * Math.sin(a),
                    (2 * rand() - 1) * zLim,
                ];
            }
            const d = spacing * Math.cbrt(1 + 7 * rand());
            const cz = 2 * rand() - 1;
            const sz = Math.sqrt(1 - cz * cz);
            return [
                pts[q * 3] + d * sz * Math.cos(a),
                pts[q * 3 + 1] + d * sz * Math.sin(a),
                pts[q * 3 + 2] + d * cz,
            ];
        };
        const seeds = [];
        for (let y = ry + spacing / 2; y < ry + rh; y += spacing) {
            for (let x = rx + spacing / 2; x < rx + rw; x += spacing) {
                seeds.push(x, y);
            }
        }
        for (let i = seeds.length / 2 - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            for (let c = 0; c < 2; c++) {
                const t = seeds[i * 2 + c];
                seeds[i * 2 + c] = seeds[j * 2 + c];
                seeds[j * 2 + c] = t;
            }
        }
        for (let si = 0; si < seeds.length / 2 && pts.length / 3 < latticeMax; si++) {
            const sx = seeds[si * 2];
            const sy = seeds[si * 2 + 1];
            const sz = (2 * rand() - 1) * zLim;
            if (!valid(sx, sy, sz) || !free(sx, sy, sz)) {
                continue;
            }
            add(sx, sy, sz);
            while (active.length > 0 && pts.length / 3 < latticeMax) {
                const e = Math.floor(rand() * active.length);
                const q = active[e];
                let found = false;
                for (let t = 0; t < POISSON_TRIES; t++) {
                    const [x, y, z] = around(q);
                    if (valid(x, y, z) && free(x, y, z)) {
                        add(x, y, z);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    active[e] = active[active.length - 1];
                    active.pop();
                }
            }
            active.length = 0;
        }
        if (fit && maxCount > 0 && pts.length / 3 >= latticeMax) {
            return null;
        }
        const lat = [];
        for (let q = 0; q < pts.length / 3; q++) {
            const cx = pts[q * 3];
            const cy = pts[q * 3 + 1];
            const cz = pts[q * 3 + 2];
            const sd = sampleSd2(shape, cx, cy)[0];
            let r = sphereR * (1 - radiusVar * rand());
            r = Math.min(r, protrude -
                extrudeSd(sd, Math.abs(cz) - halfDepth - bulgeZ, bevel));
            if (r > 0) {
                lat.push(cx, cy, cz, r);
            }
        }
        const centres = new CentreGrid(cell);
        const nLat = lat.length / 4;
        let maxR = 0;
        for (let i = 0; i < nLat; i++) {
            centres.add(i, lat[i * 4], lat[i * 4 + 1], lat[i * 4 + 2]);
            maxR = Math.max(maxR, lat[i * 4 + 3]);
        }
        const out = [];
        for (let i = 0; i < nLat && out.length / 4 < maxCount; i++) {
            const x = lat[i * 4];
            const y = lat[i * 4 + 1];
            const z = lat[i * 4 + 2];
            const own = -lat[i * 4 + 3] * lat[i * 4 + 3];
            let owned = true;
            centres.near(x, y, z, maxR, (j) => {
                if (j === i) {
                    return;
                }
                const dx = x - lat[j * 4];
                const dy = y - lat[j * 4 + 1];
                const dz = z - lat[j * 4 + 2];
                const pj = dx * dx + dy * dy + dz * dz - lat[j * 4 + 3] ** 2;
                if (pj < own || (pj === own && j < i)) {
                    owned = false;
                }
            });
            if (owned) {
                out.push(x, y, z, lat[i * 4 + 3]);
            }
        }
        const latticeCount = out.length / 4;
        const tMin = 0.5 * Math.max(o.minSize, 0) * cell;
        let voxel = 0;
        let voxels = 0;
        if (o.minSize < 1 && tMin > 0 && out.length / 4 < maxCount) {
            const k = FILL_K_FLAT + (FILL_K_ROUND - FILL_K_FLAT) * roundness;
            const rand = mulberry32(Math.imul(seed, 2654435761) ^ 0x9e3779b9);
            let bx0 = Infinity;
            let bx1 = -Infinity;
            let by0 = Infinity;
            let by1 = -Infinity;
            {
                const W = shape.sdfW;
                const H = shape.sdfH;
                for (let j = 0; j < H; j++) {
                    for (let i = 0; i < W; i++) {
                        if (shape.sdf[(j * W + i) * 4] < 0) {
                            const x = rx + ((i + 0.5) / W) * rw;
                            const y = ry + ((j + 0.5) / H) * rh;
                            bx0 = Math.min(bx0, x);
                            bx1 = Math.max(bx1, x);
                            by0 = Math.min(by0, y);
                            by1 = Math.max(by1, y);
                        }
                    }
                }
            }
            if (bx0 <= bx1) {
                const ext = [bx1 - bx0, by1 - by0, 2 * halfDepth];
                let h = Math.max(tMin, cell * FILL_VOXEL_MIN);
                h = Math.max(h, Math.cbrt((ext[0] * ext[1] * ext[2]) / FILL_VOXELS_MAX));
                const nx = Math.max(1, Math.ceil(ext[0] / h));
                const ny = Math.max(1, Math.ceil(ext[1] / h));
                const nz = Math.max(1, Math.ceil(ext[2] / h));
                const x0 = (bx0 + bx1) / 2 - ((nx - 1) * h) / 2;
                const y0 = (by0 + by1) / 2 - ((ny - 1) * h) / 2;
                const z0 = -((nz - 1) * h) / 2;
                const nxy = nx * ny;
                voxel = h;
                voxels = nxy * nz;
                const col = new Float32Array(nxy);
                for (let j = 0; j < ny; j++) {
                    for (let i = 0; i < nx; i++) {
                        col[j * nx + i] = -sampleSd2(shape, x0 + i * h, y0 + j * h)[0];
                    }
                }
                const dB = new Float32Array(voxels);
                const dS = new Float32Array(voxels).fill(Infinity);
                const clear = new Float32Array(voxels).fill(-1);
                let bMax = 0;
                for (let kk = 0; kk < nz; kk++) {
                    const dz = halfDepth - Math.abs(z0 + kk * h);
                    for (let j = 0; j < nxy; j++) {
                        const v = kk * nxy + j;
                        const d = -extrudeSd(-col[j], -dz, bevel);
                        if (d > 0) {
                            dB[v] = Math.min(col[j] +
                                Math.min(protrude, FILL_POKE_K * col[j]), dz +
                                Math.min(protrude + bulgeZ, FILL_POKE_K * dz), d + Math.min(protrude, FILL_POKE_K * d));
                            bMax = Math.max(bMax, dB[v]);
                        }
                        else {
                            dB[v] = -1;
                        }
                    }
                }
                const carve = (cx, cy, cz, r, cap, onLower) => {
                    const reach = r + cap;
                    const i0 = Math.max(0, Math.ceil((cx - reach - x0) / h));
                    const i1 = Math.min(nx - 1, Math.floor((cx + reach - x0) / h));
                    const j0 = Math.max(0, Math.ceil((cy - reach - y0) / h));
                    const j1 = Math.min(ny - 1, Math.floor((cy + reach - y0) / h));
                    const k0 = Math.max(0, Math.ceil((cz - reach - z0) / h));
                    const k1 = Math.min(nz - 1, Math.floor((cz + reach - z0) / h));
                    const r2 = reach * reach;
                    for (let kk = k0; kk <= k1; kk++) {
                        const dz = z0 + kk * h - cz;
                        for (let j = j0; j <= j1; j++) {
                            const dy = y0 + j * h - cy;
                            const dyz = dy * dy + dz * dz;
                            if (dyz > r2) {
                                continue;
                            }
                            const row = kk * nxy + j * nx;
                            for (let i = i0; i <= i1; i++) {
                                const v = row + i;
                                if (dB[v] < 0) {
                                    continue;
                                }
                                const dx = x0 + i * h - cx;
                                const d2 = dx * dx + dyz;
                                if (d2 > r2) {
                                    continue;
                                }
                                const g = Math.sqrt(d2) - r;
                                if (g < dS[v]) {
                                    dS[v] = g;
                                    onLower?.(v);
                                }
                            }
                        }
                    }
                };
                for (let s = 0; s < latticeCount; s++) {
                    carve(out[s * 4], out[s * 4 + 1], out[s * 4 + 2], out[s * 4 + 3], bMax);
                }
                const span = Math.max(bMax - tMin, 1e-9);
                const bucketOf = (c) => Math.min(BUCKETS - 1, Math.floor(((c - tMin) / span) * BUCKETS));
                const buckets = [];
                for (let b = 0; b < BUCKETS; b++) {
                    buckets.push([]);
                }
                for (let v = 0; v < voxels; v++) {
                    if (dB[v] < 0) {
                        continue;
                    }
                    const c = Math.min(dS[v], dB[v]);
                    clear[v] = c;
                    if (c >= tMin) {
                        buckets[bucketOf(c)].push(v);
                    }
                }
                const fill = new CentreGrid(cell);
                for (let s = 0; s < latticeCount; s++) {
                    fill.add(s, out[s * 4], out[s * 4 + 1], out[s * 4 + 2]);
                }
                let top = BUCKETS - 1;
                const lower = (v) => {
                    const c = Math.min(dS[v], dB[v]);
                    const old = clear[v];
                    if (c < old) {
                        clear[v] = c;
                        if (c >= tMin && bucketOf(c) !== bucketOf(old)) {
                            buckets[bucketOf(c)].push(v);
                        }
                    }
                };
                while (out.length / 4 < maxCount) {
                    while (top >= 0 && buckets[top].length === 0) {
                        top--;
                    }
                    if (top < 0) {
                        break;
                    }
                    const list = buckets[top];
                    const e = Math.floor(rand() * list.length);
                    const v = list[e];
                    list[e] = list[list.length - 1];
                    list.pop();
                    const c = clear[v];
                    if (c < tMin || bucketOf(c) !== top) {
                        continue;
                    }
                    const kk = Math.floor(v / nxy);
                    const j = Math.floor((v - kk * nxy) / nx);
                    const i = v - kk * nxy - j * nx;
                    const cx = x0 + i * h;
                    const cy = y0 + j * h;
                    const cz = z0 + kk * h;
                    const far = dS[v] === Infinity;
                    let gap = dS[v];
                    if (far) {
                        fill.near(cx, cy, cz, dB[v] + tMin + maxR, (s) => {
                            const d = Math.hypot(cx - out[s * 4], cy - out[s * 4 + 1], cz - out[s * 4 + 2]) - out[s * 4 + 3];
                            gap = Math.min(gap, d);
                        });
                    }
                    let r = Math.min(k * gap, dB[v]);
                    const reachIt = FILL_REACH * gap;
                    if (r < reachIt && reachIt <= dB[v] + tMin) {
                        r = reachIt;
                    }
                    if (r <= gap && !far) {
                        clear[v] = -1;
                        continue;
                    }
                    const n0 = out.length / 4;
                    fill.near(cx, cy, cz, r, (s) => {
                        const dx = cx - out[s * 4];
                        const dy = cy - out[s * 4 + 1];
                        const dz = cz - out[s * 4 + 2];
                        const lim = 0.98 *
                            Math.sqrt(dx * dx +
                                dy * dy +
                                dz * dz +
                                out[s * 4 + 3] ** 2);
                        if (lim < r) {
                            r = lim;
                        }
                    });
                    out.push(cx, cy, cz, r);
                    fill.add(n0, cx, cy, cz);
                    maxR = Math.max(maxR, r);
                    const cap = tMin + ((top + 1) / BUCKETS) * span;
                    carve(cx, cy, cz, r, cap, lower);
                    clear[v] = Math.min(clear[v], -r);
                }
                const thinStart = out.length / 4;
                const W = shape.sdfW;
                const H = shape.sdfH;
                const texel = Math.max(rw / W, rh / H);
                const raw = (i, j) => shape.sdf[(j * W + i) * 4];
                const thin = [];
                for (let j = 1; j < H - 1; j++) {
                    for (let i = 1; i < W - 1; i++) {
                        const d = raw(i, j);
                        if (!(d < 0) ||
                            d > raw(i - 1, j) ||
                            d > raw(i + 1, j) ||
                            d > raw(i, j - 1) ||
                            d > raw(i, j + 1) ||
                            d > raw(i - 1, j - 1) ||
                            d > raw(i + 1, j - 1) ||
                            d > raw(i - 1, j + 1) ||
                            d > raw(i + 1, j + 1)) {
                            continue;
                        }
                        const x = rx + ((i + 0.5) / W) * rw;
                        const y = ry + ((j + 0.5) / H) * rh;
                        const c = -sampleSd2(shape, x, y)[0];
                        const e = -extrudeSd(-c, -halfDepth, bevel);
                        if (!(e > 0)) {
                            continue;
                        }
                        const r = Math.min(c + Math.min(protrude, FILL_POKE_K * c), halfDepth +
                            Math.min(protrude + bulgeZ, FILL_POKE_K * halfDepth), e + Math.min(protrude, FILL_POKE_K * e));
                        if (r < tMin && r >= THIN_TEXELS * texel) {
                            thin.push([x, y, r]);
                        }
                    }
                }
                thin.sort((a, b) => b[2] - a[2]);
                const done = new Uint8Array(thin.length);
                let placedSome = true;
                for (let pass = 0; pass < THIN_PASSES && placedSome; pass++) {
                    placedSome = false;
                    for (let t = 0; t < thin.length; t++) {
                        if (out.length / 4 >= maxCount) {
                            break;
                        }
                        if (done[t]) {
                            continue;
                        }
                        const [cx, cy, r0] = thin[t];
                        let gap = Infinity;
                        let nearest = -1;
                        fill.near(cx, cy, 0, THIN_FAR * tMin + maxR, (s) => {
                            const d = Math.hypot(cx - out[s * 4], cy - out[s * 4 + 1], out[s * 4 + 2]) - out[s * 4 + 3];
                            if (d < gap) {
                                gap = d;
                                nearest = s;
                            }
                        });
                        if (gap < THIN_COVERED * r0) {
                            done[t] = 1;
                            continue;
                        }
                        const first = gap > THIN_FAR * tMin;
                        const next = nearest >= thinStart && gap < r0;
                        if (!first && !next) {
                            continue;
                        }
                        let r = r0;
                        fill.near(cx, cy, 0, r, (s) => {
                            const dx = cx - out[s * 4];
                            const dy = cy - out[s * 4 + 1];
                            const dz = out[s * 4 + 2];
                            const lim = 0.98 *
                                Math.sqrt(dx * dx +
                                    dy * dy +
                                    dz * dz +
                                    out[s * 4 + 3] ** 2);
                            if (lim < r) {
                                r = lim;
                            }
                        });
                        fill.add(out.length / 4, cx, cy, 0);
                        out.push(cx, cy, 0, r);
                        maxR = Math.max(maxR, r);
                        done[t] = 1;
                        placedSome = true;
                    }
                }
            }
        }
        const spheres = new Float32Array(out);
        const count = spheres.length / 4;
        let reach = 0;
        for (let s = 0; s < count; s++) {
            const d = sd3(shape, halfDepth, bevel, spheres[s * 4], spheres[s * 4 + 1], spheres[s * 4 + 2]);
            reach = Math.max(reach, d + spheres[s * 4 + 3]);
        }
        return {
            spheres,
            count,
            latticeCount,
            capped: count >= maxCount,
            cellSize: cell,
            reach,
            voxel,
            voxels,
        };
    }
    function buildSphereGrid(input, wobble, cell, fill = 0) {
        let spheres = input;
        let dropped = 0;
        for (;;) {
            const g = tryGrid(spheres, Math.max(wobble, 0), Math.max(cell, 1e-4), Math.max(fill, 0));
            if (g.ok) {
                return { ...g.grid, dropped };
            }
            const drop = new Set(g.drop);
            const keep = [];
            for (let s = 0; s < spheres.length / 4; s++) {
                if (!drop.has(s)) {
                    keep.push(...spheres.subarray(s * 4, s * 4 + 4));
                }
            }
            dropped += drop.size;
            spheres = new Float32Array(keep);
        }
    }
    function tryGrid(spheres, wobble, cell0, fill) {
        const count = spheres.length / 4;
        const own = (s) => spheres[s * 4 + 3] * (1 + wobble);
        const reach = (s) => {
            const r = spheres[s * 4 + 3];
            return Math.sqrt(r * r + fill) + wobble * r;
        };
        const lo = [Infinity, Infinity, Infinity];
        const hi = [-Infinity, -Infinity, -Infinity];
        for (let s = 0; s < count; s++) {
            const r = reach(s);
            for (let a = 0; a < 3; a++) {
                lo[a] = Math.min(lo[a], spheres[s * 4 + a] - r);
                hi[a] = Math.max(hi[a], spheres[s * 4 + a] + r);
            }
        }
        if (count === 0) {
            lo.fill(0);
            hi.fill(1e-3);
        }
        const size = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
        let cell = Math.max(cell0, Math.cbrt((size[0] * size[1] * size[2]) / GRID_MAX_CELLS));
        let refinements = 0;
        for (;;) {
            const dims = [
                Math.max(1, Math.ceil(size[0] / cell)),
                Math.max(1, Math.ceil(size[1] / cell)),
                Math.max(1, Math.ceil(size[2] / cell)),
            ];
            const cells = dims[0] * dims[1] * dims[2];
            const counts = new Int32Array(cells);
            let maxList = 0;
            const pairs = (f) => {
                for (let s = 0; s < count; s++) {
                    const cx = spheres[s * 4];
                    const cy = spheres[s * 4 + 1];
                    const cz = spheres[s * 4 + 2];
                    const r = reach(s);
                    const c = [cx, cy, cz];
                    const a0 = c.map((v, a) => Math.max(0, Math.floor((v - r - lo[a]) / cell)));
                    const a1 = c.map((v, a) => Math.min(dims[a] - 1, Math.floor((v + r - lo[a]) / cell)));
                    for (let z = a0[2]; z <= a1[2]; z++) {
                        const bz = lo[2] + z * cell;
                        const ez = Math.max(bz - cz, 0, cz - bz - cell);
                        const fz = Math.max(Math.abs(bz - cz), Math.abs(bz + cell - cz));
                        for (let y = a0[1]; y <= a1[1]; y++) {
                            const by = lo[1] + y * cell;
                            const ey = Math.max(by - cy, 0, cy - by - cell);
                            const fy = Math.max(Math.abs(by - cy), Math.abs(by + cell - cy));
                            for (let x = a0[0]; x <= a1[0]; x++) {
                                const bx = lo[0] + x * cell;
                                const ex = Math.max(bx - cx, 0, cx - bx - cell);
                                const near2 = ex * ex + ey * ey + ez * ez;
                                if (near2 > r * r) {
                                    continue;
                                }
                                const fx = Math.max(Math.abs(bx - cx), Math.abs(bx + cell - cx));
                                f(s, x + dims[0] * (y + dims[1] * z), Math.sqrt(near2), Math.sqrt(fx * fx + fy * fy + fz * fz));
                            }
                        }
                    }
                }
            };
            let minU = null;
            if (fill > 0) {
                const m = new Float64Array(cells).fill(Infinity);
                pairs((s, id, _near, far) => {
                    const r = spheres[s * 4 + 3];
                    const u = (far + wobble * r) ** 2 - r * r;
                    if (u < m[id]) {
                        m[id] = u;
                    }
                });
                minU = m;
            }
            const each = (f) => {
                pairs((s, id, near) => {
                    if (minU && near > own(s)) {
                        const r = spheres[s * 4 + 3];
                        const l = Math.max(near - wobble * r, 0) ** 2 - r * r;
                        if (l > minU[id]) {
                            return;
                        }
                    }
                    f(s, id);
                });
            };
            each((_s, id) => {
                counts[id]++;
            });
            for (let id = 0; id < cells; id++) {
                maxList = Math.max(maxList, counts[id]);
            }
            if (maxList > BUBBLE_LIST_MAX) {
                const finer = cell * GRID_SHRINK;
                const more = cells / (GRID_SHRINK * GRID_SHRINK * GRID_SHRINK) >
                    GRID_MAX_CELLS;
                if (refinements < GRID_TRIES && !more) {
                    cell = finer;
                    refinements++;
                    continue;
                }
                const smallest = new Int32Array(cells).fill(-1);
                each((s, id) => {
                    if (counts[id] <= BUBBLE_LIST_MAX) {
                        return;
                    }
                    const m = smallest[id];
                    if (m < 0 || spheres[s * 4 + 3] < spheres[m * 4 + 3]) {
                        smallest[id] = s;
                    }
                });
                const drop = new Set();
                for (const s of smallest) {
                    if (s >= 0) {
                        drop.add(s);
                    }
                }
                return { ok: false, drop: [...drop] };
            }
            const offsets = new Int32Array(cells);
            let total = 0;
            for (let id = 0; id < cells; id++) {
                offsets[id] = total;
                total += counts[id];
            }
            const cellTexH = Math.max(1, Math.ceil(cells / BUBBLE_TEX_W));
            const cellData = new Float32Array(BUBBLE_TEX_W * cellTexH * 4);
            for (let id = 0; id < cells; id++) {
                cellData[id * 4] = offsets[id];
                cellData[id * 4 + 1] = counts[id];
            }
            const indexTexH = Math.max(1, Math.ceil(total / 4 / BUBBLE_TEX_W));
            const index = new Float32Array(BUBBLE_TEX_W * indexTexH * 4);
            const fillAt = new Int32Array(cells);
            each((s, id) => {
                index[offsets[id] + fillAt[id]++] = s;
            });
            const sphereTexH = Math.max(1, Math.ceil(count / BUBBLE_TEX_W));
            const sphereData = new Float32Array(BUBBLE_TEX_W * sphereTexH * 4);
            sphereData.set(spheres);
            return {
                ok: true,
                grid: {
                    spheres,
                    count,
                    origin: [lo[0], lo[1], lo[2]],
                    cell,
                    dims,
                    cellData,
                    cellTexH,
                    index,
                    indexTexH,
                    sphereData,
                    sphereTexH,
                    maxList,
                    refinements,
                },
            };
        }
    }
    const CONTAIN_GROW = 0.3;
    const FILL_GAP = 1.4;
    let placed = null;
    function buildFoam(a) {
        const key = JSON.stringify([a.shapeKey, a.fill]);
        if (a.shapeKey === undefined || placed?.key !== key) {
            placed = { key, fill: placeBubbles(a.shape, a.fill) };
        }
        const fill = { ...placed.fill, spheres: placed.fill.spheres.slice() };
        const cellSize = fill.cellSize;
        let spheres = fill.spheres;
        let grow = 0;
        if (a.containment > 0) {
            let maxR = 0;
            for (let i = 0; i < fill.count; i++) {
                maxR = Math.max(maxR, fill.spheres[i * 4 + 3]);
            }
            const g = 0.5 * a.fill.minSize * cellSize;
            const add = a.containment * CONTAIN_GROW * (2 * maxR * g + g * g);
            spheres = fill.spheres.slice();
            for (let i = 0; i < fill.count; i++) {
                const r0 = spheres[i * 4 + 3];
                const r1 = Math.sqrt(r0 * r0 + add);
                spheres[i * 4 + 3] = r1;
                grow = Math.max(grow, r1 - r0);
            }
        }
        let fillG = 0;
        if (a.containment > 0) {
            let maxR = 0;
            for (let i = 0; i < spheres.length / 4; i++) {
                maxR = Math.max(maxR, spheres[i * 4 + 3]);
            }
            const h = FILL_GAP * Math.min(a.fill.minSize, 1) * cellSize;
            fillG = a.containment * (2 * maxR * h + h * h);
        }
        const grid = buildSphereGrid(spheres, a.wobble, cellSize, fillG);
        let edgeGrid = null;
        if (fillG > 0) {
            const g = buildSphereGrid(grid.spheres, a.wobble, cellSize);
            if (g.dropped === 0) {
                edgeGrid = g;
            }
        }
        const drift = new Float32Array(grid.count * 6);
        for (let i = 0; i < grid.count; i++) {
            const [x, y, z, w] = hash4(a.fill.seed, i, 977, 31);
            drift.set([0.6 + 0.8 * y, 0.6 + 0.8 * z, 0.6 + 0.8 * w, z, w, x], i * 6);
        }
        return { fill, grow, fillG, grid, edgeGrid, drift };
    }
    return {
        BUBBLE_TEX_W,
        BUBBLE_LIST_MAX,
        BUBBLE_MAX_COUNT,
        SPHERE_PROTRUDE,
        SPHERE_BULGE_Z,
        fillShape,
        hash4,
        sampleSd2,
        insideDistance,
        placeBubbles,
        buildSphereGrid,
        buildFoam,
    };
}`})))()}function ie(e,t){return 2*e*(1-t)/(1+e*e-2*e*t)}function ae(e,t){let n=Math.min(Math.max(e,0),1),r=(1-n*n)/(t*t),i=Math.sqrt(1-r),a=(n-t*i)/(n+t*i),o=(t*n-i)/(t*n+i);return{rs2:a*a,rp2:o*o,cosT:i}}function oe(){return pe||=se(),pe}function se(e=256,t=64,n=le){let r=[],s=[],c=[],l=[];for(let e=0;e<941;e+=fe){let t=0,n=0,u=0,d=0,f=0;for(let r=e;r<Math.min(e+fe,941);r++){let e=o[r];if(e<ue||e>de)continue;let s=a[r];t+=s*i[3*r],n+=s*i[3*r+1],u+=s*i[3*r+2],d+=s*e,f+=s}f>0&&(r.push(d/f),s.push(t),c.push(n),l.push(u))}let u=e=>{let t=e.reduce((e,t)=>e+t,0);return e.map(e=>e/t)},d=u(s),f=u(c),p=u(l),m=new Float32Array(e*t*4),h=new Float64Array(e*3),g=ce/e;for(let i=0;i<t;i++){let{rs2:a,rp2:o,cosT:s}=ae((i+.5)/t,n);h.fill(0);for(let t=0;t<r.length;t++){let i=4*Math.PI*n*s/r[t],c=i*.5*g,l=i*g,u=Math.cos(l),m=Math.sin(l),_=Math.cos(c),v=Math.sin(c);for(let n=0;n<e;n++){let e=.5*(ie(a,_)+ie(o,_));h[n*3]+=d[t]*e,h[n*3+1]+=f[t]*e,h[n*3+2]+=p[t]*e;let r=_*u-v*m;v=v*u+_*m,_=r}}for(let t=0;t<e;t++){let n=(i*e+t)*4,r=Math.max(h[t*3],0),a=Math.max(h[t*3+1],0),o=Math.max(h[t*3+2],0);m[n]=r,m[n+1]=a,m[n+2]=o,m[n+3]=.2126*r+.7152*a+.0722*o}}return m}var ce,le,ue,de,fe,pe;function me(){return(me=e((()=>{r(),ce=1500,le=1.33,ue=380,de=780,fe=4,pe=null})))()}function he(e,t){let n=`${e}:${t}`,r=ke.get(n);return r||(r=Oe(e,t),ke.set(n,r)),r}function Q(e,t){return Number.isFinite(e)?e:t}function $(e,t,n,r){return Math.min(Math.max(Q(e,r),t),n)}function ge(e,t){return M(typeof e==`string`?e:t)}function _e(e,t,n,r){e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,!1),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),e.pixelStorei(e.UNPACK_ALIGNMENT,4);let i=e.createTexture();return e.bindTexture(e.TEXTURE_2D,i),e.texImage2D(e.TEXTURE_2D,0,e.RGBA32F,t,n,0,e.RGBA,e.FLOAT,r),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.NEAREST),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),e.bindTexture(e.TEXTURE_2D,null),i}var ve,ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae;function je(){return(je=e((()=>{Y(),Z(),t(),m(),w(),x(),P(),u(),me(),k(),ve=1e4,ye={sourceChannel:`alpha`,depth:.1,bevel:.02,cellSize:.1,cellSizeRandomness:.25,roundness:.3,seed:1,minSize:.25,containment:0,wobble:.06,speed:.15,maxLayers:6,iridescence:.5,thickness:420,thicknessVariation:.35,drain:.5,swirlScale:1.2,swirlSpeed:.12,reflection:1.4,rim:1,tint:`#6d8ee8`,tintStrength:.3,opacity:0,color:`#2f7fe0`,borderWidth:.06,borderHighlight:.35,backdrop:`none`,backdropVisible:!1,backdropAround:!1,backdropScale:.25,backdropDistance:.6,backdropSpeed:.15,backdropColors:`mono`,backdropRatio:.5,backdropSoftness:.03,lightIntensity:1.2,lightSoftness:.8,yaw:20,pitch:11.5,orbitAnimation:11.5,orbitSpeed:3.3,fov:30,zoom:.75,drag:!1,cameraOrigin:`element`,pointer:`none`,pointerStrength:1,resolution:1,antialias:!0,pad:`fullscreen`,debug:`off`},be={off:0,cost:1,layers:2,cells:3},xe=16,Se=.5,Ce=.15,we=.6,Te=512,Ee=2,De=2,Oe=(e,t)=>`#version 300 es
#define CONTAIN ${e}
#define BACKDROP_KIND ${t}
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 uv;
out vec4 outColor;

${d}

uniform vec2 shapeHalf;
uniform float boxMargin;
uniform mat3 viewRot;
uniform float camDist;
uniform float focalPx;
// The camera (see _orbit-camera.ts): the eye in view space is
// (eye, camDist), and its axis meets the output at principalPx.
uniform vec2 eye;
uniform vec2 principalPx;
uniform vec2 bufferPx;
uniform float pixelSize;

uniform int maxLayers;
uniform uint seed;
uniform float cellSize;

// The spheres (x, y, z, r per texel, drifted for this frame) and the grid
// over them: per cell an offset into the index list and a count; the
// index list holds four sphere indices per texel. All in rows of
// BUBBLE_TEX_W texels.
uniform highp sampler2D sphereTex;
uniform highp sampler2D cellTex;
uniform highp sampler2D indexTex;
uniform vec3 gridOrigin;
uniform float gridCell;
uniform ivec3 gridDims;
// The grid the borders are found with: the spheres listed by their own
// radii. In a container the grid above lists them as far as the fill
// blows them up, which the foam's outside does not need.
uniform highp sampler2D edgeCellTex;
uniform highp sampler2D edgeIndexTex;
uniform vec3 edgeOrigin;
uniform float edgeCell;
uniform ivec3 edgeDims;
// How far any sphere can reach out of the shape, drift included.
uniform float reachMax;
// The container: the foam ends where the shape's field reaches clipOff
// (0: the shape itself).
uniform float clipOff;
// Below containment 1 the part of the foam outside the shape is not cut
// but squashed towards it: a point at distance S from the shape shows
// the foam at S / (1 - containment). warpK = containment / (1 -
// containment). At 1 (WALL_ON) it is cut flat instead.
uniform float warpK;
// In a container the bubbles inside the shape are blown up with depth,
// by up to fillG on r², reached fillDepth in: the gaps left between them
// deep inside close, and the shape reads as full of foam.
uniform float fillG;
uniform float fillDepth;
#define WALL_ON (CONTAIN == 1)

uniform sampler2D filmLut;
uniform float iridescence;
uniform float thickness;
uniform float thicknessVariation;
uniform float drain;
uniform float swirlScale;
uniform float swirlOffset;
uniform float reflection;
// The films reflect as if seen no more grazing than this cosine.
uniform float rimCos;
// The backdrop is reflected all around (1), or only behind (0).
uniform float backdropAround;
uniform vec3 tint;
uniform float tintStrength;
uniform float opacity;
uniform vec3 bodyColor;
// The borders on the foam's outside: their width in world units (0: off,
// none of their work is done), the white line, the film's thickening.
uniform float borderWidth;
uniform float borderHighlight;
uniform float borderThickness;
uniform int debugView;

// Spheres a grid cell lists, at most: the ray passes through some of them.
const int MAX_CAND = ${ee};
const int TEX_W = ${V};
const int MAX_LAYERS = ${xe};
const float THICKNESS_MAX = ${ce.toFixed(1)};
const float TAU = 6.2831853;
// Brightness of the lights in reflections, the most a film reflects, and
// how much of that the walls inside the foam keep.
const float LIGHT_GAIN = 8.0;
const float RIM_MAX = 0.2;
const float WALL_DIM = 0.35;
// Half the white line's core, as a share of the border's width.
const float BORDER_LINE = 0.22;
const float NO_EDGE = 1e30;

${F}
${N}
${S}
${E}

vec3 ro;
vec3 rd;
// Radius of the pixel's cone per unit of distance.
float pixCone;
float cost = 0.0;

uvec3 pcg3d(uvec3 v) {
    v = v * 1664525u + 1013904223u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    v ^= v >> 16u;
    v.x += v.y * v.z;
    v.y += v.z * v.x;
    v.z += v.x * v.y;
    return v;
}

vec4 hash4(uvec3 v) {
    uvec3 a = pcg3d(v ^ uvec3(seed, seed * 7u, seed * 13u));
    uint w = (a.x ^ (a.y >> 11u) ^ (a.z << 7u)) * 747796405u;
    return vec4(a, w ^ (w >> 16u)) * (1.0 / 4294967295.0);
}

// The id of sphere i, which seeds its film's swirls.
float sphereId(int i) {
    return hash4(uvec3(uint(i), 977u, 31u)).w * 251.0;
}

// ---- shading ----

vec3 col = vec3(0.0);
vec3 remain = vec3(1.0);
int films = 0;
float firstId = -1.0;

// Film thickness in nm at l (from the cell's seed, per cell size):
// thinner at the top, with slow swirls flowing down.
float filmThickness(vec3 l, float id) {
    float g = max(1.0 - drain * l.y, 0.05);
    vec3 q = l * swirlScale + vec3(id * 1.37, id * 0.71 - swirlOffset, id * 2.13);
    float n = 0.7 * snoise(q + vec3(0.0, 0.0, swirlOffset * 0.5))
        + 0.3 * snoise(q * 2.3 + 11.7);
    return thickness * g * max(1.0 + thicknessVariation * n, 0.05);
}

// Reflectance of a film without interference: both faces' Fresnel
// (water, Schlick), summed incoherently.
float plainFilm(float c) {
    float f = 0.02 + 0.98 * pow(1.0 - c, 5.0);
    return 2.0 * f / (1.0 + f);
}

// The light a film of reflectance R reflects: a soft studio sky, and the
// scene's lights (or the backdrop). The lights are much brighter than
// their surroundings, as studio lights are, so a cap facing one shows a
// highlight at the few percent a film reflects head on; past that, a
// grazing film reflects them no more, so rims stay soft.
vec3 reflected(vec3 R, vec3 pV, vec3 dV) {
    // The backdrop is behind, and with backdropAround on a plane as far
    // in front too: towards the side both planes blur to its mean.
    // It is sampled in one place: each call site is compiled apart, and
    // the patterns are the largest part of the shader.
    bool behind = backdropMode != 0 && dV.z < -1e-4;
    bool front = backdropAround > 0.5 && backdropMode != 0 && !behind;
    float t = behind
        ? (-backdropDistance - pV.z) / dV.z
        : (backdropDistance - pV.z) / max(dV.z, 1e-4);
    vec2 q = pV.xy + dV.xy * t;
    bool hit = front || (behind && t > 0.0);
    vec3 env = vec3(0.0);
    if (hit) {
        env = backdrop(q, length(fwidth(q)));
    }
    vec3 lit = lights(dV, lightSoftness);
    vec3 glint = min(R, vec3(0.05)) * LIGHT_GAIN * lit;
    if (front) {
        return R * env + glint;
    }
    float sky = lightIntensity * 0.35 * (0.3 + 0.7 * smoothstep(-0.7, 0.9, dV.y));
    if (behind) {
        return R * (hit ? env : lit) + R * sky;
    }
    return glint + R * sky;
}

// The white line across a border, at distance e from it: a flat core
// with a short falloff, spread over the pixel's footprint fp when it is
// thinner, so it keeps its brightness per length instead of breaking up.
float borderLine(float e, float fp) {
    float c = borderWidth * BORDER_LINE;
    float w = max(c, 0.5 * fp);
    float s = max(0.4 * c, 0.5 * fp);
    return c / w * (1.0 - smoothstep(w - s, w + s, e));
}

// The shell's warp along a piece of the ray, where it is linear: with
// warpOn, ro and rd are the piece in the unsquashed foam (t scaled by
// warpL), roReal and rdReal the ray seen. The push is along warpG (out of
// the side walls) and warpZ (out of the front or back), each when active.
// The outline is taken as straight: its field is warpA0 + warpGrad . xy.
bool warpOn = false;
vec3 roReal;
vec3 rdReal;
float warpL;
vec3 warpG;
vec3 warpZ;
vec2 warpGrad;
float warpA0;
// A flat film the first cell of the next walk starts with (a bubble cut
// at the middle of a gap), and its normal.
bool capOn = false;
vec3 capN;

// A film found along the ray, kept to be shaded a little later: the
// point and normal as seen, the point in its cell (per cell size), and
// the rest as addFilm takes them.
struct Film {
    vec3 p;
    vec3 n;
    vec3 l;
    float id;
    float outer;
    float cover;
    float edge;
    bool entering;
};
// The films not shaded yet. A few are enough: segmentFilms shades them
// on every step, and at most FOUND_MAX are found between two. The list is
// kept short, since every pixel pays for its size.
const int FOUND_MAX = 4;
Film found[FOUND_MAX];
int nFound = 0;
// The share of light that passes the opaque bodies found so far: the
// walk stops when none is left.
float through = 1.0;

// Keep a film at p with normal n, of the cell round \`center\` with id
// \`id\`: \`outer\` is 1 on the foam's outside, 0 on a wall inside it;
// \`cover\` is how much of the pixel it covers; \`edge\` the distance to
// the nearest border on the outside (NO_EDGE: none).
// The films are shaded apart, in as few places as can be (shadeFilms):
// each call site of the shading is compiled apart, and it is most of
// the shader.
void addFilm(vec3 p, vec3 n, vec3 center, float id, float outer, bool entering, float cover, float edge) {
    vec3 l = (p - center) / cellSize;
    if (warpOn) {
        // In the warped shell, keep the point and normal as seen.
        p = roReal + rdReal * (dot(p - ro, rd) / warpL);
        n = normalize(n + warpK * (warpG * dot(warpG, n) + warpZ * dot(warpZ, n)));
    }
    if (nFound < FOUND_MAX) {
        found[nFound] = Film(p, n, l, id, outer, cover, edge, entering);
        nFound++;
    }
    if (films == 0) {
        firstId = id;
    }
    if (entering) {
        through *= 1.0 - opacity * cover;
    }
    films++;
}

// Shade a film, in front of those shaded before.
void shadeFilm(Film film) {
    vec3 p = film.p;
    vec3 n = film.n;
    float cover = film.cover;
    float edge = film.edge;
    float th = filmThickness(film.l, film.id);
    vec3 nf = dot(n, rd) > 0.0 ? -n : n;
    float cosI = clamp(-dot(rd, nf), 0.0, 1.0);
    // White light scattered by the water along the borders.
    float white = 0.0;
    if (edge < borderWidth) {
        // The border: the water gathered where two bubbles meet. The
        // film thickens towards it, and a narrow line of it scatters.
        // The pixel's footprint on the film is longer at a grazing angle.
        float fp = pixCone * length(p - ro) / max(cosI, 0.25);
        float f = 1.0 - edge / borderWidth;
        th = min(th + borderThickness * f * f, THICKNESS_MAX);
        white = borderHighlight * borderLine(edge, fp);
    }
    float cosR = max(cosI, rimCos);
    vec3 R = mix(
        vec3(plainFilm(cosR)),
        textureLod(filmLut, vec2(th / THICKNESS_MAX, cosR), 0.0).rgb,
        iridescence
    );
    // Grazing films reflect most, but a foam is mostly grazing films:
    // their reflectance is held down, more for the walls inside it.
    R = min(R, vec3(RIM_MAX)) * mix(WALL_DIM, 1.0, film.outer) * cover;
    vec3 rv = viewRot * reflect(rd, nf);
    vec3 refl = reflected(R, viewRot * p, rv) * reflection;
    col += remain * refl / (1.0 + refl);
    // The light that passes: some of it scattered in the tint, more at a
    // grazing angle, where the path through the film is longer.
    vec3 T = 1.0 - R;
    float k = (1.0 - exp(-tintStrength * 0.03 / max(cosI * cosI, 0.1))) * cover;
    col += remain * T * k * tint;
    remain *= T * (1.0 - k);
    if (white > 0.0) {
        // An even white, lit like the sky the films reflect: it takes
        // from what passes, and shows on the body too.
        float a = clamp(white, 0.0, 1.0) * cover;
        col += remain * a * (0.3 + 0.55 * lightIntensity);
        remain *= 1.0 - a;
    }
    if (film.entering && opacity > 0.0) {
        // A matte, softly lit body: wrapped diffuse from the upper left,
        // a little rim light.
        vec3 nV = viewRot * n;
        float wrap = clamp((dot(nV, normalize(vec3(-0.5, 0.75, 0.6))) + 0.5) / 1.5, 0.0, 1.0);
        float rim = pow(1.0 - cosI, 3.0);
        float li = 0.35 + 0.5 * lightIntensity;
        vec3 body = bodyColor * li * (0.25 + 0.85 * wrap * wrap)
            + rim * 0.2 * li * vec3(0.8, 0.9, 1.0);
        float o = opacity * cover;
        col += remain * o * body;
        remain *= 1.0 - o;
    }
}

// Shade the films found since the last call, front to back.
void shadeFilms() {
    // The films are kept as seen: shade them along the ray seen, also
    // from inside the warped shell.
    vec3 roWalk = ro;
    vec3 rdWalk = rd;
    if (warpOn) {
        ro = roReal;
        rd = rdReal;
    }
    for (int i = 0; i < FOUND_MAX; i++) {
        if (i >= nFound) {
            break;
        }
        shadeFilm(found[i]);
    }
    nFound = 0;
    ro = roWalk;
    rd = rdWalk;
}

// ---- the foam: a power diagram of spheres, found through a grid ----

// The spheres of the grid cell the ray is in that it passes through on
// the segment: centre (drifted) and radius, id, and the ray's power line
// b t + k for each.
vec4 cand[MAX_CAND];
float candId[MAX_CAND];
vec2 candBK[MAX_CAND];
int nCand = 0;

// The fill along the current stretch inside the shape: the outline's
// field and gradient there, sampled at even steps of fillDt from fillT0
// and taken as straight between them.
#define FILL_STEPS 8
bool fillOn = false;
float fillT0;
float fillDt;
vec3 fillKnot[FILL_STEPS + 1];

vec3 fillOutline(float t) {
    float u = clamp((t - fillT0) / fillDt, 0.0, float(FILL_STEPS));
    int i = min(int(u), FILL_STEPS - 1);
    return mix(fillKnot[i], fillKnot[i + 1], u - float(i));
}

ivec2 texel(int i) {
    return ivec2(i % TEX_W, i / TEX_W);
}

// Load the spheres of grid cell C that the ray passes through on
// [t0, t1]. The cell's list holds every sphere that can reach into it,
// drift included, so none that owns a point of the segment is missed.
// With \`all\`, every sphere of the list is loaded instead.
void loadCell(ivec3 C, float t0, float t1, bool all) {
    nCand = 0;
    if (any(lessThan(C, ivec3(0))) || any(greaterThanEqual(C, gridDims))) {
        return;
    }
    vec4 head = texelFetch(cellTex, texel(C.x + gridDims.x * (C.y + gridDims.y * C.z)), 0);
    cost += 1.0;
    int off = int(head.x);
    int count = min(int(head.y), MAX_CAND);
    vec4 idx = vec4(0.0);
    for (int j = 0; j < MAX_CAND; j++) {
        if (j >= count) {
            break;
        }
        int e = off + j;
        if (j == 0 || (e & 3) == 0) {
            idx = texelFetch(indexTex, texel(e >> 2), 0);
            cost += 1.0;
        }
        int i = int(idx[e & 3]);
        vec4 sph = texelFetch(sphereTex, texel(i), 0);
        cost += 1.0;
        // In the shell, only the bubbles poking out through this side.
        if (warpOn && warpA0 + dot(warpGrad, sph.xy) > 0.5 * sph.w) {
            continue;
        }
        vec3 oc = ro - sph.xyz;
        vec2 bk = vec2(2.0 * dot(rd, oc), dot(oc, oc) - sph.w * sph.w);
        if (all) {
            cand[nCand] = sph;
            candId[nCand] = sphereId(i);
            candBK[nCand] = bk;
            nCand++;
            continue;
        }
        // With the fill a sphere owns points beyond its radius: keep it
        // as far as it reaches with the fill.
        float disc = bk.x * bk.x - 4.0 * (bk.y - (fillOn ? fillG : 0.0));
        if (disc <= 0.0) {
            continue;
        }
        vec2 hit = 0.5 * (-bk.x + vec2(-1.0, 1.0) * sqrt(disc));
        // Only spheres the ray passes through on the segment can own a
        // point inside the foam; the others are left out of the envelope.
        if (hit.x < t1 && hit.y > t0) {
            cand[nCand] = sph;
            candId[nCand] = sphereId(i);
            candBK[nCand] = bk;
            nCand++;
        }
    }
}

// ---- borders: where two bubbles meet ----

// The distance from q, in the cell of sphere \`own\` (whose power at q is
// powI), to the wall it shares with sphere s: walls lie on radical
// planes, so it is exact. Keeps the nearer of it and e; the owner itself
// is skipped.
void nearWall(inout float e, vec3 q, vec4 own, float powI, vec4 s) {
    vec3 dc = s.xyz - own.xyz;
    float d2 = dot(dc, dc);
    if (d2 < 1e-12) {
        return;
    }
    vec3 m = q - s.xyz;
    float ri = inversesqrt(d2);
    e = min(e, (dot(m, m) - s.w * s.w - powI) * 0.5 * ri);
}

// The distance from q to the nearest wall of its owner's cell, over
// every sphere the border grid's cell of q lists (as
// \`_sphere-foam.ts\`'s borderDist). A sphere that could bound the cell at q contains q or is
// close to it, so it reaches into that grid cell and is listed. The list
// is read again here: the one loaded for the ray keeps only the spheres
// the ray passes through.
float borderDist(vec3 q, vec4 own) {
    ivec3 C = ivec3(floor((q - edgeOrigin) / edgeCell));
    if (any(lessThan(C, ivec3(0))) || any(greaterThanEqual(C, edgeDims))) {
        return NO_EDGE;
    }
    vec4 head = texelFetch(edgeCellTex, texel(C.x + edgeDims.x * (C.y + edgeDims.y * C.z)), 0);
    cost += 1.0;
    int off = int(head.x);
    int count = min(int(head.y), MAX_CAND);
    vec3 mo = q - own.xyz;
    float powI = dot(mo, mo) - own.w * own.w;
    float e = NO_EDGE;
    vec4 idx = vec4(0.0);
    for (int j = 0; j < MAX_CAND; j++) {
        if (j >= count) {
            break;
        }
        int k = off + j;
        if (j == 0 || (k & 3) == 0) {
            idx = texelFetch(edgeIndexTex, texel(k >> 2), 0);
            cost += 1.0;
        }
        int i = int(idx[k & 3]);
        vec4 sph = texelFetch(sphereTex, texel(i), 0);
        cost += 1.0;
        if (warpOn && warpA0 + dot(warpGrad, sph.xy) > 0.5 * sph.w) {
            continue;
        }
        nearWall(e, q, own, powI, sph);
    }
    return max(e, 0.0);
}

bool sphereInside = false;

// The shape's field at t on the stretch, and its gradient.
float fillField(float t, out vec3 grad) {
    float zt = ro.z + rd.z * t;
    float dz = abs(zt) - halfDepth;
    vec3 o = fillOutline(t);
    grad = o.x > dz ? vec3(o.yz, 0.0) : vec3(0.0, 0.0, zt >= 0.0 ? 1.0 : -1.0);
    return max(o.x, dz);
}

// What the fill adds to r² at t.
float fillAt(float t) {
    vec3 grad;
    return fillG * smoothstep(0.0, 1.0, -fillField(t, grad) / fillDepth);
}
// The cell that owns the end of the last segment (an index into cand).
int segOwn = 0;
// Whether the last grid walk ended inside a bubble, and that bubble.
bool endInside = false;
vec4 endSph;
float endId;

// The film on the container's wall at t, where it cuts the cell of sphere i.
void wallFilm(int i, float t, bool entering) {
    vec3 p = ro + rd * t;
    vec4 s = sdf3(p);
    cost += 1.0;
    float edge = NO_EDGE;
    if (borderWidth > 0.0) {
        edge = borderDist(p, cand[i]);
    }
    addFilm(p, s.yzw, cand[i].xyz, candId[i], 1.0, entering, 1.0, edge);
}

// The film on a sphere's own surface at t.
void sphereFilm(int i, float t, bool entering, float cover) {
    vec3 p = ro + rd * t;
    vec3 n = (p - cand[i].xyz) / cand[i].w;
    if (fillOn) {
        // The surface is |p - c|² - r² = fill: its gradient bends with
        // the fill's.
        vec3 grad;
        float sf = fillField(t, grad);
        if (sf < 0.0 && sf > -fillDepth) {
            float q = -sf / fillDepth;
            n = normalize(p - cand[i].xyz + 3.0 * q * (1.0 - q) * fillG / fillDepth * grad);
        }
    }
    float edge = NO_EDGE;
    if (borderWidth > 0.0) {
        edge = borderDist(p, cand[i]);
    }
    addFilm(p, n, cand[i].xyz, candId[i], 1.0, entering, cover, edge);
}

// The films of the foam on [t0, t1] with the spheres loaded: the lower
// envelope of the power lines, as in \`_sphere-foam.ts\`.
// \`first\`: t0 is where the ray enters the container, so a cell that
// holds that point starts with a film on the container's wall.
void segmentFilms(float t0, float t1, float cone, int layers, bool first) {
    int n = nCand;
    int own = 0;
    float lo = candBK[0].x * t0 + candBK[0].y;
    for (int i = 1; i < MAX_CAND; i++) {
        if (i >= n) {
            break;
        }
        float l = candBK[i].x * t0 + candBK[i].y;
        if (l < lo || (l == lo && candBK[i].x < candBK[own].x)) {
            lo = l;
            own = i;
        }
    }
    segOwn = own;
    // The fill over the segment, a line there: g0 + gB (t - t0).
    float g0 = 0.0;
    float gB = 0.0;
    if (fillOn && n > 0) {
        g0 = fillAt(t0);
        gB = (fillAt(t1) - g0) / max(t1 - t0, 1e-6);
    }
    float ta = t0;
    for (int guard = 0; guard <= MAX_CAND; guard++) {
        // The one place in the walk where films are shaded, in every
        // cell, empty ones too. A step finds two films at most, and the
        // walkers add two more between calls.
        shadeFilms();
        if (n == 0) {
            sphereInside = false;
            return;
        }
        if (first && guard == 0) {
            sphereInside = t0 * t0 + lo - g0 < 0.0;
            if (sphereInside && WALL_ON) {
                wallFilm(own, t0, true);
            } else if (sphereInside && capOn) {
                addFilm(ro + rd * t0, capN, cand[own].xyz, candId[own], 1.0, true, 1.0, NO_EDGE);
            }
        }
        if (films >= layers) {
            return;
        }
        vec2 bo = candBK[own];
        float ts = 1e30;
        int next = -1;
        for (int j = 0; j < MAX_CAND; j++) {
            if (j >= n) {
                break;
            }
            vec2 bj = candBK[j];
            if (bj.x < bo.x) {
                float tj = max((bj.y - bo.y) / (bo.x - bj.x), ta);
                if (tj < ts) {
                    ts = tj;
                    next = j;
                }
            }
        }
        float tb = min(ts, t1);
        // The owner's power less the fill: t² + bf.x t + bf.y.
        vec2 bf = bo - vec2(gB, g0 - gB * t0);
        float disc = bf.x * bf.x - 4.0 * bf.y;
        if (disc > 0.0) {
            float hh = sqrt(disc);
            float tIn = 0.5 * (-bf.x - hh);
            float tOut = 0.5 * (-bf.x + hh);
            // Edge antialiasing: a chord shorter than the pixel's
            // footprint covers part of it.
            float cover = clamp(0.5 * hh / max(cone * tIn, 1e-6), 0.0, 1.0);
            if (!sphereInside && tIn > ta && tIn <= tb && tIn > 0.0) {
                sphereFilm(own, tIn, true, cover);
                sphereInside = true;
            }
            if (sphereInside && tOut > ta && tOut <= tb && films < layers) {
                sphereFilm(own, tOut, false, cover);
                sphereInside = false;
            }
        }
        if (next < 0 || ts >= t1) {
            return;
        }
        if (sphereInside && films < layers) {
            // One flat wall on the radical plane, shared by both cells.
            vec3 p = ro + rd * ts;
            vec3 c = 0.5 * (cand[own].xyz + cand[next].xyz);
            addFilm(p, normalize(cand[next].xyz - cand[own].xyz), c, candId[own] + candId[next], 0.0, false, 1.0, NO_EDGE);
        }
        own = next;
        segOwn = own;
        ta = ts;
    }
}

float fillCut(float num, float den) {
    return abs(den) > 1e-7 ? num / den : 1e30;
}

// The films on [t0, t1]. With the fill, the stretch is split where the
// fill bends along the ray, so it is close to a line on each part.
void sphereSegment(float t0, float t1, float cone, int layers, bool first) {
    // Without the fill, the whole stretch in one part.
    bool split = fillOn && nCand > 0;
    // The middle plane, and where the fill is full along z.
    float zFull = halfDepth - fillDepth;
    vec3 cut = vec3(
        fillCut(-ro.z, rd.z),
        fillCut(zFull - ro.z, rd.z),
        fillCut(-zFull - ro.z, rd.z)
    );
    float ta = t0;
    for (int k = 0; k < FILL_STEPS + 4; k++) {
        // The next sample of the outline's field.
        float tn = t1;
        if (split) {
            tn = min(t1, fillT0 + fillDt * (floor((ta - fillT0) / fillDt + 1e-3) + 1.0));
            for (int c = 0; c < 3; c++) {
                if (cut[c] > ta + 1e-5 && cut[c] < tn) {
                    tn = cut[c];
                }
            }
        }
        segmentFilms(ta, tn, cone, layers, first && k == 0);
        if (tn >= t1 || films >= layers) {
            return;
        }
        ta = tn;
    }
}

// The container's field along the ray (negative inside).
float clipField(float t) {
    cost += 1.0;
    return sdf3(ro + rd * t).x - clipOff;
}

// Walk the grid on [a, b], a stretch of the ray inside the shape (or,
// with WALL_ON, inside the container): the foam's films there. With
// WALL_ON, a cell cut by the container gets a film on its wall.
void walkGrid(float a, float b, float cone, int layers) {
    vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 inv = 1.0 / d;
    ivec3 stp = ivec3(sign(d));
    vec3 tDelta = gridCell * abs(inv);
    vec3 q = (ro + rd * a - gridOrigin) / gridCell;
    ivec3 C = clamp(ivec3(floor(q)), ivec3(0), gridDims - 1);
    vec3 tMax = a + (vec3(C) + step(0.0, d) - q) * gridCell * inv;
    float tw = a;
    bool first = true;
    sphereInside = false;
    for (int i = 0; i < 128; i++) {
        if (films >= layers || through < 0.02) {
            return;
        }
        float tn = min(tMax.x, min(tMax.y, tMax.z));
        float te = min(tn, b);
        loadCell(C, tw, te, false);
        sphereSegment(tw, te, cone, layers, first);
        first = false;
        if (tn >= b) {
            if (sphereInside && films < layers && nCand > 0 && WALL_ON) {
                wallFilm(segOwn, b, false);
            }
            break;
        }
        tw = tn;
        int axis = tMax.x <= tMax.y && tMax.x <= tMax.z ? 0 : (tMax.y <= tMax.z ? 1 : 2);
        C[axis] += stp[axis];
        tMax[axis] += tDelta[axis];
        if (C[axis] < 0 || C[axis] >= gridDims[axis]) {
            break;
        }
    }
    endInside = sphereInside && nCand > 0;
    if (endInside) {
        endSph = cand[segOwn];
        endId = candId[segOwn];
    }
    sphereInside = false;
}

// Walk [ta, tb] of the shell. Out of an extruded shape the push along
// its field splits into one out of the side walls (by the outline's
// field) and one out of the front or back (by |z| - halfDepth), even
// round its edges. With the outline taken as straight near the ray, both
// are linear in t between the points where each starts, so the ray is
// straight in the unsquashed foam on each piece, and the pieces join.
void shellWalk(float ta, float tb, float cone, int layers) {
    roReal = ro;
    rdReal = rd;
    vec3 pm = ro + rd * (0.5 * (ta + tb));
    vec3 s2 = sd2(pm.xy);
    cost += 1.0;
    vec2 g = s2.yz;
    warpGrad = g;
    warpA0 = s2.x - dot(g, pm.xy);
    // The outline's field along the ray, a + b t.
    float a = warpA0 + dot(g, ro.xy);
    float b = dot(g, rd.xy);
    float bp[3];
    bp[0] = abs(b) > 1e-6 ? -a / b : 1e30;
    bp[1] = abs(rd.z) > 1e-6 ? (halfDepth - ro.z) / rd.z : 1e30;
    bp[2] = abs(rd.z) > 1e-6 ? (-halfDepth - ro.z) / rd.z : 1e30;
    for (int i = 0; i < 2; i++) {
        for (int j = 0; j < 2 - i; j++) {
            if (bp[j] > bp[j + 1]) {
                float x = bp[j];
                bp[j] = bp[j + 1];
                bp[j + 1] = x;
            }
        }
    }
    float t0 = ta;
    for (int i = 0; i <= 3; i++) {
        float t1 = i < 3 ? clamp(bp[i], ta, tb) : tb;
        if (t1 > t0 + 1e-6) {
            float tc = 0.5 * (t0 + t1);
            float zc = roReal.z + rdReal.z * tc;
            float sz = zc >= 0.0 ? 1.0 : -1.0;
            float xy = a + b * tc > 0.0 ? 1.0 : 0.0;
            float zz = abs(zc) > halfDepth ? 1.0 : 0.0;
            vec3 G = vec3(g, 0.0) * xy;
            vec3 Z = vec3(0.0, 0.0, sz) * zz;
            vec3 q0 = roReal + warpK * (a * G + (sz * roReal.z - halfDepth) * Z);
            vec3 dq = rdReal + warpK * (b * G + sz * rdReal.z * Z);
            float L = length(dq);
            ro = q0;
            rd = dq / L;
            warpL = L;
            warpG = G;
            warpZ = Z;
            warpOn = true;
            walkGrid(t0 * L, t1 * L, cone / L, layers);
            warpOn = false;
            capOn = false;
            ro = roReal;
            rd = rdReal;
            if (films >= layers) {
                return;
            }
        }
        t0 = max(t0, t1);
    }
}


// ---- the squashed shell outside the shape ----

// The squashed shell from t, where the ray is outside the shape and in
// the container. Its stretch is found by tracing the shape's field, then
// walked by shellWalk. True when the ray enters the shape (t there).
bool shellStretch(inout float t, float tEnd, float cone, int layers) {
    float stepMin = max(clipOff / 16.0, 2e-4);
    for (int part = 0; part < 3; part++) {
        float ta = t;
        vec4 s = sdf3(ro + rd * t);
        cost += 1.0;
        if (s.x < 0.0) {
            return true;
        }
        vec3 n0 = s.yzw;
        int how = 0;
        for (int i = 0; i < 48; i++) {
            float tp = t;
            float sp = s.x;
            t += max(s.x, stepMin);
            if (t >= tEnd) {
                t = tEnd;
                break;
            }
            s = sdf3(ro + rd * t);
            cost += 1.0;
            if (s.x < 0.0) {
                // Into the shape.
                t = tp + (t - tp) * sp / (sp - s.x);
                how = 1;
                break;
            }
            if (s.x > clipOff) {
                // Out of the container.
                t = tp + (t - tp) * (clipOff - sp) / (s.x - sp);
                break;
            }
            if (dot(s.yzw, n0) < 0.0) {
                // A crease: the middle of a gap, the nearest side changes.
                t = 0.5 * (tp + t);
                how = 2;
                break;
            }
        }
        if (t > ta) {
            shellWalk(ta, t, cone, layers);
        }
        if (how == 1) {
            return true;
        }
        if (how != 2 || films >= layers) {
            return false;
        }
        // The near bubble ends flat at the crease; the far side starts
        // with one.
        vec3 nc = normalize(n0 - s.yzw + 1e-5 * rd);
        if (endInside) {
            addFilm(ro + rd * t, nc, endSph.xyz, endId, 1.0, false, 1.0, NO_EDGE);
        }
        capOn = true;
        capN = nc;
        t += 1e-4;
    }
    return false;
}

// The foam inside the container. The ray's stretches inside it are
// found by tracing the shape's field. With WALL_ON each is walked through
// the grid and cut flat by the container. Otherwise the stretches inside
// the shape are walked the same way, and those between the shape and the
// container, where the foam is squashed, by shellStretch.
void traceContained(vec2 tb, float cone, int layers) {
    float t = max(tb.x, 0.0);
    float eps = 1e-3;
    for (int iv = 0; iv < 6; iv++) {
        // Into the container. A ray that only grazes it is not in it: it
        // goes on, so a run of grazing points does not use up the stretches.
        float g = clipField(t);
        for (int i = 0; i < 64 && g > 0.0 && t <= tb.y; i++) {
            t += max(g, eps);
            g = clipField(t);
        }
        if (t > tb.y || films >= layers) {
            return;
        }
        if (g > 0.0) {
            // Out of steps: go on from here.
            continue;
        }
        for (int k = 0; k < 4; k++) {
#if CONTAIN == 2
            if (!shellStretch(t, tb.y, cone, layers)) {
                break;
            }
#endif
            // Through the container (WALL_ON) or the shape, to where the
            // ray leaves it.
            float off = WALL_ON ? clipOff : 0.0;
            float a = t;
            float tp = t;
            float gp = 0.0;
            g = sdf3(ro + rd * t).x - off;
            float b = tb.y;
            for (int i = 0; i < 96; i++) {
                tp = t;
                gp = g;
                t += max(-g, 2.0 * eps);
                if (t >= tb.y) {
                    break;
                }
                g = sdf3(ro + rd * t).x - off;
                cost += 1.0;
                if (g > 0.0) {
                    b = gp < 0.0 ? tp + (t - tp) * gp / (gp - g) : tp;
                    break;
                }
            }
            // Inside the shape: the fill.
            fillOn = fillG > 0.0;
            if (fillOn) {
                fillT0 = a;
                fillDt = max(b - a, 1e-5) / float(FILL_STEPS);
                for (int i = 0; i <= FILL_STEPS; i++) {
                    fillKnot[i] = sd2((ro + rd * (a + fillDt * float(i))).xy);
                }
                cost += float(FILL_STEPS + 1);
            }
            walkGrid(a, b, cone, layers);
            fillOn = false;
            t = b + (WALL_ON ? 4.0 * eps : 1e-4);
            if (WALL_ON || films >= layers || t >= tb.y) {
                break;
            }
        }
        if (films >= layers || t >= tb.y) {
            return;
        }
        t += 4.0 * eps;
    }
}

void traceSpheres(vec2 tb, float cone, int layers) {
    float t = max(tb.x, 0.0);
    bool walking = false;
    ivec3 C = ivec3(0);
    vec3 tMax = vec3(0.0);
    vec3 tDelta = vec3(0.0);
    ivec3 stp = ivec3(0);
    for (int i = 0; i < 256; i++) {
        if (t > tb.y || films >= layers || through < 0.02) {
            break;
        }
        if (!walking) {
            // Empty space: no sphere reaches farther than this out of the
            // shape.
            float s = sdf3(ro + rd * t).x;
            cost += 1.0;
            if (s > reachMax + 1e-4) {
                t += s - reachMax;
                continue;
            }
            vec3 q = (ro + rd * t - gridOrigin) / gridCell;
            C = clamp(ivec3(floor(q)), ivec3(0), gridDims - 1);
            vec3 d = mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
            vec3 inv = 1.0 / d;
            stp = ivec3(sign(d));
            tMax = t + (vec3(C) + step(0.0, d) - q) * gridCell * inv;
            tDelta = gridCell * abs(inv);
            sphereInside = false;
            walking = true;
        }
        float tn = min(tMax.x, min(tMax.y, tMax.z));
        float te = min(tn, tb.y);
        loadCell(C, t, te, false);
        sphereSegment(t, te, cone, layers, false);
        t = tn;
        int axis = tMax.x <= tMax.y && tMax.x <= tMax.z ? 0 : (tMax.y <= tMax.z ? 1 : 2);
        C[axis] += stp[axis];
        tMax[axis] += tDelta[axis];
        if (C[axis] < 0 || C[axis] >= gridDims[axis]) {
            // Out of the grid: no sphere is left ahead.
            break;
        }
        // Out of every sphere and well away from the shape: back to
        // tracing, which skips the empty cells faster than stepping.
        if (!sphereInside) {
            float s = sdf3(ro + rd * t).x;
            cost += 1.0;
            if (s > reachMax + 2.0 * gridCell) {
                walking = false;
            }
        }
    }
}

// Slab test against the shape's bounding box. x = near, y = far.
vec2 boundsHit() {
    vec3 b = vec3(shapeHalf, halfDepth) + boxMargin + 0.01;
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-b - ro) * inv;
    vec3 t1 = (b - ro) * inv;
    vec3 lo = min(t0, t1);
    vec3 hi = max(t0, t1);
    return vec2(max(max(lo.x, lo.y), lo.z), min(min(hi.x, hi.y), hi.z));
}

void main() {
    vec2 px = uv * bufferPx;
    vec3 rdV = normalize(vec3((px - principalPx) / focalPx, -1.0));
    vec3 roV = vec3(eye, camDist);
    // viewRot maps object to view; its transpose maps back.
    ro = roV * viewRot;
    rd = rdV * viewRot;

    vec3 miss = vec3(0.0);
    float missA = 0.0;
    if (backdropVisible > 0.5 && backdropMode != 0) {
        miss = radiance(roV, rdV, 0.0);
        missA = 1.0;
    }

    vec2 tb = boundsHit();
    // Every sphere, drift included, is inside the grid's box.
    vec3 gInv = 1.0 / mix(rd, vec3(1e-7), lessThan(abs(rd), vec3(1e-7)));
    vec3 g0 = (gridOrigin - ro) * gInv;
    vec3 g1 = (gridOrigin + vec3(gridDims) * gridCell - ro) * gInv;
    vec3 gLo = min(g0, g1);
    vec3 gHi = max(g0, g1);
    tb.x = max(tb.x, max(max(gLo.x, gLo.y), gLo.z));
    tb.y = min(tb.y, min(min(gHi.x, gHi.y), gHi.z));
    if (tb.x > tb.y || tb.y < 0.0) {
        outColor = debugView != 0 ? (debugView == 3 ? vec4(0.0, 0.0, 0.0, 1.0) : heat(0.0)) : vec4(miss, missA);
        return;
    }
    // Radius of the pixel's cone per unit of distance.
    float cone = pixelSize / focalPx;
    pixCone = cone;
#if CONTAIN == 0
    traceSpheres(tb, cone, clamp(maxLayers, 1, MAX_LAYERS));
#else
    traceContained(tb, cone, clamp(maxLayers, 1, MAX_LAYERS));
#endif
    shadeFilms();

    if (debugView == 1) {
        outColor = heat(cost);
        return;
    }
    if (debugView == 2) {
        outColor = heat(float(films) * 40.0);
        return;
    }
    if (debugView == 3) {
        vec3 c = firstId < 0.0
            ? vec3(0.0)
            : 0.25 + 0.75 * hash4(uvec3(uint(firstId * 7.0 + 3.0), 11u, 3u)).rgb;
        outColor = vec4(c, 1.0);
        return;
    }
    // What is behind: the backdrop when it is drawn, otherwise the page,
    // dimmed by what the films take from it.
    if (missA > 0.0) {
        outColor = vec4(col + remain * miss, 1.0);
    } else {
        float a = 1.0 - (remain.r + remain.g + remain.b) / 3.0;
        outColor = vec4(col, a);
    }
}
`,ke=new Map,Ae=class{params;#e;#t=new v({longSide:Te,onRead:e=>this.#F(e.pixels,e.width,e.height,e.aspect)});#n=null;#r=null;#i=null;#a=null;#o=new A;#s=null;#c=null;#l=null;#u=null;#d=null;#f=null;#p=null;#m=!1;#h=null;#g=null;#_=0;#v=0;#y=new O(j);#b=0;#x=0;#S=0;#C=new p(ye);#w=null;constructor(e={},t={}){this.params={...ye,...e},this.#e=t.still??!1}setParams(e){Object.assign(this.params,e)}init(e){this.#s=e.gl,this.#w=e.onContextRestored(()=>{this.#t.contextRestored(),this.#s=e.gl,this.#c=null,this.#l=null,this.#u=null,this.#d=null,this.#f=null,this.#g=null,this.#y.contextRestored(),this.#r=this.#r??this.#a??this.#i})}outputRect(e){return l(this.params.pad,e)}render(e){if(this.#t.phase===`idle`&&this.#n!==null&&_(this.params.sourceChannel)!==this.#n&&this.#t.refresh(),this.#t.update(e),this.#r&&(this.#a=this.#r,this.#r=null,this.#v++),this.#y.update(e,this.params),!this.#e){let t=Math.min(e.deltaTime,.1),n=this.params,r=ye;this.#b+=t,this.#x+=t*Math.max(Q(n.speed,r.speed),0),this.#S+=t*Q(n.swirlSpeed,r.swirlSpeed)}let t=this.#C.update(this.params,{time:this.#b,dt:this.#e?0:e.deltaTime,dims:e.dims,outputRect:l(this.params.pad,e.dims),mouse:e.mouse,mouseViewport:e.mouseViewport,pixelRatio:e.pixelRatio,live:!this.#e,tilt:this.params.pointer===`tilt`}),n=this.#P(e,t);this.#o.output(e,n,{pad:this.params.pad,antialias:this.params.antialias,raw:this.#T()!==0})}#T(){return be[this.params.debug]??0}#E(){let e=this.params,t=ye,n=$(e.depth/2,.005,1,t.depth/2),r=Math.max(Q(e.cellSize,t.cellSize),.02);return{halfDepth:n,cellSize:r,fill:{halfDepth:n,bevel:$(e.bevel,0,n,Math.min(t.bevel,n)),cellSize:r,roundness:$(e.roundness,0,1,t.roundness),cellSizeRandomness:$(e.cellSizeRandomness,0,1,t.cellSizeRandomness),seed:D(e.seed,0,2147483647,t.seed),minSize:$(e.minSize,.05,1,t.minSize)},wobble:$(e.wobble,0,Ce,t.wobble),containment:$(e.containment,0,1,t.containment)}}#D(e){let t=this.params,n=ye,r=$(t.borderHighlight,0,2,n.borderHighlight),i=$(t.borderWidth,0,.5,n.borderWidth);return{borderWidth:i*e,borderHighlight:r,borderThickness:i*ve}}#O(e){let t=this.#h;t&&(this.#h=null,t.version===this.#v&&!this.#k(e,t)&&(this.#g=t.key));let r=this.#a??this.#i;if(!r)return null;let i=this.#E(),a=this.#v,o=`${a}|${JSON.stringify(i.fill)}|${i.wobble}|${i.containment}`;if(!this.#m&&this.#f?.key!==o&&this.#g!==o){this.#m=!0;let e=this.#_;this.#p??=new n(B,X),this.#p.run(`buildFoam`,{shape:{sdf:r.sdf,sdfW:r.sdfW,sdfH:r.sdfH,sdfRect:r.sdfRect},shapeKey:a,fill:i.fill,wobble:i.wobble,containment:i.containment}).then(t=>{e===this.#_&&(this.#m=!1,this.#h={key:o,version:a,data:t,params:i})},t=>{e===this.#_&&(this.#m=!1,this.#g=o,console.warn(`[VFX-JS] BubbleEffect could not place its bubbles:`,t))})}return this.#f}#k(e,t){let n=e.gl,r=this.#a,i=null;if(r&&(i=T(n,r.sdfW,r.sdfH,r.sdf),e.resetState(),!i))return!1;let a=this.#A(e,t.key,t.data,t.params);return a?(this.#N(),this.#f=a,r&&i&&(n.deleteTexture(this.#c),this.#c=i,this.#u=e.wrapTexture(i,{size:[r.sdfW,r.sdfH],filter:`linear`,wrap:`clamp`}),this.#i=r,this.#a=null),!0):(n.deleteTexture(i),!1)}#A(e,t,n,r){let{grid:i}=n,a=n.edgeGrid??i,o=e.gl,s=[],c=[],l=[[i.sphereData,i.sphereTexH],[i.cellData,i.cellTexH],[i.index,i.indexTexH]];a!==i&&l.push([a.cellData,a.cellTexH],[a.index,a.indexTexH]);for(let[t,n]of l){let r=_e(o,V,n,t);if(!r)break;s.push(r),c.push(e.wrapTexture(r,{size:[V,n],filter:`nearest`,wrap:`clamp`}))}if(e.resetState(),c.length<l.length){for(let e of s)o.deleteTexture(e);return null}return{...n,key:t,raw:s,sphereTex:c[0],cellTex:c[1],indexTex:c[2],edgeCellTex:c[a===i?1:3],edgeIndexTex:c[a===i?2:4],params:r,moved:i.sphereData.slice(),movedKey:``}}#j(e,t){let n=t.params.wobble,r=`${this.#x}`;if(t.movedKey===r)return;t.movedKey=r;let i=t.grid.sphereData,a=t.moved,o=t.drift,s=Math.PI*2*this.#x;for(let e=0;e<t.grid.count;e++){let t=n*i[e*4+3]*.5774;for(let n=0;n<3;n++){let r=s*o[e*6+n]+Math.PI*2*o[e*6+3+n];a[e*4+n]=i[e*4+n]+t*Math.sin(r)}}let c=e.gl;c.pixelStorei(c.UNPACK_FLIP_Y_WEBGL,!1),c.pixelStorei(c.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),c.pixelStorei(c.UNPACK_ALIGNMENT,4),c.bindTexture(c.TEXTURE_2D,t.raw[0]),c.texSubImage2D(c.TEXTURE_2D,0,0,0,V,t.grid.sphereTexH,c.RGBA,c.FLOAT,a),c.bindTexture(c.TEXTURE_2D,null),e.resetState()}#M(e){if(!this.#d){let t=T(e.gl,256,64,oe());e.resetState(),t&&(this.#l=t,this.#d=e.wrapTexture(t,{size:[256,64],filter:`linear`,wrap:`clamp`}))}return this.#d}#N(){let e=this.#f;if(e&&this.#s)for(let t of e.raw)this.#s.deleteTexture(t);this.#f=null}#P(e,t){let n=this.#O(e),r=this.#i,i=this.#u,a=this.#M(e);if(!n||!r||!i||!a)return null;let o=this.params,s=ye,c=this.#o.scene(e,o.pad,o.resolution),[,,u,d]=l(o.pad,e.dims);if(!c||u<=0||d<=0)return null;let f=this.#b,p=n.params,m=n.fill.cellSize,h=n.grid,g=0;for(let e=0;e<h.count;e++)g=Math.max(g,h.spheres[e*4+3]);let _=n.fill.reach+n.grow+p.wobble*g+.02*m;this.#j(e,n);let v=p.containment,y=v<=0?0:v>=.995?1:2,b=this.#y.uniforms(o,f,p.halfDepth+_,i);return e.draw({frag:he(y,C(o.backdrop)),uniforms:{sdfTex:i,sdfRect:r.sdfRect,halfDepth:p.halfDepth,rounding:p.fill.bevel??0,shapeHalf:r.shapeHalf,boxMargin:_,viewRot:t.viewRot,camDist:t.camDist,focalPx:t.focalPx,eye:[t.eye[0],t.eye[1]],principalPx:t.principalPx,bufferPx:[u,d],pixelSize:u/c.width,maxLayers:D(o.maxLayers,1,xe,s.maxLayers),seed:p.fill.seed,cellSize:m,sphereTex:n.sphereTex,cellTex:n.cellTex,indexTex:n.indexTex,gridOrigin:h.origin,gridCell:h.cell,gridDims:h.dims,edgeCellTex:n.edgeCellTex,edgeIndexTex:n.edgeIndexTex,edgeOrigin:(n.edgeGrid??h).origin,edgeCell:(n.edgeGrid??h).cell,edgeDims:(n.edgeGrid??h).dims,reachMax:_,clipOff:(1-v)*_,warpK:v/Math.max(1-v,.001),fillG:n.fillG,fillDepth:Se*m,filmLut:a,iridescence:$(o.iridescence,0,1,s.iridescence),thickness:Math.max(Q(o.thickness,s.thickness),0),thicknessVariation:$(o.thicknessVariation,0,1,s.thicknessVariation),drain:$(o.drain,0,1,s.drain),swirlScale:Math.max(Q(o.swirlScale,s.swirlScale),0),swirlOffset:this.#S,reflection:Math.max(Q(o.reflection,s.reflection),0),backdropAround:+!!o.backdropAround,rimCos:we*(1-$(o.rim,0,1,s.rim)),tint:ge(o.tint,s.tint),tintStrength:$(o.tintStrength,0,1,s.tintStrength),opacity:$(o.opacity,0,1,s.opacity),bodyColor:ge(o.color,s.color),...this.#D(m),...b,debugView:this.#T()},target:c}),c}refresh(){this.#t.refresh()}#F(e,t,n,r){let i=_(this.params.sourceChannel),a=f(e,t,n,i,this.params.depth/2,r,Ee,De);return a?(this.#r=a,this.#n=i,!0):!1}dispose(){this.#C.dispose(),this.#w?.(),this.#w=null,this.#s?.deleteTexture(this.#c),this.#s?.deleteTexture(this.#l),this.#c=null,this.#l=null,this.#u=null,this.#d=null,this.#N(),this.#p?.dispose(),this.#p=null,this.#_++,this.#m=!1,this.#h=null,this.#g=null,this.#y.dispose(this.#s),this.#s=null,this.#o.dispose(),this.#i=null,this.#a=null,this.#r=null,this.#t.reset(),this.#n=null}}})))()}function Me(e){let t=Fe[e];if(`src`in t){let e=document.createElement(`img`);return e.style.cssText=t.style,e.src=t.src,e}let n=document.createElement(t.tag);return n.style.cssText=t.style,n.textContent=t.text,n}function Ne(e){return e instanceof HTMLImageElement?new Promise((t,n)=>{e.complete&&e.naturalWidth>0?t():(e.addEventListener(`load`,()=>t(),{once:!0}),e.addEventListener(`error`,()=>n(Error(`load failed`)),{once:!0}))}):document.fonts.ready.then(()=>{})}var Pe,Fe,Ie,Le,Re,ze,Be,Ve,He;function Ue(){return(Ue=e((()=>{je(),k(),I(),z(),c(),g(),Pe=`data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22220%22%20viewBox%3D%220%200%20400%20220%22%3E%3Cg%20fill%3D%22%23fff%22%3E%3Cellipse%20cx%3D%22200%22%20cy%3D%22140%22%20rx%3D%22180%22%20ry%3D%2270%22%2F%3E%3Ccircle%20cx%3D%22120%22%20cy%3D%22105%22%20r%3D%2270%22%2F%3E%3Ccircle%20cx%3D%22215%22%20cy%3D%2285%22%20r%3D%2280%22%2F%3E%3Ccircle%20cx%3D%22305%22%20cy%3D%22110%22%20r%3D%2265%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E`,Fe={"VFX-JS logo":{src:s,style:`width: min(80vw, 960px)`},amagi:{src:L,style:`height: min(70vh, 640px)`},cloud:{src:Pe,style:`width: min(80vw, 900px)`},"HTML text":{tag:`h1`,text:`Bubbles`,style:`margin: 0; padding: 0 0.1em; color: #fff; font: 900 min(20vw, 260px) / 1.1 system-ui, sans-serif; letter-spacing: -0.02em`}},Ie=[`none`,`stripes`,`grid`,`marble`,`flow`],Le={"image: jellyfish":R},Re=[...Ie,...Object.keys(Le)],ze=Object.keys(j),Be={title:`Effect/Bubble`,parameters:{layout:`fullscreen`,controls:{disable:!0}},render:e=>{let t=document.createElement(`div`);t.style.cssText=`position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: ${e.background??`#000`}`;let n=y(),r=h(),{backdrop:i,backdropColors:a,...o}=new Ae({drag:!0,...e.params}).params,s=e.backdrop??`none`,c=a,l=()=>({...o,backdrop:Le[s]??s,backdropColors:c}),u=e.source,d=null,f=null,p=0,m=Promise.resolve(),g=()=>{f&&Object.assign(f.params,l())},_=async()=>{let e=++p,i=d,a=Me(u);d=a,i?(i.replaceWith(a),await m.catch(()=>{}),n.remove(i)):t.appendChild(a);try{await Ne(a),await new Promise(e=>requestAnimationFrame(e))}catch(e){console.error(e);return}e===p&&(f=new Ae(l(),{still:r}),m=n.add(a,{effect:f}),await m)};return _().then(()=>{r||b(`Bubble`,o,g,{source:{keys:Object.keys(Fe),value:u,onChange:e=>{u=e,_()}},backdrop:{keys:Re,value:s,onChange:e=>{s=e,g()}},palette:{keys:ze,value:typeof c==`string`?c:`mono`,onChange:e=>{c=e,g()}}})}),t}},Ve={args:{source:`VFX-JS logo`,params:{containment:.5,minSize:.2}}},He=[`bubble`],Ve.parameters={...Ve.parameters,docs:{...Ve.parameters?.docs,source:{originalSource:`{
  args: {
    source: "VFX-JS logo",
    params: {
      containment: 0.5,
      minSize: 0.2
    }
  }
}`,...Ve.parameters?.docs?.source}}}})))()}Ue();export{He as __namedExportsOrder,Ve as bubble,Be as default};