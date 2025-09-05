// Theme toggle with persistence
(function(){
try{
const root=document.documentElement;const toggle=document.getElementById('theme-toggle');
const stored=localStorage.getItem('theme');
if(stored){root.setAttribute('data-theme', stored)}
if(window.matchMedia && !stored){
const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
if(prefersDark){root.setAttribute('data-theme','dark')}
}
if(toggle){
toggle.addEventListener('click',()=>{
const current=root.getAttribute('data-theme')==='dark'?'dark':'light';
const next=current==='dark'?'light':'dark';
root.setAttribute('data-theme', next);localStorage.setItem('theme', next);
toggle.setAttribute('aria-pressed', String(next==='dark'))
})
}
}catch(e){/* no-op */}
})();

// Mobile menu toggle
(function(){
const btn=document.getElementById('menu-toggle');
const nav=document.getElementById('primary-navigation');
if(!btn||!nav) return;
btn.addEventListener('click',()=>{
const expanded=btn.getAttribute('aria-expanded')==='true';
btn.setAttribute('aria-expanded', String(!expanded));
nav.classList.toggle('open');
})
})();

// Dynamic year
(function(){
const y=document.getElementById('year');
if(y){y.textContent=String(new Date().getFullYear())}
})();

