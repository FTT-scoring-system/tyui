/* FTT Poomsae — Remote Judge QR / Phone Interface */
let judgePeer = null;
let judgeConnections = {};
let judgeRuntime = { currentSession: "", connected: 0 };
let ctxMatForHeader = Number(new URLSearchParams(location.search).get("mat")) || 1;

function judgeRandomToken(){
  if(window.crypto?.getRandomValues){const a=new Uint32Array(3);crypto.getRandomValues(a);return [...a].map(x=>x.toString(36)).join("");}
  return Math.random().toString(36).slice(2)+Date.now().toString(36);
}
function judgeNewSessionId(){return "S"+Date.now().toString(36)+judgeRandomToken().slice(0,6);}
function stationNewId(mat){return "T"+Number(mat||1)+"-"+judgeRandomToken().slice(0,8);}
function ensureStationId(){if(!STATE.stationId)STATE.stationId=stationNewId(STATE.matNumber||1);return STATE.stationId;}
function judgeIsPhone(){return new URLSearchParams(location.search).get("judge")==="1";}
function judgeParams(){const q=new URLSearchParams(location.search);return {peer:q.get("peer")||"",judge:Number(q.get("j")||0),token:q.get("t")||"",mat:Number(q.get("mat")||0)||1,station:q.get("station")||""};}
function judgeBaseUrl(){return location.origin+location.pathname;}

function judgePhoneStorageKey(p){
  return `ftt-poomsae-judge-phone-v2|${String(p.peer||"")}|J${Number(p.judge)||0}|${String(p.station||"")}`;
}
function judgePhoneLoadSaved(p){
  try{const x=JSON.parse(localStorage.getItem(judgePhoneStorageKey(p))||"null");return x&&typeof x==="object"?x:null;}catch(_){return null;}
}
function judgePhoneSaveSaved(p,data){
  try{localStorage.setItem(judgePhoneStorageKey(p),JSON.stringify({...data,updatedAt:Date.now()}));}catch(_){ }
}
function judgePhoneClearSaved(p){try{localStorage.removeItem(judgePhoneStorageKey(p));}catch(_){}}
function judgePhoneSaveDraft(){
  const p=judgeParams();
  if(!p.peer||!p.judge||!p.token)return;
  judgePhoneSaveSaved(p,{peer:p.peer,judge:p.judge,token:p.token,mat:p.mat,station:p.station,sessionId:window._judgePhoneSession||"",accuracy:Number(window._judgePhoneAcc||4),parts:{...(window._judgePhoneParts||{})},sent:!!window._judgePhoneSent});
}
function judgePhoneRestoreDraft(p,sessionId){
  const saved=judgePhoneLoadSaved(p);
  if(!saved || (saved.sessionId && sessionId && saved.sessionId!==sessionId))return false;
  if(Number.isFinite(Number(saved.accuracy)))window._judgePhoneAcc=Math.max(0,Math.min(4,Number(saved.accuracy)));
  if(saved.parts&&typeof saved.parts==="object")window._judgePhoneParts={speedPower:Number(saved.parts.speedPower||2),rhythmTempo:Number(saved.parts.rhythmTempo||2),expressionEnergy:Number(saved.parts.expressionEnergy||2)};
  window._judgePhoneSent=!!saved.sent;
  return true;
}
function judgePhoneRememberLink(p){
  const old=judgePhoneLoadSaved(p)||{};
  judgePhoneSaveSaved(p,{...old,peer:p.peer,judge:p.judge,token:p.token,mat:p.mat,station:p.station});
}


const JUDGE_RECORDS_KEY = "ftt-poomsae-judge-records-v1";
function judgeRecordsLoad(){try{const x=JSON.parse(localStorage.getItem(JUDGE_RECORDS_KEY)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}}
function judgeRecordsSave(x){try{localStorage.setItem(JUDGE_RECORDS_KEY,JSON.stringify(x||[]))}catch(_){}
}
function judgeRecordsAddRound(round,judges){
 const records=judgeRecordsLoad(), a=currentAthlete?.()||{};
 const ae=new Set((round.accuracyExcluded||[]).map(Number)), pe=new Set((round.presentationExcluded||[]).map(Number));
 const accVals=judges.map(x=>Number(x.accuracy)), presVals=judges.map(x=>Number(x.presentation));
 const minA=Math.min(...accVals),maxA=Math.max(...accVals),minP=Math.min(...presVals),maxP=Math.max(...presVals);
 judges.forEach((j,i)=>{
  const n=i+1, name=String(STATE.judgeNames?.[n]||`JUDGE ${n}`).trim()||`JUDGE ${n}`;
  records.push({id:`JR-${Date.now()}-${n}-${Math.random().toString(36).slice(2,7)}`,createdAt:new Date().toISOString(),judgeId:n,judgeName:name,
   competition:STATE.competitionName||"FTT POOMSAE",classCode:STATE.classCode||"",category:STATE.category||"",gender:STATE.gender||"",participation:STATE.participation||"INDIVIDUAL",matNumber:Number(STATE.matNumber||1),matchNumber:STATE.matchNumber||"",
   athleteName:a.name||"",club:a.club||"",round:Number(round.round||STATE.currentRound||1),poomsae:WT_DATA.poomsae[round.poomsae]||round.poomsae||"",
   accuracy:Number(j.accuracy),presentation:Number(j.presentation),total:Number((Number(j.accuracy)+Number(j.presentation)).toFixed(1)),
   accuracyExcluded:ae.has(i),presentationExcluded:pe.has(i),
   accuracyStatus:ae.has(i)?(Number(j.accuracy)===maxA?"HIGH — EXCLUDED":Number(j.accuracy)===minA?"LOW — EXCLUDED":"EXCLUDED"):"COUNTED",
   presentationStatus:pe.has(i)?(Number(j.presentation)===maxP?"HIGH — EXCLUDED":Number(j.presentation)===minP?"LOW — EXCLUDED":"EXCLUDED"):"COUNTED"});
 });
 judgeRecordsSave(records); judgeRenderRecordsSummary();
}
function judgeRecordsFor(j){return judgeRecordsLoad().filter(r=>Number(r.judgeId)===Number(j))}
function judgeRecordsIdentityGroups(records){
 const map=new Map();
 records.forEach(r=>{
  const name=String(r.judgeName||`JUDGE ${r.judgeId}`).trim()||`JUDGE ${r.judgeId}`;
  const key=`${Number(r.judgeId)}||${name.toLocaleLowerCase()}`;
  if(!map.has(key))map.set(key,{j:Number(r.judgeId),name,records:[]});
  map.get(key).records.push(r);
 });
 return [...map.values()].sort((a,b)=>a.j-b.j||a.name.localeCompare(b.name));
}
function judgeRecordsClear(){if(!confirmAction("RESTART JUDGES PDF ?\nAll judge records will be deleted."))return;judgeRecordsSave([]);judgeRenderRecordsSummary()}
function judgeRenderRecordsSummary(){
 const el=document.getElementById("judgeRecordsSummary"); if(!el)return;
 const rs=judgeRecordsLoad(), count=Number(STATE.judgeCount||0), groups=judgeRecordsIdentityGroups(rs);
 el.innerHTML=Array.from({length:count},(_,i)=>{
  const j=i+1, jr=rs.filter(r=>Number(r.judgeId)===j), identities=judgeRecordsIdentityGroups(jr);
  const names=identities.map(g=>esc(g.name)).join(" → ")||esc(STATE.judgeNames?.[j]||"NAME NOT SET");
  return `<div class="judgeRecordRow"><span><b>J${j}</b> ${names}</span><small>${jr.length} RECORD${jr.length===1?"":"S"}</small><button class="btn smallBtn" onclick="judgeViewRecords(${j})">VIEW</button></div>`;
 }).join("")+(rs.length?`<div class="judgeRecordAllAction"><button class="btn primary" onclick="judgeExportAllPDF()">EXPORT ONE PDF — ALL JUDGES</button></div>`:"");
}
function judgeViewRecords(j){
 const rs=judgeRecordsFor(j), identities=judgeRecordsIdentityGroups(rs);
 const old=document.getElementById("judgeRecordsOverlay");if(old)old.remove();
 const ov=document.createElement("div");ov.id="judgeRecordsOverlay";ov.className="judgeQrOverlay";
 const rows=rs.length?rs.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.judgeName)}</td><td>${esc(r.athleteName)}</td><td>${esc(r.club)}</td><td>${esc(r.category)}</td><td>R${r.round}</td><td>${esc(r.poomsae)}</td><td>${Number(r.accuracy).toFixed(1)}<br><small>${esc(r.accuracyStatus)}</small></td><td>${Number(r.presentation).toFixed(1)}<br><small>${esc(r.presentationStatus)}</small></td><td>${Number(r.total).toFixed(1)}</td></tr>`).join(""):"<tr><td colspan=10>NO RECORDS</td></tr>";
 const history=identities.map(g=>`<span class="judgeIdentityHistoryItem"><b>${esc(g.name)}</b> <small>${g.records.length}</small></span>`).join("");
 ov.innerHTML=`<div class="judgeQrModal judgeRecordsModal"><div class="judgeQrHeader"><div><div class="phaseTag">JUDGE RECORD</div><h2>J${j}</h2><p>${history||"NAME NOT SET"}</p></div><button class="btn" onclick="document.getElementById('judgeRecordsOverlay')?.remove()">CLOSE</button></div><div class="judgeRecordsTableWrap"><table class="judgeRecordsTable"><thead><tr><th>#</th><th>JUDGE NAME</th><th>ATHLETE</th><th>CLUB</th><th>CATEGORY</th><th>ROUND</th><th>POOMSAE</th><th>ACCURACY</th><th>PRESENTATION</th><th>TOTAL</th></tr></thead><tbody>${rows}</tbody></table></div><div class="judgeQrFooter"><button class="btn primary" onclick="judgeExportAllPDF()">EXPORT ONE PDF — ALL JUDGES</button></div></div>`;
 document.body.appendChild(ov);
}
function pdfHasArabic(value){return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(String(value||""));}
function pdfArabicImageData(text,fontSize=8,bold=false,maxWidthPx=1400){
  const c=document.createElement("canvas"),ctx=c.getContext("2d");
  const px=Math.max(12,Math.round(fontSize*4));
  ctx.font=`${bold?"700":"400"} ${px}px Arial, "Noto Sans Arabic", sans-serif`;
  const raw=String(text??"");
  const m=Math.min(maxWidthPx,Math.max(40,Math.ceil(ctx.measureText(raw).width+40)));
  c.width=m;c.height=Math.ceil(px*1.8);
  ctx.clearRect(0,0,c.width,c.height);ctx.direction="rtl";ctx.textAlign="right";ctx.textBaseline="middle";
  ctx.font=`${bold?"700":"400"} ${px}px Arial, "Noto Sans Arabic", sans-serif`;
  ctx.fillStyle="#141414";ctx.fillText(raw,c.width-12,c.height/2);
  return {data:c.toDataURL("image/png"),pxWidth:c.width,pxHeight:c.height};
}
function pdfTextSmart(doc,text,x,y,opts={}){
  const value=String(text??"");
  if(!pdfHasArabic(value)){doc.text(value,x,y,opts);return;}
  const fs=Number(opts.fontSize||8), bold=!!opts.bold;
  const img=pdfArabicImageData(value,fs,bold);
  const targetW=Number(opts.maxWidth||Math.min(80,img.pxWidth/4));
  const targetH=targetW*(img.pxHeight/img.pxWidth);
  let ix=x;
  const align=opts.align||"left";
  if(align==="center")ix=x-targetW/2; else if(align==="right")ix=x-targetW;
  const iy=y-targetH*0.78;
  doc.addImage(img.data,"PNG",ix,iy,targetW,targetH,undefined,"FAST");
}

