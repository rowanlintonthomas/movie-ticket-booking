const movies = [
  {id:'orbit',title:'Orbit of Us',genre:'Sci-Fi',rating:'8.7',duration:'2h 08m',language:'English',status:'now',price:240,tag:'IMAX',art:'ORBIT<br>OF US',bg:'#18223b',orb:'#e2a65e',description:'Two strangers cross galaxies to find their way home.'},
  {id:'midnight',title:'Midnight Market',genre:'Thriller',rating:'7.9',duration:'1h 54m',language:'English',status:'now',price:210,tag:'NEW',art:'MIDNIGHT<br>MARKET',bg:'#30202c',orb:'#cc5673',description:'A night shift at a market takes a turn after closing.'},
  {id:'monsoon',title:'Monsoon Letters',genre:'Drama',rating:'9.1',duration:'2h 16m',language:'Hindi',status:'now',price:190,tag:'AUDIENCE PICK',art:'MONSOON<br>LETTERS',bg:'#1b3436',orb:'#77bda4',description:'A bundle of old letters changes one family forever.'},
  {id:'pixel',title:'Pixel Pals',genre:'Animation',rating:'8.2',duration:'1h 42m',language:'English',status:'now',price:180,tag:'FAMILY',art:'PIXEL<br>PALS',bg:'#302d53',orb:'#f4bb52',description:'A tiny game hero leaps out to save the real world.'},
  {id:'wild',title:'The Wild Between',genre:'Adventure',rating:'—',duration:'2h 05m',language:'English',status:'soon',price:230,tag:'COMING SOON',art:'WILD<br>BETWEEN',bg:'#1a3027',orb:'#85bd72',description:'An unlikely crew sets sail for an uncharted island.'},
  {id:'blue',title:'Blue Hour',genre:'Romance',rating:'—',duration:'1h 58m',language:'Tamil',status:'soon',price:200,tag:'COMING SOON',art:'BLUE<br>HOUR',bg:'#1c2647',orb:'#73a9e5',description:'One last summer evening, and a chance to begin again.'},
  {id:'echo',title:'Echoes Below',genre:'Horror',rating:'—',duration:'1h 49m',language:'English',status:'soon',price:220,tag:'COMING SOON',art:'ECHOES<br>BELOW',bg:'#29212b',orb:'#b95252',description:'The new apartment has one room that was never on the plan.'},
  {id:'chow',title:'Chow Time',genre:'Comedy',rating:'—',duration:'1h 46m',language:'Hindi',status:'soon',price:190,tag:'COMING SOON',art:'CHOW<br>TIME',bg:'#392923',orb:'#edaa5f',description:'A food truck owner enters the neighborhood cook-off.'}
];
const snacks=[{id:'popcorn',name:'Classic popcorn',detail:'Salted · Medium',price:120,emoji:'🍿'},{id:'nachos',name:'Loaded nachos',detail:'Cheese & salsa',price:180,emoji:'🧀'},{id:'cola',name:'Cola combo',detail:'2 chilled drinks',price:150,emoji:'🥤'}];

// FIX 4: added "expired" flag
const state={tab:'now',query:'',genre:'all',movie:null,dateIndex:0,time:'',seats:[],snacks:{},promo:null,seconds:480,timerId:null,expired:false};
const $=s=>document.querySelector(s);
const movieGrid=$('#movie-grid');

/* ---------- Storage helpers (FIX 1, 5, 6) ---------- */
const BOOKED_KEY='reelBookedSeats_v2';
const USER_KEY='reelUser';

function loadBooked(){
  try{return JSON.parse(localStorage.getItem(BOOKED_KEY))||{}}catch(e){return {}}
}
function saveBooked(data){
  try{localStorage.setItem(BOOKED_KEY,JSON.stringify(data))}catch(e){}
}
// One key per show: movie + date + time. The same seat in a different show stays free.
function showKey(){
  const date=dates()[state.dateIndex].toDateString();
  return `${state.movie.id}|${date}|${state.time}`;
}
function bookedForCurrentShow(){
  if(!state.movie||!state.time)return [];
  return loadBooked()[showKey()]||[];
}
function getUser(){
  try{return JSON.parse(localStorage.getItem(USER_KEY))}catch(e){return null}
}
function saveUser(user){
  try{localStorage.setItem(USER_KEY,JSON.stringify(user))}catch(e){}
  if(typeof refreshProfile==='function')refreshProfile();
}

