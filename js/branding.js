// Championship branding + first-launch setup
const FEDERATION_NAME = "FÉDÉRATION TUNISIENNE DE TAEKWONDO";
const RIGHTS_TEXT = "ALL RIGHTS RESERVED • FÉDÉRATION TUNISIENNE DE TAEKWONDO";
function federationLogoSVG(){return `<img class="fedLogo officialFedLogo" src="federation_logo_transparent.png" alt="Fédération Tunisienne de Taekwondo — logo officiel" referrerpolicy="no-referrer">`}
function landingScreen(role="operator"){
 const isPublic=role==="public";
 return `<div class="landing ${isPublic?"landingPublic":"landingOperator"}">
   <div class="landingGlow glowA"></div><div class="landingGlow glowB"></div>
   <div class="landingArt leftArt" aria-hidden="true"><svg viewBox="0 0 260 300"><circle cx="130" cy="40" r="18"/><path d="M130 63 L130 150 M130 88 L72 120 M130 88 L190 112 M130 150 L76 224 M130 150 L177 194 L236 151"/><path d="M72 120 L40 91 M190 112 L222 80"/></svg></div>
   <div class="landingArt rightArt" aria-hidden="true"><svg viewBox="0 0 260 300"><circle cx="130" cy="40" r="18"/><path d="M130 63 L130 150 M130 88 L72 120 M130 88 L190 112 M130 150 L76 224 M130 150 L177 194 L236 151"/><path d="M72 120 L40 91 M190 112 L222 80"/></svg></div>
   <div class="landingCard">
     <div class="logoRing">${federationLogoSVG()}</div>
     <div class="eyebrow">WORLD TAEKWONDO • POOMSAE</div>
     <h1>${esc((STATE.setupDraft?.competitionName)||STATE.competitionName||"POOMSAE CHAMPIONSHIP")}</h1>
     <h2>${FEDERATION_NAME}</h2>
     <div class="landingRule"></div>
     <div class="landingSubtitle">OFFICIAL POOMSAE SCORING SYSTEM</div>
     <div class="landingStatus">${isPublic?"PUBLIC DISPLAY":"OPERATOR CONSOLE"}</div>
     ${isPublic?(()=>{const d=STATE.setupDraft||{};const has=d.category||d.athleteCount||d.competitionName;return `<div class="waitingText">${has?"COMPETITION SETUP IN PROGRESS…":"WAITING FOR OPERATOR CONFIGURATION…"}</div>${has?`<div class="publicSetupLive"><div><b>${esc(d.classCode||"—")}</b> · ${esc(d.category||"—")} · ${esc(d.gender||"—")}</div><div>${d.athleteCount||0} ${d.participation==="DUO"?"DUOS":d.participation==="TEAM"?"TEAMS":"ATHLETES"} · ${d.judgeCount||3} JUDGES · TAPIS ${d.matNumber||1}</div><div>${(Number(d.athleteCount)>(d.participation==="INDIVIDUAL"?8:4))?`DEMI-FINALE: ${esc(WT_DATA.poomsae[d.poomsaeSemi1]||"—")} · ${esc(WT_DATA.poomsae[d.poomsaeSemi2]||"—")}<br>`:""}FINALE: ${esc(WT_DATA.poomsae[d.poomsaeFinal1]||"—")} · ${esc(WT_DATA.poomsae[d.poomsaeFinal2]||"—")}</div>${(d.athletes||[]).length?`<div class="liveAthleteList">${d.athletes.map((a,i)=>`<span>${i+1}. ${esc(a.name||"—")}</span>`).join("")}</div>`:""}</div>`:""}`})():`<div class="landingButtons"><button class="btn goldBtn launchBtn" onclick="openCompetitionSetup()">COMMENCER LA COMPÉTITION</button><button class="btn primary launchBtn" onclick="openPublicDisplay()">OPEN PUBLIC DISPLAY</button></div>`}
     <div class="rights">${RIGHTS_TEXT}</div>
   </div>
 </div>`
}
function broadcastSetupDraft(){
 const get=id=>document.getElementById(id);
 if(!get("setupClass"))return;
 STATE.setupDraft={competitionName:get("setupCompetition")?.value.trim()||"POOMSAE CHAMPIONSHIP",classCode:get("setupClass")?.value||"",category:get("setupCategory")?.value||"",gender:get("setupGender")?.value||"",participation:get("setupParticipation")?.value||"INDIVIDUAL",athleteCount:Number(get("setupAthletes")?.value)||0,judgeCount:Number(get("setupJudges")?.value)||3,matNumber:Number(get("setupMat")?.value)||1,poomsaeSemi1:get("setupSemiPoomsae1")?.value||"",poomsaeSemi2:get("setupSemiPoomsae2")?.value||"",poomsaeFinal1:get("setupFinalPoomsae1")?.value||"",poomsaeFinal2:get("setupFinalPoomsae2")?.value||"",athletes:[...document.querySelectorAll("#setupAthleteFields .setupAthleteItem")].map(x=>{const part=get("setupParticipation")?.value||"INDIVIDUAL";const e=buildEntryFromRow(x,part);return {name:e.name||"",club:e.club||"",members:e.members||null}})};
 saveState(); broadcast();
}
function participationMemberCount(participation){return participation==="DUO"?2:participation==="TEAM"?3:1;}
function entryGenderLabel(entry){
  if(entry?.members?.length){
    const gs=entry.members.map(m=>m.gender).filter(Boolean);
    if(STATE.participation==="DUO") return "Mixed";
    if(gs.length&&gs.every(g=>g===gs[0])) return gs[0];
  }
  return entry?.gender||STATE.gender||"—";
}
function entryDisplayName(entry){
  if(entry?.members?.length) return entry.members.map(m=>m.name).filter(Boolean).join(" / ");
  return entry?.name||"";
}
function buildEntryFromRow(row, participation){
  const memberCount=participationMemberCount(participation);
  if(participation==="INDIVIDUAL"){
    return {name:row.querySelector(".athName")?.value.trim()||"",club:row.querySelector(".athClub")?.value.trim()||"",gender:STATE.gender||""};
  }
  const members=Array.from({length:memberCount},(_,i)=>({name:row.querySelector(`.memberName${i}`)?.value.trim()||"",gender:row.querySelector(`.memberGender${i}`)?.value||""}));
  return {members,club:row.querySelector(".athClub")?.value.trim()||"",name:members.map(m=>m.name).filter(Boolean).join(" / "),gender:participation==="DUO"?"Mixed":(members[0]?.gender||"")};
}

