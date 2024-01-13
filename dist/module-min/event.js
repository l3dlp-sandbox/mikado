import{EventOptions}from"./type.js";import Mikado from"./mikado.js";import{tick}from"./profiler.js";const events={},event_options={},routes=Object.create(null),options=Object.create(null),doc=document.documentElement||document.body.parentNode,has_touch="ontouchstart"in window,has_pointer=!has_touch&&window.PointerEvent&&navigator.maxTouchPoints;Mikado.eventCache=!1,Mikado.eventBubble=!1;let tap_fallback;function handler(a,b){!1,b||(b=a.type);const c=a.target,d=Mikado.eventCache,e=Mikado.eventBubble;let f;if(d&&(f=c["_mke"+b]),"undefined"==typeof f){for(let a=c;a&&a!==doc;){let g;if("click"===b&&tap_fallback&&(g=a.getAttribute("tap")),g||(g=a.getAttribute(b)),g){const h=g.indexOf(":");let i=a;if(-1<h){const a=g.substring(0,h),b=g.substring(h+1);for(g="";(i=i.parentElement)!==doc;)if(!1,i.hasAttribute(b)){g=a;break}}if(g){f||(f=[],d&&(c["_mke"+b]=f)),f.push([g,i]);const a=options[g];if(!e||a&&(a.stop||a.cancel))break}}a=a.parentElement}d&&(f||(c["_mke"+b]=null))}else;if(f)for(let e,g=0;g<f.length;g++){e=f[g];const h=e[0],i=routes[h];if(i){const f=e[1],g=options[h];g&&(g.prevent&&a.preventDefault(),g.stop&&a.stopImmediatePropagation(),g.once&&(routes[h]=null,d&&(c["_mke"+b]=null))),!1,i(f,a)}}}export function route(a,b,c){return!1,routes[a]=b,c&&(options[a]=c),this}export function dispatch(a,b,c){return!1,routes[a](b||this,c||window.event),this}export function listen(a,b){return events[a]||(!1,register_event(1,a,handler,b),events[a]=1,event_options[a]=b||null),this}export function unlisten(a){return events[a]&&(!1,register_event(0,a,handler,event_options[a]),events[a]=0,event_options[a]=null),this}let touch_x,touch_y,register_tap;if(has_touch||has_pointer){function a(a){c(a,a.touches)}function b(a){const b=touch_x,d=touch_y;c(a,a.changedTouches),15>Math.abs(touch_x-b)&&15>Math.abs(touch_y-d)&&handler(a,"tap")}function c(a,b){b&&(a=b[0]),touch_x=a.clientX,touch_y=a.clientY}const d={passive:!1,capture:!0};register_tap=function(c){register_event(c,has_pointer?"pointerdown":"touchstart",a,d),register_event(c,has_pointer?"pointerup":"touchend",b,d)}}function register_event(a,b,c,d){if(!1,"tap"===b){if(has_touch||has_pointer)return void register_tap(a);tap_fallback=!0,b="click"}window[(a?"add":"remove")+"EventListener"](b,c,!(d||!1===d)||d)}