/* ---------- Rendering ---------- */
function renderGenres(){const genres=[...new Set(movies.map(movie=>movie.genre))];$('#genre-filter').innerHTML='<option value="all">All genres</option>'+genres.map(genre=>`<option value="${genre}">${genre}</option>`).join('')}
function renderMovies(){const filtered=movies.filter(movie=>movie.status===state.tab&&movie.title.toLowerCase().includes(state.query.toLowerCase())&&(state.genre==='all'||movie.genre===state.genre));movieGrid.innerHTML=filtered.map(movie=>`<article class="movie-card" data-movie="${movie.id}"><div class="poster" style="--poster-bg:${movie.bg};--poster-orb:${movie.orb}"><span class="poster-chip">${movie.tag}</span><span class="poster-art">${movie.art}</span></div><div class="movie-card-body"><div class="movie-title-row"><h3>${movie.title}</h3><span class="rating">★ ${movie.rating}</span></div><p class="movie-meta">${movie.duration} · ${movie.language}</p><div class="card-actions"><span class="genre-pill">${movie.genre}</span><button class="card-button" data-movie="${movie.id}">${movie.status==='now'?'Book now':'View details'} →</button></div></div></article>`).join('');$('#empty-state').hidden=filtered.length>0}
function dates(){return Array.from({length:5},(_,index)=>{const date=new Date();date.setDate(date.getDate()+index);return date})}

// FIX 3: removed "state.dateIndex=0" from here so other days can be selected
function renderDates(){const allDates=dates();$('#date-list').innerHTML=allDates.map((date,index)=>`<button class="date-button ${state.dateIndex===index?'active':''}" data-date="${index}"><span>${index===0?'TODAY':date.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</span><b>${date.getDate()}</b></button>`).join('');$('#selected-date-label').textContent=allDates[state.dateIndex].toLocaleDateString('en-US',{month:'short',day:'numeric'})}
const SHOW_SLOTS=[['11:30 AM','Matinee'],['2:45 PM','Popular'],['6:15 PM','Evening'],['9:30 PM','Late show']];
function slotMinutes(time){
  const [clock,ampm]=time.split(' ');
  let [hours,minutes]=clock.split(':').map(Number);
  if(ampm==='PM'&&hours!==12)hours+=12;
  if(ampm==='AM'&&hours===12)hours=0;
  return hours*60+minutes;
}
function minutesNow(){const now=new Date();return now.getHours()*60+now.getMinutes()}
// A show has started if it is today and its time is not in the future
function slotPassed(time){return state.dateIndex===0&&slotMinutes(time)<=minutesNow()}
// True when every show today has already started
function todayFullyPassed(){return SHOW_SLOTS.every(([time])=>slotMinutes(time)<=minutesNow())}
function renderTimes(){$('#showtime-list').innerHTML=SHOW_SLOTS.map(([time,label])=>{const passed=slotPassed(time);return `<button class="time-button ${state.time===time?'active':''}" data-time="${time}" ${passed?'disabled style="opacity:.4;cursor:not-allowed"':''}>${time}<small>${passed?'Show started':label}</small></button>`}).join('')}

// FIX 5 & 6: seats already booked for this show are shown as occupied
function renderSeats(){
  const occupied=new Set([2,3,8,14,15,27,28,36,47]);
  const booked=new Set(bookedForCurrentShow());
  $('#seat-map').innerHTML=Array.from({length:50},(_,index)=>{
    const row=String.fromCharCode(65+Math.floor(index/10)),number=index%10+1,id=row+number;
    const isOccupied=occupied.has(index)||booked.has(id);
    return `<button class="seat ${isOccupied?'occupied':''} ${state.seats.includes(id)?'selected':''}" data-seat="${id}" aria-label="Row ${row} seat ${number}${isOccupied?', occupied':', available'}" ${isOccupied?'disabled':''}></button>`
  }).join('')
}
function renderSnacks(){$('#snack-list').innerHTML=snacks.map(snack=>`<div class="snack-row"><span class="snack-emoji">${snack.emoji}</span><span class="snack-info"><b>${snack.name}</b><small>${snack.detail}</small></span><span class="snack-price">₹${snack.price}</span><span class="quantity-control"><button data-snack="${snack.id}" data-change="-1" aria-label="Remove ${snack.name}">−</button><span>${state.snacks[snack.id]||0}</span><button data-snack="${snack.id}" data-change="1" aria-label="Add ${snack.name}">+</button></span></div>`).join('')}