function normalizeExcelHeader(v){return String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"");}
function importAthletesFromExcel(file){
 if(!file)return;
 if(typeof XLSX==="undefined")return alert("Le module Excel n'est pas disponible. Vérifiez la connexion Internet puis rechargez la page.");
 const reader=new FileReader();
 reader.onload=e=>{
   try{
     const wb=XLSX.read(new Uint8Array(e.target.result),{type:"array"});
     const ws=wb.Sheets[wb.SheetNames[0]];
     const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:"",raw:false});
     if(!rows.length)throw new Error("Fichier vide");
     const first=rows[0].map(normalizeExcelHeader);
     const nameKeys=["nom","nomprenom","nometprenom","athlete","athletenom","name","fullname","participant","participantnom"];
     const clubKeys=["club","clubnom","association","team","equipe","structure"];
     let nameIdx=first.findIndex(x=>nameKeys.includes(x));
     let clubIdx=first.findIndex(x=>clubKeys.includes(x));
     let start=1;
     if(nameIdx<0){
       nameIdx=0; clubIdx=rows[0].length>1?1:-1; start=0;
     }
     const imported=[];
     for(let i=start;i<rows.length;i++){
       const r=rows[i]||[];
       const name=String(r[nameIdx]??"").trim();
       const club=clubIdx>=0?String(r[clubIdx]??"").trim():"";
       if(name)imported.push({name,club});
     }
     if(!imported.length)throw new Error("Aucun athlète trouvé. Utilisez des colonnes Nom et Club.");
     if(imported.length>50)throw new Error("Le fichier contient plus de 50 athlètes. La limite est de 50.");
     const part=document.getElementById("setupParticipation");
     if(part&&part.value!=="INDIVIDUAL"){
       part.value="INDIVIDUAL";
       part.dispatchEvent(new Event("change",{bubbles:true}));
     }
     const count=document.getElementById("setupAthletes");
     if(count){count.value=String(imported.length);count.dispatchEvent(new Event("change",{bubbles:true}));}
     const fields=document.getElementById("setupAthleteFields");
     if(!fields)throw new Error("La liste des athlètes n'est pas disponible.");
     const items=[...fields.querySelectorAll(".setupAthleteItem")];
     imported.forEach((a,i)=>{
       const row=items[i]; if(!row)return;
       const n=row.querySelector(".athName"),c=row.querySelector(".athClub");
       if(n)n.value=a.name;
       if(c)c.value=a.club;
     });
     fields.dispatchEvent(new Event("input",{bubbles:true}));
     const status=document.getElementById("excelImportStatus");
     if(status){status.textContent=`${imported.length} ATHLÈTES IMPORTÉS`;status.classList.add("successImport");}
     if(typeof validateSetupAthletes==="function")validateSetupAthletes();
     if(typeof broadcastSetupDraft==="function")broadcastSetupDraft();
   }catch(err){alert(`Import Excel impossible : ${err.message||err}`);}
   const input=document.getElementById("setupExcelFile");if(input)input.value="";
 };
 reader.onerror=()=>alert("Impossible de lire le fichier Excel.");
 reader.readAsArrayBuffer(file);
}
function handleExcelFileInput(input){importAthletesFromExcel(input?.files?.[0]);}


