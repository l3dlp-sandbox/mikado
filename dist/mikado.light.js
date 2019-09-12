/**
 * Mikado.js v0.0.84 (Light)
 * Copyright 2019 Nextapps GmbH
 * Author: Thomas Wilkerling
 * Licence: Apache-2.0
 * https://github.com/nextapps-de/mikado
 */
(function(){'use strict';var e;e=p.prototype;e._t=function(a,b){a._x!==b&&(a.nodeValue=b,a._x=b);return this};e._h=function(a,b){a._h!==b&&(a.innerHTML=b,a._h=b);return this};e._l=function(a,b){a._c!==b&&(a.className=b,a._c=b,a._cs=null);return this};e._s=function(a,b,d){var c=a._sc||(a._sc={});c[b]!==d&&(c[b]=d,(a._s||(a._s=a.style)).setProperty(b,d),a._cs=null);return this};e._c=function(a,b){a._cs!==b&&((a._s||(a._s=a.style)).cssText=b,a._cs=b,a._sc=null);return this};
e._a=function(a,b,d){var c="_a_"+b;a[c]!==d&&(a.setAttribute(b,d),a[c]=d);return this};var t={store:!1,loose:!0,cache:!0,async:!1,reuse:!0},y={},z={};function p(a,b,d){a.nodeType||(d=b,b=a,a=null);b||(d=a);a?this.mount(a):(this.b=this.f=null,this.length=0);this.init(b,d)}p["new"]=function(a,b,d){return new p(a,b,d)};e=p.prototype;e.mount=function(a){this.b!==a&&(this.b=a,A(this),this.f=a._d||(a._d=B(a.children)),this.length=this.f.length);return this};e.sync=function(){this.b._d=this.f=B(this.b.children);this.length=this.f.length;return this};e.index=function(a){return a._i};
e.node=function(a){return this.f[a]};e.item=function(a){return this.v?this.f[a]._m:this.store[a]};e.init=function(a,b){this.config=b=b?Object.assign({},this.config||t,b):t;if("string"===typeof a)a=z[a];else{var d=a;if(!c){var c=d;d=c.n}z[d]=c}this.cache=b.cache;this.w=b.reuse;this.state=b.state||y;this.m!==a&&(this.m=a.n,this.o=this.g=null,this.l=!0,this.u=this.parse(a),A(this));b.once&&this.render().destroy(!0);return this};function A(a){if(a.b){var b=a.b._t;b!==a.m&&(a.b._t=a.m,b&&a.clear())}}
function B(a){for(var b=a.length,d=Array(b),c=0,f;c<b;c++)f=a[c],f._i=c,d[c]=f;return d}e.create=function(a,b,d){var c=this.u;this.l||this.o(c._p,a,d,b);return c.cloneNode(!0)};e.render=function(a,b){"function"===typeof b&&(b=null);if(this.l)this.f[0]||this.add();else if(a||this.v){var d=a?a.length:this.length;this.w||this.clear(d);for(var c=0;c<d;c++)c<this.length?this.update(this.f[c],a[c],b,c):this.add(a[c],b,this.b);if(d<this.length)for(a=this.f.splice(d),this.length=d,d=a.length,b=0;b<d;b++)this.b.removeChild(a[b])}return this};
e.add=function(a,b,d){var c=this.length;a=this.create(a,b,c);a._i=c;(d||this.b).appendChild(a);this.f[c]=a;this.length++;return this};e.clear=function(a){this.b._d=this.f=a?Array(a):[];this.b.textContent="";this.length=0;this.cache&&(this.b._h=null);return this};e.destroy=function(a){a&&this.unload();this.u=this.o=this.g=this.b=this.f=null};e.append=function(a,b){for(var d=a.length,c=0;c<d;c++)this.add(a[c],b);return this};
e.remove=function(a){var b=a._i;this.f.splice(b,1);this.b.removeChild(a);this.length--;for(a=b;a<this.length;a++)this.f[a]._i=a;return this};e.replace=function(a,b,d,c){"undefined"===typeof c&&(c=a._i);b=this.create(b,d,c);b._i=c;this.b.replaceChild(b,a);this.f[c]=b;return this};e.update=function(a,b,d,c){this.o(a._p||C(this,a),b,c,d);return this};
function C(a,b){for(var d=a.g.length,c={},f=Array(d),l=0;l<d;l++){var q=a.g[l],m=l,g;if(!(g=c[q])){g=b;for(var n="",h=0;h<q.length;h++){var k=q[h];n+=k;c[n]?g=c[n]:(">"===k?g=g.firstElementChild:"+"===k?g=g.nextElementSibling:"|"===k&&(g=g.firstChild),c[n]=g)}}f[m]=g}return b._p=f}var D;
p.prototype.parse=function(a,b,d,c){var f=document.createElement(a.t||"div");b||(b=0,d="&",D="",this.g=[],f._p=c=[]);var l=a.s,q=a.i,m=a.x,g=a.h,n=a.a,h=a.c,k=a.j;a=this.g.length;var u=0,r="";k&&(r+=k+";");h&&("object"===typeof h?(r+=this.cache?"._l(self,"+h[0]+")":"self.className="+h[0]+";",this.g[a]=d,c[a]=f,this.l=!1,u++):f.className=h);if(n){h=Object.keys(n);for(k=0;k<h.length;k++){var w=h[k],x=n[w];if("object"===typeof x){r+=this.cache?"._a(self,'"+w+"',"+x[0]+")":"self.setAttribute('"+w+"',"+
x[0]+");";var v=!0;u++}else f.setAttribute(w,x)}v&&(this.g[a]=d,c[a]=f,this.l=!1)}if(l)if("string"===typeof l)f.style.cssText=l;else if(l.length)r+=this.cache?"._c(self,"+l[0]+")":"self.style.cssText="+l[0]+";",this.g[a]=d,c[a]=f,this.l=!1,u++;else{n=Object.keys(l);for(v=0;v<n.length;v++)if(h=n[v],k=l[h],"object"===typeof k){r+=this.cache?"._s(self,'"+h+"',"+k[0]+")":"self.style.setProperty('"+h+"',"+k[0]+");";var F=!0;u++}else f.style.setProperty(h,k);F&&(this.g[a]=d,c[a]=f,this.l=!1)}q||(m?(d+=
"|",(l="object"===typeof m)&&(m=m[0]),g=document.createTextNode(m),l&&(c[a]&&(E(u,r,a,this.cache),r="",a++),r+=this.cache?"._t(self,"+m+")":"self.nodeValue="+m+";",this.g[a]=d,c[a]=g,this.l=!1,u++),f.appendChild(g)):g&&("object"===typeof g?(g=g[0],r+=this.cache?"._h(self, "+g+")":"self.innerHTML="+g+";",this.g[a]=d,c[a]=f,this.l=!1,u++):f.innerHTML=g));E(u,r,a,this.cache);if(q)if(q.length)for(m=">",a=0;a<q.length;a++)a&&(m+="+"),f.appendChild(this.parse(q[a],b+a+1,d+m,c));else f.appendChild(this.parse(q,
b+1,d+">",c));b||this.l||(this.o=Function("p","item","index","view",D?'"use strict";var self;'+D:""));return f};function E(a,b,d,c){a&&(1<a?(D+="self=p["+d+"];",c?D+="this"+b+";":D+=b):D=c?D+("this"+b.replace(/self/g,"p["+d+"]")+";"):D+("p["+d+"]"+b.substring(4)))}p.prototype.unload=function(a){a||(a=this.m);a&&(z[a]=null)};(function(){var a=this||window,b;(b=a.define)&&b.amd?b([],function(){return p}):(b=a.modules)?b.mikado=p:"object"===typeof a.exports?a.module.exports=p:a.Mikado=p})();}).call(this);
