'use strict';
const data = window.bandContent;
const $ = id => document.getElementById(id);
const dateText = d => new Date(d+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
function uiIcon(name) {
 return '<svg class="ui-icon" aria-hidden="true" focusable="false"><use href="#ui-'+name+'"></use></svg>';
}
const externalArrow = uiIcon('arrow-out');
const icons = {
 Instagram:'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>',
 Spotify:'<circle cx="12" cy="12" r="10"/><g fill="none" stroke="#100d11" stroke-linecap="round"><path stroke-width="2" d="M5.8 9q6-2.7 12.3.7"/><path stroke-width="1.8" d="M6.6 12q5.6-2 10.4.7"/><path stroke-width="1.6" d="M7.5 15q4.4-1.6 8.3.6"/></g>',
 YouTube:'<rect x="1" y="4" width="22" height="16" rx="5"/><path d="m10 8.7 5.5 3.3-5.5 3.3Z" fill="#100d11"/>'
};
Object.entries(icons).forEach(([name,shape])=>{
 const a=document.createElement('a');a.href=data.profiles[name];a.setAttribute('aria-label',name);a.innerHTML='<svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">'+shape+'</svg>';$('top-social').append(a);
});
document.querySelectorAll('[data-profile]').forEach(a=>a.href=data.profiles[a.dataset.profile]);
const feature=data.feature;
$('hero-title').textContent=feature.title;
$('tagline').textContent=feature.tagline;
$('hero-art').src=feature.detail;
const releaseTime=document.querySelector('.release-date time');
releaseTime.dateTime=feature.releaseDate;
releaseTime.textContent=feature.dateLabel || dateText(feature.releaseDate);
releaseTime.setAttribute('aria-label',dateText(feature.releaseDate));
const menu=document.querySelector('.menu');
function closeMenu(){menu.setAttribute('aria-expanded','false');$('phone-nav').hidden=true;}
menu.onclick=()=>{const opening=$('phone-nav').hidden;menu.setAttribute('aria-expanded',String(opening));$('phone-nav').hidden=!opening;};
$('phone-nav').onclick=closeMenu;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('phone-nav').hidden){closeMenu();menu.focus();}});
matchMedia('(min-width:641px)').addEventListener('change',closeMenu);
const audio=$('audio');audio.src=feature.preview;
const preview=$('preview');
function updatePreview(){preview.querySelector('.playicon use').setAttribute('href', audio.paused?'#ui-play':'#ui-pause');$('preview-name').textContent=!audio.paused?'Pause preview':audio.currentTime>0&&!audio.ended?'Resume preview':'Play preview';}
preview.onclick=async()=>{if(!audio.paused){audio.pause();return;}try{await audio.play();$('progress').hidden=false;$('media-status').textContent='';}catch{$('media-status').textContent='Preview unavailable. Listen to the released singles below.';}};
['play','pause','ended'].forEach(event=>audio.addEventListener(event,updatePreview));
audio.ontimeupdate=()=>{$('seek').value=audio.currentTime;$('elapsed').value='0:'+String(Math.floor(audio.currentTime)).padStart(2,'0')+' / 0:'+feature.previewSeconds;};
$('seek').max=feature.previewSeconds;$('seek').oninput=()=>{audio.currentTime=Number($('seek').value);};$('seek').setAttribute('aria-label','Seek through preview');
const dialog=$('dialog');const dialogBody=$('dialog-body');let opener;
function openDialog(title,html){
 audio.pause();opener=document.activeElement;$('dialog-title').textContent=title;dialogBody.innerHTML=html;dialog.showModal();document.body.style.overflow='hidden';$('close').focus();
}
$('close').onclick=()=>dialog.close();
dialog.onclick=e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}};
dialog.onclose=()=>{dialogBody.replaceChildren();document.body.style.overflow='';opener?.focus();};
$('sleeve').onclick=()=>openDialog(feature.title+' — front cover','<img src="'+feature.cover+'" alt="Full TASTY. sleeve featuring a bitten red glass candy, pink plush center and ivory lettering.">');
const spotifyURL=r=>'https://open.spotify.com/album/'+r.spotify;
data.releases.forEach(r=>{
 const card=document.createElement('article');card.className='record';
 card.innerHTML=`<button class="record-pic" aria-label="Listen to ${r.title} and view release details"><img loading="lazy" width="840" height="840" src="assets/${r.cover}" alt="${r.alt}"><span aria-hidden="true" class="round-play">${uiIcon('play')}</span></button><div><div class="date">Single · ${dateText(r.date)}</div><h3>${r.title}</h3><div class="record-links"><a href="${spotifyURL(r)}" aria-label="${r.title} on Spotify">Spotify ${externalArrow}</a><a href="${r.apple}" aria-label="${r.title} on Apple Music">Apple Music ${externalArrow}</a></div></div>`;
 card.querySelector('button').onclick=()=>openDialog(r.title,`<iframe height="152" title="${r.title} on Spotify" allow="autoplay; encrypted-media" src="https://open.spotify.com/embed/album/${r.spotify}"></iframe><a href="${spotifyURL(r)}">Listen on Spotify ${externalArrow}</a><a href="${r.apple}">Listen on Apple Music ${externalArrow}</a>${r.credits?'<details><summary>Recording credits</summary><p>'+r.credits+'</p></details>':''}<p class="label-credit">${data.labelCredit}</p>`);
 $('records').append(card);
});
data.videos.forEach(v=>{
 const card=document.createElement('article');const name=v.title+' — '+v.type;
 if(v.section==='related'){
  card.innerHTML=`<button class="textlink">Also watch ${name} ${externalArrow}</button>`;
 }else{
  card.innerHTML=`<button class="video-thumb" aria-label="Play ${name}"><img src="assets/${v.thumb}" loading="lazy" width="1280" height="720" alt=""><span class="round-play" aria-hidden="true">${uiIcon('play')}</span></button><div class="video-meta"><div><strong>${v.title}</strong><span class="video-type">${v.type}</span></div><span class="duration">${v.duration}</span></div>`;
 }
 card.querySelector('button').onclick=()=>openDialog(name,`<iframe class="video" src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1" title="${name}" referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe><a href="https://www.youtube.com/watch?v=${v.id}">Watch on YouTube ${externalArrow}</a>`);
 const destination={watch:'video-feature',related:'video-related',moments:'moment-grid'}[v.section];
 $(destination).append(card);
});
data.socialPosts.forEach(post=>{
 const a=document.createElement('a');a.href=post.url;a.className='post';a.innerHTML=`<img src="assets/${post.asset}" alt="${post.alt}" loading="lazy"><div class="post-info"><strong>${post.caption}</strong><span class="insta-label">Reel ${externalArrow}</span></div>`;$('posts').append(a);
});
const today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'});
const upcoming=data.shows.filter(show=>show.date>=today).sort((a,b)=>a.date.localeCompare(b.date));
$('events').innerHTML=upcoming.length?upcoming.map(s=>`<p><time datetime="${s.date}">${dateText(s.date)}</time> · ${s.venue}, ${s.city}<br><a class="textlink" href="${s.url}">Event details ${externalArrow}</a></p>`).join(''):`<p>Follow along for the next show announcement.</p><a class="textlink" href="${data.profiles.Instagram}">Follow the band ${externalArrow}</a>`;
Object.entries(data.profiles).forEach(([label,href])=>{const a=document.createElement('a');a.href=href;a.textContent=label+' ';a.insertAdjacentHTML('beforeend',externalArrow);$('links').append(a);});