function judgeExportAllPDF(){
 const records=judgeRecordsLoad(); const jsPDF=window.jspdf?.jsPDF;
 if(!jsPDF){alert("PDF library is not available. Connect to Internet and try again.");return}
 if(!records.length){alert("NO JUDGE RECORDS");return}
 const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
 const pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight(), margin=8, usable=pageW-margin*2;
 const widths=[42,31,34,28,28,28,28], totalW=widths.reduce((a,b)=>a+b,0), scale=usable/totalW, W=widths.map(w=>w*scale);
 const groups=judgeRecordsIdentityGroups(records).map(g=>{const jr=g.records.slice().sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));const athletes=new Map();jr.forEach(r=>{const key=[r.athleteName||"",r.club||"",r.category||"",r.matchNumber||""].join("||");if(!athletes.has(key))athletes.set(key,[]);const arr=athletes.get(key);if(arr.length<2)arr.push(r)});return {...g,records:jr,rows:[...athletes.values()]};});
 const totalPages=(()=>{let n=0;groups.forEach(g=>{let used=0;g.rows.forEach(pair=>{const vals=[pair[0]?.athleteName||pair[1]?.athleteName||"",pair[0]?.club||pair[1]?.club||"",pair[0]?.category||pair[1]?.category||""];const lines=Math.max(1,...vals.map((v,k)=>Math.max(1,doc.splitTextToSize(String(v),W[k]-3).length)));const h=Math.max(12,Math.min(25,lines*3.1+4));if(used===0||used+h>140){n++;used=14+h}else used+=h});if(!g.rows.length)n++});return Math.max(1,n)})();
 function titleBlock(g){doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20);doc.text("FTT POOMSAE — JUDGE SCORE REPORT",margin,9);const boxY=12,boxH=9,bw=usable/3;[["JUDGE",g.name||`JUDGE ${g.j}`],["COMPETITION",STATE.competitionName||g.records[0]?.competition||"FTT POOMSAE"],["TAPIS",String(g.records[0]?.matNumber||STATE.matNumber||1)]].forEach((b,i)=>{const x=margin+i*bw;doc.setDrawColor(150);doc.rect(x,boxY,bw-2,boxH);doc.setFont("helvetica","bold");doc.setFontSize(6.5);doc.text(b[0],x+2,boxY+3.2);doc.setFont("helvetica","normal");doc.setFontSize(8);const value=String(b[1]);if(pdfHasArabic(value)){pdfTextSmart(doc,value,x+bw-6,boxY+6,{align:"right",fontSize:8,bold:false,maxWidth:bw-22});}else{doc.text(doc.splitTextToSize(value,bw-18)[0],x+17,boxY+5.9);}});}
 function drawHeader(y){const headers=["ATHLÈTE — NOM PRÉNOM","CLUB","CATÉGORIE","POOMSAE 1 — ACCURACY","POOMSAE 1 — PRESENTATION","POOMSAE 2 — ACCURACY","POOMSAE 2 — PRESENTATION"];let x=margin,h=14;headers.forEach((head,i)=>{doc.setFillColor(238,241,245);doc.setDrawColor(120);doc.rect(x,y,W[i],h,"FD");doc.setTextColor(20);doc.setFont("helvetica","bold");doc.setFontSize(6.2);const lines=doc.splitTextToSize(head,W[i]-3);doc.text(lines,x+W[i]/2,y+(h-lines.length*2.6)/2+2.4,{align:"center"});x+=W[i]});return y+h;}
 function scoreCell(text,status,poomsaeName,x,y,w,h){const st=String(status||"").toUpperCase();doc.setDrawColor(130);if(st.startsWith("HIGH")){doc.setFillColor(255,170,170);doc.rect(x,y,w,h,"FD")}else if(st.startsWith("LOW")){doc.setFillColor(255,210,125);doc.rect(x,y,w,h,"FD")}else doc.rect(x,y,w,h);doc.setTextColor(20);doc.setFont("helvetica","bold");doc.setFontSize(8);doc.text(text,x+w/2,y+5.5,{align:"center"});doc.setFont("helvetica","normal");doc.setFontSize(4.8);const pn=doc.splitTextToSize(String(poomsaeName||""),w-2);if(pn.length){if(pdfHasArabic(String(poomsaeName||"")))pdfTextSmart(doc,String(poomsaeName||""),x+w/2,y+8.8,{align:"center",fontSize:4.8,maxWidth:w-2});else doc.text(pn.slice(0,2),x+w/2,y+8.2,{align:"center"});}doc.setFontSize(5.5);if(st.startsWith("HIGH"))doc.text("HIGH",x+w/2,y+h-1.8,{align:"center"});else if(st.startsWith("LOW"))doc.text("LOW",x+w/2,y+h-1.8,{align:"center"});}
 const pageOwners=[];
 function footer(g){pageOwners.push({j:g.j,name:g.name,competition:STATE.competitionName||g.records[0]?.competition||"FTT POOMSAE",mat:g.records[0]?.matNumber||STATE.matNumber||1});}
 let first=true;
 groups.forEach(g=>{if(!first)doc.addPage();first=false;let y=18;titleBlock(g);y=25;if(!g.rows.length){doc.setFont("helvetica","normal");doc.setFontSize(9);doc.text("NO RECORDS",margin,y+8);footer(g);return;}let headerNeeded=true;g.rows.forEach((pair,idx)=>{const r1=pair[0],r2=pair[1],p1Name=r1?.poomsae||"",p2Name=r2?.poomsae||"";if(headerNeeded){y=drawHeader(y);headerNeeded=false;}const vals=[r1?.athleteName||r2?.athleteName||"",r1?.club||r2?.club||"",r1?.category||r2?.category||""];const lineCounts=vals.map((v,k)=>Math.max(1,doc.splitTextToSize(String(v),W[k]-3).length));const rowH=Math.max(12,Math.min(25,Math.max(...lineCounts)*3.1+4));if(y+rowH>pageH-12){footer(g);doc.addPage(); y=18;titleBlock(g);y=25;y=drawHeader(y);}let x=margin;vals.forEach((v,k)=>{doc.setDrawColor(130);doc.rect(x,y,W[k],rowH);doc.setTextColor(20);doc.setFont("helvetica",k===0?"bold":"normal");doc.setFontSize(7.5);const lines=doc.splitTextToSize(String(v),W[k]-3);if(pdfHasArabic(String(v))){pdfTextSmart(doc,String(v),x+W[k]/2,y+rowH/2+1.5,{align:"center",fontSize:7.5,bold:k===0,maxWidth:W[k]-4});}else{doc.text(lines,x+W[k]/2,y+(rowH-lines.length*3.1)/2+2.6,{align:"center"});}x+=W[k]});[[r1?.accuracy,r1?.accuracyStatus],[r1?.presentation,r1?.presentationStatus],[r2?.accuracy,r2?.accuracyStatus],[r2?.presentation,r2?.presentationStatus]].forEach(([v,st],ci)=>{scoreCell(v==null?"—":Number(v).toFixed(1),st,ci<2?p1Name:p2Name,x,y,W[ci+3],rowH);x+=W[ci+3]});y+=rowH;});footer(g);});
 // Add a final index page only if there are multiple identity groups; this makes name changes explicit.
 if(groups.length>0){
   doc.addPage();
   doc.setFont("helvetica","bold");doc.setFontSize(14);doc.setTextColor(20);doc.text("JUDGE IDENTITY HISTORY",margin,15);
   doc.setFont("helvetica","normal");doc.setFontSize(9);let y=25;
   groups.forEach((g,i)=>{if(y>pageH-15){doc.addPage();y=18;}doc.text(`${i+1}. J${g.j} — ${g.name} — ${g.records.length} record(s)`,margin,y);y+=7;});
   pageOwners.push({j:"",name:"JUDGE IDENTITY HISTORY",competition:STATE.competitionName||records[0]?.competition||"FTT POOMSAE",mat:records[0]?.matNumber||STATE.matNumber||1});
 }
 // Draw final, accurate page numbers after all pages have been created.
 const actualPages=doc.getNumberOfPages();
 for(let pn=1;pn<=actualPages;pn++){
   doc.setPage(pn); const meta=pageOwners[pn-1]||{j:"",name:"",competition:STATE.competitionName||records[0]?.competition||"FTT POOMSAE",mat:records[0]?.matNumber||STATE.matNumber||1};
   doc.setFont("helvetica","normal");doc.setFontSize(4.6);doc.setTextColor(70);
   const key=meta.j?`${meta.j}||${String(meta.name||"").toLocaleLowerCase()}`:"__INDEX__";
   const same=pageOwners.map((m,i)=>({m,i})).filter(x=>{const k=x.m.j?`${x.m.j}||${String(x.m.name||"").toLocaleLowerCase()}`:"__INDEX__";return k===key;});
   const localIndex=Math.max(1,same.findIndex(x=>x.i===pn-1)+1), localTotal=same.length;
   const left=meta.j?`J${meta.j} · ${meta.name} | ${meta.competition} | Tapis: ${meta.mat}`:`${meta.name} | ${meta.competition} | Tapis: ${meta.mat}`;
   if(pdfHasArabic(left)) pdfTextSmart(doc,left,margin,pageH-5,{fontSize:4.6,maxWidth:pageW-margin*2-35}); else doc.text(left,margin,pageH-5);
   doc.text(meta.j?`PAGE ${localIndex} / ${localTotal}`:`PAGE ${pn} / ${actualPages}`,pageW-margin,pageH-5,{align:"right"});
 }
 const safe=(v)=>String(v||"POOMSAE").trim().replace(/[\\/:*?"<>|]+/g,"_").replace(/\s+/g,"_").slice(0,90)||"POOMSAE";
 const competition=safe(STATE.competitionName||records[0]?.competition||"POOMSAE"); const mat=safe(records[0]?.matNumber||STATE.matNumber||1);
 doc.save(`${competition}_Tapis_${mat}.pdf`);
}
window.judgeViewRecords=judgeViewRecords;window.judgeExportAllPDF=judgeExportAllPDF;window.judgeRecordsClear=judgeRecordsClear;

function ensureJudgePeer(){
  if(typeof Peer!=="function")return;
  if(judgePeer && !judgePeer.destroyed)return;
  ensureStationId();
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  // Reserve the Peer ID before QR generation so scanned QR links are never built with an empty peer.
  const desired=(STATE.judgeQr.peerId)||("ftt-poomsae-"+judgeRandomToken().slice(0,12));
  STATE.judgeQr.peerId=desired;
  saveState();
  judgePeer=new Peer(desired,{debug:0});
  judgePeer.on("open",id=>{
    STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
    STATE.judgeQr.peerId=id;
    STATE.collectorQr=STATE.collectorQr||{peerId:"",token:"",deleted:false}; STATE.collectorQr.peerId=id;
    saveState();
    judgeSendContext();
    if(document.getElementById("judgesQrOverlay")){ setTimeout(()=>{ judgeRenderAllQRCodes(); judgeUpdateQrStatuses(); },60); }
    if(document.getElementById("collectorQrOverlay")){ ensureCollectorQr(); renderCollectorQRCode(); }
  });
  judgePeer.on("connection",conn=>{
    conn.on("open",()=>{
      const data=conn.metadata||{};
      const role=String(data.role||"judge");
      const station=String(data.station||"");
      if(station!==String(STATE.stationId||ensureStationId())){try{conn.close()}catch(_){} return;}
      if(role==="collector") {
        const token=String(data.token||"");
        if(!token || token!==String(STATE.collectorQr?.token||"")){conn.close();return;}
        window.collectorConnection=conn;
        conn.on("close",()=>{if(window.collectorConnection===conn)window.collectorConnection=null;});
        conn.on("data",msg=>{
          if(msg?.type==="COLLECTOR_HELLO"){
            const helloToken=String(msg.token||"");
            if(helloToken===String(STATE.collectorQr?.token||"")){
              try{conn.send({...judgeContextPayload(),type:"COLLECTOR_CONTEXT"});}catch(_){}
            }
            return;
          }
          collectorReceive(msg);
        });
        try{conn.send({...judgeContextPayload(),type:"COLLECTOR_CONTEXT"});}catch(_){}
        judgeUpdateQrStatuses();
        return;
      }
      const j=Number(data.judge||0), token=String(data.token||"");
      if(!j || STATE.judgeQr?.tokens?.[j]!==token){conn.close();return;}
      judgeConnections[j]=conn;
      conn.on("data",msg=>{
        if(msg?.type==="JUDGE_HELLO"){
          try{conn.send({type:"CONTEXT",...judgeContextPayload()});}catch(_){}
          return;
        }
        judgeReceive(msg,j);
      });
      conn.on("close",()=>{delete judgeConnections[j];judgeUpdateQrStatuses();});
      // Always send the current state immediately, including SCORING OPEN when a round is already running.
      try{conn.send({type:"CONTEXT",...judgeContextPayload()});}catch(_){}
      judgeUpdateQrStatuses();
    });
    conn.on("error",()=>{});
  });
  judgePeer.on("error",e=>{console.warn("Judge peer",e); if(e?.type==="unavailable-id"){ try{judgePeer.destroy()}catch(_){} STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}}; STATE.judgeQr.peerId=""; setTimeout(ensureJudgePeer,250); }});
}
function judgeReceive(msg,j){
  if(!msg||msg.type!=="SCORE")return;
  if(String(msg.token)!==String(STATE.judgeQr?.tokens?.[j]||""))return;
  if(msg.sessionId!==STATE.judgeQr?.sessionId)return;
  const a=msg.accuracy, p=msg.presentation;
  if(!Number.isFinite(Number(a))||Number(a)<0||Number(a)>4)return;
  const parts=msg.parts||{};
  const vals=[parts.speedPower,parts.rhythmTempo,parts.expressionEnergy].map(Number);
  if(vals.some(v=>!Number.isFinite(v)||v<0.5||v>2))return;
  const presentation=Number((vals[0]+vals[1]+vals[2]).toFixed(1));
  if(Math.abs(presentation-Number(p))>0.001)return;
  STATE.judgeQr.scores[j]={accuracy:Number(a),presentation,parts:{speedPower:vals[0],rhythmTempo:vals[1],expressionEnergy:vals[2]},receivedAt:Date.now(),sessionId:msg.sessionId};
  try{if(judgeConnections[j]?.open)judgeConnections[j].send({type:"SCORE_ACK",judge:j,sessionId:msg.sessionId,receivedAt:Date.now()});}catch(_){ }
  saveState();
  if(window.collectorConnection?.open){try{window.collectorConnection.send({type:"COLLECTOR_CONTEXT",...judgeContextPayload({scoreReceived:true,judge:j})});}catch(_){} }
  const ai=j-1;
  const acc=document.getElementById(`acc${ai}`),pres=document.getElementById(`pres${ai}`);
  if(acc)acc.value=Number(a).toFixed(1);
  if(pres)pres.value=presentation.toFixed(1);
  updateJudgeSubmitButton?.();
  judgeUpdateQrStatuses();
  renderJudgeRemoteToast?.(j);
}
function judgeContextPayload(extra={}){
  const a=currentAthlete?.();
  const p=currentRoundPoomsae?.();
  return {type:"CONTEXT",stationId:ensureStationId(),sessionId:STATE.judgeQr?.sessionId||"",active:[STATES.ROUND_RUNNING,STATES.CALCULATING,STATES.TIE_BREAK_RUNNING,STATES.TIE_BREAK_CALCULATING].includes(STATE.state),scoringOpen:[STATES.ROUND_RUNNING,STATES.CALCULATING,STATES.TIE_BREAK_RUNNING,STATES.TIE_BREAK_CALCULATING].includes(STATE.state),round:STATE.currentRound,athlete:a?.name||"",club:a?.club||"",poomsae:WT_DATA.poomsae[p]||p||"",competition:STATE.competitionName||"FTT POOMSAE",matNumber:STATE.matNumber||1,judgeScores:STATE.judgeQr?.scores||{},judgeCount:Number(STATE.judgeCount||0),judgeNames:STATE.judgeNames||{},tieBreak:!!STATE.tieBreak?.active,tieBreakStage:STATE.tieBreak?.stage||"",...extra};
}
function judgeSendContext(extra={}){
  const payload=judgeContextPayload(extra);
  Object.values(judgeConnections||{}).forEach(c=>{try{if(c.open)c.send(payload)}catch(e){}});
  const collector=window.collectorConnection;
  if(collector?.open){
    try{ collector.send({...payload,type:"COLLECTOR_CONTEXT"}); }catch(e){}
  }
}
function judgeGenerateTokens(){
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  STATE.judgeQr.tokens={};STATE.judgeQr.deleted=STATE.judgeQr.deleted||{};
  for(let i=1;i<=Number(STATE.judgeCount||0);i++){STATE.judgeQr.tokens[i]=judgeRandomToken();STATE.judgeQr.deleted[i]=false;}
  saveState();ensureJudgePeer();openJudgesQR(true);
}
function judgeRegenerateOne(j){
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  STATE.judgeQr.tokens[j]=judgeRandomToken();
  STATE.judgeQr.deleted[j]=false;
  // Keep any already received score. Changing the QR must not erase competition data.
  try{judgeConnections[j]?.close()}catch(e){}
  delete judgeConnections[j];saveState();openJudgesQR(true);
}
function judgeDeleteOne(j){
  if(!confirmAction(`DELETE QR FOR JUDGE ${j}?`))return;
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  delete STATE.judgeQr.tokens[j];STATE.judgeQr.deleted[j]=true;delete STATE.judgeQr.scores[j];
  try{judgeConnections[j]?.close()}catch(e){} delete judgeConnections[j];
  saveState();openJudgesQR(true);
}
function judgeUpdateQrStatuses(){
  Object.keys(STATE.judgeQr?.tokens||{}).forEach(j=>{const connected=!!judgeConnections[j]?.open, scored=!!STATE.judgeQr?.scores?.[j];const el=document.getElementById(`judgeQrStatus${j}`);if(el){el.textContent=scored?"SCORE RECEIVED":connected?"CONNECTED":"WAITING";el.classList.toggle("connected",connected||scored);}const op=document.querySelector(`.operatorJudgeStatusItem[data-judge="${j}"]`);if(op){op.classList.toggle("online",connected);op.classList.toggle("scored",scored);const st=op.querySelector("span");if(st)st.textContent=scored?"SCORE RECEIVED":connected?"CONNECTED":"WAITING";}});
  const cs=document.getElementById("collectorQrStatus");if(cs)cs.textContent=window.collectorConnection?.open?"CONNECTED":"WAITING";
}
function judgeQrUrl(j){
  const base=judgeBaseUrl();
  const peer=STATE.judgeQr?.peerId||"";
  return `${base}?judge=1&peer=${encodeURIComponent(peer)}&j=${j}&t=${encodeURIComponent(STATE.judgeQr.tokens[j]||"")}&mat=${encodeURIComponent(Number(STATE.matNumber)||1)}&station=${encodeURIComponent(ensureStationId())}`;
}
function openJudgesQR(regenerate=false){
  if(location.protocol==="file:")return alert("JUDGES QR requires the project to be opened from GitHub Pages, Netlify, or a local web server (not directly as a file).");
  if(!STATE.setupComplete)return alert("Complete the Competition Setup first.");
  ensureJudgePeer();
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  if(!Object.keys(STATE.judgeQr.tokens||{}).length || Object.keys(STATE.judgeQr.tokens||{}).length!==Number(STATE.judgeCount||0)){
    STATE.judgeQr.tokens={};STATE.judgeQr.deleted=STATE.judgeQr.deleted||{};for(let i=1;i<=STATE.judgeCount;i++){STATE.judgeQr.tokens[i]=judgeRandomToken();STATE.judgeQr.deleted[i]=false;}saveState();
  }
  const old=document.getElementById("judgesQrOverlay");if(old)old.remove();
  const overlay=document.createElement("div");overlay.id="judgesQrOverlay";overlay.className="judgeQrOverlay";
  overlay.innerHTML=`<div class="judgeQrModal"><div class="judgeQrHeader"><div><div class="phaseTag">REMOTE JUDGES</div><h2>JUDGES QR</h2><p>Chaque juge scanne uniquement son QR code avec son téléphone.</p></div><button class="btn" onclick="document.getElementById('judgesQrOverlay')?.remove()">CLOSE</button></div><div class="judgeQrGrid">${Array.from({length:Number(STATE.judgeCount||0)},(_,idx)=>{const j=idx+1;const hasQr=!!STATE.judgeQr.tokens?.[j];return `<div class="judgeQrCard"><div class="judgeQrCardTop"><div><strong>JUDGE ${j}</strong><small class="judgeQrName" data-judge-name="${j}">${esc(STATE.judgeNames?.[j]||"NAME NOT SET")}</small></div><span id="judgeQrStatus${j}" class="judgeQrStatus">${hasQr?(judgeConnections[j]?.open?"CONNECTED":"WAITING"):"QR DELETED"}</span></div>${hasQr?`<div id="judgeQr${j}" class="judgeQrImage"></div><div class="judgeQrHint">SCAN WITH PHONE</div>`:`<div class="judgeQrImage judgeQrDeleted"><span>QR<br>DELETED</span></div><div class="judgeQrHint">GENERATE A NEW CODE</div>`}<label class="judgeQrNameEditor">NOM DU JUGE ${j}<input type="text" value="${esc(STATE.judgeNames?.[j]||"")}" placeholder="Nom et prénom du juge ${j}" oninput="judgeSetName(${j},this.value)"></label><div class="judgeQrActions"><button class="btn" onclick="judgeRegenerateOne(${j})">${hasQr?"CHANGE QR":"GENERATE QR"}</button><button class="btn danger" onclick="judgeDeleteOne(${j})" ${hasQr?"":"disabled"}>DELETE</button></div></div>`}).join("")}</div><div class="judgeQrFooter"><span>PEER CONNECTION: <b>${esc(STATE.judgeQr.peerId||"CONNECTING...")}</b></span><div class="judgeRecordsActions"><button class="btn" onclick="judgeRenderRecordsSummary()">JUDGE RECORDS</button><button class="btn danger" onclick="judgeRecordsClear()">RESTART JUDGES PDF</button><button class="btn primary" onclick="judgeGenerateTokens()">REGENERATE ALL QR</button></div></div><div id="judgeRecordsSummary" class="judgeRecordsSummary"></div></div>`;
  document.body.appendChild(overlay);
  judgeRenderRecordsSummary();
  requestAnimationFrame(()=>judgeRenderAllQRCodes());
  setTimeout(()=>{ judgeRenderAllQRCodes(); judgeUpdateQrStatuses(); },250);
}

