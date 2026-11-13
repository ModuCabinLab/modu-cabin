const test = require('node:test');
const assert = require('node:assert/strict');
const {Cabin, SimulationGateway, layouts, seatNames, vehicles} = require('../web/cabin-core.js');

test('shared fan candidates stay in every occupant range and separate zone temperatures', () => {
  const c = new Cabin(); c.connectFamily();
  const p = c.plan();
  assert.ok(p.candidates.length > 0 && p.candidates.length <= 3);
  assert.deepEqual(p.candidates.map(x=>x.values.fan), [2,1]);
  assert.equal(p.candidates[0].values['temp:driver'], 22);
  assert.equal(p.candidates[0].values['temp:frontPassenger'], 24);
});
test('conflicting shared ranges produce no actionable candidate', () => {
  const c = new Cabin(); c.connectFamily(); c.setConflict(true);
  assert.equal(c.plan().candidates.length,0);
  assert.equal(c.plan().conflict,true);
});
test('manual child sleep selection reduces allowed common fan', () => {
  const c = new Cabin(); c.connectFamily(); c.setSleep(true);
  assert.deepEqual(c.plan().candidates.map(x=>x.values.fan),[1]);
});
test('temporary heat request preserves saved preference and resets next trip', () => {
  const c = new Cabin(); c.connectFamily(); c.heatOffThisTrip('B');
  assert.equal(c.plan().candidates[0].values['heat:frontPassenger'],0);
  assert.equal(c.profiles.B.heat,1);
  c.nextTrip(); c.connectFamily();
  assert.equal(c.plan().candidates[0].values['heat:frontPassenger'],1);
  assert.equal(c.sleep,false);
});
test('profile moves to one seat only and unsupported heat is omitted', () => {
  const c = new Cabin(); c.connectFamily(); c.heatOffThisTrip('B'); c.move('B','rearRight');
  assert.equal(c.seats.frontPassenger,null);
  assert.equal(c.seats.rearRight,'B');
  assert.equal(c.plan().candidates[0].values['heat:rearRight'],undefined);
  assert.ok(c.plan().unsupported.some(x=>x.includes('열선')));
});
test('occupied seat cannot silently replace another occupant', () => {
  const c = new Cabin(); c.connectFamily();
  assert.throws(()=>c.move('B','rearLeft'),/사용 중/);
  assert.equal(c.seats.rearLeft,'C');
});
test('driving blocks seat changes and applying candidate', async () => {
  const c = new Cabin(); c.connectFamily(); const p=c.plan().candidates[0]; c.setDriving(true);
  assert.throws(()=>c.move('B','rearRight'),/정차/);
  assert.equal((await c.apply(p,new SimulationGateway({delay:0}))).status,'blocked');
});
test('success requires readback matching the requested settings', async () => {
  const c = new Cabin(); c.connectFamily();
  assert.equal((await c.apply(c.plan().candidates[0],new SimulationGateway({delay:0}))).status,'confirmed');
});
test('write failure is never presented as full confirmation', async () => {
  const c = new Cabin(); c.connectFamily();
  const r=await c.apply(c.plan().candidates[0],new SimulationGateway({delay:0,mode:'fail'}));
  assert.equal(r.status,'failed');
});
test('unreadable and mismatching readback stay unconfirmed', async () => {
  for(const mode of ['unreadable','mismatch']) {
    const c = new Cabin(); c.connectFamily();
    assert.equal((await c.apply(c.plan().candidates[0],new SimulationGateway({delay:0,mode}))).status,'unconfirmed');
  }
});
test('stale candidate after moving a seat is rejected', async () => {
  const c = new Cabin(); c.connectFamily(); const p=c.plan().candidates[0]; c.move('B','rearRight');
  assert.equal((await c.apply(p,new SimulationGateway({delay:0}))).status,'stale');
});
test('manual override cancels pending automated application', async () => {
  const c = new Cabin(); c.connectFamily(); const g=new SimulationGateway({delay:40});
  const pending=c.apply(c.plan().candidates[0],g);
  c.manualFan(3,g);
  assert.equal((await pending).status,'cancelled');
  assert.equal(g.values.fan,3);
});
test('next trip cancels pending update from previous session', async () => {
  const c = new Cabin(); c.connectFamily();
  const pending=c.apply(c.plan().candidates[0],new SimulationGateway({delay:20}));
  c.nextTrip();
  assert.equal((await pending).status,'cancelled');
});

