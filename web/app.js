(()=>{
  'use strict';
  const {Cabin,SimulationGateway,seatNames}=window.CabinCore;
  let cabin=new Cabin({vehicleId:'ioniq9'}),gateway=new SimulationGateway({vehicleId:'ioniq9'}),selectedSeat='driver',moveTarget='';
  // 차량(시뮬레이터)이 보고한 지원 범위를 먼저 조회한 뒤 제안을 만든다.
  const syncCapabilities=()=>cabin.setCapabilities(gateway.capabilities());
  syncCapabilities();
  const $=id=>document.getElementById(id);
  let message='가족 또는 전 좌석 샘플을 연결하면 설정을 제안해요.',warning=false;
  const statusText={confirmed:'가상 상태 확인 완료',failed:'명령 실패 · 재확인 필요',unconfirmed:'현재값 확인 불가',manual:'수동 조작 우선',cancelled:'변경 요청 취소',blocked:'정차 후 적용',stale:'새 제안 확인 필요',busy:'확인 중'};
  function tell(text,warn=false){message=text;warning=warn;render();}
  let drawnVehicle='';
  const genericBody=$('vehicle-body').innerHTML;
  function renderVehicle(){
    const id=cabin.vehicleId;
    document.querySelector('.vehicle-svg').dataset.vehicle=id;
    $('steering-wheel').setAttribute('transform','translate('+(cabin.layout.rows[0].length===3?154:166)+' 231)');
    if(drawnVehicle===id)return;
    drawnVehicle=id;
    $('vehicle-photo-card').hidden=id==='generic';
    $('vehicle-model-name').textContent=cabin.vehicle.name;
    if(id!=='generic'){$('vehicle-photo').src=id+'.jpg';$('vehicle-photo').alt='현대 '+cabin.vehicle.name+' 공식 외관 참고 사진';}
    $('vehicle-photo-caption').textContent=id==='ioniq5'?'현대자동차그룹 · 2027':'현대자동차그룹 · 2027 블랙잉크';
    if(id==='generic'){$('vehicle-body').innerHTML=genericBody;return;}
    const shape={
      ioniq5:{body:'M125 57H335L360 83 371 161V548l-25 83H114l-25-83V161l11-78Z',hood:'M112 96H348l8 55-23-12H127l-23 12Z',glass:'M113 168H347l-16 49H129Z',rear:'M121 574h218l-14 35H135Z',paint:['#879498','#e6ebed','#a7b4b8'],hoodColor:'#c6d1d4'},
      ioniq9:{body:'M230 27c-78 0-122 17-133 62l-8 92v365c0 73 28 106 141 106s141-33 141-106V181l-8-92C352 44 308 27 230 27Z',hood:'M108 90Q230 57 352 90l6 63q-128-24-256 0Z',glass:'M107 166q123-27 246 0l-12 51q-111-15-222 0Z',rear:'M117 583h226l-10 41q-103 14-206 0Z',paint:['#253137','#637370','#303f43'],hoodColor:'#485b59'},
      palisade:{body:'M125 32h210q29 0 32 36l7 110v394q0 72-43 77H129q-43-5-43-77V178l7-110q3-36 32-36Z',hood:'M110 77h240l7 80H103Z',glass:'M107 169q123-12 246 0l-9 47H116Z',rear:'M114 588h232v35H114Z',paint:['#202833','#586471','#28343f'],hoodColor:'#45525e'}
    }[id];
    const paint='<defs><linearGradient id="model-paint"><stop stop-color="'+shape.paint[0]+'"/><stop offset=".18" stop-color="'+shape.paint[1]+'"/><stop offset=".48" stop-color="'+shape.paint[1]+'"/><stop offset="1" stop-color="'+shape.paint[2]+'"/></linearGradient></defs>';
    const tires='<g fill="#293734"><rect x="75" y="133" width="27" height="104" rx="10"/><rect x="358" y="133" width="27" height="104" rx="10"/><rect x="75" y="465" width="27" height="104" rx="10"/><rect x="358" y="465" width="27" height="104" rx="10"/></g>';
    let lamps='';
    if(id==='ioniq5')lamps='<path d="M101 77h70v12h-70ZM289 77h70v12h-70Z" fill="#edfaff" stroke="#283f47" stroke-width="3"/>'+[110,124,138,304,318,332].map(x=>'<rect x="'+x+'" y="79" width="9" height="8" fill="white"/>').join('')+'<path d="M105 615h250v12H105Z" fill="#392e31"/>'+Array.from({length:16},(_,i)=>'<rect x="'+(111+i*15)+'" y="617" width="9" height="7" fill="#c46b67"/>').join('');
    if(id==='ioniq9')lamps='<path d="M108 68q122-16 244 0" fill="none" stroke="#192b32" stroke-width="16"/>'+Array.from({length:23},(_,i)=>'<rect x="'+(112+i*10)+'" y="'+(62-Math.sin(i/22*Math.PI)*9)+'" width="7" height="6" rx="1" fill="#eafaff"/>').join('')+'<path d="M105 580v44q125 28 250 0v-44" fill="none" stroke="#b76059" stroke-width="8" stroke-dasharray="4 3"/>';
    if(id==='palisade')lamps='<rect x="140" y="43" width="180" height="16" rx="3" fill="#15212c"/><path d="M148 48h164M148 54h164" stroke="#64717b"/>'+[0,1,2,3].map(i=>'<path d="M101 '+(67+i*12)+'h22v7h-22ZM337 '+(67+i*12)+'h22v7h-22Z" fill="#edfaff"/>').join('')+'<path d="M99 580v46M361 580v46" stroke="#ce8580" stroke-width="9" stroke-dasharray="8 4"/>';
    const rails=id==='ioniq5'?'':'<path d="M99 246v302M361 246v302" stroke="#9aa6a8" stroke-width="4" stroke-linecap="round"/>';
    $('vehicle-body').innerHTML=paint+tires+'<path class="body-shell" d="'+shape.body+'" fill="url(#model-paint)" stroke="#768989" stroke-width="2"/>'+
      '<path d="'+shape.hood+'" fill="'+shape.hoodColor+'" stroke="#7b8e8d" stroke-width="1.5"/><path d="M132 95l-7 46M328 95l7 46" stroke="#b0bcbb" opacity=".5"/>'+lamps+
      '<path d="'+shape.glass+'" fill="url(#glass)" stroke="#1f373b" stroke-width="4"/><path d="M135 171l-6 28M326 165l-7 30" stroke="#c6e2df" stroke-width="6" opacity=".3"/>'+
      '<path d="M90 218l-28 7q-12 20 2 25l27-4M370 218l28 7q12 20-2 25l-27-4" fill="'+shape.paint[2]+'" stroke="#788e87" stroke-width="2"/>'+
      '<rect x="108" y="229" width="244" height="348" rx="'+(id==='palisade'?15:28)+'" fill="#263c35"/><rect x="115" y="236" width="230" height="334" rx="'+(id==='palisade'?11:22)+'" fill="#edf0e9"/>'+
      '<path d="M92 266v126h-3M368 266v126h3M92 405v143M368 405v143" fill="none" stroke="#94a5a1" opacity=".6"/>'+
      '<path d="M92 297v25M368 297v25M92 446v25M368 446v25" stroke="#cad5d1" stroke-width="4" stroke-linecap="round"/>'+rails+
      '<path d="'+shape.rear+'" fill="url(#glass)" stroke="#273e41" stroke-width="3"/><path d="M150 638h160" stroke="#a2b5ad" stroke-width="3"/>'+
      '<text x="230" y="113" text-anchor="middle" fill="#dbe7e1" font-size="11" letter-spacing="3">HYUNDAI</text>';
  }
  function drawSeat(seat,x,y,w){
    const id=cabin.seats[seat],p=id&&cabin.profiles[id],temp=cabin.observed?.['temp:'+seat]??'?';
    const label=seatNames[seat]+' · '+(p?p.name:'빈 좌석');
    return '<g class="seat '+(p?'occupied':'empty')+(selectedSeat===seat?' selected':'')+(id==='C'&&cabin.sleep?' sleeping':'')+'" data-seat="'+seat+'" transform="translate('+x+' '+y+')" role="button" tabindex="0" aria-label="'+label+'" aria-pressed="'+(selectedSeat===seat)+'">'+
      '<rect class="selection-ring" x="-5" y="-4" width="'+(w+10)+'" height="106" rx="14"/>'+
      '<rect class="seat-head" x="'+w*.25+'" y="0" width="'+w*.5+'" height="14" rx="5"/>'+
      '<rect class="seat-back" x="0" y="18" width="'+w+'" height="49" rx="12"/>'+
      '<path class="seat-stitch" d="M9 27v30M'+(w-9)+' 27v30"/>'+
      '<rect class="seat-bottom" x="0" y="71" width="'+w+'" height="24" rx="8"/>'+
      '<text class="seat-id" x="'+w/2+'" y="44">'+(id||'+')+'</text>'+
      '<text class="seat-temp" x="'+w/2+'" y="61">'+(p?temp+'°':'')+'</text>'+
      '<text class="seat-label" x="'+w/2+'" y="87">'+seatNames[seat]+'</text></g>';
  }
  function renderSeats(){
    const rows=cabin.layout.rows;
    renderVehicle();
    $('seat-grid').innerHTML=rows.map((row,r)=>{
      const y=rows.length===2?[259,438][r]:249+r*111;
      const w=row.length===2?78:62,positions=row.length===2?[127,255]:[123,199,275];
      return row.map((seat,i)=>drawSeat(seat,positions[i],y,w)).join('');
    }).join('');
    const occupied=Object.entries(cabin.seats).filter(([,id])=>id);
    document.querySelector('.cabin-stage').classList.toggle('full-cabin',occupied.length>4);
    $('roster-count').textContent=occupied.length;
    $('occupant-list').innerHTML=occupied.length?occupied.map(([seat,id])=>'<button class="occupant-item '+(selectedSeat===seat?'selected':'')+'" data-select-seat="'+seat+'" aria-pressed="'+(selectedSeat===seat)+'"><span class="avatar">'+id+'</span><span><strong>'+cabin.profiles[id].name+'</strong><small>'+seatNames[seat]+'</small></span></button>').join(''):'<p class="roster-empty">아직 연결된<br>탑승자가 없어요.</p>';
    const id=cabin.seats[selectedSeat],p=id&&cabin.profiles[id],temp=cabin.observed?.['temp:'+selectedSeat]??'—';
    let note=p?'선호 '+p.temp+'° · ':'좌석에 프로필을 연결해 주세요.'+(cabin.capabilities.heatSeats.includes(selectedSeat)?' · 빈 좌석 열선 '+(cabin.observed?.['heat:'+selectedSeat]??'?')+'단계':'');
    if(p)note+=(p.heat>0||cabin.temporary[id])?'<span class="heat-detail">'+(cabin.capabilities.heatSeats.includes(selectedSeat)?'열선 '+(cabin.observed?.['heat:'+selectedSeat]??'?')+'단계':'시뮬레이터 열선 미지원')+' · 저장 '+p.heat+'단계</span>':id==='C'&&cabin.sleep?'보호자가 수면 요청을 선택했어요.':'취향은 자리가 바뀌어도 함께 이동해요.';
    if(p&&cabin.temporary[id])note+='<br>이번 탑승만 열선 끄기';
    $('seat-detail').innerHTML='<span class="detail-icon">'+(id||'+')+'</span><div class="detail-main"><strong>'+seatNames[selectedSeat]+(p?' · '+p.name:' · 빈 좌석')+'</strong><p>'+note+'</p></div><div class="detail-metric">'+temp+'°<small>가상 현재값</small></div>';
  }
  function render(){
    const connected=Object.values(cabin.seats).filter(Boolean).length;
    $('trip-label').textContent='OUR SPACE · '+String(cabin.trip).padStart(2,'0');
    $('people-count').innerHTML=connected+'<span>명 탑승</span>';
    $('capacity-summary').textContent=cabin.vehicle.name+' · '+cabin.capacity+'인승';
    $('vehicle-select').value=cabin.vehicleId;
    $('vehicle-select').disabled=cabin.driving||cabin.busy;
    $('vehicle-model-year').textContent=cabin.vehicle.year?cabin.vehicle.year+' · 국내 모델':'자유 배치 샘플';
    $('capacity-options').innerHTML=cabin.vehicle.capacities.map(n=>'<button data-capacity="'+n+'" aria-pressed="'+(n===cabin.capacity)+'">'+n+'인</button>').join('');
    $('layout-note').textContent=cabin.vehicleId==='generic'?'차종과 무관한 자유 배치입니다. 구성을 바꾸면 새 탑승으로 시작해요.':'차종·정원 변경 시 새 탑승 · 실제 좌석 구성 참고 · 제어값은 시뮬레이션';
    $('layout-description').textContent=cabin.layout.rows.length+'열 · '+cabin.layout.rows.map(r=>r.length).join(' + ')+' 배치';
    $('welcome-detail').textContent=connected?'사람마다 다른 취향을, 한 공간에서 조율합니다.':'좌석을 연결하고, 함께 편안한 설정을 골라 보세요.';
    document.querySelectorAll('[data-capacity]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.capacity)===cabin.capacity));b.disabled=cabin.driving||cabin.busy;});
    renderSeats();
    const fan=cabin.observed?.fan;
    $('fan-value').innerHTML=(fan??'—')+' <small>'+(fan===undefined?'확인 불가':'단계')+'</small>';
    $('fan-bars').innerHTML=Array.from({length:5},(_,i)=>'<i class="'+(i<fan?'on':'')+'" style="height:'+(11+i*5)+'px"></i>').join('');
    $('result-label').textContent=cabin.busy?'요청 후 현재값 확인 중…':cabin.result?.status==='unconfirmed'&&cabin.result.reason==='mismatch'?'요청값과 현재값이 달라요':statusText[cabin.result?.status]||'가상 차량 현재값';
    $('result-label').className='state-label '+(cabin.result?.status==='confirmed'?'success':cabin.result&&['failed','unconfirmed'].includes(cabin.result.status)?'error':'');
    const plan=cabin.plan();
    $('suggestion-count').textContent=plan.conflict?'선택 필요':connected?plan.candidates.length+'개 제안':'연결 대기';
    $('suggestions').innerHTML=plan.conflict?'<div class="empty-suggestion conflict"><strong>공용 풍량의 허용 범위가 겹치지 않아요.</strong>'+(plan.conflictDetail?'<span>'+plan.conflictDetail+'</span>':'')+'임의로 적용하지 않아요. 취향을 다시 확인해 주세요.</div>':!connected?'<div class="empty-suggestion">아직 연결된 탑승자가 없어요.<br>프로필을 연결하면 함께 편안한 설정을 제안해요.</div>':plan.candidates.map((p,i)=>{const applied=cabin.result?.status==='confirmed'&&Object.entries(p.values).every(([k,v])=>cabin.observed?.[k]===v);return '<article class="candidate '+(i?'secondary':'')+(applied?' applied':'')+'"><div><h4><span class="dot"></span>'+p.title+'</h4><p>공용 풍량 '+p.values.fan+'단계 · 좌석별 선호 온도<br>'+p.reason+'</p></div><button data-apply="'+i+'" '+(cabin.driving||cabin.busy?'disabled':'')+(applied?' aria-label="'+p.title+' 적용됨"':'')+'>'+(applied?'적용됨 ✓':'적용하기')+'</button></article>';}).join('');
    $('connect').disabled=$('fill-all').disabled=cabin.driving||cabin.busy;
    $('connect').innerHTML='가족 3명 연결 <span>↗</span>';
    $('fill-all').textContent='전 '+cabin.capacity+'석 샘플';
    $('next-trip').disabled=cabin.driving;
    $('sleep').disabled=!Object.values(cabin.seats).includes('C')||cabin.driving||cabin.busy;
    $('sleep').classList.toggle('active',cabin.sleep);$('sleep').setAttribute('aria-pressed',String(cabin.sleep));
    $('heat-off').disabled=!Object.values(cabin.seats).includes('B')||cabin.driving||cabin.busy;
    $('heat-off').classList.toggle('active',!!cabin.temporary.B);$('heat-off').setAttribute('aria-pressed',String(!!cabin.temporary.B));
    $('heat-off').querySelector('.request-check').textContent=cabin.temporary.B?'✓':'+';
    const empty=Object.keys(cabin.seats).filter(s=>!cabin.seats[s]),hasB=Object.values(cabin.seats).includes('B');
    if(!empty.includes(moveTarget))moveTarget=empty.includes(cabin.capacity>=6?'thirdRight':'rearRight')?(cabin.capacity>=6?'thirdRight':'rearRight'):empty[0]||'';
    $('move-target').innerHTML=!hasB?'<option value="">프로필 연결 대기</option>':empty.length?empty.map(s=>'<option value="'+s+'">'+seatNames[s]+'</option>').join(''):'<option value="">빈 좌석 없음</option>';
    if(hasB)$('move-target').value=moveTarget;
    $('move-target').disabled=$('move').disabled=!hasB||!empty.length||cabin.driving||cabin.busy;
    $('driving-state').textContent=cabin.driving?'● 주행 중 · 조작 제한':'● 정차 중';
    const main=document.createElement('span'),fb=$('feedback');main.textContent=message;fb.replaceChildren(main);
    if(plan.unsupported.length){const note=document.createElement('span');note.className='support-note';note.textContent=' '+plan.unsupported.join(' / ')+' · 지원되는 기능만 제안해요.';fb.append(note);}
    fb.className='feedback '+(warning?'warn':'');
  }
  function action(fn){try{fn()}catch(e){tell(e.message,true)}}
  function selectSeat(seat){if(Object.hasOwn(cabin.seats,seat)){selectedSeat=seat;renderSeats();}}
  $('seat-grid').onclick=e=>{const seat=e.target.closest('[data-seat]');if(seat)selectSeat(seat.dataset.seat);};
  $('seat-grid').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){const seat=e.target.closest('[data-seat]');if(seat){e.preventDefault();const id=seat.dataset.seat;selectSeat(id);document.querySelector('[data-seat="'+id+'"]').focus();}}};
  $('occupant-list').onclick=e=>{const seat=e.target.closest('[data-select-seat]');if(seat)selectSeat(seat.dataset.selectSeat);};
  function resetVehicleView(){gateway=new SimulationGateway({vehicleId:cabin.vehicleId,capacity:cabin.capacity,mode:gateway.mode});syncCapabilities();selectedSeat='driver';moveTarget='';$('conflict').checked=false;tell(cabin.vehicle.name+' '+cabin.capacity+'인승으로 새 탑승을 시작했어요. 프로필을 연결해 주세요.');}
  $('vehicle-select').onchange=e=>action(()=>{cabin.setVehicle(e.target.value);resetVehicleView();});
  $('capacity-options').onclick=e=>{const b=e.target.closest('[data-capacity]');if(!b||b.disabled||Number(b.dataset.capacity)===cabin.capacity)return;action(()=>{cabin.setLayout(Number(b.dataset.capacity));resetVehicleView();});};
  $('connect').onclick=()=>action(()=>{cabin.connectFamily();selectedSeat='driver';moveTarget='';tell('3명의 선호를 불러왔어요. 적용할 설정을 직접 골라 주세요.');});
  $('fill-all').onclick=()=>action(()=>{cabin.connectAll();selectedSeat='driver';tell(cabin.capacity+'명 모두 연결했어요. 전 좌석의 선호를 함께 고려해요.');});
  $('sleep').onclick=()=>action(()=>{cabin.setSleep(!cabin.sleep);selectedSeat=Object.keys(cabin.seats).find(s=>cabin.seats[s]==='C')||selectedSeat;tell(cabin.sleep?'보호자가 아이의 수면을 선택했어요. 풍량 1단계를 제안해요.':'수면 요청을 해제했어요. 기본 선호로 다시 조율해요.');});
  $('heat-off').onclick=()=>action(()=>{cabin.heatOffThisTrip('B');selectedSeat=Object.keys(cabin.seats).find(s=>cabin.seats[s]==='B')||selectedSeat;tell('B의 열선 끄기를 제안에 반영했어요. 저장 선호는 1단계로 유지해요.');});
  $('move-target').onchange=e=>{moveTarget=e.target.value;};
  $('move').onclick=()=>action(()=>{const target=moveTarget;cabin.move('B',target);selectedSeat=target;tell('B의 취향이 '+seatNames[target]+'으로 이동했어요. 좌석별 지원 기능을 다시 확인했어요.');});
  $('next-trip').onclick=()=>action(()=>{cabin.nextTrip();selectedSeat='driver';moveTarget='';$('conflict').checked=false;tell('새 탑승을 시작했어요. 임시 요청은 지우고 저장한 선호만 남겼어요.');});
  $('suggestions').onclick=async event=>{
    const button=event.target.closest('[data-apply]');if(!button||button.disabled)return;
    const candidate=cabin.plan().candidates[Number(button.dataset.apply)],activeCabin=cabin;
    const promise=cabin.apply(candidate,gateway);message='명령 요청 뒤 가상 차량의 현재값을 다시 확인하고 있어요.';warning=false;render();
    const result=await promise;if(activeCabin!==cabin)return;
    if(result.status==='cancelled'){render();return;}
    tell(result.status==='confirmed'?'요청한 값과 가상 차량 현재값이 일치해요. 적용 결과를 확인했어요.':(result.reason==='mismatch'?'요청값과 현재값이 달라요':statusText[result.status])+' · 성공으로 표시하지 않아요.',result.status!=='confirmed');
  };
  $('test-toggle').onclick=()=>{const panel=$('test-panel');panel.hidden=!panel.hidden;$('test-toggle').setAttribute('aria-expanded',String(!panel.hidden));};
  $('gateway-mode').onchange=e=>{gateway.mode=e.target.value;tell('시연용 차량 응답을 바꿨어요. 제안을 적용해 결과를 확인해 보세요.');};
  $('driving').onchange=e=>{cabin.setDriving(e.target.checked);tell(cabin.driving?'주행 중에는 좌석 변경과 복잡한 설정 적용을 보류해요.':'정차 상태예요. 좌석과 제안을 다시 확인할 수 있어요.');};
  $('conflict').onchange=e=>{cabin.setConflict(e.target.checked);const detail=cabin.plan().conflictDetail;tell(e.target.checked?(detail?detail+'를 원해요. ':'')+'공용 풍량이 충돌해요.':'허용 범위가 다시 겹쳐 설정을 제안할 수 있어요.',e.target.checked);};
  $('manual').onclick=()=>{cabin.manualFan(3,gateway);tell('사용자가 직접 바꾼 풍량 3단계를 우선해요. 진행 중 요청은 취소해요.');};
  $('reset').onclick=()=>{cabin.change();cabin=new Cabin({vehicleId:'ioniq9'});gateway=new SimulationGateway({vehicleId:'ioniq9'});syncCapabilities();selectedSeat='driver';moveTarget='';$('gateway-mode').value='normal';$('driving').checked=false;$('conflict').checked=false;tell('가족 또는 전 좌석 샘플을 연결하면 설정을 제안해요.');};
  render();
})();