function judgeRenderAllQRCodes(){
  for(let j=1;j<=Number(STATE.judgeCount||0);j++){
    const box=document.getElementById(`judgeQr${j}`);
    if(!box || !STATE.judgeQr.tokens?.[j]) continue;
    const text=judgeQrUrl(j);
    box.innerHTML="";
    try{
      if(typeof window.QRCode === "function"){
        new QRCode(box,{text,width:190,height:190,colorDark:"#07111d",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
        if(box.children.length)continue;
      }
    }catch(e){ console.warn("QRCode library failed",e); }
    // Reliable fallback: render the QR through a public QR image endpoint.
    const img=document.createElement("img");
    img.alt=`QR CODE JUGE ${j}`;
    img.width=190; img.height=190;
    img.referrerPolicy="no-referrer";
    img.src=`https://api.qrserver.com/v1/create-qr-code/?size=190x190&margin=8&data=${encodeURIComponent(text)}`;
    img.onerror=()=>{box.innerHTML='<div style="font-size:12px;text-align:center;color:#667789;padding:25px">QR IMAGE UNAVAILABLE<br><small>Check internet connection</small></div>';};
    box.appendChild(img);
  }
}

function judgePhoneSend(type,data){
  if(window._judgePhoneScoringOpen!==true){judgePhoneToast("SCORING NOT OPEN",true);return;}
  const {peer,judge,token}=judgeParams();
  if(!peer||!judge||!token){judgePhoneToast("INVALID JUDGE LINK",true);return;}
  if(!window._judgePhoneConn||!window._judgePhoneConn.open){judgePhoneToast("NOT CONNECTED TO OPERATOR",true);return;}
  if(type!=="SCORE"){return;}
  const accuracy=Number(window._judgePhoneAcc);
  const parts={...(window._judgePhoneParts||{})};
  const vals=[parts.speedPower,parts.rhythmTempo,parts.expressionEnergy].map(Number);
  const presentation=Number(vals.reduce((a,v)=>a+v,0).toFixed(1));
  if(!Number.isFinite(accuracy)||accuracy<0||accuracy>4){judgePhoneToast("ACCURACY MUST BE 0.0–4.0",true);return;}
  if(vals.some(v=>!Number.isFinite(v)||v<0.5||v>2)||presentation<1.5||presentation>6){judgePhoneToast("PRESENTATION MUST BE 1.5–6.0",true);return;}
  const payload={type:"SCORE",accuracy:Number(accuracy.toFixed(1)),presentation,parts,judge,token,stationId:window._judgePhoneStation||"",sessionId:window._judgePhoneSession||""};
  try{window._judgePhonePendingPayload=payload;window._judgePhonePendingSince=Date.now();window._judgePhoneSent=false;judgePhoneSaveDraft();window._judgePhoneConn.send(payload);judgePhoneToast("SENDING…");}catch(e){judgePhoneToast("SEND FAILED",true);}
}
function judgePhoneToast(msg,error=false){const el=document.getElementById("judgePhoneToast");if(!el)return;el.textContent=msg;el.className=`judgePhoneToast show ${error?"error":""}`;clearTimeout(window._judgeToastTimer);window._judgeToastTimer=setTimeout(()=>el.classList.remove("show"),1800);}
function judgePhoneRenderSent(){const b=document.getElementById("judgePhoneSend");if(b){b.textContent="✓ SCORE SENT";b.classList.add("sent");}}
function judgePhoneClamp(){
  const base=Number(window._judgePhoneAcc);
  const delta=Number(window._judgePhoneDelta||0);
  const next=Math.max(0,Math.min(4,Math.round((base+delta)*10)/10));
  window._judgePhoneAcc=next; window._judgePhoneDelta=0;
  const el=document.getElementById("judgeAccuracyValue");
  if(el)el.textContent=next.toFixed(1);
}
function judgePhoneAdjust(delta){
  if(window._judgePhoneSent){judgePhoneToast("SCORE ALREADY SENT",true);return;}
  if(window._judgePhoneScoringOpen!==true){judgePhoneToast("SCORING NOT OPEN",true);return;}
  const d=Number(delta); if(!Number.isFinite(d))return;
  window._judgePhoneAcc=Number(window._judgePhoneAcc||4);
  window._judgePhoneDelta=d; judgePhoneClamp();
  window._judgePhoneSent=false; judgePhoneRenderReset(); judgePhoneSaveDraft();
}
function judgePhoneSetPart(key,value){
  if(window._judgePhoneSent){judgePhoneToast("SCORE ALREADY SENT",true);return;}
  if(window._judgePhoneScoringOpen!==true){judgePhoneToast("SCORING NOT OPEN",true);return;}
  if(!window._judgePhoneParts)window._judgePhoneParts={speedPower:2,rhythmTempo:2,expressionEnergy:2};
  const next=Math.max(0.5,Math.min(2,Math.round(Number(value)*10)/10));
  if(!Number.isFinite(next))return;
  window._judgePhoneParts[key]=next;
  const control=document.querySelector(`[data-part-control="${key}"]`);
  if(control)control.innerHTML=judgePhoneBuildValues(key);
  const total=Object.values(window._judgePhoneParts).reduce((s,v)=>s+Number(v||0),0);
  const t=document.getElementById("judgePresentationTotal"); if(t)t.textContent=total.toFixed(1);
  window._judgePhoneSent=false; judgePhoneRenderReset(); judgePhoneSaveDraft();
}
function judgePhoneAdjustPart(key,delta){
  if(window._judgePhoneSent){judgePhoneToast("SCORE ALREADY SENT",true);return;}
  if(window._judgePhoneScoringOpen!==true){judgePhoneToast("SCORING NOT OPEN",true);return;}
  if(!window._judgePhoneParts)window._judgePhoneParts={speedPower:2,rhythmTempo:2,expressionEnergy:2};
  const current=Number(window._judgePhoneParts[key]||2);
  judgePhoneSetPart(key,current+Number(delta||0));
}
function judgePhoneBuildValues(key){
  const value=Number(window._judgePhoneParts[key]||2);
  return `<button type="button" class="partAdjust partMinus" ${window._judgePhoneScoringOpen!==true||window._judgePhoneSent||value<=0.5?"disabled":""} onclick="window.judgePhoneAdjustPart('${key}',-0.1)">−</button><div class="partValue" data-part-value="${key}">${value.toFixed(1)}</div><button type="button" class="partAdjust partPlus" ${window._judgePhoneScoringOpen!==true||window._judgePhoneSent||value>=2?"disabled":""} onclick="window.judgePhoneAdjustPart('${key}',0.1)">+</button>`;
}
window.judgePhoneAdjust=judgePhoneAdjust;
window.judgePhoneAdjustPart=judgePhoneAdjustPart;
window.judgePhoneSendScore=()=>judgePhoneSend("SCORE",{});
window.judgePhoneRestart=judgePhoneRestart;
function renderJudgeRemoteToast(j){ const box=document.getElementById("judgeQrStatus"+j); if(box){box.textContent="SCORE RECEIVED";box.classList.add("connected");setTimeout(()=>judgeUpdateQrStatuses(),1300);} }
function judgePhoneRenderReset(){const b=document.getElementById("judgePhoneSend");if(b){b.textContent="SEND SCORE";b.classList.remove("sent");}}
function judgePhoneRestart(){
  if(window._judgePhoneScoringOpen!==true){judgePhoneToast("SCORING NOT OPEN",true);return;}
  window._judgePhoneAcc=3.4;
  window._judgePhoneParts={speedPower:2,rhythmTempo:2,expressionEnergy:2};
  window._judgePhoneDelta=0;
  window._judgePhoneSent=false;
  judgePhoneSaveDraft();
  judgePhoneRenderMain(window._judgePhoneLastContext||{active:true,scoringOpen:true,athlete:"",club:"",poomsae:"",round:1,competition:"FTT POOMSAE"});
  judgePhoneToast("RESTART — ACCURACY 3.4");
}
async function judgePhoneFullscreen(){
  try{
    if(!document.fullscreenElement){
      await document.documentElement.requestFullscreen?.();
      try{await screen.orientation?.lock?.("landscape");}catch(_){}
    }else{
      await document.exitFullscreen?.();
    }
    judgePhoneUpdateViewport();
  }catch(e){judgePhoneToast("FULL SCREEN NOT AVAILABLE",true);}
}
function judgePhoneUpdateViewport(){
  const app=document.querySelector(".judgePhoneApp");
  const portrait=window.innerHeight>window.innerWidth;
  document.body.classList.toggle("judgePortrait",portrait);
  if(app) app.classList.toggle("judgeLandscape",!portrait);
  const b=document.getElementById("judgeFsBtn");
  if(b)b.textContent=document.fullscreenElement?"↙":"⛶";
  if(b)b.title=document.fullscreenElement?"Quitter le plein écran":"Plein écran";
}
function judgePhoneOrientationPrompt(){
  const p=document.getElementById("judgeOrientationOverlay");
  if(p)p.classList.remove("show");
}
function judgePhoneInitControls(){
  document.addEventListener("fullscreenchange",()=>{judgePhoneUpdateViewport();judgePhoneOrientationPrompt();});
  window.addEventListener("resize",()=>{judgePhoneUpdateViewport();judgePhoneOrientationPrompt();});
  judgePhoneUpdateViewport();judgePhoneOrientationPrompt();
}

function collectorRandomToken(){return judgeRandomToken();}
function collectorQrUrl(){const base=judgeBaseUrl();ensureStationId(); const peer=STATE.collectorQr?.peerId||STATE.judgeQr?.peerId||"";return `${base}?collector=1&peer=${encodeURIComponent(peer)}&t=${encodeURIComponent(STATE.collectorQr?.token||"")}&mat=${encodeURIComponent(Number(STATE.matNumber)||1)}&station=${encodeURIComponent(ensureStationId())}`;}
function ensureCollectorQr(){STATE.collectorQr=STATE.collectorQr||{peerId:"",token:"",deleted:false};if(!STATE.collectorQr.token)STATE.collectorQr.token=collectorRandomToken();STATE.collectorQr.peerId=STATE.judgeQr?.peerId||STATE.collectorQr.peerId||"";saveState();}
function openCollectorQR(){
  if(location.protocol==="file:")return alert("COLLECTOR QR requires a web server.");
  ensureJudgePeer();
  ensureCollectorQr();
  const old=document.getElementById("collectorQrOverlay");if(old)old.remove();
  const overlay=document.createElement("div");overlay.id="collectorQrOverlay";overlay.className="judgeQrOverlay";
  overlay.innerHTML=`<div class="judgeQrModal collectorModal"><div class="judgeQrHeader"><div><div class="phaseTag">REMOTE COLLECTOR</div><h2>COLLECTOR QR</h2><p>Scannez ce QR avec le téléphone du collecteur.</p></div><button class="btn" onclick="document.getElementById('collectorQrOverlay')?.remove()">CLOSE</button></div><div class="collectorQrCenter"><div id="collectorQrImage" class="judgeQrImage"></div><div class="judgeQrHint">SCAN WITH COLLECTOR PHONE</div><span id="collectorQrStatus" class="judgeQrStatus">${window.collectorConnection?.open?"CONNECTED":"WAITING"}</span><div class="judgeQrActions"><button class="btn" onclick="regenerateCollectorQR()">CHANGE QR</button><button class="btn danger" onclick="deleteCollectorQR()">DELETE</button></div></div></div>`;
  document.body.appendChild(overlay);renderCollectorQRCode();
}
function renderCollectorQRCode(){const box=document.getElementById("collectorQrImage");if(!box)return;box.innerHTML="";try{if(typeof QRCode==="function"){new QRCode(box,{text:collectorQrUrl(),width:220,height:220,colorDark:"#07111d",colorLight:"#fff",correctLevel:QRCode.CorrectLevel.M});if(box.children.length)return;}}catch(e){}const img=document.createElement("img");img.width=220;img.height=220;img.alt="COLLECTOR QR";img.src=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(collectorQrUrl())}`;box.appendChild(img);}
function regenerateCollectorQR(){ensureCollectorQr();STATE.collectorQr.token=collectorRandomToken();STATE.collectorQr.deleted=false;try{window.collectorConnection?.close()}catch(_){}window.collectorConnection=null;saveState();openCollectorQR();}
function deleteCollectorQR(){if(!confirmAction("DELETE COLLECTOR QR?"))return;STATE.collectorQr.token="";STATE.collectorQr.deleted=true;try{window.collectorConnection?.close()}catch(_){}window.collectorConnection=null;saveState();openCollectorQR();}
function collectorReceive(msg){
  if(!msg||msg.type!=="COLLECTOR_SCORES")return;
  if(STATE.state!==STATES.CALCULATING && STATE.state!==STATES.TIE_BREAK_CALCULATING)return;
  const count=Number(STATE.judgeCount||0), incoming=msg.scores||{}, scores={};
  for(let i=1;i<=count;i++){
    const v=incoming[i]; if(!v)return;
    const a=Number(v.accuracy), p=Number(v.presentation);
    if(!Number.isFinite(a)||a<0||a>4||!Number.isFinite(p)||p<1.5||p>6)return;
    scores[i]={accuracy:Number(a.toFixed(1)),presentation:Number(p.toFixed(1)),receivedAt:Date.now(),sessionId:STATE.judgeQr?.sessionId||"",source:"collector"};
  }
  STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
  STATE.judgeQr.scores=scores; saveState();
  for(let i=1;i<=count;i++){
    const acc=document.getElementById(`acc${i-1}`), pres=document.getElementById(`pres${i-1}`);
    if(acc)acc.value=scores[i].accuracy.toFixed(1);
    if(pres)pres.value=scores[i].presentation.toFixed(1);
  }
  updateJudgeSubmitButton?.(); judgeUpdateQrStatuses();
}

function collectorPhoneConnect(p){
  if(typeof Peer!=="function"){collectorPhoneToast("PeerJS unavailable",true);return;}
  if(!p.peer||!p.token){collectorPhoneToast("Invalid collector QR",true);return;}
  try{window._collectorRetryTimer&&clearInterval(window._collectorRetryTimer);}catch(_){}
  try{window._collectorPeer?.destroy?.();}catch(_){}
  const local=new Peer();
  const status=t=>{const e=document.getElementById("collectorConnection");if(e){e.textContent=t;e.classList.toggle("connected",t==="CONNECTED");}};
  let retryTimer=null;
  const connectNow=()=>{
    if(window._collectorConn?.open)return;
    let c;
    try{c=local.connect(p.peer,{reliable:true,metadata:{role:"collector",token:p.token,station:p.station||""}});}catch(e){status("RETRYING");return;}
    window._collectorConn=c;
    c.on("open",()=>{status("CONNECTED");try{c.send({type:"COLLECTOR_HELLO",token:p.token});}catch(_){} setTimeout(()=>{try{if(c.open)c.send({type:"COLLECTOR_HELLO",token:p.token});}catch(_){}},700); });
    c.on("data",m=>{if(m?.type==="COLLECTOR_CONTEXT"){window._collectorStation=String(m.stationId||p.station||"");renderCollectorPhoneContext(m);}});
    c.on("close",()=>{if(window._collectorConn===c)window._collectorConn=null;status("RETRYING");});
    c.on("error",()=>{status("RETRYING");});
  };
  local.on("open",()=>{status("CONNECTING");connectNow();retryTimer=setInterval(connectNow,1800);window._collectorRetryTimer=retryTimer;});
  local.on("error",()=>status("RETRYING"));
  window._collectorPeer=local;
}

function collectorPhoneToast(msg,error=false){const e=document.getElementById("collectorToast");if(e){e.textContent=msg;e.className=`judgePhoneToast show ${error?"error":""}`;setTimeout(()=>e.classList.remove("show"),1800);}}
function collectorValidateInput(el,min,max){
  if(!el)return false;
  const raw=String(el.value||"").trim().replace(",",".");
  el.classList.remove("scoreValid","scoreInvalid");
  if(raw==="")return false;
  const n=Number(raw);
  const ok=Number.isFinite(n)&&n>=min&&n<=max;
  el.classList.add(ok?"scoreValid":"scoreInvalid");
  return ok;
}
function collectorBindValidation(){
  document.querySelectorAll(".collectorInput").forEach(el=>{
    const isAcc=el.id.startsWith("collectorAcc");
    el.addEventListener("input",()=>collectorValidateInput(el,isAcc?0:1.5,isAcc?4:6));
    el.addEventListener("change",()=>collectorValidateInput(el,isAcc?0:1.5,isAcc?4:6));
    if(el.value)collectorValidateInput(el,isAcc?0:1.5,isAcc?4:6);
  });
}

function collectorSendScores(){
  if(!window._collectorScoringOpen){collectorPhoneToast("WAIT FOR OPERATOR TO FINISH PERFORMANCE",true);return;}
  const count=Number(window._collectorJudgeCount||0), scores={};
  for(let i=1;i<=count;i++){
    const a=document.getElementById(`collectorAcc${i}`), p=document.getElementById(`collectorPres${i}`);
    const acc=Number(String(a?.value||"").replace(",",".")), pres=Number(String(p?.value||"").replace(",","."));
    const accOk=collectorValidateInput(a,0,4); const presOk=collectorValidateInput(p,1.5,6); if(!accOk||!presOk){collectorPhoneToast(`ENTER VALID SCORES FOR JUDGE ${i}`,true);(accOk?p:a)?.focus();return;}
    scores[i]={accuracy:Number(acc.toFixed(1)),presentation:Number(pres.toFixed(1))};
  }
  if(!window._collectorConn?.open){collectorPhoneToast("NOT CONNECTED TO OPERATOR",true);return;}
  window._collectorConn.send({type:"COLLECTOR_SCORES",scores,stationId:window._collectorStation||""});
  window._collectorSent=true;
  const b=document.getElementById("collectorSendBtn");if(b){b.disabled=true;b.textContent="SCORES SENT";b.classList.add("sent");}
  document.querySelectorAll(".collectorInput").forEach(x=>x.disabled=true);
  collectorPhoneToast("ALL SCORES SENT TO OPERATOR");
}
function renderCollectorPhoneContext(ctx){
  const mat=Number(ctx.matNumber)||Number(window._collectorMat)||1;
  const judges=Number(ctx.judgeCount||0), open=!!ctx.scoringOpen;
  const incomingSession=String(ctx.sessionId||"");
  const incomingRound=Number(ctx.round||0);
  const sessionChanged=incomingSession!==String(window._collectorSessionId||"") || incomingRound!==Number(window._collectorRound||0);
  if(sessionChanged){
    window._collectorSent=false;
    window._collectorSessionId=incomingSession;
    window._collectorRound=incomingRound;
  }
  window._collectorScoringOpen=open; window._collectorJudgeCount=judges;
  const stateEl=document.getElementById("collectorState");if(stateEl)stateEl.textContent=open?"READY TO ENTER SCORES":"WAITING FOR OPERATOR TO FINISH PERFORMANCE";
  const matEl=document.getElementById("collectorMat");if(matEl)matEl.textContent=String(mat);
  const titleEl=document.getElementById("collectorMatTitle");if(titleEl)titleEl.textContent=`TAPIS ${mat}`;
  const athleteEl=document.getElementById("collectorAthlete");if(athleteEl)athleteEl.textContent=ctx.athlete||"WAITING FOR NEXT POOMSAE";
  const list=document.getElementById("collectorJudgeList");if(!list)return;
  const old={};
  if(!sessionChanged){
    list.querySelectorAll(".collectorJudgeBox").forEach(box=>{const i=box.dataset.judge;old[i]={a:document.getElementById(`collectorAcc${i}`)?.value||"",p:document.getElementById(`collectorPres${i}`)?.value||""};});
  }
  list.innerHTML=Array.from({length:judges},(_,i)=>{const j=i+1,v=old[j]||{},name=ctx.judgeNames?.[j]||`JUDGE ${j}`;return `<div class="collectorJudgeBox" data-judge="${j}"><div class="collectorJudgeTitle"><span>JUDGE ${j}</span><small>${esc(name)}</small></div><div class="collectorFields"><label>ACCURACY<input class="collectorInput" id="collectorAcc${j}" type="number" min="0" max="4" step="0.1" inputmode="decimal" placeholder="3.2" value="${esc(v.a)}" ${open?"":"disabled"}></label><label>PRESENTATION<input class="collectorInput" id="collectorPres${j}" type="number" min="1.5" max="6" step="0.1" inputmode="decimal" placeholder="4.2" value="${esc(v.p)}" ${open?"":"disabled"}></label></div></div>`;}).join("")+`<button id="collectorSendBtn" class="judgePhoneSend collectorSendBtn" ${open?"":"disabled"} onclick="collectorSendScores()">SEND SCORES</button>`;
  collectorBindValidation();
  if(open&&window._collectorSent){const b=document.getElementById("collectorSendBtn");if(b){b.disabled=true;b.textContent="SCORES SENT";b.classList.add("sent");}document.querySelectorAll(".collectorInput").forEach(x=>x.disabled=true);}
}
function renderCollector(){
  const p=new URLSearchParams(location.search);const qrMat=Number(p.get("mat"))||1;window._collectorMat=qrMat;
  document.body.innerHTML=`<div class="judgePhoneApp collectorApp"><header class="judgePhoneHeader"><img src="federation_logo_transparent.png"><div><small>FTT POOMSAE · TAPIS <span id="collectorMat">${esc(qrMat)}</span></small><strong>COLLECTOR</strong></div><span id="collectorConnection" class="judgePhoneConnection">CONNECTING</span></header><main id="collectorMain"><section class="collectorPhoneCard"><div class="phaseTag">COLLECTOR</div><h1 id="collectorMatTitle">TAPIS ${esc(qrMat)}</h1><p id="collectorAthlete">WAITING FOR NEXT POOMSAE</p><div id="collectorState" class="collectorState">WAITING FOR OPERATOR TO FINISH PERFORMANCE</div><div id="collectorJudgeList" class="collectorJudgeList"></div></section></main><div id="collectorToast" class="judgePhoneToast"></div></div>`;
  window._collectorScoringOpen=false;window._collectorSent=false;window._collectorJudgeCount=0;window._collectorSessionId="";window._collectorRound=0;
  collectorPhoneConnect({peer:p.get("peer"),token:p.get("t"),station:p.get("station")||""});
}

function renderJudgePhone(){
  const p=judgeParams(); judgePhoneRememberLink(p); window._judgePhoneJudge=Number(p.judge)||0;window._judgePhoneName=String(STATE.judgeNames?.[p.judge]||"");ctxMatForHeader=p.mat||Number(STATE.matNumber)||1;
  document.body.innerHTML=`<div class="judgePhoneApp"><div class="judgePhoneGlow g1"></div><div class="judgePhoneGlow g2"></div><header class="judgePhoneHeader"><img src="federation_logo_transparent.png"><div><small>FTT POOMSAE · TAPIS ${esc(ctxMatForHeader||p.mat||STATE.matNumber||1)}</small><strong>JUDGE ${p.judge||"—"}</strong><em class="judgePhoneName" id="judgePhoneName">${esc(window._judgePhoneName||"")}</em></div><div class="judgePhoneHeaderActions"><span id="judgePhoneConnection" class="judgePhoneConnection">CONNECTING</span><button id="judgeFsBtn" class="judgePhoneFsBtn" onclick="judgePhoneFullscreen()" title="Plein écran">⛶</button></div></header><main id="judgePhoneMain"></main><div id="judgePhoneToast" class="judgePhoneToast"></div><div id="judgeOrientationOverlay" class="judgeOrientationOverlay"><div class="orientationIcon">↔</div><strong>TURN PHONE TO LANDSCAPE</strong><span>Le mode paysage est obligatoire pour noter.</span><button class="judgePhoneFsBtn large" onclick="judgePhoneFullscreen()">⛶ FULL SCREEN</button></div></div>`;
  window._judgePhoneAcc=4;window._judgePhoneParts={speedPower:2,rhythmTempo:2,expressionEnergy:2};window._judgePhoneSent=false;window._judgePhoneScoringOpen=false;
  judgePhoneInitControls();
  judgePhoneRenderMain({active:false,scoringOpen:false,athlete:"",club:"",poomsae:"",round:1,competition:"FTT POOMSAE"});
  judgePhoneConnect(p);
}
function judgePhoneConnect(p){
 if(typeof Peer!=="function"){judgePhoneToast("PeerJS unavailable",true);return;}
 const saved=judgePhoneLoadSaved(p);
 if(!p.token && saved?.token)p={...p,token:saved.token,peer:saved.peer||p.peer,judge:saved.judge||p.judge,mat:saved.mat||p.mat,station:saved.station||p.station};
 if(!p.peer||!p.judge||!p.token){judgePhoneToast("Invalid judge QR",true);return;}
 judgePhoneRememberLink(p);
 try{window._judgePhoneReconnectTimer&&clearInterval(window._judgePhoneReconnectTimer)}catch(_){ }
 try{window._judgePhonePeer?.destroy?.()}catch(_){ }
 window._judgePhonePeer=null;window._judgePhoneConn=null;
 const setStatus=(text,on)=>{const el=document.getElementById("judgePhoneConnection");if(el){el.textContent=text;el.classList.toggle("connected",!!on);}};
 const connectOnce=()=>{
  if(window._judgePhoneConn?.open)return;
  const local=window._judgePhonePeer;
  if(!local||local.destroyed)return;
  let conn;
  try{conn=local.connect(p.peer,{reliable:true,metadata:{role:"judge",judge:p.judge,token:p.token,station:p.station||""}});}catch(e){setStatus("RECONNECTING",false);return;}
  window._judgePhoneConn=conn;
  conn.on("open",()=>{
   setStatus("CONNECTED",true);judgePhoneToast("CONNECTED TO OPERATOR");
   try{conn.send({type:"JUDGE_HELLO",judge:Number(p.judge),token:String(p.token),station:String(p.station||"")});}catch(_){ }
   try{conn.send({type:"REQUEST_CONTEXT",judge:Number(p.judge),token:String(p.token),station:String(p.station||"")});}catch(_){ }
  });
  conn.on("data",msg=>{
   if(msg?.type==="SCORE_ACK"){
    if(String(msg.sessionId||"")!==String(window._judgePhoneSession||""))return;
    window._judgePhoneSent=true;window._judgePhonePendingPayload=null;judgePhoneClearSaved(p);judgePhoneRenderSent();
    document.querySelectorAll("#judgePhoneMain button").forEach(b=>{if(b.id!=="judgePhoneSend")b.disabled=true;});
    const sendBtn=document.getElementById("judgePhoneSend");if(sendBtn){sendBtn.disabled=true;sendBtn.textContent="✓ SCORE SENT";sendBtn.classList.add("sent");}
    return;
   }
   if(msg?.type!=="CONTEXT" && msg?.type!=="SCORING_CONTEXT")return;
   ctxMatForHeader=Number(msg.matNumber)||1;
   window._judgePhoneName=String(msg.judgeNames?.[p.judge]||"");
   const nameEl=document.getElementById("judgePhoneName");if(nameEl)nameEl.textContent=window._judgePhoneName;
   const nextSession=msg.sessionId||"";
   const sessionChanged=nextSession!==window._judgePhoneSession;
   window._judgePhoneSession=nextSession;window._judgePhoneStation=String(msg.stationId||p.station||"");
   const operatorScore=msg.judgeScores?.[Number(p.judge)]||null;
   if(operatorScore && String(operatorScore.sessionId||"")===String(nextSession)){
     window._judgePhoneSent=true;window._judgePhoneAcc=Number(operatorScore.accuracy);window._judgePhoneParts={...(operatorScore.parts||window._judgePhoneParts)};judgePhoneClearSaved(p);
   }else if(sessionChanged){
     window._judgePhoneAcc=4;window._judgePhoneParts={speedPower:2,rhythmTempo:2,expressionEnergy:2};window._judgePhoneSent=false;
     judgePhoneRestoreDraft(p,nextSession);
   }else{
     judgePhoneRestoreDraft(p,nextSession);
   }
   judgePhoneSaveSaved(p,{peer:p.peer,judge:p.judge,token:p.token,mat:p.mat,station:p.station,sessionId:nextSession,accuracy:window._judgePhoneAcc,parts:window._judgePhoneParts,sent:!!window._judgePhoneSent});
   judgePhoneRenderMain(msg);
   if(window._judgePhonePendingPayload && !window._judgePhoneSent && msg.scoringOpen){
     setTimeout(()=>{try{if(window._judgePhoneConn?.open)window._judgePhoneConn.send(window._judgePhonePendingPayload)}catch(_){ }},120);
   }
  });
  conn.on("close",()=>{if(window._judgePhoneConn===conn)window._judgePhoneConn=null;setStatus("RECONNECTING",false);});
  conn.on("error",()=>{if(window._judgePhoneConn===conn)window._judgePhoneConn=null;setStatus("RECONNECTING",false);});
 };
 const local=new Peer();window._judgePhonePeer=local;
 local.on("open",()=>{setStatus("CONNECTING",false);connectOnce();window._judgePhoneReconnectTimer=setInterval(connectOnce,1800);});
 local.on("error",()=>setStatus("RECONNECTING",false));
 local.on("disconnected",()=>{setStatus("RECONNECTING",false);try{local.reconnect?.()}catch(_){ }});
}

function judgePhoneRenderMain(ctx){
  window._judgePhoneLastContext=ctx;
  const open=!!ctx.scoringOpen;
  window._judgePhoneScoringOpen=open;
  const total=Number(Object.values(window._judgePhoneParts||{speedPower:2,rhythmTempo:2,expressionEnergy:2}).reduce((s,v)=>s+v,0).toFixed(1));
  const main=document.getElementById("judgePhoneMain");if(!main)return;
  const header=`<section class="judgePhoneMatch"><div class="judgePhoneEyebrow">${esc(ctx.competition||"FTT POOMSAE")}</div><h1>${esc(ctx.athlete||"WAITING FOR NEXT POOMSAE")}</h1><p>${esc(ctx.club||"")}</p><div class="judgePhoneRound">${ctx.tieBreak?`TIE-BREAK · ${esc(ctx.poomsae||"—")}`:`ROUND ${ctx.round||1} · ${esc(ctx.poomsae||"—")}`}</div></section>`;
  const sent=!!window._judgePhoneSent;
  const canEdit=open&&!sent;
  const scoring=`<section class="judgeScoreCard ${open?'':'judgeScoreLocked'}"><div class="judgeScoringState">${sent?'✓ SCORE SENT':open?'SCORING OPEN':'WAITING FOR OPERATOR'}</div><div class="scoreSectionTitle"><span>ACCURACY</span><small>STARTING SCORE</small></div><div id="judgeAccuracyValue" class="judgeAccuracyValue ${Number(window._judgePhoneAcc)>=0&&Number(window._judgePhoneAcc)<=4?"scoreValidText":"scoreInvalidText"}">${Number(window._judgePhoneAcc||4).toFixed(1)}</div><div class="accuracyControls"><div class="accuracyCol"><button type="button" class="accuracyMinus big" ${canEdit?'':'disabled'} onclick="window.judgePhoneAdjust(-0.3)">−0.3</button><button type="button" class="accuracyPlus small" ${canEdit?'':'disabled'} onclick="window.judgePhoneAdjust(0.3)">+0.3</button></div><div class="accuracyCol"><button type="button" class="accuracyMinus big" ${canEdit?'':'disabled'} onclick="window.judgePhoneAdjust(-0.1)">−0.1</button><button type="button" class="accuracyPlus small" ${canEdit?'':'disabled'} onclick="window.judgePhoneAdjust(0.1)">+0.1</button></div></div><div class="scoreSectionTitle presentationTitle"><span>PRESENTATION</span><small>3 PARAMETERS</small></div><div class="presentationParts"><div class="partCard"><b>SPEED &amp; POWER</b><div class="partControl" data-part-control="speedPower">${judgePhoneBuildValues("speedPower",open)}</div></div><div class="partCard"><b>RHYTHM &amp; TEMPO</b><div class="partControl" data-part-control="rhythmTempo">${judgePhoneBuildValues("rhythmTempo",open)}</div></div><div class="partCard"><b>EXPRESSION OF ENERGY</b><div class="partControl" data-part-control="expressionEnergy">${judgePhoneBuildValues("expressionEnergy",open)}</div></div></div><div class="presentationTotal"><span>PRESENTATION</span><strong id="judgePresentationTotal" class="${total>=1.5&&total<=6?"scoreValidText":"scoreInvalidText"}">${total.toFixed(1)}</strong></div><button id="judgePhoneSend" class="judgePhoneSend" ${canEdit?'':'disabled'} onclick="window.judgePhoneSendScore()">${sent?'✓ SCORE SENT':'SEND SCORE'}</button><div class="judgeRestartZone"><span>EXCEPTION</span><button id="judgePhoneRestart" class="judgePhoneRestartBtn" ${canEdit?'':'disabled'} onclick="window.judgePhoneRestart()">↻ RESTART</button></div></section>`;
  const own=ctx.judgeScores?.[Number(window._judgePhoneJudge)||0]||null;
  const finalNote=(!open&&own&&Number.isFinite(Number(own.accuracy))&&Number.isFinite(Number(own.presentation)))
    ? `<section class="judgeFinalNote"><div class="judgeFinalNoteKicker">YOUR FINAL NOTE</div><div class="judgeFinalNoteGrid"><div><span>ACCURACY</span><strong>${Number(own.accuracy).toFixed(1)}</strong></div><div><span>PRESENTATION</span><strong>${Number(own.presentation).toFixed(1)}</strong></div><div class="judgeFinalNoteTotal"><span>TOTAL</span><strong>${(Number(own.accuracy)+Number(own.presentation)).toFixed(1)}</strong></div></div><small>NOTE ENREGISTRÉE PAR L’OPÉRATEUR</small></section>` : "";
  main.innerHTML=header+scoring+finalNote;
}


function renderJudge(){renderJudgePhone();}
if(judgeIsPhone())renderJudge();
else if(new URLSearchParams(location.search).get("collector")==="1")renderCollector();
else if(!new URLSearchParams(location.search).get("display")) ensureJudgePeer();
function judgeSetName(j,value){
  j=Number(j)||1;
  STATE.judgeNames=STATE.judgeNames||{};
  STATE.judgeNames[j]=String(value||"").trim();
  saveState();
  const name=document.querySelector(`.judgeQrName[data-judge-name="${j}"]`);
  if(name) name.textContent=STATE.judgeNames[j]||"NAME NOT SET";
  const items=document.querySelectorAll(`.operatorJudgeStatusItem[data-judge="${j}"] .operatorJudgeIdentity strong`);
  items.forEach(el=>el.textContent=STATE.judgeNames[j]||"NAME NOT SET");
  const box=document.querySelector(`.judgeBox[data-judge="${j}"] .operatorJudgeName`);
  if(box) box.textContent=STATE.judgeNames[j]||"NAME NOT SET";
  judgeSendContext();
}