const TUNISIA_GOVERNORATES_AR = [
 {id:"TN11",name:"تونس"},{id:"TN12",name:"أريانة"},{id:"TN13",name:"بن عروس"},{id:"TN14",name:"منوبة"},
 {id:"TN21",name:"نابل"},{id:"TN22",name:"زغوان"},{id:"TN23",name:"بنزرت"},{id:"TN24",name:"باجة"},
 {id:"TN31",name:"سوسة"},{id:"TN32",name:"المنستير"},{id:"TN33",name:"المهدية"},{id:"TN34",name:"صفاقس"},
 {id:"TN41",name:"القيروان"},{id:"TN42",name:"القصرين"},{id:"TN43",name:"سيدي بوزيد"},{id:"TN51",name:"قابس"},
 {id:"TN52",name:"مدنين"},{id:"TN53",name:"تطاوين"},{id:"TN61",name:"قفصة"},{id:"TN62",name:"توزر"},
 {id:"TN63",name:"قبلي"},{id:"TN71",name:"الكاف"},{id:"TN72",name:"سليانة"},{id:"TN73",name:"جندوبة"}
];
const COMPETITION_TYPES_AR = [
 {key:"regional",label:"البطولة الجهوية"},
 {key:"territorial",label:"البطولة الإقليمية"},
 {key:"national",label:"البطولة الوطنية"}
];
function generatedArabicCompetitionName(type, governorate){
 const t=COMPETITION_TYPES_AR.find(x=>x.key===type)?.label||"البطولة الجهوية";
 return type === "national" ? `${t} للبومزا` : `${t} للبومزا - ${governorate||"تونس"}`;
}
function openArabicCompetitionNameBuilder(){
 const old=document.getElementById("arabicCompetitionNameModal"); if(old){old.remove();return;}
 document.body.insertAdjacentHTML("beforeend",`<div id="arabicCompetitionNameModal" class="setupOverlay open" dir="rtl">
   <div class="arabicNameModal">
     <div class="arabicNameHeader">
       <div><div class="phaseTag">تسمية المسابقة</div><h2>إنشاء اسم المسابقة</h2><p>اختر نوع البطولة ثم مرّر المؤشر فوق الولاية المطلوبة واضغط عليها.</p></div>
       <button class="btn" onclick="closeArabicCompetitionNameBuilder()">إغلاق</button>
     </div>
     <div class="arabicNameTypes" role="group" aria-label="نوع البطولة">
       ${COMPETITION_TYPES_AR.map(t=>`<button type="button" class="arabicNameTypeBtn ${STATE.competitionType===t.key?"selected":""}" data-type="${t.key}" onclick="selectArabicCompetitionType('${t.key}')">${t.label}</button>`).join("")}
     </div>
     <div class="arabicMapLayout" id="arabicMapLayout">
       <div class="tunisiaMapCard" id="tunisiaMapCard">
         <div class="tunisiaMapTitle">خريطة الجمهورية التونسية</div>
         <div class="tunisiaMapHint">مرّر المؤشر فوق الولاية لمعرفة اسمها، ثم اضغط لاختيارها.</div>
         <div class="govHoverTooltip" id="govHoverTooltip">حرّك المؤشر فوق ولاية</div>
         <div class="tunisiaMapWrap" id="tunisiaGovernorateMap">
           <svg class="tunisiaActualMap" viewBox="0 0 760 620" role="img" aria-label="خريطة ولايات تونس"><defs><filter id="mapShadow"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".25"/></filter></defs><path d="M 22.0,34.4 128.2,34.4 228.9,11.5 357.1,11.5 476.1,19.5 576.9,37.9 668.4,60.9 714.2,114.8 705.1,172.2 692.2,218.1 714.2,281.3 741.7,333.0 754.5,396.1 723.4,447.8 695.9,493.7 650.1,528.1 595.2,568.3 531.1,602.8 467.0,614.3 375.4,614.3 274.7,608.5 192.3,585.6 128.2,556.9 73.3,510.9 45.8,447.8 27.5,384.6 18.3,304.3 3.7,241.1 9.2,178.0 9.2,103.3 Z" class="tunisiaOutline"/><g class="govMapRegion" data-gov="تونس" onmouseenter="previewArabicGovernorate('تونس');showArabicGovernorateTooltip('تونس')" onfocus="showArabicGovernorateTooltip('تونس')" onclick="selectArabicGovernorate('تونس')" tabindex="0" role="button" aria-label="تونس"><path d="M 502.3,94.5 531.6,89.2 499.3,109.5 502.3,94.5 Z"/><text x="509.1" y="97.6">تونس</text></g><g class="govMapRegion" data-gov="أريانة" onmouseenter="previewArabicGovernorate('أريانة');showArabicGovernorateTooltip('أريانة')" onfocus="showArabicGovernorateTooltip('أريانة')" onclick="selectArabicGovernorate('أريانة')" tabindex="0" role="button" aria-label="أريانة"><path d="M 466.7,72.1 552.0,33.4 576.9,37.9 630.5,51.3 627.1,54.3 531.6,89.2 502.3,94.5 466.7,72.1 Z"/><text x="505.4" y="89.6">أريانة</text></g><g class="govMapRegion" data-gov="بن عروس" onmouseenter="previewArabicGovernorate('بن عروس');showArabicGovernorateTooltip('بن عروس')" onfocus="showArabicGovernorateTooltip('بن عروس')" onclick="selectArabicGovernorate('بن عروس')" tabindex="0" role="button" aria-label="بن عروس"><path d="M 531.6,89.2 627.1,54.3 555.4,130.7 491.3,120.4 499.3,109.5 531.6,89.2 Z"/><text x="518.3" y="103.3">بن عروس</text></g><g class="govMapRegion" data-gov="منوبة" onmouseenter="previewArabicGovernorate('منوبة');showArabicGovernorateTooltip('منوبة')" onfocus="showArabicGovernorateTooltip('منوبة')" onclick="selectArabicGovernorate('منوبة')" tabindex="0" role="button" aria-label="منوبة"><path d="M 491.3,120.4 413.6,125.2 408.7,90.3 466.7,72.1 502.3,94.5 499.3,109.5 491.3,120.4 Z"/><text x="494.5" y="96.4">منوبة</text></g><g class="govMapRegion" data-gov="نابل" onmouseenter="previewArabicGovernorate('نابل');showArabicGovernorateTooltip('نابل')" onfocus="showArabicGovernorateTooltip('نابل')" onclick="selectArabicGovernorate('نابل')" tabindex="0" role="button" aria-label="نابل"><path d="M 560.4,168.5 555.4,130.7 627.1,54.3 630.5,51.3 668.4,60.9 714.2,114.8 705.3,170.4 625.3,176.4 560.4,168.5 Z"/><text x="611.7" y="137.8">نابل</text></g><g class="govMapRegion" data-gov="زغوان" onmouseenter="previewArabicGovernorate('زغوان');showArabicGovernorateTooltip('زغوان')" onfocus="showArabicGovernorateTooltip('زغوان')" onclick="selectArabicGovernorate('زغوان')" tabindex="0" role="button" aria-label="زغوان"><path d="M 445.3,183.0 410.6,130.6 413.6,125.2 491.3,120.4 555.4,130.7 560.4,168.5 527.5,185.9 445.3,183.0 Z"/><text x="501.8" y="143.5">زغوان</text></g><g class="govMapRegion" data-gov="بنزرت" onmouseenter="previewArabicGovernorate('بنزرت');showArabicGovernorateTooltip('بنزرت')" onfocus="showArabicGovernorateTooltip('بنزرت')" onclick="selectArabicGovernorate('بنزرت')" tabindex="0" role="button" aria-label="بنزرت"><path d="M 310.3,11.5 357.1,11.5 476.1,19.5 552.0,33.4 466.7,72.1 408.7,90.3 310.3,11.5 Z"/><text x="452.3" y="43.6">بنزرت</text></g><g class="govMapRegion" data-gov="باجة" onmouseenter="previewArabicGovernorate('باجة');showArabicGovernorateTooltip('باجة')" onfocus="showArabicGovernorateTooltip('باجة')" onclick="selectArabicGovernorate('باجة')" tabindex="0" role="button" aria-label="باجة"><path d="M 408.7,90.3 413.6,125.2 410.6,130.6 316.1,148.0 197.5,18.7 228.9,11.5 310.3,11.5 408.7,90.3 Z"/><text x="326.0" y="105.6">باجة</text></g><g class="govMapRegion" data-gov="سوسة" onmouseenter="previewArabicGovernorate('سوسة');showArabicGovernorateTooltip('سوسة')" onfocus="showArabicGovernorateTooltip('سوسة')" onclick="selectArabicGovernorate('سوسة')" tabindex="0" role="button" aria-label="سوسة"><path d="M 566.2,270.0 527.5,185.9 560.4,168.5 625.3,176.4 588.0,254.3 566.2,270.0 Z"/><text x="589.7" y="209.0">سوسة</text></g><g class="govMapRegion" data-gov="المنستير" onmouseenter="previewArabicGovernorate('المنستير');showArabicGovernorateTooltip('المنستير')" onfocus="showArabicGovernorateTooltip('المنستير')" onclick="selectArabicGovernorate('المنستير')" tabindex="0" role="button" aria-label="المنستير"><path d="M 588.0,254.3 625.3,176.4 705.3,170.4 705.1,172.2 694.6,209.7 588.0,254.3 Z"/><text x="626.3" y="215.9">المنستير</text></g><g class="govMapRegion" data-gov="المهدية" onmouseenter="previewArabicGovernorate('المهدية');showArabicGovernorateTooltip('المهدية')" onfocus="showArabicGovernorateTooltip('المهدية')" onclick="selectArabicGovernorate('المهدية')" tabindex="0" role="button" aria-label="المهدية"><path d="M 564.3,276.0 566.2,270.0 588.0,254.3 694.6,209.7 692.2,218.1 714.2,281.3 728.7,308.6 564.3,276.0 Z"/><text x="659.3" y="246.9">المهدية</text></g><g class="govMapRegion" data-gov="صفاقس" onmouseenter="previewArabicGovernorate('صفاقس');showArabicGovernorateTooltip('صفاقس')" onfocus="showArabicGovernorateTooltip('صفاقس')" onclick="selectArabicGovernorate('صفاقس')" tabindex="0" role="button" aria-label="صفاقس"><path d="M 728.7,308.6 741.7,333.0 754.5,396.1 733.7,430.6 626.7,418.0 485.7,350.2 503.4,302.8 564.3,276.0 728.7,308.6 Z"/><text x="615.3" y="334.1">صفاقس</text></g><g class="govMapRegion" data-gov="القيروان" onmouseenter="previewArabicGovernorate('القيروان');showArabicGovernorateTooltip('القيروان')" onfocus="showArabicGovernorateTooltip('القيروان')" onclick="selectArabicGovernorate('القيروان')" tabindex="0" role="button" aria-label="القيروان"><path d="M 564.3,276.0 503.4,302.8 397.0,238.2 445.3,183.0 527.5,185.9 566.2,270.0 564.3,276.0 Z"/><text x="494.5" y="226.2">القيروان</text></g><g class="govMapRegion" data-gov="القصرين" onmouseenter="previewArabicGovernorate('القصرين');showArabicGovernorateTooltip('القصرين')" onfocus="showArabicGovernorateTooltip('القصرين')" onclick="selectArabicGovernorate('القصرين')" tabindex="0" role="button" aria-label="القصرين"><path d="M 289.6,224.4 337.4,242.2 309.5,329.4 94.8,320.3 15.6,292.5 4.8,245.9 289.6,224.4 Z"/><text x="261.9" y="284.7">القصرين</text></g><g class="govMapRegion" data-gov="سيدي بوزيد" onmouseenter="previewArabicGovernorate('سيدي بوزيد');showArabicGovernorateTooltip('سيدي بوزيد')" onfocus="showArabicGovernorateTooltip('سيدي بوزيد')" onclick="selectArabicGovernorate('سيدي بوزيد')" tabindex="0" role="button" aria-label="سيدي بوزيد"><path d="M 485.7,350.2 385.2,383.9 309.5,329.4 337.4,242.2 397.0,238.2 503.4,302.8 485.7,350.2 Z"/><text x="380.9" y="299.7">سيدي بوزيد</text></g><g class="govMapRegion" data-gov="قابس" onmouseenter="previewArabicGovernorate('قابس');showArabicGovernorateTooltip('قابس')" onfocus="showArabicGovernorateTooltip('قابس')" onclick="selectArabicGovernorate('قابس')" tabindex="0" role="button" aria-label="قابس"><path d="M 435.9,508.3 409.1,514.5 378.5,393.9 385.2,383.9 485.7,350.2 626.7,418.0 435.9,508.3 Z"/><text x="494.5" y="432.9">قابس</text></g><g class="govMapRegion" data-gov="مدنين" onmouseenter="previewArabicGovernorate('مدنين');showArabicGovernorateTooltip('مدنين')" onfocus="showArabicGovernorateTooltip('مدنين')" onclick="selectArabicGovernorate('مدنين')" tabindex="0" role="button" aria-label="مدنين"><path d="M 435.9,508.3 626.7,418.0 733.7,430.6 723.4,447.8 695.9,493.7 654.8,524.7 435.9,508.3 Z"/><text x="567.7" y="493.7">مدنين</text></g><g class="govMapRegion" data-gov="تطاوين" onmouseenter="previewArabicGovernorate('تطاوين');showArabicGovernorateTooltip('تطاوين')" onfocus="showArabicGovernorateTooltip('تطاوين')" onclick="selectArabicGovernorate('تطاوين')" tabindex="0" role="button" aria-label="تطاوين"><path d="M 409.1,514.5 435.9,508.3 654.8,524.7 650.1,528.1 595.2,568.3 531.1,602.8 467.0,614.3 375.4,614.3 328.5,611.6 409.1,514.5 Z"/><text x="558.6" y="541.9">تطاوين</text></g><g class="govMapRegion" data-gov="قفصة" onmouseenter="previewArabicGovernorate('قفصة');showArabicGovernorateTooltip('قفصة')" onfocus="showArabicGovernorateTooltip('قفصة')" onclick="selectArabicGovernorate('قفصة')" tabindex="0" role="button" aria-label="قفصة"><path d="M 309.5,329.4 385.2,383.9 378.5,393.9 219.4,419.9 94.8,320.3 309.5,329.4 Z"/><text x="252.7" y="369.7">قفصة</text></g><g class="govMapRegion" data-gov="توزر" onmouseenter="previewArabicGovernorate('توزر');showArabicGovernorateTooltip('توزر')" onfocus="showArabicGovernorateTooltip('توزر')" onclick="selectArabicGovernorate('توزر')" tabindex="0" role="button" aria-label="توزر"><path d="M 94.8,320.3 219.4,419.9 156.8,569.7 128.2,556.9 73.3,510.9 45.8,447.8 27.5,384.6 18.3,304.3 15.6,292.5 94.8,320.3 Z"/><text x="133.7" y="428.3">توزر</text></g><g class="govMapRegion" data-gov="قبلي" onmouseenter="previewArabicGovernorate('قبلي');showArabicGovernorateTooltip('قبلي')" onfocus="showArabicGovernorateTooltip('قبلي')" onclick="selectArabicGovernorate('قبلي')" tabindex="0" role="button" aria-label="قبلي"><path d="M 378.5,393.9 409.1,514.5 328.5,611.6 274.7,608.5 192.3,585.6 156.8,569.7 219.4,419.9 378.5,393.9 Z"/><text x="287.5" y="453.5">قبلي</text></g><g class="govMapRegion" data-gov="الكاف" onmouseenter="previewArabicGovernorate('الكاف');showArabicGovernorateTooltip('الكاف')" onfocus="showArabicGovernorateTooltip('الكاف')" onclick="selectArabicGovernorate('الكاف')" tabindex="0" role="button" aria-label="الكاف"><path d="M 303.9,158.6 289.6,224.4 4.8,245.9 3.7,241.1 9.2,178.0 9.2,119.4 303.9,158.6 Z"/><text x="239.9" y="169.9">الكاف</text></g><g class="govMapRegion" data-gov="سليانة" onmouseenter="previewArabicGovernorate('سليانة');showArabicGovernorateTooltip('سليانة')" onfocus="showArabicGovernorateTooltip('سليانة')" onclick="selectArabicGovernorate('سليانة')" tabindex="0" role="button" aria-label="سليانة"><path d="M 337.4,242.2 289.6,224.4 303.9,158.6 316.1,148.0 410.6,130.6 445.3,183.0 397.0,238.2 337.4,242.2 Z"/><text x="360.8" y="180.3">سليانة</text></g><g class="govMapRegion" data-gov="جندوبة" onmouseenter="previewArabicGovernorate('جندوبة');showArabicGovernorateTooltip('جندوبة')" onfocus="showArabicGovernorateTooltip('جندوبة')" onclick="selectArabicGovernorate('جندوبة')" tabindex="0" role="button" aria-label="جندوبة"><path d="M 316.1,148.0 303.9,158.6 9.2,119.4 9.2,103.3 22.0,34.4 128.2,34.4 197.5,18.7 316.1,148.0 Z"/><text x="252.7" y="132.0">جندوبة</text></g></svg>
         </div>
       </div>
       <div class="arabicNamePreviewCard">
         <div class="phaseTag">المعاينة</div>
         <div class="arabicNamePreviewLabel">اسم المسابقة النهائي</div>
         <div id="arabicCompetitionNamePreview" class="arabicNamePreview">${esc(generatedArabicCompetitionName(STATE.competitionType,STATE.competitionGovernorate))}</div>
         <div class="arabicSelectedInfo"><span>نوع البطولة</span><strong id="arabicSelectedType">${esc(COMPETITION_TYPES_AR.find(x=>x.key===STATE.competitionType)?.label||"—")}</strong><span>الولاية</span><strong id="arabicSelectedGovernorate">${esc(STATE.competitionGovernorate||"—")}</strong></div>
         <button class="btn goldBtn arabicNameApply" onclick="applyArabicCompetitionName()">استخدام هذا الاسم</button>
       </div>
     </div>
   </div>
 </div>`);
 updateArabicCompetitionBuilderUI();
 loadRealTunisiaGovernorateMap();
}