function updateSummary(){
  const ticketTotal=state.seats.length*(state.movie?.price||0),
    snackTotal=snacks.reduce((sum,snack)=>sum+snack.price*(state.snacks[snack.id]||0),0),
    subtotal=ticketTotal+snackTotal,
    discount=state.promo==='REEL10'?Math.round(subtotal*.1):0;
  $('#ticket-count').textContent=`${state.seats.length} ${state.seats.length===1?'seat':'seats'}`;
  $('#ticket-total').textContent=`₹${ticketTotal}`;
  $('#snack-total').textContent=`₹${snackTotal}`;
  $('#discount-line').hidden=!discount;
  $('#discount-total').textContent=`−₹${discount}`;
  $('#grand-total').textContent=`₹${subtotal-discount}`;
  // FIX 2: coupon is no longer required. FIX 4: payment is blocked when time is up.
  $('#checkout-button').disabled=state.seats.length===0||!state.time||state.expired;
}

/* ---------- Timer (FIX 4) ---------- */
function startTimer(){
  clearInterval(state.timerId);
  state.seconds=480;
  state.expired=false;
  $('#timer').classList.remove('expired');
  renderTimer();
  state.timerId=setInterval(()=>{
    state.seconds--;
    renderTimer();
    if(state.seconds<=0){
      expireBooking();
    }
  },1000)
}
function expireBooking(){
  clearInterval(state.timerId);
  state.seconds=0;
  state.expired=true;
  state.seats=[];
  renderTimer();
  renderSeats();
  updateSummary();
  $('#timer').classList.add('expired');
  alert('Time is up! Your seats were released. Please select the movie again to restart.');
}
function renderTimer(){const minutes=Math.floor(state.seconds/60),seconds=state.seconds%60;$('#timer b').textContent=`${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`}

function selectMovie(id){
  state.movie=movies.find(movie=>movie.id===id);
  state.seats=[];state.time='';state.dateIndex=todayFullyPassed()?1:0;state.snacks={};state.promo=null;
  $('#promo-code').value='';$('#promo-message').textContent='';
  const isSoon=state.movie.status==='soon';
  $('#booking-controls').hidden=isSoon;
  $('#movie-detail').innerHTML=`<div class="detail-poster" style="--poster-bg:${state.movie.bg};--poster-orb:${state.movie.orb}"><b>${state.movie.art}</b></div><div class="detail-copy"><h3>${state.movie.title}</h3><p>${state.movie.description}</p><div class="detail-tags"><span>${state.movie.genre}</span><span>${state.movie.duration}</span><span>${state.movie.language}</span><span>★ ${state.movie.rating}</span>${isSoon?'':`<span>₹${state.movie.price} per ticket</span>`}</div>${isSoon?'<p style="color:#d8ff64;font-weight:700">🎬 Coming soon. Booking opens closer to the release date.</p>':''}</div>`;
  if(isSoon){
    clearInterval(state.timerId);
    state.expired=false;
    updateSummary();
    $('#booking').scrollIntoView({behavior:'smooth',block:'start'});
    return
  }
  renderDates();renderTimes();renderSeats();renderSnacks();startTimer();updateSummary();
  $('#booking').scrollIntoView({behavior:'smooth',block:'start'})
}
function closeModal(){
  $('#confirmation-modal').hidden=true;
  if(state.movie&&state.movie.status==='now')startTimer();
}

/* ---------- Events ---------- */
$('#genre-filter').addEventListener('change',event=>{state.genre=event.target.value;renderMovies()});

// Fixed: read the value from the element that fired the event
$('#movie-search').addEventListener('input',event=>{state.query=event.target.value;renderMovies()});

document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{state.tab=tab.dataset.tab;document.querySelectorAll('.tab').forEach(item=>{item.classList.toggle('active',item===tab);item.setAttribute('aria-selected',item===tab?'true':'false')});renderMovies()}));

movieGrid.addEventListener('click',event=>{const card=event.target.closest('.movie-card');if(card)selectMovie(card.dataset.movie)});

// FIX 3: picking a new date clears the time and seats, so shows load for that day
$('#date-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-date]');
  if(!button||state.expired)return;
  state.dateIndex=Number(button.dataset.date);
  state.time='';
  state.seats=[];
  renderDates();renderTimes();renderSeats();updateSummary()
});

