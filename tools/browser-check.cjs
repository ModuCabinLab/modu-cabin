// Development QA only. Install Playwright separately: npm install --no-save playwright
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.locator('#vehicle-select').selectOption('generic');
 await page.locator('#connect').click();
 assert.equal((await page.locator('#people-count').innerText()).replace(/\s+/g,''),'3명탑승');
 await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
 assert.match(await page.locator('#fan-value').innerText(),/^2/);
 fs.mkdirSync(path.join(__dirname,'../qa'),{recursive:true});
 await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'../qa/01-connected.png'),fullPage:true});
 await page.locator('#sleep').click();await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
 assert.match(await page.locator('#fan-value').innerText(),/^1/);
 await page.locator('#heat-off').click();await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
 await page.locator('#move').click();assert.match(await page.locator('#feedback').innerText(),/열선 미지원/);
 await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'../qa/02-moved.png'),fullPage:true});
 await page.locator('#next-trip').click();await page.locator('#connect').click();
 assert.equal(await page.locator('#heat-off').getAttribute('aria-pressed'),'false');
 assert.equal(await page.locator('#sleep').getAttribute('aria-pressed'),'false');
 await page.locator('#test-toggle').click();
 await page.locator('#conflict').check();assert.equal(await page.locator('[data-apply]').count(),0);
 await page.locator('#conflict').uncheck();await page.locator('#driving').check();
 assert.equal(await page.locator('#move').isDisabled(),true);assert.equal(await page.locator('[data-apply="0"]').isDisabled(),true);
 await page.locator('#driving').uncheck();
 await page.locator('#gateway-mode').selectOption('fail');await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'명령 실패'}).waitFor();
 await page.locator('#gateway-mode').selectOption('unreadable');await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'현재값 확인 불가'}).waitFor();
 assert.match(await page.locator('#fan-value').innerText(),/확인 불가/);
 await page.locator('#gateway-mode').selectOption('mismatch');await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'요청값과 현재값이 달라요'}).waitFor();
 assert.match(await page.locator('#fan-value').innerText(),/^5/);
 await page.locator('#move').click();await page.locator('#gateway-mode').selectOption('fail');await page.locator('[data-apply="0"]').click();
 await page.locator('#result-label').filter({hasText:'명령 실패'}).waitFor();
 assert.match(await page.locator('#feedback').innerText(),/명령 실패.*열선 미지원/);
 await page.locator('#gateway-mode').selectOption('normal');await page.locator('[data-apply="0"]').click();await page.locator('#manual').click();
 await page.locator('#result-label').filter({hasText:'수동 조작 우선'}).waitFor();
 assert.match(await page.locator('#fan-value').innerText(),/^3/);
 await page.locator('#test-toggle').click();
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'../qa/03-1280.png'),fullPage:true});
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 assert.equal(overflow,false);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'../qa/04-mobile.png'),fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

 const addedFlows=[];
 const expectedLayouts=[
  [4,[['driver','frontPassenger'],['rearLeft','rearRight']]],
  [5,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight']]],
  [6,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdRight']]],
  [7,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdRight']]],
  [8,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
 ];
 async function check(name,run){try{await run();addedFlows.push(name);}catch(error){error.message=name+': '+error.message;throw error;}}
 async function selectCapacity(capacity){
  await page.locator('[data-capacity="'+capacity+'"]').click();
  assert.equal(await page.locator('[data-capacity="'+capacity+'"]').getAttribute('aria-pressed'),'true');
 }
 async function peopleCount(expected){assert.equal((await page.locator('#people-count').innerText()).replace(/\s+/g,''),expected+'명탑승');}
 async function testPanel(visible){if((await page.locator('#test-panel').isVisible())!==visible)await page.locator('#test-toggle').click();}
 async function confirmedApply(){await page.locator('[data-apply="0"]').click();await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();}
 async function capture(name){await page.waitForTimeout(250);await page.screenshot({path:path.join(__dirname,'../qa',name),fullPage:true});}
 async function noOverflow(){
  const size=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(size.document<=size.viewport&&size.body<=size.viewport,JSON.stringify(size));
 }
 async function capacityDisabled(disabled){assert.equal(await page.locator('[data-capacity]').evaluateAll((buttons,state)=>buttons.every(button=>button.disabled===state),disabled),true);}
 async function selectedSeat(seat,label){
  assert.equal(await page.locator('[data-seat="'+seat+'"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#seat-grid [aria-pressed="true"]').count(),1);
  assert.match(await page.locator('#seat-detail').innerText(),label);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:4173');
 await page.locator('#vehicle-select').selectOption('generic');
 for(const [capacity,rows] of expectedLayouts){
  await check(capacity+'-seat desktop layout and full occupancy',async()=>{
   await selectCapacity(capacity);await page.locator('#fill-all').click();await peopleCount(capacity);
   assert.equal(await page.locator('#seat-grid [data-seat]').count(),capacity);
   assert.equal(await page.locator('#seat-grid .occupied').count(),capacity);
   assert.equal(await page.locator('#occupant-list [data-select-seat]').count(),capacity);
   const actualRows=await page.locator('#seat-grid [data-seat]').evaluateAll(elements=>{
    const rows=new Map();
    for(const element of elements){
     const y=element.transform.baseVal.getItem(0).matrix.f;
     if(!rows.has(y))rows.set(y,[]);
     rows.get(y).push(element.dataset.seat);
    }
    return [...rows.values()];
   });
   assert.deepEqual(actualRows,rows);
   const ids=await page.locator('#seat-grid .seat-id').allTextContents();
   assert.deepEqual(ids,'ABCDEFGH'.slice(0,capacity).split(''));
   assert.equal(new Set(ids).size,capacity);
   await confirmedApply();await noOverflow();await capture('layout-'+capacity+'.png');
  });
 }
 await check('full cabin has no empty move target',async()=>{
  assert.equal(await page.locator('#move').isDisabled(),true);
  assert.equal(await page.locator('#move-target').isDisabled(),true);
  assert.equal(await page.locator('#move-target').inputValue(),'');
  assert.match(await page.locator('#move-target').innerText(),/빈 좌석 없음/);
 });
 await check('mouse selection updates detail and roster',async()=>{
  await page.locator('[data-select-seat="thirdRight"]').click();
  await selectedSeat('thirdRight',/3열 오른쪽 · 동승자 H/);
  await page.locator('[data-seat="frontPassenger"]').click();
  await selectedSeat('frontPassenger',/조수석 · 동승자 B/);
  assert.equal(await page.locator('[data-select-seat="frontPassenger"]').getAttribute('aria-pressed'),'true');
 });
 await check('Enter and Space update detail and retain keyboard focus',async()=>{
  for(const [seat,key,label] of [['thirdLeft','Enter',/3열 왼쪽 · 동승자 F/],['rearCenter','Space',/2열 가운데 · 동승자 D/]]){
   await page.locator('[data-seat="'+seat+'"]').focus();
   await page.locator('[data-seat="'+seat+'"]').press(key);
   await selectedSeat(seat,label);
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.seat),seat);
  }
 });
 await check('B moves to third row with unsupported temporary heater request',async()=>{
  await page.locator('#connect').click();await page.locator('#heat-off').click();
  await page.locator('#move-target').selectOption('thirdRight');await page.locator('#move').click();
  await selectedSeat('thirdRight',/3열 오른쪽 · 동승자 B/);
  assert.match(await page.locator('#seat-detail').innerText(),/열선 미지원.*이번 탑승만 열선 끄기/s);
  assert.equal(await page.locator('[data-seat="frontPassenger"]').evaluate(element=>element.classList.contains('empty')),true);
  const ids=await page.locator('#seat-grid .seat-id').allTextContents();
  assert.equal(ids.filter(id=>id==='B').length,1);
  await confirmedApply();assert.match(await page.locator('#feedback').innerText(),/열선 미지원/);
 });
 await check('eight to four seats starts fresh trip and clears requests',async()=>{
  await page.locator('#sleep').click();await testPanel(true);await page.locator('#conflict').check();
  const previousTrip=Number((await page.locator('#trip-label').innerText()).match(/\d+$/)[0]);
  await selectCapacity(4);await peopleCount(0);
  assert.equal(Number((await page.locator('#trip-label').innerText()).match(/\d+$/)[0]),previousTrip+1);
  assert.equal(await page.locator('#seat-grid [data-seat]').count(),4);
  assert.equal(await page.locator('#seat-grid .occupied').count(),0);
  assert.equal(await page.locator('#occupant-list [data-select-seat]').count(),0);
  assert.equal(await page.locator('#heat-off').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#sleep').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#conflict').isChecked(),false);
  assert.equal(await page.locator('[data-apply]').count(),0);
  assert.match(await page.locator('#fan-value').innerText(),/^3/);
  assert.match(await page.locator('#seat-detail').innerText(),/23°/);
 });
 await check('driving disables all capacity options',async()=>{
  await page.locator('#connect').click();await page.locator('#driving').check();
  await capacityDisabled(true);await page.locator('#driving').uncheck();await capacityDisabled(false);
 });
 await check('pending application disables all capacity options',async()=>{
  await page.locator('[data-apply="0"]').click();await capacityDisabled(true);
  await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
  await capacityDisabled(false);await testPanel(false);
 });
 for(const width of [390,540]){
  await page.setViewportSize({width,height:844});
  for(const [capacity] of expectedLayouts){
   await check(width+'px mobile '+capacity+'-seat layout has no horizontal overflow',async()=>{
    await selectCapacity(capacity);await page.locator('#fill-all').click();await peopleCount(capacity);
    assert.equal(await page.locator('#seat-grid .occupied').count(),capacity);
    await noOverflow();
    if(capacity===8)await capture('layout-8-mobile-'+width+'.png');
   });
  }
 }

 const vehicleVariants=[
  ['ioniq5',5,[5],/아이오닉\s*5|IONIQ\s*5/i,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight']]],
  ['ioniq9',6,[6,7],/아이오닉\s*9|IONIQ\s*9/i,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdRight']]],
  ['ioniq9',7,[6,7],/아이오닉\s*9|IONIQ\s*9/i,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdRight']]],
  ['palisade',7,[7,9],/팰리세이드|PALISADE/i,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
  ['palisade',9,[7,9],/팰리세이드|PALISADE/i,[['driver','frontCenter','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
 ];
 const bodyPaths=new Map(),photoSources=new Map();
 async function modelPhoto(vehicleId,label){
  assert.equal(await page.locator('#vehicle-photo').isVisible(),true);
  await page.waitForFunction(()=>{const photo=document.getElementById('vehicle-photo');return photo.complete&&photo.naturalWidth>0;});
  assert.match(await page.locator('#vehicle-model-name').innerText(),label);
  assert.equal(await page.locator('.vehicle-svg').getAttribute('data-vehicle'),vehicleId);
  assert.ok((await page.locator('#vehicle-photo-caption').innerText()).trim().length>0);
 }
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:4173');
 await check('initial vehicle is the six-seat IONIQ 9',async()=>{
  assert.equal(await page.locator('#vehicle-select').inputValue(),'ioniq9');
  assert.equal(await page.locator('[data-capacity="6"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(await page.locator('[data-capacity]').evaluateAll(buttons=>buttons.map(button=>Number(button.dataset.capacity))),[6,7]);
  await peopleCount(0);await modelPhoto('ioniq9',/아이오닉\s*9|IONIQ\s*9/i);
 });
 for(const [vehicleId,capacity,allowed,label,rows] of vehicleVariants){
  await check(vehicleId+' '+capacity+'-seat model photo, rows, and full occupancy',async()=>{
   await page.locator('#vehicle-select').selectOption(vehicleId);await selectCapacity(capacity);
   assert.deepEqual(await page.locator('[data-capacity]').evaluateAll(buttons=>buttons.map(button=>Number(button.dataset.capacity))),allowed);
   await page.locator('#fill-all').click();await peopleCount(capacity);
   assert.equal(await page.locator('#seat-grid [data-seat]').count(),capacity);
   assert.equal(await page.locator('#seat-grid .occupied').count(),capacity);
   assert.equal(await page.locator('#occupant-list [data-select-seat]').count(),capacity);
   const renderedRows=await page.locator('#seat-grid [data-seat]').evaluateAll(elements=>{
    const grouped=new Map();
    for(const element of elements){
     const y=element.transform.baseVal.getItem(0).matrix.f;
     if(!grouped.has(y))grouped.set(y,[]);
     grouped.get(y).push(element.dataset.seat);
    }
    return [...grouped.values()];
   });
   assert.deepEqual(renderedRows,rows);
   const ids=await page.locator('#seat-grid .seat-id').allTextContents();
   const expectedIds=vehicleId==='palisade'&&capacity===9?'ADBCEFGHI':'ABCDEFGHI'.slice(0,capacity);
   assert.deepEqual(ids,expectedIds.split(''));
   assert.equal(new Set(ids).size,capacity);
   await modelPhoto(vehicleId,label);
   const body=await page.locator('#vehicle-body > path.body-shell').getAttribute('d');
   assert.ok(body&&body.trim().length>0);
   if(bodyPaths.has(vehicleId))assert.equal(body,bodyPaths.get(vehicleId));
   bodyPaths.set(vehicleId,body);
   photoSources.set(vehicleId,await page.locator('#vehicle-photo').getAttribute('src'));
   await confirmedApply();await noOverflow();await capture('hyundai-'+vehicleId+'-'+capacity+'.png');
  });
 }
 await check('three Hyundai models use distinct body paths and exterior images',async()=>{
  assert.equal(bodyPaths.size,3);assert.equal(new Set(bodyPaths.values()).size,3);
  assert.equal(photoSources.size,3);assert.equal(new Set(photoSources.values()).size,3);
 });
 await check('Palisade nine to IONIQ 5 resets capacity, occupants, temperatures, and requests',async()=>{
  await page.locator('#heat-off').click();await page.locator('#sleep').click();await confirmedApply();
  assert.equal(await page.locator('#heat-off').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#sleep').getAttribute('aria-pressed'),'true');
  const previousTrip=Number((await page.locator('#trip-label').innerText()).match(/\d+$/)[0]);
  await page.locator('#vehicle-select').selectOption('ioniq5');
  assert.equal(Number((await page.locator('#trip-label').innerText()).match(/\d+$/)[0]),previousTrip+1);
  assert.equal(await page.locator('[data-capacity="5"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#seat-grid [data-seat]').count(),5);
  assert.equal(await page.locator('#seat-grid .occupied').count(),0);
  await peopleCount(0);
  assert.equal(await page.locator('#heat-off').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#sleep').getAttribute('aria-pressed'),'false');
  assert.match(await page.locator('#seat-detail').innerText(),/23°/);
  assert.match(await page.locator('#fan-value').innerText(),/^3/);
  await modelPhoto('ioniq5',/아이오닉\s*5|IONIQ\s*5/i);
 });
 await check('driving disables the vehicle picker',async()=>{
  await page.locator('#connect').click();await testPanel(true);await page.locator('#driving').check();
  assert.equal(await page.locator('#vehicle-select').isDisabled(),true);
  await page.locator('#driving').uncheck();
  assert.equal(await page.locator('#vehicle-select').isDisabled(),false);
 });
 await check('pending application disables the vehicle picker',async()=>{
  await page.locator('[data-apply="0"]').click();
  assert.equal(await page.locator('#vehicle-select').isDisabled(),true);
  await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
  assert.equal(await page.locator('#vehicle-select').isDisabled(),false);await testPanel(false);
 });
 await check('390px Palisade nine-seat view loads photo without horizontal overflow',async()=>{
  await page.setViewportSize({width:390,height:844});
  await page.locator('#vehicle-select').selectOption('palisade');await selectCapacity(9);
  await page.locator('#fill-all').click();await peopleCount(9);await confirmedApply();
  assert.equal(await page.locator('#seat-grid .occupied').count(),9);
  await modelPhoto('palisade',/팰리세이드|PALISADE/i);
  await noOverflow();await capture('hyundai-palisade-9-mobile-390.png');
 });
 await check('full reset restores the default six-seat IONIQ 9',async()=>{
  await testPanel(true);await page.locator('#reset').click();
  assert.equal(await page.locator('#vehicle-select').inputValue(),'ioniq9');
  assert.equal(await page.locator('[data-capacity="6"]').getAttribute('aria-pressed'),'true');
  await peopleCount(0);
  assert.equal(await page.locator('#heat-off').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#sleep').getAttribute('aria-pressed'),'false');
  await modelPhoto('ioniq9',/아이오닉\s*9|IONIQ\s*9/i);
 });

 await page.setViewportSize({width:1440,height:900});await testPanel(false);
 await check('vacated front-seat heater stays visible until the next confirmed plan turns it off',async()=>{
  await page.locator('#connect').click();await confirmedApply();
  await page.locator('[data-seat="frontPassenger"]').click();
  assert.match(await page.locator('#seat-detail').innerText(),/열선 1단계/);
  await page.locator('#move-target').selectOption('thirdRight');await page.locator('#move').click();
  await page.locator('[data-seat="frontPassenger"]').click();
  assert.match(await page.locator('#seat-detail').innerText(),/빈 좌석 열선 1단계/);
  await confirmedApply();
  assert.match(await page.locator('#seat-detail').innerText(),/빈 좌석 열선 0단계/);
  await capture('review-vacated-heater-desktop.png');
 });
 await check('applied candidate follows confirmed selection and clears on change or failure',async()=>{
  assert.equal(await page.locator('.candidate.applied').count(),1);
  assert.match(await page.locator('[data-apply="0"]').innerText(),/적용됨/);
  assert.match(await page.locator('[data-apply="0"]').getAttribute('aria-label'),/적용됨/);
  await page.locator('[data-apply="1"]').click();
  await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();
  assert.equal(await page.locator('.candidate.applied [data-apply="1"]').count(),1);
  assert.equal(await page.locator('.candidate.applied [data-apply="0"]').count(),0);
  await page.locator('#sleep').click();
  assert.equal(await page.locator('.candidate.applied').count(),0);
  await confirmedApply();assert.equal(await page.locator('.candidate.applied').count(),1);
  await testPanel(true);await page.locator('#gateway-mode').selectOption('fail');
  await page.locator('[data-apply="0"]').click();
  await page.locator('#result-label').filter({hasText:'명령 실패'}).waitFor();
  assert.equal(await page.locator('.candidate.applied').count(),0);
  await page.locator('#gateway-mode').selectOption('normal');await page.locator('#sleep').click();
 });
 await check('conflict details and support notes retain separate actionable feedback',async()=>{
  await confirmedApply();
  assert.match(await page.locator('#feedback > span').first().innerText(),/적용 결과를 확인/);
  assert.match(await page.locator('#feedback .support-note').innerText(),/동승자 B.*3열 오른쪽.*시뮬레이터 열선 미지원/);
  assert.equal(await page.locator('#feedback').evaluate(element=>element.classList.contains('warn')),false);
  const titles=await page.locator('.candidate h4').allTextContents();
  assert.equal(new Set(titles).size,titles.length);
  assert.match(await page.locator('.candidate p').first().innerText(),/동승자 B 2단계 이하/);
  await page.locator('#conflict').check();
  assert.equal(await page.locator('[data-apply]').count(),0);
  const conflict=await page.locator('.empty-suggestion.conflict').innerText();
  assert.match(conflict,/운전자 A 4단계 이상/);assert.match(conflict,/동승자 B 2단계 이하/);
  assert.match(await page.locator('#feedback > span').first().innerText(),/공용 풍량이 충돌/);
  assert.match(await page.locator('#feedback .support-note').innerText(),/시뮬레이터 열선 미지원/);
  await capture('review-conflict-desktop.png');
  await page.setViewportSize({width:390,height:844});await noOverflow();
  await capture('review-conflict-mobile-390.png');
  await page.locator('#conflict').uncheck();await page.locator('#gateway-mode').selectOption('fail');
  await page.locator('[data-apply="0"]').click();await page.locator('#result-label').filter({hasText:'명령 실패'}).waitFor();
  assert.match(await page.locator('#feedback > span').first().innerText(),/명령 실패/);
  assert.match(await page.locator('#feedback .support-note').innerText(),/시뮬레이터 열선 미지원/);
  await page.locator('#gateway-mode').selectOption('normal');await testPanel(false);
  await page.locator('[data-seat="frontPassenger"]').click();
  assert.match(await page.locator('#seat-detail').innerText(),/빈 좌석 열선 0단계/);
  await capture('review-vacated-heater-mobile-390.png');
 });

 for(const width of [390,540]){
  await check(width+'px request labels and toggles remain inside their buttons',async()=>{
   await page.setViewportSize({width,height:844});
   const overflow=await page.locator('.request-buttons > button').evaluateAll(buttons=>buttons.flatMap(button=>{
    const bounds=button.getBoundingClientRect();
    return [...button.children].filter(child=>{const rect=child.getBoundingClientRect();return rect.left<bounds.left-0.5||rect.right>bounds.right+0.5;}).map(child=>({button:button.id,child:child.className||'label'}));
   }));
   assert.deepEqual(overflow,[]);await noOverflow();
  });
 }
 await page.setViewportSize({width:1440,height:900});
 await testPanel(true);await page.locator('#reset').click();await testPanel(false);
 await page.locator('#connect').click();await confirmedApply();
 await capture('review-preview.png');

 assert.deepEqual(errors,[]);
 const result={passed:true,flows:13+addedFlows.length,additionalFlows:addedFlows,viewports:['1440x900','1280x720','390x844','540x844'],pageErrors:errors};
 fs.writeFileSync(path.join(__dirname,'../qa/browser-review-result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));
 await browser.close();
})().catch(async e=>{console.error(e);await browser?.close();process.exitCode=1;});
