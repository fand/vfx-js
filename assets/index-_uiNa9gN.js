var ie=Object.defineProperty;var se=(d,l,r)=>l in d?ie(d,l,{enumerable:!0,configurable:!0,writable:!0,value:r}):d[l]=r;var Z=(d,l,r)=>se(d,typeof l!="symbol"?l+"":l,r);import"./modulepreload-polyfill-B5Qt9EMX.js";import{V as N}from"./vfx-Bk5ysT1u.js";var V=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};function oe(d){return d&&d.__esModule&&Object.prototype.hasOwnProperty.call(d,"default")?d.default:d}var U={exports:{}},J;function ue(){return J||(J=1,function(d){var l=typeof window<"u"?window:typeof WorkerGlobalScope<"u"&&self instanceof WorkerGlobalScope?self:{};/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */var r=function(c){var f=/(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i,b=0,w={},s={manual:c.Prism&&c.Prism.manual,disableWorkerMessageHandler:c.Prism&&c.Prism.disableWorkerMessageHandler,util:{encode:function t(e){return e instanceof p?new p(e.type,t(e.content),e.alias):Array.isArray(e)?e.map(t):e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\u00a0/g," ")},type:function(t){return Object.prototype.toString.call(t).slice(8,-1)},objId:function(t){return t.__id||Object.defineProperty(t,"__id",{value:++b}),t.__id},clone:function t(e,a){a=a||{};var n,i;switch(s.util.type(e)){case"Object":if(i=s.util.objId(e),a[i])return a[i];n={},a[i]=n;for(var u in e)e.hasOwnProperty(u)&&(n[u]=t(e[u],a));return n;case"Array":return i=s.util.objId(e),a[i]?a[i]:(n=[],a[i]=n,e.forEach(function(g,o){n[o]=t(g,a)}),n);default:return e}},getLanguage:function(t){for(;t;){var e=f.exec(t.className);if(e)return e[1].toLowerCase();t=t.parentElement}return"none"},setLanguage:function(t,e){t.className=t.className.replace(RegExp(f,"gi"),""),t.classList.add("language-"+e)},currentScript:function(){if(typeof document>"u")return null;if(document.currentScript&&document.currentScript.tagName==="SCRIPT")return document.currentScript;try{throw new Error}catch(n){var t=(/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(n.stack)||[])[1];if(t){var e=document.getElementsByTagName("script");for(var a in e)if(e[a].src==t)return e[a]}return null}},isActive:function(t,e,a){for(var n="no-"+e;t;){var i=t.classList;if(i.contains(e))return!0;if(i.contains(n))return!1;t=t.parentElement}return!!a}},languages:{plain:w,plaintext:w,text:w,txt:w,extend:function(t,e){var a=s.util.clone(s.languages[t]);for(var n in e)a[n]=e[n];return a},insertBefore:function(t,e,a,n){n=n||s.languages;var i=n[t],u={};for(var g in i)if(i.hasOwnProperty(g)){if(g==e)for(var o in a)a.hasOwnProperty(o)&&(u[o]=a[o]);a.hasOwnProperty(g)||(u[g]=i[g])}var m=n[t];return n[t]=u,s.languages.DFS(s.languages,function(F,T){T===m&&F!=t&&(this[F]=u)}),u},DFS:function t(e,a,n,i){i=i||{};var u=s.util.objId;for(var g in e)if(e.hasOwnProperty(g)){a.call(e,g,e[g],n||g);var o=e[g],m=s.util.type(o);m==="Object"&&!i[u(o)]?(i[u(o)]=!0,t(o,a,null,i)):m==="Array"&&!i[u(o)]&&(i[u(o)]=!0,t(o,a,g,i))}}},plugins:{},highlightAll:function(t,e){s.highlightAllUnder(document,t,e)},highlightAllUnder:function(t,e,a){var n={callback:a,container:t,selector:'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'};s.hooks.run("before-highlightall",n),n.elements=Array.prototype.slice.apply(n.container.querySelectorAll(n.selector)),s.hooks.run("before-all-elements-highlight",n);for(var i=0,u;u=n.elements[i++];)s.highlightElement(u,e===!0,n.callback)},highlightElement:function(t,e,a){var n=s.util.getLanguage(t),i=s.languages[n];s.util.setLanguage(t,n);var u=t.parentElement;u&&u.nodeName.toLowerCase()==="pre"&&s.util.setLanguage(u,n);var g=t.textContent,o={element:t,language:n,grammar:i,code:g};function m(T){o.highlightedCode=T,s.hooks.run("before-insert",o),o.element.innerHTML=o.highlightedCode,s.hooks.run("after-highlight",o),s.hooks.run("complete",o),a&&a.call(o.element)}if(s.hooks.run("before-sanity-check",o),u=o.element.parentElement,u&&u.nodeName.toLowerCase()==="pre"&&!u.hasAttribute("tabindex")&&u.setAttribute("tabindex","0"),!o.code){s.hooks.run("complete",o),a&&a.call(o.element);return}if(s.hooks.run("before-highlight",o),!o.grammar){m(s.util.encode(o.code));return}if(e&&c.Worker){var F=new Worker(s.filename);F.onmessage=function(T){m(T.data)},F.postMessage(JSON.stringify({language:o.language,code:o.code,immediateClose:!0}))}else m(s.highlight(o.code,o.grammar,o.language))},highlight:function(t,e,a){var n={code:t,grammar:e,language:a};if(s.hooks.run("before-tokenize",n),!n.grammar)throw new Error('The language "'+n.language+'" has no grammar.');return n.tokens=s.tokenize(n.code,n.grammar),s.hooks.run("after-tokenize",n),p.stringify(s.util.encode(n.tokens),n.language)},tokenize:function(t,e){var a=e.rest;if(a){for(var n in a)e[n]=a[n];delete e.rest}var i=new C;return M(i,i.head,t),P(t,i,e,i.head,0),y(i)},hooks:{all:{},add:function(t,e){var a=s.hooks.all;a[t]=a[t]||[],a[t].push(e)},run:function(t,e){var a=s.hooks.all[t];if(!(!a||!a.length))for(var n=0,i;i=a[n++];)i(e)}},Token:p};c.Prism=s;function p(t,e,a,n){this.type=t,this.content=e,this.alias=a,this.length=(n||"").length|0}p.stringify=function t(e,a){if(typeof e=="string")return e;if(Array.isArray(e)){var n="";return e.forEach(function(m){n+=t(m,a)}),n}var i={type:e.type,content:t(e.content,a),tag:"span",classes:["token",e.type],attributes:{},language:a},u=e.alias;u&&(Array.isArray(u)?Array.prototype.push.apply(i.classes,u):i.classes.push(u)),s.hooks.run("wrap",i);var g="";for(var o in i.attributes)g+=" "+o+'="'+(i.attributes[o]||"").replace(/"/g,"&quot;")+'"';return"<"+i.tag+' class="'+i.classes.join(" ")+'"'+g+">"+i.content+"</"+i.tag+">"};function $(t,e,a,n){t.lastIndex=e;var i=t.exec(a);if(i&&n&&i[1]){var u=i[1].length;i.index+=u,i[0]=i[0].slice(u)}return i}function P(t,e,a,n,i,u){for(var g in a)if(!(!a.hasOwnProperty(g)||!a[g])){var o=a[g];o=Array.isArray(o)?o:[o];for(var m=0;m<o.length;++m){if(u&&u.cause==g+","+m)return;var F=o[m],T=F.inside,K=!!F.lookbehind,W=!!F.greedy,te=F.alias;if(W&&!F.pattern.global){var re=F.pattern.toString().match(/[imsuy]*$/)[0];F.pattern=RegExp(F.pattern.source,re+"g")}for(var X=F.pattern||F,A=n.next,S=i;A!==e.tail&&!(u&&S>=u.reach);S+=A.value.length,A=A.next){var O=A.value;if(e.length>t.length)return;if(!(O instanceof p)){var I=1,k;if(W){if(k=$(X,S,t,K),!k||k.index>=t.length)break;var R=k.index,ae=k.index+k[0].length,_=S;for(_+=A.value.length;R>=_;)A=A.next,_+=A.value.length;if(_-=A.value.length,S=_,A.value instanceof p)continue;for(var z=A;z!==e.tail&&(_<ae||typeof z.value=="string");z=z.next)I++,_+=z.value.length;I--,O=t.slice(S,_),k.index-=S}else if(k=$(X,0,O,K),!k)continue;var R=k.index,q=k[0],B=O.slice(0,R),Y=O.slice(R+q.length),G=S+O.length;u&&G>u.reach&&(u.reach=G);var j=A.prev;B&&(j=M(e,j,B),S+=B.length),D(e,j,I);var ne=new p(g,T?s.tokenize(q,T):q,te,q);if(A=M(e,j,ne),Y&&M(e,A,Y),I>1){var H={cause:g+","+m,reach:G};P(t,e,a,A.prev,S,H),u&&H.reach>u.reach&&(u.reach=H.reach)}}}}}}function C(){var t={value:null,prev:null,next:null},e={value:null,prev:t,next:null};t.next=e,this.head=t,this.tail=e,this.length=0}function M(t,e,a){var n=e.next,i={value:a,prev:e,next:n};return e.next=i,n.prev=i,t.length++,i}function D(t,e,a){for(var n=e.next,i=0;i<a&&n!==t.tail;i++)n=n.next;e.next=n,n.prev=e,t.length-=i}function y(t){for(var e=[],a=t.head.next;a!==t.tail;)e.push(a.value),a=a.next;return e}if(!c.document)return c.addEventListener&&(s.disableWorkerMessageHandler||c.addEventListener("message",function(t){var e=JSON.parse(t.data),a=e.language,n=e.code,i=e.immediateClose;c.postMessage(s.highlight(n,s.languages[a],a)),i&&c.close()},!1)),s;var h=s.util.currentScript();h&&(s.filename=h.src,h.hasAttribute("data-manual")&&(s.manual=!0));function v(){s.manual||s.highlightAll()}if(!s.manual){var x=document.readyState;x==="loading"||x==="interactive"&&h&&h.defer?document.addEventListener("DOMContentLoaded",v):window.requestAnimationFrame?window.requestAnimationFrame(v):window.setTimeout(v,16)}return s}(l);d.exports&&(d.exports=r),typeof V<"u"&&(V.Prism=r),r.languages.markup={comment:{pattern:/<!--(?:(?!<!--)[\s\S])*?-->/,greedy:!0},prolog:{pattern:/<\?[\s\S]+?\?>/,greedy:!0},doctype:{pattern:/<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,greedy:!0,inside:{"internal-subset":{pattern:/(^[^\[]*\[)[\s\S]+(?=\]>$)/,lookbehind:!0,greedy:!0,inside:null},string:{pattern:/"[^"]*"|'[^']*'/,greedy:!0},punctuation:/^<!|>$|[[\]]/,"doctype-tag":/^DOCTYPE/i,name:/[^\s<>'"]+/}},cdata:{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,greedy:!0},tag:{pattern:/<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,greedy:!0,inside:{tag:{pattern:/^<\/?[^\s>\/]+/,inside:{punctuation:/^<\/?/,namespace:/^[^\s>\/:]+:/}},"special-attr":[],"attr-value":{pattern:/=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,inside:{punctuation:[{pattern:/^=/,alias:"attr-equals"},{pattern:/^(\s*)["']|["']$/,lookbehind:!0}]}},punctuation:/\/?>/,"attr-name":{pattern:/[^\s>\/]+/,inside:{namespace:/^[^\s>\/:]+:/}}}},entity:[{pattern:/&[\da-z]{1,8};/i,alias:"named-entity"},/&#x?[\da-f]{1,8};/i]},r.languages.markup.tag.inside["attr-value"].inside.entity=r.languages.markup.entity,r.languages.markup.doctype.inside["internal-subset"].inside=r.languages.markup,r.hooks.add("wrap",function(c){c.type==="entity"&&(c.attributes.title=c.content.replace(/&amp;/,"&"))}),Object.defineProperty(r.languages.markup.tag,"addInlined",{value:function(f,b){var w={};w["language-"+b]={pattern:/(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,lookbehind:!0,inside:r.languages[b]},w.cdata=/^<!\[CDATA\[|\]\]>$/i;var s={"included-cdata":{pattern:/<!\[CDATA\[[\s\S]*?\]\]>/i,inside:w}};s["language-"+b]={pattern:/[\s\S]+/,inside:r.languages[b]};var p={};p[f]={pattern:RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g,function(){return f}),"i"),lookbehind:!0,greedy:!0,inside:s},r.languages.insertBefore("markup","cdata",p)}}),Object.defineProperty(r.languages.markup.tag,"addAttribute",{value:function(c,f){r.languages.markup.tag.inside["special-attr"].push({pattern:RegExp(/(^|["'\s])/.source+"(?:"+c+")"+/\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,"i"),lookbehind:!0,inside:{"attr-name":/^[^\s=]+/,"attr-value":{pattern:/=[\s\S]+/,inside:{value:{pattern:/(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,lookbehind:!0,alias:[f,"language-"+f],inside:r.languages[f]},punctuation:[{pattern:/^=/,alias:"attr-equals"},/"|'/]}}}})}}),r.languages.html=r.languages.markup,r.languages.mathml=r.languages.markup,r.languages.svg=r.languages.markup,r.languages.xml=r.languages.extend("markup",{}),r.languages.ssml=r.languages.xml,r.languages.atom=r.languages.xml,r.languages.rss=r.languages.xml,function(c){var f=/(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;c.languages.css={comment:/\/\*[\s\S]*?\*\//,atrule:{pattern:RegExp("@[\\w-](?:"+/[^;{\s"']|\s+(?!\s)/.source+"|"+f.source+")*?"+/(?:;|(?=\s*\{))/.source),inside:{rule:/^@[\w-]+/,"selector-function-argument":{pattern:/(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,lookbehind:!0,alias:"selector"},keyword:{pattern:/(^|[^\w-])(?:and|not|only|or)(?![\w-])/,lookbehind:!0}}},url:{pattern:RegExp("\\burl\\((?:"+f.source+"|"+/(?:[^\\\r\n()"']|\\[\s\S])*/.source+")\\)","i"),greedy:!0,inside:{function:/^url/i,punctuation:/^\(|\)$/,string:{pattern:RegExp("^"+f.source+"$"),alias:"url"}}},selector:{pattern:RegExp(`(^|[{}\\s])[^{}\\s](?:[^{};"'\\s]|\\s+(?![\\s{])|`+f.source+")*(?=\\s*\\{)"),lookbehind:!0},string:{pattern:f,greedy:!0},property:{pattern:/(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,lookbehind:!0},important:/!important\b/i,function:{pattern:/(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,lookbehind:!0},punctuation:/[(){};:,]/},c.languages.css.atrule.inside.rest=c.languages.css;var b=c.languages.markup;b&&(b.tag.addInlined("style","css"),b.tag.addAttribute("style","css"))}(r),r.languages.clike={comment:[{pattern:/(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,lookbehind:!0,greedy:!0},{pattern:/(^|[^\\:])\/\/.*/,lookbehind:!0,greedy:!0}],string:{pattern:/(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,greedy:!0},"class-name":{pattern:/(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,lookbehind:!0,inside:{punctuation:/[.\\]/}},keyword:/\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,boolean:/\b(?:false|true)\b/,function:/\b\w+(?=\()/,number:/\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,operator:/[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,punctuation:/[{}[\];(),.:]/},r.languages.javascript=r.languages.extend("clike",{"class-name":[r.languages.clike["class-name"],{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,lookbehind:!0}],keyword:[{pattern:/((?:^|\})\s*)catch\b/,lookbehind:!0},{pattern:/(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,lookbehind:!0}],function:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,number:{pattern:RegExp(/(^|[^\w$])/.source+"(?:"+(/NaN|Infinity/.source+"|"+/0[bB][01]+(?:_[01]+)*n?/.source+"|"+/0[oO][0-7]+(?:_[0-7]+)*n?/.source+"|"+/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source+"|"+/\d+(?:_\d+)*n/.source+"|"+/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source)+")"+/(?![\w$])/.source),lookbehind:!0},operator:/--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/}),r.languages.javascript["class-name"][0].pattern=/(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/,r.languages.insertBefore("javascript","keyword",{regex:{pattern:RegExp(/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source+/\//.source+"(?:"+/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source+"|"+/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source+")"+/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source),lookbehind:!0,greedy:!0,inside:{"regex-source":{pattern:/^(\/)[\s\S]+(?=\/[a-z]*$)/,lookbehind:!0,alias:"language-regex",inside:r.languages.regex},"regex-delimiter":/^\/|\/$/,"regex-flags":/^[a-z]+$/}},"function-variable":{pattern:/#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,alias:"function"},parameter:[{pattern:/(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,lookbehind:!0,inside:r.languages.javascript},{pattern:/(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,lookbehind:!0,inside:r.languages.javascript},{pattern:/(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,lookbehind:!0,inside:r.languages.javascript},{pattern:/((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,lookbehind:!0,inside:r.languages.javascript}],constant:/\b[A-Z](?:[A-Z_]|\dx?)*\b/}),r.languages.insertBefore("javascript","string",{hashbang:{pattern:/^#!.*/,greedy:!0,alias:"comment"},"template-string":{pattern:/`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,greedy:!0,inside:{"template-punctuation":{pattern:/^`|`$/,alias:"string"},interpolation:{pattern:/((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,lookbehind:!0,inside:{"interpolation-punctuation":{pattern:/^\$\{|\}$/,alias:"punctuation"},rest:r.languages.javascript}},string:/[\s\S]+/}},"string-property":{pattern:/((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,lookbehind:!0,greedy:!0,alias:"property"}}),r.languages.insertBefore("javascript","operator",{"literal-property":{pattern:/((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,lookbehind:!0,alias:"property"}}),r.languages.markup&&(r.languages.markup.tag.addInlined("script","javascript"),r.languages.markup.tag.addAttribute(/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,"javascript")),r.languages.js=r.languages.javascript,function(){if(typeof r>"u"||typeof document>"u")return;Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector);var c="Loading…",f=function(h,v){return"✖ Error "+h+" while fetching file: "+v},b="✖ Error: File does not exist or is empty",w={js:"javascript",py:"python",rb:"ruby",ps1:"powershell",psm1:"powershell",sh:"bash",bat:"batch",h:"c",tex:"latex"},s="data-src-status",p="loading",$="loaded",P="failed",C="pre[data-src]:not(["+s+'="'+$+'"]):not(['+s+'="'+p+'"])';function M(h,v,x){var t=new XMLHttpRequest;t.open("GET",h,!0),t.onreadystatechange=function(){t.readyState==4&&(t.status<400&&t.responseText?v(t.responseText):t.status>=400?x(f(t.status,t.statusText)):x(b))},t.send(null)}function D(h){var v=/^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(h||"");if(v){var x=Number(v[1]),t=v[2],e=v[3];return t?e?[x,Number(e)]:[x,void 0]:[x,x]}}r.hooks.add("before-highlightall",function(h){h.selector+=", "+C}),r.hooks.add("before-sanity-check",function(h){var v=h.element;if(v.matches(C)){h.code="",v.setAttribute(s,p);var x=v.appendChild(document.createElement("CODE"));x.textContent=c;var t=v.getAttribute("data-src"),e=h.language;if(e==="none"){var a=(/\.(\w+)$/.exec(t)||[,"none"])[1];e=w[a]||a}r.util.setLanguage(x,e),r.util.setLanguage(v,e);var n=r.plugins.autoloader;n&&n.loadLanguages(e),M(t,function(i){v.setAttribute(s,$);var u=D(v.getAttribute("data-range"));if(u){var g=i.split(/\r\n?|\n/g),o=u[0],m=u[1]==null?g.length:u[1];o<0&&(o+=g.length),o=Math.max(0,Math.min(o-1,g.length)),m<0&&(m+=g.length),m=Math.max(0,Math.min(m,g.length)),i=g.slice(o,m).join(`
`),v.hasAttribute("data-start")||v.setAttribute("data-start",String(o+1))}x.textContent=i,r.highlightElement(x)},function(i){v.setAttribute(s,P),x.textContent=i})}}),r.plugins.fileHighlight={highlight:function(v){for(var x=(v||document).querySelectorAll(C),t=0,e;e=x[t++];)r.highlightElement(e)}};var y=!1;r.fileHighlight=function(){y||(console.warn("Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead."),y=!0),r.plugins.fileHighlight.highlight.apply(this,arguments)}}()}(U)),U.exports}var le=ue();const ee=oe(le);ee.manual=!0;ee.highlightAll();function E(d,l){return(l??document).querySelector(d)}function Q(d,l,r){return d*(1-r)+l*r}const L={logo:`
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform float enterTime;
    uniform float leaveTime;
    uniform sampler2D src;

    uniform float delay;
    #define speed 2.0

    out vec4 outColor;

    float nn(float y, float t) {
        float n = (
            sin(y * .07 + t * 8. + sin(y * .5 + t * 10.)) +
            sin(y * .7 + t * 2. + sin(y * .3 + t * 8.)) * .7 +
            sin(y * 1.1 + t * 2.8) * .4
        );
        n += sin(y * 124. + t * 100.7) * sin(y * 877. - t * 38.8) * .3;
        return n;
    }

    vec4 readTex(sampler2D tex, vec2 uv) {
        if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) { return vec4(0); }
        return texture(tex, uv);
    }

    vec4 glitch(vec2 uv) {
        vec2 uvr = uv, uvg = uv, uvb = uv;
        float t = mod(time, 30.);
        float amp = 10. / resolution.x;
        if (abs(nn(uv.y, t)) > 1.) {
            uvr.x += nn(uv.y, t) * amp;
            uvg.x += nn(uv.y, t + 10.) * amp;
            uvb.x += nn(uv.y, t + 20.) * amp;
        }
        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r,
            cg.g,
            cb.b,
            smoothstep(.0, 1., cr.a + cg.a + cb.a)
        );
    }
    vec4 slitscan(vec2 uv) {
        float t = max(enterTime - delay, 0.) * speed;
        if (t <= 0.0) {
            return vec4(0);
        }

        vec2 uvr = uv, uvg = uv, uvb = uv;
        uvr.x = min(uvr.x, t);
        uvg.x = min(uvg.x, max(t - 0.2, 0.));
        uvb.x = min(uvb.x, max(t - 0.4, 0.));

        vec4 cr = readTex(src, uvr);
        vec4 cg = readTex(src, uvg);
        vec4 cb = readTex(src, uvb);

        return vec4(
            cr.r, cg.g, cb.b, (cr.a + cg.a + cb.a) / 1.
        );
    }

    void main (void) {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;
        if (leaveTime > 0.) {
            float t = clamp(leaveTime - 0.5, 0., 1.);
            outColor = glitch(uv) * (1. - t);
        } else if (enterTime < 1.0) {
            outColor = slitscan(uv);
        } else {
            outColor = glitch(uv);
        }
    }
    `,blob:`
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 offset;
    uniform float time;
    uniform sampler2D src;
    out vec4 outColor;

    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hueShift(vec3 rgb, float t) {
        vec3 hsv = rgb2hsv(rgb);
        hsv.x = fract(hsv.x + t);
        return hsv2rgb(hsv);
    }

    vec4 readTex(vec2 uv) {
        vec2 d = 3. / resolution.xy;
        vec4 c = vec4(0);
        c += texture(src, uv + vec2(1, 0) * d);
        c += texture(src, uv - vec2(1, 0) * d);
        c += texture(src, uv + vec2(0, 1) * d);
        c += texture(src, uv - vec2(0, 1) * d);
        return c / 4.;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - offset) / resolution;

        vec4 img = texture(src, uv);

        float gray = dot(img.rgb, vec3(0.2, 0.7, 0.1));

        vec2 d = (uv - .5) * vec2(resolution.x / resolution.y, 1);
        float l = length(d);

        // Colorize
        img.rgb = mix(img.rgb, vec3(.8, .4, .4), sin(gray * 3. - time));

        // Hue shift
        float shift = fract(gray + l - time * 0.2);
        img.rgb = hueShift(img.rgb, shift);

        img.a *= 0.5;
        outColor = img;
    }
    `,canvas:`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
