const express=require('express'),http=require('http'),{Server}=require('socket.io');
const app=express(),server=http.createServer(app),io=new Server(server);app.use(express.static('public'));
const rooms=new Map(); const newCode=()=>{let c;do c=String(Math.floor(1000+Math.random()*9000));while(rooms.has(c));return c};
function pub(r){return {code:r.code,stage:r.stage,phase:r.phase,players:Object.values(r.players).map(p=>({slot:p.slot,name:p.name}))}}
io.on('connection',s=>{
 s.on('create-room',(_,cb)=>{const code=newCode();rooms.set(code,{code,host:s.id,stage:0,phase:'teach',players:{}});s.join(code);cb({ok:true,code})});
 s.on('join-room',(d,cb)=>{const r=rooms.get(String(d.code||''));if(!r)return cb({ok:false,error:'Room not found'});const used=new Set(Object.values(r.players).map(p=>p.slot));const slot=[1,2].find(n=>!used.has(n));if(!slot)return cb({ok:false,error:'Both player spots are filled'});r.players[s.id]={slot,name:(d.name||`Player ${slot}`).slice(0,20)};s.join(r.code);io.to(r.code).emit('room-state',pub(r));cb({ok:true,slot,code:r.code})});
 s.on('answer',d=>{const r=rooms.get(String(d.code||'')),p=r&&r.players[s.id];if(r&&p)io.to(r.host).emit('answer',{slot:p.slot,value:d.value})});
 s.on('control',d=>{const r=rooms.get(String(d.code||'')),p=r&&r.players[s.id];if(r&&p)io.to(r.host).emit('control',{slot:p.slot,action:d.action,down:d.down!==false})});
 s.on('host-state',d=>{const r=rooms.get(String(d.code||''));if(r&&r.host===s.id){r.stage=d.stage;r.phase=d.phase;io.to(r.code).emit('host-state',{stage:d.stage,phase:d.phase,prompt:d.prompt||'',options:d.options||[]})}});
 s.on('disconnect',()=>{for(const [c,r] of rooms){if(r.host===s.id){io.to(c).emit('ended');rooms.delete(c)}else if(r.players[s.id]){delete r.players[s.id];io.to(c).emit('room-state',pub(r))}}});
});server.listen(process.env.PORT||3000,()=>console.log('Metastasis Mayhem on port '+(process.env.PORT||3000)));
