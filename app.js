
let questions=[], state={solved:{}, wrong:{}, favorites:[]};
let currentIndex=0,currentMode="all",currentWrongId=null,deferredInstall=null;

const $=s=>document.querySelector(s);
const loadState=()=>{try{state=JSON.parse(localStorage.getItem("mathWrongState"))||state}catch(e){}};
const saveState=()=>localStorage.setItem("mathWrongState",JSON.stringify(state));
const loadCustom=()=>{try{return JSON.parse(localStorage.getItem("mathCustomQuestions")||"[]")}catch(e){return[]}};
const saveCustom=a=>localStorage.setItem("mathCustomQuestions",JSON.stringify(a));
const allQuestions=()=>questions;
const qById=id=>allQuestions().find(q=>q.id===id);
const solvedCount=()=>Object.keys(state.solved).length;
const wrongIds=()=>Object.keys(state.wrong).filter(id=>state.wrong[id]&&qById(id));
const toast=m=>{const t=$("#toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)};

function go(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  $("#"+view+"View").classList.add("active");
  document.querySelectorAll(".nav").forEach(n=>n.classList.toggle("active",n.dataset.go===view));
  if(view==="home")renderHome();
  if(view==="quiz")startQuiz();
  if(view==="wrong")renderWrong();
  if(view==="stats")renderStats();
  if(view==="admin"){renderAdminAdd();renderAdminManage()}
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderHome(){
  const total=solvedCount(),correct=Object.values(state.solved).filter(v=>v.correct).length;
  $("#totalSolved").textContent=total;
  $("#accuracy").textContent=total?Math.round(correct/total*100)+"%":"0%";
  $("#wrongCount").textContent=wrongIds().length;
  $("#progressText").textContent=`${total} / ${allQuestions().length}`;
  $("#progressBar").style.width=(allQuestions().length?Math.min(100,total/allQuestions().length*100):0)+"%";
}
function startQuiz(mode="all",id=null){
  currentMode=mode;currentWrongId=id;
  $("#quizModeLabel").textContent=mode==="wrong"?"오답 다시 풀기":"기출문제";
  $("#quizTitle").textContent=mode==="wrong"?"오답 문제":"문제 풀이";
  if(mode==="wrong"){const ids=wrongIds();currentIndex=Math.max(0,ids.indexOf(id))}else currentIndex=0;
  renderQuiz();
}
function renderQuiz(){
  const list=currentMode==="wrong"?wrongIds():allQuestions().map(q=>q.id);
  if(!list.length){$("#quizArea").innerHTML=`<div class="empty"><strong>풀 문제가 없어요.</strong>오답노트가 비어 있습니다.</div>`;return}
  const id=list[currentIndex%list.length],q=qById(id),old=state.solved[q.id];
  let selected=old?.selected??null,checked=old?.checked??false;
  $("#quizArea").innerHTML=`
  <div class="question-card">
    <div class="meta"><span class="tag primary">${q.grade}</span><span class="tag">${q.unit}</span><span class="tag">${q.difficulty}</span><span class="tag">${q.year}</span></div>
    ${q.image?`<img src="${q.image}" style="width:100%;max-height:330px;object-fit:contain;border-radius:12px;margin:5px 0 12px;background:#fafafa">`:""}
    <div class="question-no">${currentIndex+1} / ${list.length}</div>
    <div class="question">${q.question}</div>
    <div class="choices">${q.choices.map((c,i)=>{let cls=selected===i?"selected ":"";if(checked){if(i===q.answer)cls+="correct ";else if(selected===i)cls+="wrong "}return `<button class="choice ${cls}${checked?"disabled":""}" data-choice="${i}"><span class="num">${String.fromCharCode(65+i)}</span><span>${c}</span></button>`}).join("")}</div>
    ${checked?`<div class="result ${selected===q.answer?"good":"bad"}"><b>${selected===q.answer?"정답입니다! 🎉":"아쉬워요. 오답노트에 저장했어요."}</b>${selected===q.answer?"잘 풀었어요!":"다음에는 풀이를 다시 확인해 보세요."}<div class="solution"><b>풀이</b>${q.solution||"등록된 풀이가 없습니다."}</div></div>`:""}
    ${!checked?`<button class="primary-btn" id="checkBtn" ${selected===null?"disabled":""}>정답 확인</button>`:`<button class="secondary-btn" id="nextBtn">${currentIndex+1<list.length?"다음 문제":"처음부터 다시"}</button>`}
  </div>`;
  document.querySelectorAll(".choice:not(.disabled)").forEach(b=>b.onclick=()=>{selected=+b.dataset.choice;document.querySelectorAll(".choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("#checkBtn").disabled=false});
  $("#checkBtn")?.addEventListener("click",()=>checkAnswer(q,selected));
  $("#nextBtn")?.addEventListener("click",()=>{currentIndex=(currentIndex+1)%list.length;renderQuiz()});
}
function checkAnswer(q,selected){
  const correct=selected===q.answer;
  state.solved[q.id]={selected,correct,checked:true,at:Date.now()};
  if(!correct){state.wrong[q.id]=(state.wrong[q.id]||0)+1;toast("오답노트에 저장했습니다.")}else{delete state.wrong[q.id];toast("정답! 잘했어요 🎉")}
  saveState();renderQuiz();
}
function renderWrong(){
  const ids=wrongIds();
  if(!ids.length){$("#wrongArea").innerHTML=`<div class="empty"><div style="font-size:45px">🎯</div><strong>오답노트가 비어 있어요.</strong>문제를 풀고 틀린 문제를 자동으로 모아보세요.</div>`;return}
  $("#wrongArea").innerHTML=`<div class="wrong-list">${ids.map(id=>{const q=qById(id);return `<div class="wrong-card">${q.image?`<img src="${q.image}" style="width:100%;max-height:120px;object-fit:contain;border-radius:8px">`:""}<div class="meta"><span class="tag primary">${q.grade}</span><span class="tag">${q.unit}</span><span class="tag">${q.difficulty}</span></div><div class="q">${q.question}</div><div class="meta-line">오답 횟수 ${state.wrong[id]}회 · ${q.year}</div><button class="mini-btn" data-review="${id}">다시 풀기</button></div>`}).join("")}</div>`;
  document.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>{go("quiz");setTimeout(()=>startQuiz("wrong",b.dataset.review),0)});
}
function renderStats(){
  const total=solvedCount(),correct=Object.values(state.solved).filter(v=>v.correct).length,acc=total?Math.round(correct/total*100):0;
  const units={};allQuestions().forEach(q=>{units[q.unit]??={t:0,c:0};if(state.solved[q.id]?.checked){units[q.unit].t++;if(state.solved[q.id].correct)units[q.unit].c++}});
  $("#statsArea").innerHTML=`<div class="stats"><div class="stat"><strong>${total}</strong><span>풀이 완료</span></div><div class="stat"><strong>${acc}%</strong><span>정답률</span></div><div class="stat"><strong>${wrongIds().length}</strong><span>오답 보관</span></div></div><div class="stat-panel" style="margin-top:12px"><b>단원별 정답률</b><div class="chart">${Object.entries(units).map(([u,v])=>{let p=v.t?Math.round(v.c/v.t*100):0;return `<div class="bar-row"><span>${u}</span><div class="bar"><i style="width:${p}%"></i></div><b>${p}%</b></div>`}).join("")}</div></div>`;
}

function renderAdminAdd(){
  $("#adminAddArea").classList.remove("hidden");$("#adminManageArea").classList.add("hidden");
  $("#adminAddArea").innerHTML=`
  <form class="admin-form" id="questionForm">
    <div class="field"><label>기출문제 사진</label><div class="photo-box"><input id="questionImage" type="file" accept="image/*"><img id="photoPreview" class="photo-preview"></div></div>
    <div class="field"><label>대회명</label><input id="fContest" placeholder="예: 초등 수학경시대회"></div>
    <div class="choice-input">
      <div class="field"><label>연도</label><input id="fYear" type="number" value="${new Date().getFullYear()}"></div>
      <div class="field"><label>학년</label><input id="fGrade" placeholder="예: 초등 4학년"></div>
    </div>
    <div class="choice-input">
      <div class="field"><label>단원</label><input id="fUnit" placeholder="예: 도형"></div>
      <div class="field"><label>난이도</label><select id="fDifficulty"><option>쉬움</option><option selected>보통</option><option>어려움</option><option>최상</option></select></div>
    </div>
    <div class="field"><label>문제</label><textarea id="fQuestion" placeholder="문제 내용을 입력하세요"></textarea></div>
    <div class="field"><label>보기 4개</label><div class="choice-input">
      <input id="fC0" placeholder="① 보기"><input id="fC1" placeholder="② 보기">
      <input id="fC2" placeholder="③ 보기"><input id="fC3" placeholder="④ 보기">
    </div></div>
    <div class="field"><label>정답</label><select id="fAnswer"><option value="0">① 첫 번째</option><option value="1">② 두 번째</option><option value="2">③ 세 번째</option><option value="3">④ 네 번째</option></select></div>
    <div class="field"><label>풀이</label><textarea id="fSolution" placeholder="정답 풀이를 입력하세요"></textarea></div>
    <button class="primary-btn" type="submit">문제 저장하기</button>
    <div class="admin-note">사진은 이 기기의 브라우저에 저장됩니다. 문제를 서버/다른 기기와 공유하려면 별도의 데이터베이스 연동이 필요합니다.</div>
  </form>`;
  $("#questionImage").onchange=e=>{
    const file=e.target.files?.[0];if(!file)return;
    const r=new FileReader();r.onload=()=>{const img=$("#photoPreview");img.src=r.result;img.style.display="block";img.dataset.value=r.result};r.readAsDataURL(file);
  };
  $("#questionForm").onsubmit=saveNewQuestion;
}
function saveNewQuestion(e){
  e.preventDefault();
  const question=$("#fQuestion").value.trim();
  const choices=[0,1,2,3].map(i=>$(`#fC${i}`).value.trim());
  if(!question||choices.some(x=>!x)){toast("문제와 보기 4개를 입력해주세요.");return}
  const custom=loadCustom();
  const q={
    id:"custom_"+Date.now(),contest:$("#fContest").value.trim()||"내가 추가한 기출문제",
    year:+$("#fYear").value||new Date().getFullYear(),grade:$("#fGrade").value.trim()||"미지정",
    unit:$("#fUnit").value.trim()||"기타",difficulty:$("#fDifficulty").value,
    question,choices,answer:+$("#fAnswer").value,solution:$("#fSolution").value.trim()||"등록된 풀이가 없습니다.",
    image:$("#photoPreview").dataset.value||""
  };
  custom.push(q);saveCustom(custom);questions.push(q);toast("문제를 저장했습니다!");renderAdminManage();e.target.reset();$("#photoPreview").style.display="none";$("#photoPreview").removeAttribute("src");$("#photoPreview").dataset.value="";
}
function renderAdminManage(){
  $("#adminManageArea").innerHTML=`<div class="admin-list">${allQuestions().map(q=>`<div class="admin-item"><div class="title">${q.question}</div><div class="small">${q.contest} · ${q.year} · ${q.grade} · ${q.unit}</div>${q.id.startsWith("custom_")?`<button class="danger-btn" data-delete-q="${q.id}">삭제</button>`:""}</div>`).join("")}</div><div class="admin-note">기본 제공 문제는 삭제할 수 없고, 직접 추가한 문제만 삭제할 수 있습니다.</div>`;
  document.querySelectorAll("[data-delete-q]").forEach(b=>b.onclick=()=>{if(confirm("이 문제를 삭제할까요?")){const id=b.dataset.deleteQ;saveCustom(loadCustom().filter(q=>q.id!==id));questions=questions.filter(q=>q.id!==id);delete state.solved[id];delete state.wrong[id];saveState();renderAdminManage();renderHome();toast("삭제했습니다.")}});
}
document.addEventListener("click",e=>{
  const b=e.target.closest("[data-go]");if(b)go(b.dataset.go);
  const tab=e.target.closest("[data-admin-tab]");
  if(tab){
    document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");
    if(tab.dataset.adminTab==="add"){renderAdminAdd();$("#adminManageArea").classList.add("hidden")}
    else{renderAdminManage();$("#adminAddArea").classList.add("hidden");$("#adminManageArea").classList.remove("hidden")}
  }
});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").classList.remove("hidden")});
$("#installBtn").onclick=async()=>{if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").classList.add("hidden")}};
window.addEventListener("appinstalled",()=>$("#installBtn").classList.add("hidden"));
async function init(){
  loadState();
  const res=await fetch("data/questions.json");questions=await res.json();
  const custom=loadCustom();questions=[...questions,...custom];
  renderHome();
  if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
}
init();