test('finishing cancelled old request cannot unlock a pending new trip request', async () => {
  const writes=[];
  const gateway={write:()=>new Promise(resolve=>writes.push(resolve)),read:async()=>({})};
  const c=new Cabin();c.connectFamily();const old=c.apply(c.plan().candidates[0],gateway);
  c.nextTrip();c.connectFamily();const current=c.apply(c.plan().candidates[0],gateway);
  writes[0](false);assert.equal((await old).status,'cancelled');
  assert.equal(c.busy,true);
  assert.equal((await c.apply(c.plan().candidates[1],gateway)).status,'busy');
  writes[1](false);await current;assert.equal(c.busy,false);
});
test('observed state uses readback instead of requested values', async () => {
  const c=new Cabin();c.connectFamily();const g=new SimulationGateway({delay:0,mode:'mismatch'});
  await c.apply(c.plan().candidates[0],g);
  assert.equal(c.observed.fan,5);
  assert.equal(c.result.reason,'mismatch');
  g.mode='unreadable';await c.apply(c.plan().candidates[0],g);
  assert.equal(c.observed,null);
});
test('manual change while readback is pending cannot be overwritten by late readback', async () => {
  let resolveRead;const g={values:{fan:2},write:async()=>true,read:()=>new Promise(r=>resolveRead=r),manual(k,v){this.values[k]=v}};
  const c=new Cabin();c.connectFamily();const pending=c.apply(c.plan().candidates[0],g);
  await new Promise(resolve=>setImmediate(resolve));c.manualFan(3,g);resolveRead({fan:2});
  assert.equal((await pending).status,'cancelled');assert.equal(c.observed.fan,3);
});