async function loadRealTunisiaGovernorateMap(){
 const host=document.getElementById("tunisiaRealMap");
 if(!host)return;
 if(host.dataset.loaded==="1")return;
 try{
  const res=await fetch("https://raw.githubusercontent.com/riatelab/tunisie/master/data/TN-gouvernorats.geojson",{cache:"force-cache"});
  if(!res.ok)throw new Error("map fetch failed");
  const geo=await res.json();
  renderRealTunisiaMap(host,geo);
  host.dataset.loaded="1";
 }catch(e){
  host.innerHTML=`<div class="realMapFallback"><div class="realMapFallbackTitle">تعذر تحميل الخريطة التفاعلية</div><div class="realMapFallbackHint">اختر الولاية من القائمة:</div><div class="govFallbackGrid">${ARABIC_GOVERNORATES.map(g=>`<button type="button" onclick="selectArabicGovernorate('${g.replace(/'/g,"\\'")}')">${g}</button>`).join("")}</div></div>`;
 }
}
function renderRealTunisiaMap(host,geo){
 const feats=(geo.features||[]).filter(f=>f.geometry&&f.properties?.gouv_ar);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 const collect=coords=>coords.forEach(p=>{if(Array.isArray(p[0])) collect(p); else {minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}});
 feats.forEach(f=>collect(f.geometry.coordinates));
 const pad=10,W=720,H=820,sx=(W-2*pad)/(maxX-minX),sy=(H-2*pad)/(maxY-minY),sc=Math.min(sx,sy);
 const px=x=>pad+(x-minX)*sc+(W-(maxX-minX)*sc-2*pad)/2;
 const py=y=>H-pad-(y-minY)*sc-(H-(maxY-minY)*sc-2*pad)/2;
 const pathD=ring=>ring.map((p,i)=>`${i?'L':'M'} ${px(p[0]).toFixed(2)} ${py(p[1]).toFixed(2)}`).join(" ")+" Z";
 const geomPath=geom=>geom.type==='Polygon'?geom.coordinates.map(pathD).join(' '):geom.type==='MultiPolygon'?geom.coordinates.flat().map(pathD).join(' '):'';
 const centroid=geom=>{const pts=[];const collectPts=c=>c.forEach(p=>Array.isArray(p[0])?collectPts(p):pts.push(p));collectPts(geom.coordinates);const x=pts.reduce((a,p)=>a+p[0],0)/pts.length,y=pts.reduce((a,p)=>a+p[1],0)/pts.length;return [px(x),py(y)];};
 host.innerHTML=`<svg class="tunisiaActualMap realGeoMap" viewBox="0 0 ${W} ${H}" role="img" aria-label="خريطة ولايات تونس">${feats.map(f=>{const name=f.properties.gouv_ar,d=geomPath(f.geometry),c=centroid(f.geometry);return `<g class="govMapRegion" data-gov="${name}" onmouseenter="previewArabicGovernorate('${name}');showArabicGovernorateTooltip('${name}')" onfocus="showArabicGovernorateTooltip('${name}')" onclick="selectArabicGovernorate('${name}')" tabindex="0" role="button" aria-label="${name}"><path d="${d}"/><text x="${c[0].toFixed(1)}" y="${c[1].toFixed(1)}">${name}</text></g>`}).join('')}</svg><div class="mapSourceNote">حدود الولايات مبنية على بيانات جغرافية لولايات تونس. المصدر: riateLab / GeoJSON.</div>`;
 updateArabicCompetitionBuilderUI();
}
function updateArabicCompetitionBuilderUI(){
 const national=STATE.competitionType==="national";
 const card=document.getElementById("tunisiaMapCard");
 if(card)card.classList.toggle("nationalLocked",national);
 const wrap=document.getElementById("tunisiaGovernorateMap");
 if(wrap)wrap.setAttribute("aria-hidden",national?"true":"false");
 document.querySelectorAll(".govMapRegion").forEach(b=>{b.style.pointerEvents=national?"none":"";b.style.opacity=national?".32":"";});
 const tooltip=document.getElementById("govHoverTooltip");
 if(tooltip)tooltip.textContent=national?"البطولة الوطنية — لا توجد ولاية":"حرّك المؤشر فوق ولاية";
}
function closeArabicCompetitionNameBuilder(){document.getElementById("arabicCompetitionNameModal")?.remove()}
function selectArabicCompetitionType(type){
 STATE.competitionType=type;
 if(type==="national") STATE.competitionGovernorate="";
 document.querySelectorAll(".arabicNameTypeBtn").forEach(b=>b.classList.toggle("selected",b.dataset.type===type));
 updateArabicCompetitionBuilderUI();
 updateArabicCompetitionNamePreview();
}
function showArabicGovernorateTooltip(name){const t=document.getElementById("govHoverTooltip");if(t)t.textContent=`الولاية: ${name}`;}
function previewArabicGovernorate(name){
 const p=document.getElementById("arabicCompetitionNamePreview"); if(p && STATE.competitionType)p.textContent=generatedArabicCompetitionName(STATE.competitionType,name);
}
function selectArabicGovernorate(name){
 STATE.competitionGovernorate=name;
 document.querySelectorAll(".govMapRegion").forEach(b=>b.classList.toggle("selected",b.dataset.gov===name));
 updateArabicCompetitionNamePreview();
}
function updateArabicCompetitionNamePreview(){
 const typeLabel=COMPETITION_TYPES_AR.find(x=>x.key===STATE.competitionType)?.label||"—";
 const national=STATE.competitionType==="national";
 const gov=national?"غير مطلوبة":(STATE.competitionGovernorate||"—");
 const p=document.getElementById("arabicCompetitionNamePreview"); if(p)p.textContent=STATE.competitionType?generatedArabicCompetitionName(STATE.competitionType,STATE.competitionGovernorate):"اختر نوع البطولة";
 const t=document.getElementById("arabicSelectedType");if(t)t.textContent=typeLabel;
 const g=document.getElementById("arabicSelectedGovernorate");if(g)g.textContent=gov;
 updateArabicCompetitionBuilderUI();
}
function applyArabicCompetitionName(){
 if(!STATE.competitionType)return alert("يرجى اختيار نوع البطولة.");
 if(STATE.competitionType!=="national" && !STATE.competitionGovernorate)return alert("يرجى اختيار الولاية من الخريطة.");
 const name=generatedArabicCompetitionName(STATE.competitionType,STATE.competitionGovernorate);
 const input=document.getElementById("setupCompetition"); if(input){input.value=name;input.dataset.generated="true";input.dispatchEvent(new Event("input",{bubbles:true}));}
 STATE.competitionName=name;STATE.competitionNameMode="generated";
 closeArabicCompetitionNameBuilder();
 if(typeof broadcastSetupDraft==="function")broadcastSetupDraft();
}