// FIX 3, 5, 6: picking a show time loads the seats booked for that exact show
$('#showtime-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-time]');
  if(!button||state.expired)return;
  if(slotPassed(button.dataset.time))return;
  state.time=button.dataset.time;
  state.seats=[];
  renderTimes();renderSeats();updateSummary()
});

$('#seat-map').addEventListener('click',event=>{
  const seat=event.target.closest('[data-seat]');
  if(!seat||seat.disabled)return;
  if(state.expired){alert('Time is up. Please select the movie again.');return}
  if(!state.time){alert('Please choose a show time first.');return}
  const id=seat.dataset.seat;
  state.seats=state.seats.includes(id)?state.seats.filter(item=>item!==id):[...state.seats,id];
  seat.classList.toggle('selected',state.seats.includes(id));
  updateSummary()
});

$('#snack-list').addEventListener('click',event=>{const button=event.target.closest('[data-snack]');if(!button)return;const id=button.dataset.snack;state.snacks[id]=Math.max(0,(state.snacks[id]||0)+Number(button.dataset.change));renderSnacks();updateSummary()});

// FIX 2: coupon code is now case sensitive (no toUpperCase)
$('#promo-form').addEventListener('submit',event=>{
  event.preventDefault();
  const code=$('#promo-code').value.trim();
  if(code==='REEL10'){
    state.promo=code;
    $('#promo-message').textContent='10% off applied. Enjoy the show!';
    $('#promo-message').style.color='var(--accent)'
  }else{
    state.promo=null;
    $('#promo-message').textContent='That code did not work. Try REEL10.';
    $('#promo-message').style.color='var(--red)'
  }
  updateSummary()
});

$('#checkout-button').addEventListener('click',()=>{
  // FIX 4: check the time again at the moment of payment
  if(state.expired||state.seconds<=0){alert('Time is up. Please select the movie again.');return}
  if(!state.movie||state.movie.status!=='now'||!state.seats.length||!state.time)return;

  if(slotPassed(state.time)){
    alert('This show has already started. Please choose another time.');
    state.time='';state.seats=[];
    renderTimes();renderSeats();updateSummary();
    return
  }

  // FIX 1: get and save user details
  const user=getUser();
  if(!user||!user.name||!user.email){
    window.scrollTo({top:0,behavior:'smooth'});
    openProfilePopup('Please add your name and email to confirm your booking.');
    return
  }

  // FIX 6: make sure none of the chosen seats were booked already
  const booked=loadBooked();
  const key=showKey();
  const alreadyBooked=booked[key]||[];
  const clash=state.seats.filter(id=>alreadyBooked.includes(id));
  if(clash.length){
    alert(`Seat ${clash.join(', ')} is already booked. Please choose other seats.`);
    state.seats=state.seats.filter(id=>!clash.includes(id));
    renderSeats();updateSummary();
    return
  }

  const date=dates()[state.dateIndex],movie=state.movie;
  $('#confirmation-copy').textContent=`${movie.title} · ${date.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} at ${state.time} · Seats ${state.seats.join(', ')} · Booked for ${user.name} (${user.email})`;
  $('#confirmation-total').textContent=$('#grand-total').textContent;
  $('#confirmation-modal').hidden=false;
  clearInterval(state.timerId);

  // FIX 5: save the booking so these seats are blocked for everyone else
  booked[key]=[...alreadyBooked,...state.seats];
  saveBooked(booked);
  state.seats=[];
  state.snacks={};
  renderSeats();renderSnacks();updateSummary()
});

$('#close-modal').addEventListener('click',closeModal);$('#done-button').addEventListener('click',closeModal);$('#confirmation-modal').addEventListener('click',event=>{if(event.target.id==='confirmation-modal')closeModal()});

renderGenres();renderMovies();renderDates();renderTimes();renderSeats();renderSnacks();updateSummary();

