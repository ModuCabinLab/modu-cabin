// Record a real browser interaction. No frame contains fabricated app state.
// Requires local app server, Playwright, Google Chrome and FFmpeg on PATH.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const {once}=require('node:events');
const portrait=process.env.DEMO_FORMAT==='portrait';
const pause=ms=>new Promise(r=>setTimeout(r,ms*(portrait?.52:1)));
(async()=>{
 const out=path.resolve(__dirname,'../artifacts');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:portrait?{width:540,height:960}:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173');
 await page.evaluate(portrait=>{
  const caption=document.createElement('div');caption.id='video-caption';caption.className='caption-bar';caption.style.pointerEvents='none';document.body.append(caption);
  if(portrait)document.body.style.paddingBottom='180px';
  const cursor=document.createElement('div');cursor.id='video-cursor';Object.assign(cursor.style,{position:'fixed',width:'20px',height:'20px',border:'2px solid #e7ca8c',borderRadius:'50%',pointerEvents:'none',zIndex:30,boxShadow:'0 0 0 5px #e7ca8c22',left:'800px',top:'800px'});document.body.append(cursor);
  if(portrait){const label=document.createElement('div');label.textContent='모두의 캐빈 · 시연용 시뮬레이션';Object.assign(label.style,{position:'fixed',top:'8px',right:'12px',zIndex:40,background:'#111b1cee',color:'#c7e1d2',border:'1px solid #6a8572',borderRadius:'20px',fontSize:'11px',padding:'7px 12px'});document.body.append(label);}
 },portrait);
 const videoPath=path.join(out,portrait?'modu-cabin-shortform.mp4':'modu-cabin-browser-demo.mp4');
 const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','mjpeg','-framerate','12','-i','pipe:0','-an',...(portrait?['-vf','scale=1080:1920:flags=lanczos']:[]),'-c:v','libx264','-preset','veryfast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',videoPath],{windowsHide:true,stdio:['pipe','ignore','pipe']});
 let ffError='';ff.stderr.on('data',x=>ffError+=x.toString());
 const done=once(ff,'exit');let recording=true;let frames=0;const chapters=[];
 const capture=(async()=>{while(recording){const start=Date.now();const jpg=await page.screenshot({type:'jpeg',quality:88});if(!ff.stdin.write(jpg))await once(ff.stdin,'drain');frames++;await new Promise(r=>setTimeout(r,Math.max(0,1000/12-(Date.now()-start))));}})();
 async function caption(title,text){chapters.push({seconds:Number((frames/12).toFixed(2)),title,text});await page.evaluate(({title,text})=>{const node=document.getElementById('video-caption');node.replaceChildren();const small=document.createElement('small');small.textContent=title;node.append(small,document.createTextNode(text));},{title,text});}
 async function click(selector){const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();const box=await el.boundingBox();await page.evaluate(({x,y})=>{const p=document.getElementById('video-cursor');p.style.left=x-10+'px';p.style.top=y-10+'px';},{x:box.x+box.width/2,y:box.y+box.height/2});await pause(500);await el.click();}
 async function apply(){await click('[data-apply="0"]');await page.locator('#result-label').filter({hasText:'가상 상태 확인 완료'}).waitFor();}
 await caption('모두의 캐빈 · 실제 실행 화면','좌석마다 다른 취향을, 함께 편안한 설정으로');await pause(4500);
 await caption('01 · 현대차 모델별 좌석 구성','아이오닉 5는 5인승, 아이오닉 9는 6·7인승을 선택합니다');await page.locator('#vehicle-select').selectOption('ioniq5');await page.locator('.vehicle-svg').scrollIntoViewIfNeeded();await pause(2800);await page.locator('#vehicle-select').selectOption('ioniq9');await click('[data-capacity="7"]');await page.locator('.vehicle-svg').scrollIntoViewIfNeeded();await pause(2800);
 await caption('02 · 팰리세이드 9인승','1열 가운데까지 3+3+3, 아홉 명의 취향을 함께 조율합니다');await page.locator('#vehicle-select').selectOption('palisade');await click('[data-capacity="9"]');await click('#fill-all');await page.locator('.vehicle-svg').scrollIntoViewIfNeeded();await pause(4500);
 await caption('03 · 탑승자와 좌석 연결','아이오닉 9 6인승에 가족 세 사람의 선호를 연결합니다');await page.locator('#vehicle-select').selectOption('ioniq9');await click('#connect');await page.locator('.vehicle-svg').scrollIntoViewIfNeeded();await pause(4500);
 await caption('04 · 공용 풍량 조율','모두의 허용 범위 안에서 제안하고, 선택한 값만 적용합니다');await apply();await pause(5500);
 await caption('05 · 보호자가 선택하는 수면 요청','아이의 수면 선호와 함께 탄 사람의 범위를 함께 고려합니다');await click('#sleep');await pause(2500);await apply();await pause(5000);
 await caption('06 · 이번 탑승만 열선 끄기','임시 요청은 반영하고, 저장한 열선 선호는 그대로 둡니다');await click('#heat-off');await pause(2500);await apply();await pause(5000);
 await caption('07 · 자리를 바꿔도 같은 취향','B의 취향을 3열로 옮깁니다. 이 시뮬레이터의 열선 제어는 앞좌석만 지원합니다.');await click('#move');await page.locator('.vehicle-svg').scrollIntoViewIfNeeded();await pause(3000);await apply();await pause(5000);
 await caption('08 · 다음 탑승','임시 요청을 지우고, 저장된 선호로 다시 시작합니다');await click('#next-trip');await pause(2000);await click('#connect');await apply();await pause(5000);
 await caption('09 · 비워진 자리의 열선까지','B가 다시 이동한 뒤 제안을 적용하면, 빈 조수석의 열선도 0단계로 확인됩니다');await click('#move');await apply();await click('[data-seat="frontPassenger"]');await page.locator('#seat-detail').scrollIntoViewIfNeeded();await page.locator('#seat-detail').filter({hasText:'빈 좌석 열선 0단계'}).waitFor();await pause(5500);
 await caption('10 · 확인할 수 없다면 완료로 표시하지 않기','명령 실패를 가정해 처리 결과를 확인합니다');await click('#test-toggle');await page.locator('#gateway-mode').selectOption('fail');await click('[data-apply="0"]');await page.locator('#result-label').filter({hasText:'명령 실패'}).waitFor();await click('#test-toggle');await page.locator('.comfort-card').scrollIntoViewIfNeeded();await pause(5000);
 await caption('모두의 캐빈 · 시연용 프로토타입','브라우저 실행 샘플 · Android APK · 소스코드 공개');await pause(4000);
 await caption('현재 구현 범위','차량 상태는 시뮬레이션입니다. 실제 Pleos SDK 연동은 후속 검증 대상입니다.');await pause(5000);
 recording=false;await capture;ff.stdin.end();const [code]=await done;await browser.close();
 if(code!==0)throw new Error(ffError);if(errors.length)throw new Error(errors.join('\n'));
 fs.writeFileSync(path.join(out,portrait?'shortform-chapters.json':'video-chapters.json'),JSON.stringify({frames,fps:12,durationSeconds:frames/12,chapters},null,2));
 console.log(JSON.stringify({videoPath,frames,durationSeconds:frames/12,pageErrors:errors}));
})().catch(e=>{console.error(e);process.exitCode=1;});