function openCompetitionSetup(){
 const modal=document.getElementById("setupModal"); if(modal){modal.classList.add("open");return}
 document.body.insertAdjacentHTML("beforeend",`<div id="setupModal" class="setupOverlay open"><div class="setupModal">
   <div class="setupTop"><div>${federationLogoSVG()}</div><div><div class="phaseTag">COMPETITION SETUP</div><h2>INITIALISATION DE LA CATÉGORIE</h2><p>Le système choisira automatiquement la phase.</p></div></div>
   <div class="cardMini excelImportCard">
     <div class="phaseTag">IMPORTATION DE LA LISTE DES ATHLÈTES</div>
     <div class="excelImportRow">
       <div><strong>Importer depuis Excel</strong><p class="muted">Colonnes recommandées : <b>Nom</b> et <b>Club</b>. Maximum 50 athlètes.</p></div>
       <label class="btn primary excelFileBtn">CHOISIR UN FICHIER EXCEL<input id="setupExcelFile" type="file" accept=".xlsx,.xls,.csv" onchange="handleExcelFileInput(this)"></label>
     </div>
     <div id="excelImportStatus" class="excelImportStatus">AUCUN FICHIER IMPORTÉ</div>
   </div>
   <div class="setupGrid">
     <label class="competitionNameField">Nom de la compétition
       <div class="competitionNameInputRow"><input id="setupCompetition" value="${esc(STATE.competitionName||"POOMSAE CHAMPIONSHIP")}" placeholder="Nom de la compétition"><button type="button" class="btn arabicNameGeneratorBtn" onclick="openArabicCompetitionNameBuilder()">🇹🇳 توليد اسم المسابقة</button></div>
       <small class="competitionNameHint">يمكنك كتابة الاسم يدويًا أو استعمال مولّد الاسم العربي.</small>
     </label>
     <label>Classe<select id="setupClass"><option value="A">A</option><option value="B">B</option></select></label>
     <label>Catégorie<select id="setupCategory"></select></label>
     <label>Sexe<select id="setupGender"><option value="Male">Male</option><option value="Female">Female</option></select></label>
     <label>Participation<select id="setupParticipation"><option value="INDIVIDUAL">Indiv</option><option value="DUO">Duo</option><option value="TEAM">Team</option></select></label>
     <label>Nombre d'athlètes<select id="setupAthletes">${Array.from({length:50},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}</select></label>
     <label>Nombre de juges<select id="setupJudges">${WT_DATA.judges.map(n=>`<option value="${n}">${n}</option>`).join("")}</select></label>
     <label>Numéro du tapis<select id="setupMat">${WT_DATA.mats.map(n=>`<option value="${n}">Tapis ${n}</option>`).join("")}</select></label>
   </div>
   <div class="poomsaeSetup cardMini">
     <div class="phaseTag">POOMSAE OFFICIELLES — FIXATION DE LA COMPÉTITION</div>
     <p class="muted">Après le nombre d’athlètes, si un demi-final est requis, choisissez les 2 Poomsae du demi-final et les 2 Poomsae de la finale. Elles seront verrouillées avant le début de la compétition.</p>
     <div id="semiPoomsaeSetup">
       <div class="phaseTag">DEMI-FINALE — 2 POOMSAE</div>
       <div class="setupGrid twoCols">
         <label>Round 1 — Demi-finale<select id="setupSemiPoomsae1"></select></label>
         <label>Round 2 — Demi-finale<select id="setupSemiPoomsae2"></select></label>
       </div>
     </div>
     <div class="phaseTag" style="margin-top:16px">FINALE — 2 POOMSAE</div>
     <div class="setupGrid twoCols">
       <label>Round 1 — Finale<select id="setupFinalPoomsae1"></select></label>
       <label>Round 2 — Finale<select id="setupFinalPoomsae2"></select></label>
     </div>
     <div class="lockNotice">🔒 POOMSAE FIXÉES — L'opérateur ne pourra plus les modifier pendant la compétition.</div>
   </div>
   <div id="athleteSetup" class="athleteSetup cardMini">
     <div class="phaseTag">ATHLETES — FIXATION DE LA LISTE</div>
     <p class="muted">Saisissez les noms avant le début de la compétition. La liste sera verrouillée après confirmation.</p>
     <div id="setupAthleteFields" class="setupAthleteFields"></div>
   </div>
   <div id="phasePreview" class="phasePreview"></div>
   <div class="setupActions"><button class="btn" onclick="closeCompetitionSetup()">ANNULER</button><button class="btn goldBtn" onclick="confirmCompetitionSetup()">CONFIRMER & COMMENCER</button></div>
 </div></div>`);
 const cls=document.getElementById("setupClass"),cat=document.getElementById("setupCategory"),count=document.getElementById("setupAthletes"),judges=document.getElementById("setupJudges"),pSemi1=document.getElementById("setupSemiPoomsae1"),pSemi2=document.getElementById("setupSemiPoomsae2"),pFinal1=document.getElementById("setupFinalPoomsae1"),pFinal2=document.getElementById("setupFinalPoomsae2"), athleteFields=document.getElementById("setupAthleteFields");
 cls.value=STATE.classCode||"B"; cat.innerHTML=WT_DATA.categories.map(x=>`<option>${esc(x)}</option>`).join(""); cat.value=STATE.category||"Cadet"; document.getElementById("setupGender").value=STATE.gender||""; document.getElementById("setupParticipation").value=STATE.participation||"INDIVIDUAL"; count.value=STATE.athleteCount||8; judges.value=STATE.judgeCount||3; document.getElementById("setupMat").value=STATE.matNumber||1;
 const refreshPoomsae=()=>{
   const allowed=allowedPoomsae(cls.value,cat.value);
   const opts=allowed.map(k=>`<option value="${k}">${esc(WT_DATA.poomsae[k])}</option>`).join("");
   [pSemi1,pSemi2,pFinal1,pFinal2].forEach(x=>x.innerHTML=opts);
   const fixed=STATE.fixedPoomsae||{};
   const semi=fixed.semi||{}; const fin=fixed.final||{};
   pSemi1.value=allowed.includes(semi.round1)?semi.round1:(fixed.round1&&allowed.includes(fixed.round1)?fixed.round1:(allowed[0]||""));
   pSemi2.value=allowed.includes(semi.round2)?semi.round2:(fixed.round2&&allowed.includes(fixed.round2)?fixed.round2:(allowed[1]||allowed[0]||""));
   pFinal1.value=allowed.includes(fin.round1)?fin.round1:(allowed[1]||allowed[0]||"");
   pFinal2.value=allowed.includes(fin.round2)?fin.round2:(allowed[2]||allowed[1]||allowed[0]||"");
   const semiWrap=document.getElementById("semiPoomsaeSetup"); const partNow=document.getElementById("setupParticipation")?.value||"INDIVIDUAL"; const thresholdNow=partNow==="INDIVIDUAL"?8:4; if(semiWrap)semiWrap.style.display=(Number(count.value)>thresholdNow?"block":"none");
 };
 const renderAthleteFields=()=>{
   const n=Number(count.value)||1;
   const participation=document.getElementById("setupParticipation")?.value||"INDIVIDUAL";
   const memberCount=participationMemberCount(participation);
   const old=[...athleteFields.querySelectorAll(".setupAthleteItem")].map(row=>buildEntryFromRow(row, participation));
   athleteFields.innerHTML=Array.from({length:n},(_,i)=>{
     const v=old[i]||{};
     if(participation==="INDIVIDUAL") return `<div class="setupAthleteItem"><span class="athNo">${i+1}</span><input class="athName" placeholder="Nom et prénom de l'athlète ${i+1}" value="${esc(v.name||"")}"><input class="athClub" placeholder="Club ${i+1}" value="${esc(v.club||"")}"></div>`;
     const members=Array.from({length:memberCount},(_,m)=>v.members?.[m]||{});
     const memberInputs=members.map((m,mi)=>`<div class="memberCell"><input class="memberName${mi}" placeholder="${participation==="DUO"?`Athlète ${mi+1}`:`Membre ${mi+1}`} — nom et prénom" value="${esc(m.name||"")}">${participation==="DUO"?`<select class="memberGender${mi}"><option value="">Sexe</option><option value="Male" ${m.gender==="Male"?"selected":""}>Male</option><option value="Female" ${m.gender==="Female"?"selected":""}>Female</option></select>`:""}</div>`).join("");
     return `<div class="setupAthleteItem groupEntry"><span class="athNo">${i+1}</span><div class="groupMembers">${memberInputs}</div><input class="athClub" placeholder="Club / Équipe ${i+1}" value="${esc(v.club||"")}"><small class="groupHint">${participation==="DUO"?"DUO : 1 homme + 1 femme · même club":"TEAM : 3 membres · même sexe · même club"}</small></div>`;
   }).join("");
 };
 const update=()=>{const n=Number(count.value);const part=document.getElementById("setupParticipation")?.value||"INDIVIDUAL";const threshold=part==="INDIVIDUAL"?8:4;const semiWrap=document.getElementById("semiPoomsaeSetup");if(semiWrap)semiWrap.style.display=n>threshold?"block":"none";const qualifier=part==="INDIVIDUAL"?8:4;const label=part==="DUO"?"DUOS":part==="TEAM"?"ÉQUIPES":"ATHLÈTES";document.getElementById("phasePreview").innerHTML=n<=threshold?`<span class="direct">DIRECT FINAL</span><small>${n} ${label} • ACCÈS DIRECT À LA FINALE</small>`:`<span class="semi">SEMI-FINAL</span><small>${n} ${label} • TOP ${qualifier} POUR LA FINALE</small>`;renderAthleteFields()};
 cls.addEventListener("change",()=>{refreshPoomsae();broadcastSetupDraft()});
 cat.addEventListener("change",()=>{refreshPoomsae();broadcastSetupDraft()});
 const participationEl=document.getElementById("setupParticipation");
 participationEl?.addEventListener("change",()=>{update();broadcastSetupDraft()});
 count.addEventListener("change",()=>{update();broadcastSetupDraft()});
 judges.addEventListener("change",broadcastSetupDraft);
 document.getElementById("setupCompetition")?.addEventListener("input",function(){if(!this.dataset.generated)STATE.competitionNameMode="manual";this.dataset.generated="";broadcastSetupDraft();});
 ["setupGender","setupParticipation","setupSemiPoomsae1","setupSemiPoomsae2","setupFinalPoomsae1","setupFinalPoomsae2","setupJudges","setupMat"].forEach(id=>document.getElementById(id)?.addEventListener("input",broadcastSetupDraft));
 ["setupGender","setupParticipation","setupSemiPoomsae1","setupSemiPoomsae2","setupFinalPoomsae1","setupFinalPoomsae2","setupJudges","setupMat"].forEach(id=>document.getElementById(id)?.addEventListener("change",broadcastSetupDraft));
 athleteFields.addEventListener("input",()=>{broadcastSetupDraft();validateSetupAthletes();});
 athleteFields.addEventListener("change",()=>{broadcastSetupDraft();validateSetupAthletes();});
 refreshPoomsae();update();renderJudgeNameFields();broadcastSetupDraft();validateSetupAthletes();
}
function closeCompetitionSetup(){document.getElementById("setupModal")?.remove()}
function validateSetupAthletes(showErrors=false){
 const rows=[...document.querySelectorAll("#setupAthleteFields .setupAthleteItem")];
 const participation=document.getElementById("setupParticipation")?.value||STATE.participation||"INDIVIDUAL";
 let ok=true; const names=[];
 rows.forEach(row=>{
   if(participation==="INDIVIDUAL"){
     const nameEl=row.querySelector(".athName"),clubEl=row.querySelector(".athClub");
     const name=nameEl?.value.trim()||"",club=clubEl?.value.trim()||"";
     nameEl?.classList.toggle("invalid-athlete",!name);clubEl?.classList.toggle("invalid-athlete",!club);if(!name||!club)ok=false;names.push(name.toLowerCase());return;
   }
   const clubEl=row.querySelector(".athClub");const club=clubEl?.value.trim()||"";clubEl?.classList.toggle("invalid-athlete",!club);if(!club)ok=false;
   const members=[...row.querySelectorAll(".groupMembers .memberCell")].map(cell=>({name:cell.querySelector("input")?.value.trim()||"",gender:cell.querySelector("select")?.value||"",nameEl:cell.querySelector("input"),genderEl:cell.querySelector("select")}));
   members.forEach(m=>{m.nameEl?.classList.toggle("invalid-athlete",!m.name);if(participation==="DUO")m.genderEl?.classList.toggle("invalid-athlete",!m.gender);if(!m.name||(participation==="DUO"&&!m.gender))ok=false;names.push(m.name.toLowerCase())});
   if(participation==="DUO" && members.length===2 && members[0].gender===members[1].gender){members.forEach(m=>m.genderEl?.classList.add("invalid-athlete"));ok=false;}
   if(participation==="TEAM" && !document.getElementById("setupGender")?.value){ok=false;}
 });
 const seen=new Map();names.filter(Boolean).forEach(n=>seen.set(n,(seen.get(n)||0)+1));
 rows.forEach(row=>row.querySelectorAll(".athName,.groupMembers input").forEach(el=>{const n=el.value.trim().toLowerCase();if(n&&seen.get(n)>1){el.classList.add("invalid-athlete");ok=false;}}));
 const btn=document.querySelector(".setupActions .goldBtn");if(btn){btn.disabled=!ok;btn.title=ok?"":(participation==="DUO"?"Chaque duo doit avoir 2 athlètes du même club : 1 homme + 1 femme.":participation==="TEAM"?"Chaque équipe doit avoir 3 athlètes du même club et du même sexe.":"Complétez les noms et clubs des athlètes.");}
 return ok;
}
function confirmCompetitionSetup(){
 const name=document.getElementById("setupCompetition")?.value.trim()||"POOMSAE CHAMPIONSHIP";
 const count=Number(document.getElementById("setupAthletes")?.value)||1;
 const previousMat=Number(STATE.matNumber)||1; STATE.competitionName=name;STATE.competitionNameMode=document.getElementById("setupCompetition")?.dataset.generated==="true"?"generated":(STATE.competitionNameMode||"manual");STATE.participation=document.getElementById("setupParticipation").value||"INDIVIDUAL";STATE.matNumber=Number(document.getElementById("setupMat").value)||1; if(typeof ensureStationId==="function" && (!STATE.stationId || previousMat!==STATE.matNumber)){STATE.stationId=stationNewId(STATE.matNumber);}STATE.classCode=document.getElementById("setupClass").value;STATE.category=document.getElementById("setupCategory").value;STATE.gender=document.getElementById("setupGender").value;STATE.athleteCount=count;STATE.judgeCount=Number(document.getElementById("setupJudges").value)||3;STATE.matNumber=Number(document.getElementById("setupMat").value)||1;STATE.judgeNames=STATE.judgeNames||{};for(let j=1;j<=STATE.judgeCount;j++){if(typeof STATE.judgeNames[j]!=="string")STATE.judgeNames[j]="";}const phaseThreshold=STATE.participation==="INDIVIDUAL"?8:4;STATE.phase=count<=phaseThreshold?"DIRECT FINAL":"SEMI-FINAL";
 STATE.fixedPoomsae={semi:{round1:document.getElementById("setupSemiPoomsae1").value,round2:document.getElementById("setupSemiPoomsae2").value},final:{round1:document.getElementById("setupFinalPoomsae1").value,round2:document.getElementById("setupFinalPoomsae2").value}};
 STATE.fixedPoomsae.round1=STATE.fixedPoomsae.final.round1; STATE.fixedPoomsae.round2=STATE.fixedPoomsae.final.round2;
 const semiThreshold=STATE.participation==="INDIVIDUAL"?8:4; if(count>semiThreshold && (!STATE.fixedPoomsae.semi.round1||!STATE.fixedPoomsae.semi.round2))return alert("Sélectionnez les 2 Poomsae du demi-final.");
 if(!STATE.fixedPoomsae.final.round1||!STATE.fixedPoomsae.final.round2)return alert("Sélectionnez les 2 Poomsae de la finale.");
 const rows=[...document.querySelectorAll("#setupAthleteFields .setupAthleteItem")];
 if(rows.length!==count)return alert("Le nombre d'athlètes ne correspond pas à la liste.");
 const names=rows.map(x=>x.querySelector(".athName")?.value.trim()||"");
 const clubs=rows.map(x=>x.querySelector(".athClub")?.value.trim()||"");
 if(!validateSetupAthletes(true))return false;
 // Keep existing QR tokens/Peer connection across category changes. Only create tokens for newly added judges.
 STATE.judgeQr=STATE.judgeQr||{peerId:"",tokens:{},deleted:{},sessionId:"",scores:{}};
 STATE.collectorQr=STATE.collectorQr||{peerId:"",token:"",deleted:false};
 if(typeof judgeConnections!=="undefined"){
   Object.keys(judgeConnections).forEach(k=>{if(Number(k)>STATE.judgeCount){try{judgeConnections[k]?.close()}catch(_){} delete judgeConnections[k];}});
 }
 for(let j=1;j<=STATE.judgeCount;j++){if(!STATE.judgeQr.tokens[j])STATE.judgeQr.tokens[j]=judgeRandomToken();STATE.judgeQr.deleted[j]=false;}
 Object.keys(STATE.judgeQr.tokens).forEach(k=>{if(Number(k)>STATE.judgeCount)delete STATE.judgeQr.tokens[k];});
 STATE.judgeQr.sessionId="";STATE.judgeQr.scores={};
 if(typeof judgePeer!=="undefined" && judgePeer?.open){STATE.judgeQr.peerId=judgePeer.id;STATE.collectorQr.peerId=judgePeer.id;}
 saveState();
 STATE.setupComplete=true;STATE.competitionStarted=false;const builtEntries=rows.map(row=>buildEntryFromRow(row,STATE.participation));if(STATE.participation==="DUO")STATE.gender="Mixed";if(STATE.participation==="TEAM")builtEntries.forEach(entry=>{entry.gender=STATE.gender;entry.members?.forEach(m=>{m.gender=STATE.gender;});}); STATE.athletes=builtEntries.map((entry)=>({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name:entry.name,club:entry.club||"—",gender:entry.gender||STATE.gender,participation:STATE.participation,members:entry.members||null,matNumber:STATE.matNumber,absent:false,rounds:[],finalScore:null}));STATE.currentIndex=0;STATE.currentRound=1;STATE.rankings=[];STATE.publishedResult=null;STATE.tieResolutions={};STATE.state=STATES.IDLE;STATE.publicMode="ready";STATE.timer={elapsed:0,running:false,expired:false};saveState();closeCompetitionSetup();broadcast();render();
 if(typeof ensureJudgePeer==="function"){ensureJudgePeer(()=>{try{judgeSendContext({scoringOpen:false});}catch(_){} });}
}