/* ---------- User profile (name + email panel) ---------- */
function getInitials(name){
  return name.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

// The profile button in the header: <button class="profile-button">
function findProfileElement(){
  return document.querySelector('.profile-button');
}

// Shows the real user's initials instead of "JD" (a person icon until details are saved)
function refreshProfile(){
  const el=findProfileElement();
  if(!el)return;
  const user=getUser();
  el.textContent=(user&&user.name)?getInitials(user.name):'👤';
  el.title=(user&&user.name)?`${user.name} · ${user.email}`:'Click to add your details';
}

function closeProfilePopup(){
  const old=document.getElementById('user-popup');
  if(old)old.remove();
}

// notice: optional message shown at the top. forceEdit: show the form even if details exist.
function openProfilePopup(notice,forceEdit){
  closeProfilePopup();
  const user=getUser();
  const editing=!!forceEdit||!(user&&user.name&&user.email);

  const popup=document.createElement('div');
  popup.id='user-popup';
  popup.style.cssText='position:fixed;top:84px;right:16px;z-index:9999;width:280px;max-width:calc(100vw - 32px);padding:16px;border-radius:12px;background:#1b1f2a;color:#f5f4f1;border:1px solid rgba(255,255,255,.18);box-shadow:0 10px 30px rgba(0,0,0,.5);font-size:13px;line-height:1.4';
  // clicks inside the panel must not reach the "click outside to close" handler
  popup.addEventListener('click',event=>event.stopPropagation());

  const labelStyle='display:block;font-size:11px;color:#969baa';
  const inputStyle='width:100%;height:34px;margin:4px 0 10px;padding:0 10px;border-radius:8px;border:1px solid #3a4054;background:#11141e;color:#f5f4f1;font-size:13px;outline:0';
  const buttonStyle='padding:8px 14px;border-radius:8px;border:0;cursor:pointer;font-weight:700;font-size:12px';

  if(editing){
    popup.innerHTML=`
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">Your details</div>
      <div id="popup-notice" style="color:#d8ff64;font-size:11px;margin-bottom:8px"></div>
      <label for="popup-name-input" style="${labelStyle}">Name</label>
      <input id="popup-name-input" type="text" placeholder="Your name" autocomplete="name" style="${inputStyle}">
      <label for="popup-email-input" style="${labelStyle}">Email</label>
      <input id="popup-email-input" type="email" placeholder="you@example.com" autocomplete="email" style="${inputStyle}">
      <div id="popup-error" style="color:#ff7185;font-size:11px;min-height:15px;margin-bottom:4px"></div>
      <button id="popup-save" type="button" style="${buttonStyle};background:#d8ff64;color:#14170d">Save</button>`;
    document.body.appendChild(popup);
    $('#popup-notice').textContent=notice||'';
    if(user){$('#popup-name-input').value=user.name||'';$('#popup-email-input').value=user.email||''}

    const save=()=>{
      const name=$('#popup-name-input').value.trim();
      const email=$('#popup-email-input').value.trim();
      if(!name){$('#popup-error').textContent='Please enter your name.';return}
      if(!/^\S+@\S+\.\S+$/.test(email)){$('#popup-error').textContent='Please enter a valid email.';return}
      saveUser({name,email});
      refreshProfile();
      openProfilePopup('Saved. You can now confirm your booking.');
    };
    $('#popup-save').addEventListener('click',save);
    popup.addEventListener('keydown',event=>{if(event.key==='Enter')save()});
    $('#popup-name-input').focus();
  }else{
    popup.innerHTML=`
      <div style="font-size:11px;color:#969baa;margin-bottom:4px">Signed in as</div>
      <div id="popup-name" style="font-size:16px;font-weight:700"></div>
      <div id="popup-email" style="font-size:13px;opacity:.85;margin:2px 0 10px;word-break:break-all"></div>
      <div id="popup-notice" style="color:#d8ff64;font-size:11px;margin-bottom:10px"></div>
      <button id="popup-edit" type="button" style="${buttonStyle};background:transparent;color:#f5f4f1;border:1px solid rgba(255,255,255,.3)">Edit details</button>`;
    document.body.appendChild(popup);
    // textContent keeps the name/email safe from HTML injection
    $('#popup-name').textContent=user.name;
    $('#popup-email').textContent=user.email;
    $('#popup-notice').textContent=notice||'';
    $('#popup-edit').addEventListener('click',()=>openProfilePopup('',true));
  }
}

(function setupProfile(){
  const button=findProfileElement();
  if(!button)return;
  refreshProfile();
  button.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    if(document.getElementById('user-popup'))closeProfilePopup();
    else openProfilePopup();
  });
  // click anywhere else, or press Escape, closes the panel
  document.addEventListener('click',event=>{if(!event.target.closest('#checkout-button'))closeProfilePopup()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeProfilePopup()});
})();