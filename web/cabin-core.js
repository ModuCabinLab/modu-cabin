(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CabinCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const seatNames={driver:'운전석',frontCenter:'1열 가운데',frontPassenger:'조수석',rearLeft:'2열 왼쪽',rearCenter:'2열 가운데',rearRight:'2열 오른쪽',thirdLeft:'3열 왼쪽',thirdCenter:'3열 가운데',thirdRight:'3열 오른쪽'};
  const layouts={
    4:{capacity:4,label:'4인승 · 2+2',rows:[['driver','frontPassenger'],['rearLeft','rearRight']]},
    5:{capacity:5,label:'5인승 · 2+3',rows:[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight']]},
    6:{capacity:6,label:'6인승 · 2+2+2',rows:[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdRight']]},
    7:{capacity:7,label:'7인승 · 2+3+2',rows:[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdRight']]},
    8:{capacity:8,label:'8인승 · 2+3+3',rows:[['driver','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]},
  };
  const vehicles={
    generic:{id:'generic',name:'예시 캐빈',year:'',capacities:[4,5,6,7,8],defaultCapacity:4},
    ioniq5:{id:'ioniq5',name:'아이오닉 5',year:'2027',capacities:[5],defaultCapacity:5},
    ioniq9:{id:'ioniq9',name:'아이오닉 9',year:'2027',capacities:[6,7],defaultCapacity:6},
    palisade:{id:'palisade',name:'팰리세이드',year:'2027',capacities:[7,9],defaultCapacity:7},
  };
  const vehicleLayouts={
    generic:layouts,
    ioniq5:{5:layouts[5]},
    ioniq9:{6:layouts[6],7:layouts[7]},
    palisade:{
      7:{capacity:7,label:'7인승 · 2+2+3',rows:[['driver','frontPassenger'],['rearLeft','rearRight'],['thirdLeft','thirdCenter','thirdRight']]},
      9:{capacity:9,label:'9인승 · 3+3+3',rows:[['driver','frontCenter','frontPassenger'],['rearLeft','rearCenter','rearRight'],['thirdLeft','thirdCenter','thirdRight']]},
    },
  };
  function getVehicle(vehicleId){
    if(typeof vehicleId!=='string'||!Object.hasOwn(vehicles,vehicleId))throw new Error('지원하는 차종을 선택해 주세요.');
    return vehicles[vehicleId];
  }
  function getLayout(vehicleId,capacity){
    const vehicle=getVehicle(vehicleId);
    const selectedCapacity=capacity===undefined?vehicle.defaultCapacity:capacity;
    if(!Number.isInteger(selectedCapacity)||!vehicle.capacities.includes(selectedCapacity))throw new Error('선택한 차종에서 지원하는 좌석 구성을 선택해 주세요.');
    return vehicleLayouts[vehicleId][selectedCapacity];
  }
  const emptySeats=layout=>Object.fromEntries(layout.rows.flat().map(seat=>[seat,null]));
  const initialValues=layout=>({fan:3,...Object.fromEntries(layout.rows.flat().map(seat=>['temp:'+seat,23])),'heat:driver':0,'heat:frontPassenger':1});
  // 시뮬레이터가 보고하는 제어 가능 범위. 실제 SDK 연동 시 Vehicle capability 조회 결과로 교체한다.
  const defaultCapabilities=layout=>({fan:{min:1,max:5},tempSeats:layout.rows.flat(),heatSeats:layout.rows[0].filter(seat=>seat==='driver'||seat==='frontPassenger')});
  class Cabin {
    constructor({vehicleId='generic',capacity}={}){
      const layout=getLayout(vehicleId,capacity);
      this.vehicleId=vehicleId;this.capacity=layout.capacity;
      this.profiles={
        A:{name:'운전자 A',temp:22,fan:[1,4],heat:0},
        B:{name:'동승자 B',temp:24,fan:[1,2],heat:1},
        C:{name:'아이 C',temp:24,fan:[1,3],heat:0},
        D:{name:'동승자 D',temp:23,fan:[1,3],heat:0},
        E:{name:'동승자 E',temp:24,fan:[1,2],heat:0},
        F:{name:'동승자 F',temp:23,fan:[1,4],heat:0},
        G:{name:'동승자 G',temp:24,fan:[1,3],heat:0},
        H:{name:'동승자 H',temp:23,fan:[1,3],heat:0},
        I:{name:'동승자 I',temp:23,fan:[1,3],heat:0},
      };
      this.revision=0;this.operation=0;this.observed=initialValues(layout);this.trip=1;this.driving=false;this.seats=emptySeats(layout);this.temporary={};this.sleep=false;this.conflictMode=false;this.result=null;this.busy=false;this.capabilities=defaultCapabilities(layout);
    }
    get vehicle(){return getVehicle(this.vehicleId);}
    get layout(){return getLayout(this.vehicleId,this.capacity);}
    change(){this.revision++;this.result=null;}
    stationary(){if(this.driving)throw new Error('정차 후 변경할 수 있어요.');}
    setVehicle(vehicleId,capacity){
      const layout=getLayout(vehicleId,capacity);this.stationary();
      if(this.busy)throw new Error('현재 요청의 확인이 끝난 뒤 구성을 변경해 주세요.');
      this.vehicleId=vehicleId;this.capacity=layout.capacity;this.nextTrip();this.observed=initialValues(layout);this.capabilities=defaultCapabilities(layout);
    }
    setLayout(capacity){
      if(!Number.isInteger(capacity))throw new Error('지원하는 좌석 구성을 선택해 주세요.');
      this.setVehicle(this.vehicleId,capacity);
    }
    setCapabilities(capabilities){
      const seats=Object.keys(this.seats),fan=capabilities&&capabilities.fan;
      if(!fan||!Number.isInteger(fan.min)||!Number.isInteger(fan.max)||fan.min>fan.max||!Array.isArray(capabilities.heatSeats)||!Array.isArray(capabilities.tempSeats))throw new Error('차량 지원 범위를 확인할 수 없어요.');
      this.change();this.capabilities={fan:{min:fan.min,max:fan.max},tempSeats:capabilities.tempSeats.filter(s=>seats.includes(s)),heatSeats:capabilities.heatSeats.filter(s=>seats.includes(s))};
    }
    connectFamily(){this.stationary();this.change();this.seats={...emptySeats(this.layout),driver:'A',frontPassenger:'B',rearLeft:'C'};}
    connectAll(){
      this.connectFamily();
      const remaining=Object.keys(this.profiles).filter(id=>!Object.values(this.seats).includes(id));
      let index=0;for(const seat of this.layout.rows.flat())if(!this.seats[seat])this.seats[seat]=remaining[index++];
    }
    move(id,seat){
      this.stationary();if(!this.profiles[id]||!Object.hasOwn(this.seats,seat))throw new Error('올바른 프로필과 좌석을 선택해 주세요.');
      if(this.seats[seat]&&this.seats[seat]!==id)throw new Error('다른 탑승자가 사용 중인 좌석이에요.');
      this.change();for(const key of Object.keys(this.seats))if(this.seats[key]===id)this.seats[key]=null;this.seats[seat]=id;
    }
    setSleep(on){this.change();this.sleep=!!on;}
    heatOffThisTrip(id){if(!this.profiles[id])throw new Error('프로필이 없어요.');this.change();this.temporary[id]={heat:0};}
    setConflict(on){this.change();this.conflictMode=!!on;}
    setDriving(on){this.change();this.driving=!!on;}
    nextTrip(){this.stationary();this.change();this.operation++;this.trip++;this.seats=emptySeats(this.layout);this.temporary={};this.sleep=false;this.conflictMode=false;this.busy=false;}
    manualFan(value,gateway){if(!Number.isInteger(value)||value<1||value>5)throw new Error('풍량 범위를 확인해 주세요.');this.change();gateway.manual('fan',value);this.observed={...(this.observed||{}),fan:value};this.result={status:'manual',values:{...this.observed}};}
    plan(){
      const people=Object.entries(this.seats).filter(([,id])=>id);
      if(!people.length)return {candidates:[],unsupported:[],conflict:false};
      const caps=this.capabilities;
      let low=caps.fan.min,high=caps.fan.max,lowBy=[],highBy=[];const base={},unsupported=[];
      for(const [seat,id] of people){
        const p=this.profiles[id];
        const min=this.conflictMode&&id==='A'?4:p.fan[0],asleep=id==='C'&&this.sleep,max=asleep?1:p.fan[1];
        if(min>low){low=min;lowBy=[p.name];}else if(min===low&&min>caps.fan.min)lowBy.push(p.name);
        const who=p.name+(asleep?' 수면':'');
        if(max<high){high=max;highBy=[who];}else if(max===high&&max<caps.fan.max)highBy.push(who);
        if(caps.tempSeats.includes(seat))base['temp:'+seat]=p.temp;else unsupported.push(p.name+' · '+seatNames[seat]+' 시뮬레이터 온도 미지원');
        const heat=this.temporary[id]?.heat??p.heat;
        if(caps.heatSeats.includes(seat))base['heat:'+seat]=heat;
        else if(heat>0||this.temporary[id])unsupported.push(p.name+' · '+seatNames[seat]+' 시뮬레이터 열선 미지원');
      }
      // 사람이 떠난 좌석의 열선은 켜진 채로 두지 않는다.
      for(const seat of caps.heatSeats)if(!this.seats[seat])base['heat:'+seat]=0;
      const limits=[];
      if(lowBy.length)limits.push(lowBy.join('·')+' '+low+'단계 이상');
      if(highBy.length)limits.push(highBy.join('·')+' '+high+'단계 이하');
      if(low>high)return {candidates:[],unsupported,conflict:true,conflictDetail:limits.join(' / ')};
      const preferred=Math.min(high,Math.max(low,2));
      const fans=[...new Set([preferred,low,high])].slice(0,3);
      const reason='탑승자 모두의 허용 범위 '+low+'–'+high+'단계 안에서 조율'+(limits.length?' · '+limits.join(' / '):'');
      return {conflict:false,unsupported,candidates:fans.map((fan,i)=>({id:this.revision+'-'+fan,revision:this.revision,title:i===0?(this.sleep?'조용한 휴식':'함께 편안하게'):fan<preferred?'더 조용하게':'더 시원하게',values:{...base,fan},reason}))};
    }
    async apply(candidate,gateway){
      if(this.driving)return {status:'blocked'};
      if(!candidate||candidate.revision!==this.revision)return {status:'stale'};
      const valid=this.plan().candidates.find(x=>x.id===candidate.id);
      if(!valid||JSON.stringify(valid.values)!==JSON.stringify(candidate.values))return {status:'stale'};
      if(this.busy)return {status:'busy'};
      const revision=this.revision;const operation=++this.operation;this.busy=true;
      const active=()=>this.revision===revision&&this.operation===operation;
      try{
        const wrote=await gateway.write(candidate.values,active);
        if(!active())return {status:'cancelled'};
        if(!wrote){this.result={status:'failed'};return this.result;}
        const observed=await gateway.read();
        if(!active())return {status:'cancelled'};
        const mismatched=observed?Object.entries(candidate.values).filter(([k,v])=>observed[k]!==v).map(([k])=>k):[];
        const matched=!!observed&&!mismatched.length;
        this.observed=observed?{...observed}:null;
        this.result=matched?{status:'confirmed',values:this.observed,requested:{...candidate.values}}:{status:'unconfirmed',reason:observed?'mismatch':'unreadable',mismatched,values:this.observed};
        return this.result;
      }catch(error){
        if(!active())return {status:'cancelled'};
        this.result={status:'failed',message:error.message};return this.result;
      }finally{if(this.operation===operation)this.busy=false;}
    }
  }
  class SimulationGateway {
    constructor({vehicleId='generic',capacity,delay=500,mode='normal'}={}){const layout=getLayout(vehicleId,capacity);this.layout=layout;this.delay=delay;this.mode=mode;this.values=initialValues(layout);}
    wait(){return new Promise(resolve=>setTimeout(resolve,this.delay));}
    async write(values,isActive){await this.wait();if(!isActive()||this.mode==='fail')return false;Object.assign(this.values,values);return true;}
    async read(){await this.wait();if(this.mode==='unreadable')return null;return this.mode==='mismatch'?{...this.values,fan:5}:{...this.values};}
    manual(key,value){this.values[key]=value;}
    capabilities(){return defaultCapabilities(this.layout);}
  }
  return {Cabin,SimulationGateway,seatNames,layouts,vehicles};
});
