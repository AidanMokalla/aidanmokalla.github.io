// Theme toggle: "match" device vs "invert" device, with persistence + OS-change listener
(function(){
try{
const root=document.documentElement;const toggle=document.getElementById('theme-toggle');
const media=window.matchMedia?window.matchMedia('(prefers-color-scheme: dark)'):null;

function migrateOld(){
const old=localStorage.getItem('theme');
if(!old) return null;
const prefersDark=media?media.matches:false;
const mode=(old===(prefersDark?'dark':'light'))?'match':'invert';
localStorage.setItem('themeMode', mode);
localStorage.removeItem('theme');
return mode;
}

function getMode(){
const m=localStorage.getItem('themeMode');
if(m==='match'||m==='invert') return m;
const migrated=migrateOld();
if(migrated) return migrated;
return 'match';
}

function apply(mode){
const prefersDark=media?media.matches:false;
const isDark=(mode==='match')?prefersDark:!prefersDark;
root.setAttribute('data-theme', isDark?'dark':'light');
if(toggle){
toggle.setAttribute('aria-pressed', String(mode==='invert'));
toggle.setAttribute('aria-label', mode==='invert'?'Theme: opposite of device':'Theme: same as device');
toggle.title=mode==='invert'?'Opposite of device':'Same as device';
}
}

function setMode(mode){
localStorage.setItem('themeMode', mode);
apply(mode);
}

apply(getMode());

if(media){
if(typeof media.addEventListener==='function'){
media.addEventListener('change',()=>apply(getMode()));
}else if(typeof media.addListener==='function'){
media.addListener(()=>apply(getMode()));
}
}

if(toggle){
toggle.addEventListener('click',()=>{
const current=getMode();
const next=current==='match'?'invert':'match';
setMode(next);
});
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

