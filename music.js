(() => {
  'use strict';
  const albumURL='https://open.spotify.com/album/0t09jqNM8q30erGVmLvT9L';
  const albumURI='spotify:album:0t09jqNM8q30erGVmLvT9L';
  const tracks=window.KabilinAlbum?.tracks||[];
  let api=null,controller=null,ready=false,loading=false,playing=false,pending=false,onRecipe=false;
  let trackIndex=0,position=0,duration=0,requestedURI=null,switching=false,desiredPlay=false,hasStarted=false;
  let loadTimeout=0,playTimeout=0;
  const player=document.createElement('aside');
  player.id='kitchen-player';player.className='music-player';player.hidden=true;
  player.setAttribute('aria-labelledby','music-title');
  player.innerHTML=`
    <header class="music-heading"><span class="eyebrow">A little music for the kitchen</span><h2 id="music-title">While the pot simmers</h2></header>
    <div class="turntable-scene" role="img" aria-label="Pencil and watercolor vinyl record player"><div class="turntable-machine">
      <img class="turntable-base" src="assets/music/turntable.png" alt="" width="720" height="600" loading="lazy" decoding="async">
      <div class="vinyl-plane"><img class="vinyl-disc" src="assets/music/vinyl.png" alt="" width="720" height="720" loading="lazy" decoding="async"></div>
      <svg class="tonearm" viewBox="0 0 360 300" aria-hidden="true"><g class="tonearm-moving"><path d="M302 66Q303 96 298 134L265 191" stroke="#493b2a" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M301 66Q302 96 297 134L264 189" stroke="#d8cca5" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M299 76L296 131L263 186" stroke="#fff4d7" stroke-width="1" fill="none"/><path d="M260 178l13 8-12 21-13-8z" fill="#52684c" stroke="#3b3428" stroke-width="1.5"/><path d="M253 197l7 4-4 7" fill="none" stroke="#3b3428" stroke-width="1.5"/><path d="M261 183l6 4m-9 1 6 4m-9 1 6 4" stroke="#a9b28a" stroke-width="1"/></g><circle cx="302" cy="66" r="7" fill="#ba9859" stroke="#6b5330" stroke-width="1.5"/><circle cx="302" cy="66" r="2" fill="#f2ddb0"/></svg>
      <span class="player-led" aria-hidden="true"></span>
    </div></div>
    <div class="music-wave" aria-hidden="true">${Array.from({length:25},(_,index)=>`<span class="wave-bar" style="--bar:${[8,12,20,15,26,18,30,22,14,28,20,32,24,16,26,18,30,21,13,25,17,22,14,10,7][index]}px;--beat:${.65+(index%5)*.16}s;--delay:-${index*.13}s"></span>`).join('')}</div>
    <div class="album-caption"><span class="track-state">Ready to play</span><span class="current-track-title" role="status" aria-live="polite"></span><span class="track-artist"><span class="track-artist-name">Timeless Hour</span> · <a href="${albumURL}" target="_blank" rel="noopener noreferrer">Spotify</a></span><span class="track-counter"></span></div>
    <div class="music-controls" role="group" aria-label="Music playback">
      <button type="button" class="music-skip" data-music-previous disabled aria-label="Restart track or play previous track" title="Restart / Previous"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M4 3h2v14H4zm12 0L6 10l10 7z" fill="currentColor"/></svg></button>
      <button type="button" data-music-play disabled><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M6 3l11 7-11 7z" fill="currentColor"/></svg>Play</button>
      <button type="button" data-music-pause disabled><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M5 3h4v14H5zm7 0h4v14h-4z" fill="currentColor"/></svg>Pause</button>
      <button type="button" class="music-skip" data-music-next disabled aria-label="Next track" title="Next track"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M14 3h2v14h-2zM4 3l10 7-10 7z" fill="currentColor"/></svg></button>
    </div>
    <p class="music-status" role="status" aria-live="polite">Loading Spotify…</p>
    <div class="spotify-embed"><div id="spotify-kitchen-slot"></div></div>
    <button type="button" class="text-button music-retry" data-music-retry hidden>Reconnect player</button>`;
  document.querySelector('.creators').before(player);
  const playButton=player.querySelector('[data-music-play]');
  const pauseButton=player.querySelector('[data-music-pause]');
  const previousButton=player.querySelector('[data-music-previous]');
  const nextButton=player.querySelector('[data-music-next]');
  const status=player.querySelector('.music-status');
  const retry=player.querySelector('[data-music-retry]');
  const embed=player.querySelector('.spotify-embed');
  embed.setAttribute('aria-hidden','true');embed.inert=true;
  const current=()=>tracks[trackIndex]||{uri:albumURI,title:'This Music Feels Like a Memory',artist:'Timeless Hour'};
  const setStatus=text=>{if(status.textContent!==text)status.textContent=text;};
  function renderTrack() {
    const track=current();
    const title=player.querySelector('.current-track-title');
    if(title.textContent!==track.title)title.textContent=track.title;
    player.querySelector('.track-artist-name').textContent=track.artist;
    player.querySelector('.track-artist a').href=track.uri.startsWith('spotify:track:')?`https://open.spotify.com/track/${track.uri.split(':').at(-1)}`:albumURL;
    player.querySelector('.track-counter').textContent=tracks.length?`${trackIndex+1} / ${tracks.length}`:'';
    player.querySelector('.track-state').textContent=playing?'Now playing':switching?'Loading track…':pending?'Starting…':hasStarted?'Paused':'Ready to play';
  }
  function controls() {
    playButton.disabled=!ready||playing||pending||switching;
    pauseButton.disabled=!ready||(!playing&&!pending);
    nextButton.disabled=previousButton.disabled=!ready||switching||!tracks.length;
    player.classList.toggle('is-playing',playing);renderTrack();
  }
  function unavailable(message) {
    clearTimeout(loadTimeout);clearTimeout(playTimeout);
    loading=false;ready=false;pending=false;playing=false;switching=false;requestedURI=null;desiredPlay=false;
    controls();setStatus(message);retry.hidden=false;
  }
  function waitForPlayback() {
    clearTimeout(playTimeout);
    playTimeout=setTimeout(()=>{
      if(!playing){pending=false;switching=false;requestedURI=null;desiredPlay=false;controls();setStatus('Try Play again, or listen using the Spotify link.');}
    },10000);
  }
  function syncTrack(uri) {
    const index=tracks.findIndex(track=>track.uri===uri);
    if(index>=0){trackIndex=index;renderTrack();}
  }
  function selectTrack(index,continuePlaying) {
    if(!controller||!ready||!tracks.length)return;
    trackIndex=(index+tracks.length)%tracks.length;
    requestedURI=current().uri;switching=true;desiredPlay=continuePlaying;
    playing=false;pending=continuePlaying;hasStarted=false;position=duration=0;
    controls();setStatus('Changing the record…');
    try{
      controller.pause();
      if(typeof controller.loadEntity==='function')controller.loadEntity(requestedURI,false,0);
      else controller.loadUri(requestedURI);
      if(continuePlaying)controller.play();
      clearTimeout(playTimeout);
      playTimeout=setTimeout(()=>{
        if(switching||pending){switching=false;pending=false;requestedURI=null;desiredPlay=false;controls();setStatus('The next track is taking a while. Try Play again.');}
      },10000);
    }catch{switching=false;pending=false;requestedURI=null;controls();setStatus('Could not change tracks. Try reconnecting.');retry.hidden=false;}
  }
  function createEmbed() {
    if(!api||controller)return;
    embed.innerHTML='<div id="spotify-kitchen-slot"></div>';
    try{
      api.createController(embed.firstElementChild,{uri:current().uri,width:260,height:152},created=>{
        controller=created;
        const iframe=embed.querySelector('iframe');if(iframe){iframe.title='Spotify music playback';iframe.tabIndex=-1;iframe.loading='eager';}
        created.addListener('ready',()=>{
          clearTimeout(loadTimeout);loading=false;ready=true;retry.hidden=true;
          if(switching){
            if(desiredPlay){try{created.play();}catch{}}
            else{switching=false;requestedURI=null;clearTimeout(playTimeout);}
          }
          controls();if(!pending)setStatus('Ready when you are.');
        });
        created.addListener('playback_started',event=>{
          const uri=event.data?.playingURI;
          if(!requestedURI||uri===requestedURI)syncTrack(uri);
        });
        created.addListener('playback_update',event=>{
          const data=event.data||{};
          if(requestedURI&&data.playingURI!==requestedURI)return;
          const wasSwitching=switching;
          if(requestedURI===data.playingURI){requestedURI=null;switching=false;}
          syncTrack(data.playingURI);
          const oldPosition=position,oldDuration=duration;
          position=Number.isFinite(data.position)?data.position:position;
          duration=Number.isFinite(data.duration)&&data.duration>0?data.duration:duration;
          const ended=duration>0&&position>=duration-250 || oldDuration>0&&oldPosition>=oldDuration-250&&position===0;
          if(!wasSwitching&&desiredPlay&&data.isPaused===true&&!data.isBuffering&&ended){
            if(trackIndex<tracks.length-1){selectTrack(trackIndex+1,true);return;}
            desiredPlay=false;playing=false;pending=false;controls();setStatus('The album has finished. Thank you for listening.');return;
          }
          if(wasSwitching&&desiredPlay&&data.isPaused===true){try{created.play();}catch{}controls();return;}
          playing=data.isPaused===false&&data.isBuffering!==true;
          if(playing){hasStarted=true;desiredPlay=true;}
          if(playing||data.isPaused===true){pending=false;clearTimeout(playTimeout);}
          player.classList.toggle('is-buffering',data.isBuffering===true);
          controls();
          if(data.isBuffering)setStatus('Finding the next notes…');
          else if(playing)setStatus('A little company while you cook.');
          else if(ready)setStatus('Paused · take your time.');
          if(playing&&!onRecipe){desiredPlay=false;try{created.pause();}catch{}}
        });
      });
    }catch{unavailable('Spotify could not connect. Try reconnecting.');}
  }
  window.onSpotifyIframeApiReady=SpotifyAPI=>{api=SpotifyAPI;createEmbed();};
  function connect() {
    if(ready||loading)return;
    loading=true;setStatus('Loading Spotify…');retry.hidden=true;
    loadTimeout=setTimeout(()=>unavailable('Music is taking a while. Try reconnecting.'),16000);
    if(api){createEmbed();return;}
    document.getElementById('spotify-kitchen-api')?.remove();
    const script=document.createElement('script');script.id='spotify-kitchen-api';script.src='https://open.spotify.com/embed/iframe-api/v1';script.async=true;
    script.onerror=()=>unavailable('Spotify could not connect. Try reconnecting.');document.head.append(script);
  }
  playButton.addEventListener('click',()=>{
    if(!ready||!controller)return;
    if(duration>0&&position>=duration-250){selectTrack((trackIndex+1)%tracks.length,true);return;}
    desiredPlay=true;pending=true;controls();setStatus('Starting your music…');
    try{if(hasStarted&&typeof controller.resume==='function')controller.resume();else controller.play();waitForPlayback();}
    catch{pending=false;desiredPlay=false;controls();setStatus('Try Play again, or listen using the Spotify link.');}
  });
  pauseButton.addEventListener('click',()=>{
    if(!controller)return;
    desiredPlay=false;pending=false;clearTimeout(playTimeout);setStatus('Pausing…');controls();
    try{controller.pause();}catch{setStatus('Could not pause. Try reconnecting.');}
  });
  nextButton.addEventListener('click',()=>selectTrack(trackIndex+1,playing||pending));
  previousButton.addEventListener('click',()=>{
    if(!ready||!controller)return;
    if(position>3000||trackIndex===0){
      if(!playing&&!pending){selectTrack(trackIndex,false);return;}
      position=0;desiredPlay=true;pending=true;controls();setStatus('Back to the beginning…');
      try{controller.restart();waitForPlayback();}catch{selectTrack(trackIndex,true);}
    }else selectTrack(trackIndex-1,playing||pending);
  });
  retry.addEventListener('click',()=>{
    try{controller?.destroy();}catch{}
    controller=null;ready=false;loading=false;playing=false;pending=false;switching=false;requestedURI=null;desiredPlay=false;hasStarted=false;
    clearTimeout(loadTimeout);clearTimeout(playTimeout);embed.replaceChildren();controls();connect();
  });
  window.enhanceMusic=()=>{
    const recipe=document.querySelector('#app [data-recipe-id]'),active=!!recipe;
    document.body.classList.toggle('has-recipe-music',active);player.hidden=!active;
    if(active){
      if(!controller&&!loading&&retry.hidden)connect();
      const actions=recipe.querySelector('.recipe-actions');
      if(actions&&!actions.querySelector('[data-open-music]')){
        const link=document.createElement('button');link.type='button';link.className='text-button open-kitchen-music';link.dataset.openMusic='';link.textContent='♫ Kitchen music';
        link.addEventListener('click',()=>{
          player.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
          (ready?(playing||pending?pauseButton:playButton):player.querySelector('.track-artist a')).focus({preventScroll:true});
        });actions.append(link);
      }
    }else if(onRecipe){desiredPlay=false;pending=false;clearTimeout(playTimeout);try{controller?.pause();}catch{}}
    onRecipe=active;
  };
  controls();window.enhanceMusic();
})();