const expectedLayouts = [
  [4, [['driver','frontPassenger'],['rearLeft','rearRight']]],
  [5, [['driver','frontPassenger'],['rearLeft','rearCenter','rearRight']]],
  [6, [['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdRight']]],
  [7, [['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdRight']]],
  [8, [['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
];

for (const [capacity, rows] of expectedLayouts) {
  test(`${capacity}-seat cabin and simulated vehicle use exactly the selected rows`, () => {
    const c = new Cabin({capacity});
    const g = new SimulationGateway({capacity,delay:0});
    assert.equal(c.capacity,capacity);
    assert.deepEqual(c.layout.rows,rows);
    assert.equal(c.layout,layouts[capacity]);
    assert.equal(c.layout.capacity,capacity);
    assert.ok(c.layout.label.length > 0);
    assert.deepEqual(Object.keys(c.seats),rows.flat());
    assert.deepEqual(Object.values(c.seats),Array(capacity).fill(null));
    assert.deepEqual(Object.keys(c.observed).filter(k=>k.startsWith('temp:')),rows.flat().map(seat=>'temp:'+seat));
    assert.ok(Object.entries(c.observed).filter(([k])=>k.startsWith('temp:')).every(([,v])=>v===23));
    assert.deepEqual(Object.keys(g.values).filter(k=>k.startsWith('heat:')),['heat:driver','heat:frontPassenger']);
    assert.deepEqual(g.values,c.observed);
    assert.ok(rows.flat().every(seat=>typeof seatNames[seat]==='string'));
  });
}

test('connect all assigns eight distinct people and applies each occupied seat temperature', async () => {
  const c = new Cabin({capacity:8});
  c.connectAll();
  assert.deepEqual(Object.values(c.seats),['A','B','C','D','E','F','G','H']);
  const candidate = c.plan().candidates[0];
  assert.deepEqual(candidate.values,{
    'temp:driver':22,'heat:driver':0,
    'temp:frontPassenger':24,'heat:frontPassenger':1,
    'temp:rearLeft':24,'temp:rearCenter':23,'temp:rearRight':24,
    'temp:thirdLeft':23,'temp:thirdCenter':24,'temp:thirdRight':23,
    fan:2,
  });
  const result = await c.apply(candidate,new SimulationGateway({capacity:8,delay:0}));
  assert.equal(result.status,'confirmed');
  assert.deepEqual(c.observed,candidate.values);
});

test('family reconnect clears extra occupants while keeping the chosen layout', () => {
  const c = new Cabin({capacity:8});c.connectAll();c.connectFamily();
  assert.equal(c.capacity,8);
  assert.deepEqual(c.seats,{driver:'A',frontPassenger:'B',rearLeft:'C',rearCenter:null,rearRight:null,thirdLeft:null,thirdCenter:null,thirdRight:null});
});

test('third row occupants constrain the shared fan and all eight allow child sleep', () => {
  const c = new Cabin({capacity:8});c.connectAll();c.setSleep(true);
  assert.deepEqual(c.plan().candidates.map(x=>x.values.fan),[1]);
  c.setSleep(false);c.profiles.H.fan=[1,1];
  assert.deepEqual(c.plan().candidates.map(x=>x.values.fan),[1]);
});

test('switching eight seats to four starts a clean trip without orphan seats or requests', () => {
  const c = new Cabin({capacity:8});c.connectAll();c.heatOffThisTrip('H');c.heatOffThisTrip('B');c.setSleep(true);c.setConflict(true);
  const previousTrip = c.trip;
  c.setLayout(4);
  assert.equal(c.capacity,4);
  assert.equal(c.trip,previousTrip+1);
  assert.deepEqual(c.seats,{driver:null,frontPassenger:null,rearLeft:null,rearRight:null});
  assert.deepEqual(c.temporary,{});
  assert.equal(c.sleep,false);
  assert.equal(c.conflictMode,false);
  assert.equal(c.profiles.B.heat,1);
  assert.deepEqual(c.observed,{fan:3,'temp:driver':23,'temp:frontPassenger':23,'temp:rearLeft':23,'temp:rearRight':23,'heat:driver':0,'heat:frontPassenger':1});
  c.connectAll();
  assert.deepEqual(Object.values(c.seats),['A','B','C','D']);
});

test('changing layout discards old confirmation and invalidates its candidate', async () => {
  const c = new Cabin();c.connectFamily();
  const candidate = c.plan().candidates[0];
  await c.apply(candidate,new SimulationGateway({delay:0}));
  assert.equal(c.result.status,'confirmed');
  c.setLayout(6);
  assert.equal(c.result,null);
  assert.equal(c.observed.fan,3);
  assert.equal((await c.apply(candidate,new SimulationGateway({capacity:6,delay:0}))).status,'stale');
});

test('unsupported layout input is rejected without changing the active trip', () => {
  const c = new Cabin({capacity:8});c.connectFamily();c.heatOffThisTrip('B');
  const before = JSON.stringify(c);
  for (const capacity of [0,3,9,6.5,'6',null]) {
    assert.throws(()=>c.setLayout(capacity));
    assert.equal(JSON.stringify(c),before);
    assert.throws(()=>new Cabin({capacity}));
    assert.throws(()=>new SimulationGateway({capacity}));
  }
});

test('driving prevents layout changes and connecting a full cabin', () => {
  const c = new Cabin({capacity:6});c.connectFamily();c.setDriving(true);
  const before = JSON.stringify(c);
  assert.throws(()=>c.setLayout(8),/정차/);
  assert.throws(()=>c.connectAll(),/정차/);
  assert.equal(JSON.stringify(c),before);
});

test('layout cannot change during an active application', async () => {
  const c = new Cabin({capacity:6});c.connectFamily();
  const pending = c.apply(c.plan().candidates[0],new SimulationGateway({capacity:6,delay:10}));
  const before = JSON.stringify(c);
  assert.throws(()=>c.setLayout(8));
  assert.equal(JSON.stringify(c),before);
  assert.equal((await pending).status,'confirmed');
  c.setLayout(8);
  assert.equal(c.capacity,8);
});

test('moving B to the third row preserves a temporary request and omits unsupported heat', () => {
  const c = new Cabin({capacity:8});c.connectFamily();c.heatOffThisTrip('B');c.move('B','thirdCenter');
  assert.equal(c.seats.frontPassenger,null);
  assert.equal(c.seats.thirdCenter,'B');
  assert.equal(Object.values(c.seats).filter(id=>id==='B').length,1);
  assert.deepEqual(c.temporary.B,{heat:0});
  const plan = c.plan();
  assert.equal(plan.candidates[0].values['temp:thirdCenter'],24);
  assert.equal(plan.candidates[0].values['heat:thirdCenter'],undefined);
  assert.ok(plan.unsupported.some(message=>message.includes('3열 가운데')&&message.includes('열선 미지원')));
});

test('move rejects seats missing from the selected layout without losing the occupant', () => {
  const c = new Cabin({capacity:6});c.connectFamily();
  const before = JSON.stringify(c);
  for (const seat of ['rearCenter','thirdCenter','missing']) {
    assert.throws(()=>c.move('B',seat));
    assert.equal(JSON.stringify(c),before);
  }
});

test('next trip keeps eight-seat capacity while clearing occupants and transient requests', () => {
  const c = new Cabin({capacity:8});c.connectAll();c.heatOffThisTrip('H');c.setSleep(true);c.setConflict(true);
  c.nextTrip();
  assert.equal(c.capacity,8);
  assert.equal(c.layout.capacity,8);
  assert.deepEqual(Object.keys(c.seats),['driver','frontPassenger','rearLeft','rearCenter','rearRight','thirdLeft','thirdCenter','thirdRight']);
  assert.ok(Object.values(c.seats).every(id=>id===null));
  assert.deepEqual(c.temporary,{});
  assert.equal(c.sleep,false);
  assert.equal(c.conflictMode,false);
});

for (const [vehicleId,capacity,capacities] of [
  ['generic',4,[4,5,6,7,8]],['ioniq5',5,[5]],['ioniq9',6,[6,7]],['palisade',7,[7,9]],
]) {
  test(`${vehicleId} defaults to its own capacity and exposes its selectable variants`, () => {
    const c = new Cabin({vehicleId});
    const g = new SimulationGateway({vehicleId,delay:0});
    assert.equal(c.vehicleId,vehicleId);
    assert.equal(c.capacity,capacity);
    assert.equal(c.vehicle,vehicles[vehicleId]);
    assert.equal(c.vehicle.id,vehicleId);
    assert.equal(c.vehicle.defaultCapacity,capacity);
    assert.deepEqual(c.vehicle.capacities,capacities);
    assert.ok(c.vehicle.name.length>0);
    if(vehicleId!=='generic')assert.equal(c.vehicle.year,'2027');
    assert.deepEqual(g.values,c.observed);
  });
}

const vehicleLayouts = [
  ['ioniq5',5,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight']]],
  ['ioniq9',6,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdRight']]],
  ['ioniq9',7,[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdRight']]],
  ['palisade',7,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
  ['palisade',9,[['driver','frontCenter','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]],
];
for(const [vehicleId,capacity,rows] of vehicleLayouts) {
  test(`${vehicleId} ${capacity}-seat variant creates the correct seat and readback keys`, async () => {
    const c = new Cabin({vehicleId,capacity});
    const g = new SimulationGateway({vehicleId,capacity,delay:0});
    assert.deepEqual(c.layout.rows,rows);
    assert.equal(c.layout.capacity,capacity);
    assert.deepEqual(Object.keys(c.seats),rows.flat());
    const observed=await g.read();
    assert.deepEqual(Object.keys(observed).filter(key=>key.startsWith('temp:')),rows.flat().map(seat=>'temp:'+seat));
    assert.deepEqual(Object.keys(observed).filter(key=>key.startsWith('heat:')),['heat:driver','heat:frontPassenger']);
  });
}

test('switching between seven-seat models replaces the row shape even at the same capacity', () => {
  const c = new Cabin({vehicleId:'ioniq9',capacity:7});c.connectAll();
  const previousTrip=c.trip;
  c.setVehicle('palisade',7);
  assert.equal(c.capacity,7);
  assert.equal(c.vehicleId,'palisade');
  assert.equal(c.trip,previousTrip+1);
  assert.deepEqual(c.layout.rows,[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdCenter','thirdRight']]);
  assert.equal(Object.hasOwn(c.seats,'rearCenter'),false);
  assert.equal(Object.hasOwn(c.observed,'temp:rearCenter'),false);
  assert.equal(c.seats.thirdCenter,null);
  assert.equal(c.observed['temp:thirdCenter'],23);
});

test('nine-seat full occupancy preserves family positions and applies every seat temperature', async () => {
  const c = new Cabin({vehicleId:'palisade',capacity:9});c.connectAll();
  assert.deepEqual(Object.values(c.seats),['A','D','B','C','E','F','G','H','I']);
  assert.equal(seatNames.frontCenter,'1열 가운데');
  const candidate=c.plan().candidates[0];
  assert.deepEqual(candidate.values,{
    'temp:driver':22,'heat:driver':0,'temp:frontCenter':23,
    'temp:frontPassenger':24,'heat:frontPassenger':1,
    'temp:rearLeft':24,'temp:rearCenter':24,'temp:rearRight':23,
    'temp:thirdLeft':24,'temp:thirdCenter':23,'temp:thirdRight':23,fan:2,
  });
  assert.equal((await c.apply(candidate,new SimulationGateway({vehicleId:'palisade',capacity:9,delay:0}))).status,'confirmed');
  assert.deepEqual(c.observed,candidate.values);
  c.heatOffThisTrip('D');
  assert.ok(c.plan().unsupported.some(message=>message.includes('1열 가운데')&&message.includes('시뮬레이터 열선 미지원')));
  c.setSleep(true);
  assert.deepEqual(c.plan().candidates.map(item=>item.values.fan),[1]);
  c.setSleep(false);c.profiles.I.fan=[1,1];
  assert.deepEqual(c.plan().candidates.map(item=>item.values.fan),[1]);
});

test('family connection keeps B in passenger seat and C in second row in a nine-seat cabin', () => {
  const c = new Cabin({vehicleId:'palisade',capacity:9});c.connectAll();c.connectFamily();
  assert.deepEqual(c.seats,{driver:'A',frontCenter:null,frontPassenger:'B',rearLeft:'C',rearCenter:null,rearRight:null,thirdLeft:null,thirdCenter:null,thirdRight:null});
  c.heatOffThisTrip('B');
  assert.equal(c.plan().candidates[0].values['heat:frontPassenger'],0);
  assert.equal(c.plan().candidates[0].values['heat:frontCenter'],undefined);
});

test('vehicle changes reset transient state and initialize a matching simulated vehicle', () => {
  const c = new Cabin({vehicleId:'palisade',capacity:9});c.connectAll();c.heatOffThisTrip('I');c.setSleep(true);c.setConflict(true);
  c.manualFan(5,new SimulationGateway({vehicleId:'palisade',capacity:9,delay:0}));
  const previousTrip=c.trip;
  c.setVehicle('ioniq5');
  assert.equal(c.capacity,5);
  assert.equal(c.trip,previousTrip+1);
  assert.equal(c.result,null);
  assert.deepEqual(c.temporary,{});
  assert.equal(c.sleep,false);
  assert.equal(c.conflictMode,false);
  assert.deepEqual(c.seats,{driver:null,frontPassenger:null,rearLeft:null,rearCenter:null,rearRight:null});
  assert.deepEqual(c.observed,new SimulationGateway({vehicleId:'ioniq5',delay:0}).values);
  assert.equal(c.observed.fan,3);
});

test('vehicle changes invalidate previous confirmed candidates', async () => {
  const c = new Cabin({vehicleId:'ioniq9',capacity:7});c.connectFamily();
  const old=c.plan().candidates[0];
  await c.apply(old,new SimulationGateway({vehicleId:'ioniq9',capacity:7,delay:0}));
  assert.equal(c.result.status,'confirmed');
  c.setVehicle('palisade',7);
  assert.equal(c.result,null);
  assert.equal((await c.apply(old,new SimulationGateway({vehicleId:'palisade',capacity:7,delay:0}))).status,'stale');
});

test('unknown vehicle IDs fail before changing the active trip', () => {
  const c = new Cabin({vehicleId:'palisade',capacity:9});c.connectFamily();c.heatOffThisTrip('B');
  const before=JSON.stringify(c);
  for(const vehicleId of ['unknown','',null,5,'toString']) {
    assert.throws(()=>new Cabin({vehicleId}));
    assert.throws(()=>new SimulationGateway({vehicleId}));
    assert.throws(()=>c.setVehicle(vehicleId));
    assert.equal(JSON.stringify(c),before);
  }
});

test('unsupported vehicle capacities fail without replacing the current vehicle', () => {
  const c = new Cabin({vehicleId:'palisade',capacity:9});c.connectAll();c.heatOffThisTrip('I');
  const before=JSON.stringify(c);
  for(const [vehicleId,capacity] of [['generic',9],['ioniq5',4],['ioniq5',7],['ioniq9',5],['ioniq9',8],['ioniq9',9],['palisade',6],['palisade',8],['palisade','9'],['palisade',null]]) {
    assert.throws(()=>new Cabin({vehicleId,capacity}));
    assert.throws(()=>new SimulationGateway({vehicleId,capacity}));
    assert.throws(()=>c.setVehicle(vehicleId,capacity));
    assert.equal(JSON.stringify(c),before);
  }
});

test('setLayout respects active vehicle variants and next trip retains model and capacity', () => {
  const c = new Cabin({vehicleId:'palisade'});
  const before=JSON.stringify(c);
  for(const capacity of [4,5,6,8,undefined]) {
    assert.throws(()=>c.setLayout(capacity));
    assert.equal(JSON.stringify(c),before);
  }
  c.setLayout(9);c.connectAll();c.nextTrip();
  assert.equal(c.vehicleId,'palisade');
  assert.equal(c.capacity,9);
  assert.deepEqual(c.layout.rows,[['driver','frontCenter','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]);
  assert.equal(Object.keys(c.seats).length,9);
  assert.ok(Object.values(c.seats).every(id=>id===null));
  c.setVehicle('ioniq9');
  assert.equal(c.capacity,6);
  c.setLayout(7);
  assert.equal(c.seats.rearCenter,null);
  assert.equal(Object.hasOwn(c.seats,'thirdCenter'),false);
});

test('driving prevents vehicle replacement without mutating the current state', () => {
  const c = new Cabin({vehicleId:'ioniq5'});c.connectFamily();c.setDriving(true);
  const before=JSON.stringify(c);
  assert.throws(()=>c.setVehicle('palisade',9),/정차/);
  assert.equal(JSON.stringify(c),before);
});

test('pending application prevents vehicle replacement until completion', async () => {
  const c = new Cabin({vehicleId:'ioniq5'});c.connectFamily();
  const pending=c.apply(c.plan().candidates[0],new SimulationGateway({vehicleId:'ioniq5',delay:10}));
  const before=JSON.stringify(c);
  assert.throws(()=>c.setVehicle('palisade',9));
  assert.equal(JSON.stringify(c),before);
  assert.equal((await pending).status,'confirmed');
  c.setVehicle('palisade',9);
  assert.equal(c.vehicleId,'palisade');
  assert.equal(c.capacity,9);
});

// --- 검토 후 추가한 회귀 테스트 ---
test('a heater left on in a vacated front seat is switched off by the next applied plan', async () => {
  const c=new Cabin({vehicleId:'ioniq9',capacity:6}),g=new SimulationGateway({vehicleId:'ioniq9',capacity:6,delay:1});
  c.connectFamily();await c.apply(c.plan().candidates[0],g);
  assert.equal(g.values['heat:frontPassenger'],1);
  c.move('B','thirdRight');
  const plan=c.plan();assert.equal(plan.candidates[0].values['heat:frontPassenger'],0);
  const result=await c.apply(plan.candidates[0],g);
  assert.equal(result.status,'confirmed');assert.equal(g.values['heat:frontPassenger'],0);
});
test('a confirmed result carries no failure reason and an unconfirmed one names the mismatched keys', async () => {
  const c=new Cabin(),g=new SimulationGateway({delay:1});c.connectFamily();
  const ok=await c.apply(c.plan().candidates[0],g);
  assert.equal(ok.status,'confirmed');assert.equal(ok.reason,undefined);
  c.setSleep(true);g.mode='mismatch';
  const bad=await c.apply(c.plan().candidates[0],g);
  assert.equal(bad.status,'unconfirmed');assert.equal(bad.reason,'mismatch');assert.deepEqual(bad.mismatched,['fan']);
});
test('candidates have distinct titles and say who limits the shared fan range', () => {
  const c=new Cabin();c.connectFamily();
  const {candidates}=c.plan();
  assert.equal(new Set(candidates.map(x=>x.title)).size,candidates.length);
  assert.ok(candidates[0].reason.includes('동승자 B 2단계 이하'));
  c.setSleep(true);assert.ok(c.plan().candidates[0].reason.includes('아이 C 수면 1단계 이하'));
});
test('a conflict names the passengers whose ranges do not overlap', () => {
  const c=new Cabin();c.connectFamily();c.setConflict(true);
  const plan=c.plan();assert.equal(plan.conflict,true);assert.equal(plan.candidates.length,0);
  assert.ok(plan.conflictDetail.includes('운전자 A 4단계 이상'));assert.ok(plan.conflictDetail.includes('동승자 B 2단계 이하'));
});
test('heater support follows the reported capabilities instead of fixed seat names', () => {
  const c=new Cabin({vehicleId:'ioniq9',capacity:6}),g=new SimulationGateway({vehicleId:'ioniq9',capacity:6});
  assert.deepEqual(g.capabilities().heatSeats,['driver','frontPassenger']);
  c.setCapabilities({...g.capabilities(),heatSeats:['driver','frontPassenger','thirdRight']});
  c.connectFamily();c.move('B','thirdRight');
  const plan=c.plan();assert.equal(plan.candidates[0].values['heat:thirdRight'],1);assert.equal(plan.unsupported.length,0);
  assert.throws(()=>c.setCapabilities({fan:{min:3,max:1},heatSeats:[],tempSeats:[]}));
});