out vec4 outColor;

#define ZOOM(uv, x) ((uv - .5) / x + .5)

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;

    float r = sin(time) * 0.5 + 0.5;

    float l = pow(length(uv - .5), 2.);
    uv = (uv - .5) *  (1. - l * 0.3 * r) + .5;


    float n = 0.02 + r * 0.03;
    vec4 cr = texture(src, ZOOM(uv, 1.00));
    vec4 cg = texture(src, ZOOM(uv, (1. + n)));
    vec4 cb = texture(src, ZOOM(uv, (1. + n * 2.)));

    outColor = vec4(cr.r, cg.g, cb.b, 1);
}
    `,custom:`
precision highp float;
uniform vec2 resolution;
uniform vec2 offset;
uniform float time;
uniform sampler2D src;
uniform float scroll;
out vec4 outColor;

void main (void) {
    vec2 uv = (gl_FragCoord.xy - offset) / resolution;
    uv.x = fract(uv.x + scroll + time * 0.2);
    outColor = texture(src, uv);
}
    `};class ce{constructor(){Z(this,"vfx",new N({pixelRatio:window.devicePixelRatio,zIndex:-1}));Z(this,"vfx2",new N({pixelRatio:1,zIndex:-2,scrollPadding:!1}))}async initBG(){const l=E("#BG");let r=0;function c(b,w,s){return b*(1-s)+w*s}function f(){r=c(r,window.scrollY,.03),l.style.setProperty("transform",`translateY(-${r*.1}px)`),requestAnimationFrame(f)}f(),await this.vfx2.add(l,{shader:L.blob})}async initVFX(){await Promise.all(Array.from(document.querySelectorAll("*[data-shader]")).map(l=>{const r=l.getAttribute("data-shader"),c=l.getAttribute("data-uniforms"),f=c?JSON.parse(c):void 0;return this.vfx.add(l,{shader:r,overflow:Number.parseFloat(l.getAttribute("data-overflow")??"0"),uniforms:f,intersection:{threshold:Number.parseFloat(l.getAttribute("data-threshold")??"0")}})}))}async initDiv(){const l=E("#div");await this.vfx.add(l,{shader:"rgbShift",overflow:100});for(const f of l.querySelectorAll("input,textarea"))f.addEventListener("input",()=>this.vfx.update(l));const r=E("textarea",l);new MutationObserver(()=>this.vfx.update(l)).observe(r,{attributes:!0})}async initCanvas(){const l=document.getElementById("canvas"),r=l.getContext("2d");if(!r)throw"Failed to get the canvas context";const{width:c,height:f}=l.getBoundingClientRect(),b=window.devicePixelRatio??1;l.width=c*b,l.height=f*b,r.scale(b,b);let w=[c/2,f/2],s=w;const p=[s];let $=!1;const P=Date.now();l.addEventListener("mousemove",y=>{$=!0,w=[y.offsetX,y.offsetY]}),l.addEventListener("mouseleave",y=>{$=!1});let C=!1;new IntersectionObserver(y=>{for(const h of y)C=h.intersectionRatio>.1},{threshold:[0,1,.2,.8]}).observe(l);const D=()=>{if(requestAnimationFrame(D),!!C){if(!$){const y=Date.now()/1e3-P;w=[c*.5+Math.sin(y*1.3)*c*.3,f*.5+Math.sin(y*1.7)*f*.3]}s=[Q(s[0],w[0],.1),Q(s[1],w[1],.1)],p.push(s),p.splice(0,p.length-30),r.clearRect(0,0,c,f),r.fillStyle="black",r.fillRect(0,0,c,f),r.fillStyle="white",r.font=`bold ${c*.14}px sans-serif`,r.fillText("HOVER ME",c/2,f/2),r.textBaseline="middle",r.textAlign="center";for(let y=0;y<p.length;y++){const[h,v]=p[y],x=y/p.length*255;r.fillStyle=`rgba(${255-x}, 255, ${x}, ${y/p.length*.5+.5})`,r.beginPath(),r.arc(h,v,y+20,0,2*Math.PI),r.fill()}this.vfx.update(l)}};D(),await this.vfx.add(l,{shader:L.canvas})}async initCustomShader(){const l=E("#custom");await this.vfx.add(l,{shader:L.custom,uniforms:{scroll:()=>window.scrollY/window.innerHeight}})}async initMultipass(){const l=E("#multipass");await this.vfx.add(l,{shader:[{frag:`
                        precision highp float;
                        uniform sampler2D src;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec2 t = 4.0 / resolution;
                            vec4 c = texture(src, uv) * 0.4;
                            c += texture(src, uv + vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv - vec2(t.x, 0)) * 0.15;
                            c += texture(src, uv + vec2(0, t.y)) * 0.15;
                            c += texture(src, uv - vec2(0, t.y)) * 0.15;
                            outColor = c;
                        }
                    `,target:"blur"},{frag:`
                        precision highp float;
                        uniform sampler2D src;
                        uniform sampler2D blur;
                        uniform vec2 resolution;
                        uniform vec2 offset;
                        out vec4 outColor;
                        void main() {
                            vec2 uv = (gl_FragCoord.xy - offset) / resolution;
                            vec4 c = texture(src, uv);
                            vec4 b = texture(blur, uv);
                            outColor = c + b * 0.6;
                        }
                    `}]})}hideMask(){E("#MaskTop").style.setProperty("height","0"),E("#MaskBottom").style.setProperty("opacity","0")}async showLogo(){const l=E("#Logo"),r=E("#LogoTagline");return Promise.all([this.vfx.add(l,{shader:L.logo,overflow:[0,3e3,0,100],uniforms:{delay:0},intersection:{threshold:1}}),this.vfx.add(r,{shader:L.logo,overflow:[0,3e3,0,1e3],uniforms:{delay:.3},intersection:{threshold:1}})])}async showProfile(){const l=E("#profile");await this.vfx.add(l,{shader:L.logo,overflow:[0,3e3,0,2e3],uniforms:{delay:.5},intersection:{rootMargin:[-100,0,-100,0],threshold:1}})}}window.addEventListener("load",async()=>{const d=new ce;await d.initBG(),await Promise.all([await d.initVFX(),d.initDiv(),d.initCanvas(),d.initCustomShader(),d.initMultipass()]),d.hideMask(),setTimeout(()=>{d.showLogo(),d.showProfile()},2e3)});
