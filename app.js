const splash = document.querySelector("#splash");
const enterButton = document.querySelector("#enterButton");
const app = document.querySelector("#app");
const statusBar = document.querySelector(".status-bar");
const screen = document.querySelector(".screen");
let splashTimer;

function closeSplash() {
  if (!splash) return;
  splash.classList.add("is-hidden");
  splash.style.display = "none";
  window.clearTimeout(splashTimer);
  if (app) app.style.zIndex = "100";
}

enterButton.addEventListener("click", closeSplash);
splashTimer = window.setTimeout(closeSplash, 3200);

window.addEventListener("load", () => {
  window.setTimeout(() => {
    if (splash && !splash.classList.contains("is-hidden")) {
      closeSplash();
    }
  }, 4000);
});

function showPage(pageId) {
  app.classList.toggle("hide-header", pageId !== "home");
  app.classList.toggle("home-theme", pageId === "home");
  statusBar?.classList.toggle("chat-integrated", pageId === "chat");
  screen?.classList.toggle("chat-screen", pageId === "chat");
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === pageId);
  });
  document.querySelectorAll(".bottom-nav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === pageId);
  });
  app.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".bottom-nav button").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.tab === "home") closeSummaryDetail();
    if (button.dataset.tab === "community") closeCommunityTopic();
    showPage(button.dataset.tab);
  });
});

const elderInput = document.querySelector("#elderInput");
const toneSelect = document.querySelector("#toneSelect");
const responseText = document.querySelector("#responseText");
const syncState = document.querySelector("#syncState");
const dialogList = document.querySelector("#dialogList");
const voiceButton = document.querySelector("#voiceButton");
const chatCanvas = document.querySelector("#chatCanvas");
const generateButton = document.querySelector("#generateButton");
const conversationHistory = [];
const recentResponses = [];

const fallbackResponses = {
  soothe: ["你一定是想要安心一点。我在这里陪你，我们先慢慢坐一会儿。", "没关系的，我在这儿陪着您，我们慢慢来。", "我理解您的感受，让我陪您一起度过。"],
  memory: ["这可能让你想起以前熟悉的地方。我陪你看看照片，慢慢想，不着急。", "是的，那些都是很珍贵的回忆呢。", "我陪您一起慢慢回忆，不着急。"],
  redirect: ["我们先不急着找答案。要不要听一首熟悉的歌？我陪你把心慢慢安静下来。", "我们换个心情，听听老歌怎么样？", "让我陪您听听音乐，放松一下。"]
};

function getCareSettings(){
  const get=id=>document.querySelector(id)?.value?.trim()||"";
  return{
    nickname:get("#nickname")||"奶奶",
    tone:get("#toneSetting")||"智能型",
    length:get("#lengthSetting")||"简短",
    softness:get("#softnessSetting")||"更轻柔",
    memoryWeight:get("#memoryWeight")||"智能引用",
    avoid:get("#avoidSetting").split(/[；;，,\n]/).map(x=>x.trim()).filter(Boolean)
  }
}

function updateRulePreview(){
  const s=getCareSettings();
  document.querySelector("#rulePreview").textContent=`在在会称呼老人为${s.nickname}，以${s.tone}方式生成${s.length}回应，语气${s.softness}；记忆库采用${s.memoryWeight}，并避开${s.avoid.length}条敏感内容。`
}

function getPresetMemory(message = ""){
  const text = String(message || "").toLowerCase();
  if (!text) return [];

  const sceneTriggers = [
    { keywords: ["照片", "相片", "合影", "拍照", "这张照片", "那张照片", "看照片", "照片里"], boost: 3 },
    { keywords: ["歌", "唱", "音乐", "听", "旋律", "歌声", "邓丽君", "茉莉花", "我的祖国"], boost: 2 },
    { keywords: ["吃", "饭", "饺子", "红烧肉", "桂花糕", "菜", "味道", "好吃"], boost: 2 },
    { keywords: ["女儿", "张丽", "丽丽", "丈夫", "志明", "桂花", "李桂花", "外婆", "妈妈", "爸爸", "老伴", "外孙", "孙女", "孙子", "外孙女", "孙", "爷爷", "奶奶", "外公"], boost: 3 },
    { keywords: ["纺织厂", "织布", "车间", "厂里"], boost: 2 },
    { keywords: ["想回家", "这里不是我的家", "这不是我的家", "我要回家", "回家去"], boost: 2 },
    { keywords: ["几点了", "什么时候", "该去哪", "现在几点"], boost: 1 },
    { keywords: ["头疼", "不舒服", "累", "难受"], boost: 1 },
    { keywords: ["吃药", "胸口", "摔倒", "医院"], boost: 2 },
    { keywords: ["名字", "叫什么", "是谁", "我是谁", "认识", "记得"], boost: 2 }
  ];

  const stopWords = new Set(["这个", "那个", "这里", "那里", "我们", "你们", "他们", "什么", "怎么", "是不是", "不知道", "现在", "自己", "一个", "没有", "可以", "还是", "就是", "这么", "那么", "我外", "孙呢", "你在", "在哪", "在呢", "是哪", "是不"]);

  const rawWords = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const tokenSet = new Set();
  rawWords.forEach(word => {
    if (word.length <= 3) {
      tokenSet.add(word);
    }
    for (let i = 0; i < word.length - 1; i++) {
      tokenSet.add(word.slice(i, i + 2));
    }
    if (word.length >= 3) {
      for (let i = 0; i < word.length - 2; i++) {
        tokenSet.add(word.slice(i, i + 3));
      }
    }
  });
  const tokens = Array.from(tokenSet).filter(word => !stopWords.has(word));

  const scored = memoryItems.map(item => {
    const itemText = (item.type + " " + item.title + " " + item.content).toLowerCase();
    let score = 0;

    sceneTriggers.forEach(scene => {
      scene.keywords.forEach(kw => {
        if (text.includes(kw) && itemText.includes(kw)) {
          score += scene.boost;
        }
      });
    });

    tokens.forEach(token => {
      if (itemText.includes(token)) score += 2;
    });

    if (item.title && text.includes(item.title.toLowerCase())) score += 4;

    return { item, score };
  }).filter(entry => entry.score > 0).sort((a, b) => b.score - a.score);

  console.log("[在在] 记忆匹配:", text, "→ tokens:", tokens, "→ 命中:", scored.length, "条", scored.map(s => s.item.title + "(score:" + s.score + ")"));

  return scored.slice(0, 4).map(entry => `${entry.item.type}：${entry.item.title}。${entry.item.content}`);
}

const memoryTypes=["基本信息","人生锚点","重要人物","喜好","老照片","常见表达","安抚方式","禁忌","人物","照片","事件"];
const baseMemoryDefaults=[
  {id:"base-profile-1",type:"基本信息",title:"王秀兰 · 82岁",content:"早期至中期认知症，独居，女儿张丽每周来看两次。"},
  {id:"base-profile-2",type:"基本信息",title:"核心特征",content:"情景记忆受损，但情感记忆保留完整；喜欢回忆年轻时的故事，对老歌有强烈情绪反应。"},
  {id:"base-anchor-1965",type:"人生锚点",title:"1965年进入纺织厂",content:"成为纺织女工，是她最自豪的人生阶段。"},
  {id:"base-anchor-1970",type:"人生锚点",title:"1970年与张志明结婚",content:"这是她最幸福的回忆，可用红嫁衣、中山装、口琴等细节轻柔唤起。"},
  {id:"base-anchor-1972",type:"人生锚点",title:"1972年生下女儿张丽",content:"这是她最深刻的母爱记忆，张丽小时候爱哭，可亲切称为丽丽。"},
  {id:"base-anchor-1980",type:"人生锚点",title:"1980年搬进老房子",content:"这里是生活了四十多年的家，可用熟悉、安心、慢慢看一看来回应。"},
  {id:"base-person-zhangzhiming",type:"重要人物",title:"丈夫张志明",content:"会吹口琴、个子高、对她很好；不要主动强调他已经去世。"},
  {id:"base-person-zhangli",type:"重要人物",title:"女儿张丽",content:"在银行工作，每周来看她两次，小时候很粘人，可称呼为丽丽。"},
  {id:"base-person-liguihua",type:"重要人物",title:"老同事李桂花",content:"纺织厂最好的朋友，常常一起上下班，可关联厂里和织布机的回忆。"},
  {id:"base-like-music",type:"喜好",title:"老歌",content:"喜欢《茉莉花》《我的祖国》和邓丽君的歌，不喜欢吵闹的现代音乐。"},
  {id:"base-like-food",type:"喜好",title:"食物",content:"喜欢红烧肉、饺子、桂花糕，不喜欢太辣的东西。"},
  {id:"base-like-activity",type:"喜好",title:"活动与颜色",content:"喜欢织毛衣、看老照片、晒太阳；喜欢暖橙色和碎花色，不喜欢暗黑色。"},
  {id:"base-photo-ph01",type:"老照片",title:"PH-01 结婚照",content:"1970年结婚照，丈夫穿中山装，她穿红嫁衣。"},
  {id:"base-photo-ph02",type:"老照片",title:"PH-02 纺织厂合影",content:"1975年车间合影，她和李桂花站在一起，背后是织布机。"},
  {id:"base-photo-ph03",type:"老照片",title:"PH-03 搬新家",content:"1980年搬进新房子，她抱着女儿站在门口。"},
  {id:"base-photo-ph04",type:"老照片",title:"PH-04 全家福",content:"1995年丈夫、女儿和她在公园拍的全家福。"},
  {id:"base-say-1",type:"常见表达",title:"厂里的回忆",content:"常说“那时候在厂里，桂花还在我旁边呢”。回应时可鼓励她讲讲厂里的故事。"},
  {id:"base-say-2",type:"常见表达",title:"想念志明",content:"常说“志明要是还在就好了”。先回应想念和陪伴，不直接纠正现实。"},
  {id:"base-soothe-evening",type:"安抚方式",title:"傍晚焦虑",content:"温和告知时间，可提晚饭、饺子、丽丽来看她，避免追问和争辩。"},
  {id:"base-soothe-night",type:"安抚方式",title:"夜间醒来",content:"如果深夜呼唤志明，先说“我在呢”，提醒天还没亮，可提丽丽明天来看她和桂花糕。"},
  {id:"base-avoid-1",type:"禁忌",title:"不要纠错",content:"不要说“你忘了”“你记错了”，优先回应情绪，再轻轻引导。"}
];
let memoryItems=loadMemoryItems();

function loadMemoryItems(){
  try{
    const saved=JSON.parse(localStorage.getItem("zaizaiMemoryItems")||"null");
    if(Array.isArray(saved)&&saved.length) return saved;
    const old=JSON.parse(localStorage.getItem("zaizaiCustomMemory")||"[]");
    return baseMemoryDefaults.concat(old.map((item,index)=>({id:"custom-old-"+index,type:item.type||"事件",title:item.title||"未命名记忆",content:item.content||""})));
  }catch(error){return baseMemoryDefaults.slice()}
}

function saveMemoryItems(){localStorage.setItem("zaizaiMemoryItems",JSON.stringify(memoryItems))}

function renderMemoryGroups(editingId=""){
  const container=document.querySelector("#memoryGroups");
  if(!container) return;
  const groups=memoryItems.reduce((map,item)=>{(map[item.type]||(map[item.type]=[])).push(item);return map},{});
  const ordered=memoryTypes.filter(type=>groups[type]).concat(Object.keys(groups).filter(type=>!memoryTypes.includes(type)));
  container.innerHTML=ordered.map(type=>`<details class="memory-group" open><summary>${escapeHtml(type)}<span>${groups[type].length} 条</span></summary><div class="memory-list">${groups[type].map(item=>renderMemoryItem(item,editingId)).join("")}</div></details>`).join("");
}

function renderMemoryItem(item,editingId){
  if(item.id===editingId){
    return `<div class="memory-chip memory-edit" data-memory-id="${escapeHtml(item.id)}">
      <select data-edit-field="type">${memoryTypes.map(type=>`<option ${type===item.type?"selected":""}>${escapeHtml(type)}</option>`).join("")}</select>
      <input data-edit-field="title" value="${escapeHtml(item.title)}" />
      <textarea data-edit-field="content">${escapeHtml(item.content)}</textarea>
      <div class="memory-actions"><button type="button" data-save-memory="${escapeHtml(item.id)}">保存</button><button type="button" data-cancel-memory>取消</button></div>
    </div>`;
  }
  return `<div class="memory-chip"><span>${escapeHtml(item.type)} · ${escapeHtml(item.title)}</span>${escapeHtml(item.content)}<div class="memory-actions"><button type="button" data-edit-memory="${escapeHtml(item.id)}">编辑</button></div></div>`;
}

function addCustomMemory(){
  const type=document.querySelector("#memoryType").value;
  const title=document.querySelector("#memoryTitle").value.trim();
  const content=document.querySelector("#memoryContent").value.trim();
  if(!title||!content) return;
  memoryItems.push({id:"custom-"+Date.now(),type,title,content});
  document.querySelector("#memoryTitle").value="";
  document.querySelector("#memoryContent").value="";
  saveMemoryItems();
  renderMemoryGroups();
}

function saveEditedMemory(id){
  const box=document.querySelector(`[data-memory-id="${CSS.escape(id)}"]`);
  if(!box) return;
  const next={id,type:box.querySelector('[data-edit-field="type"]').value,title:box.querySelector('[data-edit-field="title"]').value.trim(),content:box.querySelector('[data-edit-field="content"]').value.trim()};
  if(!next.title||!next.content) return;
  memoryItems=memoryItems.map(item=>item.id===id?next:item);
  saveMemoryItems();
  renderMemoryGroups();
}

function rememberTurn(userText, assistantText) {
  conversationHistory.push(
    { role: "user", content: userText },
    { role: "assistant", content: assistantText }
  );
  while (conversationHistory.length > 12) conversationHistory.shift();
}

function renderDialog(extraMessages = []) {
  if (!dialogList) return;
  const messages = conversationHistory.concat(extraMessages).slice(-6);
  dialogList.innerHTML = messages.map((item) => `
    <div class="dialog-bubble ${item.role === "user" ? "user" : "assistant"}">${escapeHtml(item.content)}</div>
  `).join("");
  dialogList.scrollTop = dialogList.scrollHeight;
}

function updateTimeLight() {
  if (!chatCanvas) return;
  const hour = new Date().getHours();
  const timeClass = hour < 11 ? "time-morning" : hour < 17 ? "time-day" : hour < 20 ? "time-afternoon" : "time-night";
  chatCanvas.classList.remove("time-morning", "time-day", "time-afternoon", "time-evening", "time-night");
  chatCanvas.classList.add(timeClass);
  const label = timeClass === "time-morning"
    ? "晨间白光"
    : timeClass === "time-day"
      ? "日间柔光"
      : timeClass === "time-afternoon"
        ? "傍晚暖橙光"
        : "夜间低亮暖光";
  if (syncState && !syncState.dataset.busy) syncState.textContent = label;
}

function updateMood(text = "", modelEmotion = "") {
  if (!chatCanvas) return;
  let mood = "soothe";
  if (modelEmotion === "happy" || /开心|舒服|照片|家人|唱歌|茉莉花/.test(text)) mood = "happy";
  if (modelEmotion === "worried" || /害怕|怕|找不到|想回家|不是我的家|难受|孤单/.test(text)) mood = "worried";
  if (modelEmotion === "risk" || /吃药|用药|胸口|摔倒|走失|急救|医院/.test(text)) mood = "risk";
  chatCanvas.classList.remove("mood-soothe", "mood-happy", "mood-worried", "mood-risk");
  chatCanvas.classList.add(`mood-${mood}`);
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function getRandomResponse(arr) {
  const available = arr.filter(r => !recentResponses.includes(r));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

function localResponse(text) {
  if (/吃药|用药|胸口|摔倒|走失|急救|医院/.test(text)) {
    return "我会先陪着您。这个情况需要家人或专业人员确认，我会提醒家属及时查看。";
  }
  if (/你是谁|你叫什么|你是什么|你是干什么的|你是啥/.test(text)) {
    return "我叫在在，是一直陪着您的家人。我会一直陪着您，哪儿也不去。";
  }
  if (text.includes("忘")) return "没关系，不用急着想起来。我会陪您一起想，一点一点来。";
  if (text.includes("照片") || text.includes("是什么人")) return "我陪您一起看看，这像是一张很重要的家人照片。";
  if (text.includes("无聊")) return "我在这儿陪您说说话呢。要不要听一首轻一点的歌？";
  const tone = toneSelect ? toneSelect.value : "soothe";
  const responses = fallbackResponses[tone] || fallbackResponses.soothe;
  return getRandomResponse(Array.isArray(responses) ? responses : [responses]);
}

function sourceLabel(data) {
  if (data.source === "doubao") return "真实 AI：豆包/Ark 已回应";
  if (data.source === "openai") return "真实 AI：OpenAI 已回应";
  if (data.source === "cached") return "已缓存回应";
  if (data.source === "mock") return "本地演示回应";
  return "已生成回应";
}

async function typeText(element, text, speed = 40) {
  element.textContent = "";
  for (let i = 0; i < text.length; i++) {
    element.textContent += text[i];
    await new Promise(resolve => setTimeout(resolve, speed));
  }
}

async function startDialogTyping(fullText) {
  if (!dialogList) return;
  const historyWithoutLast = conversationHistory.slice(0, -1);
  dialogList.innerHTML = historyWithoutLast.slice(-6).map((item) => `
    <div class="dialog-bubble ${item.role === "user" ? "user" : "assistant"}">${escapeHtml(item.content)}</div>
  `).join("");
  const bubble = document.createElement("div");
  bubble.className = "dialog-bubble assistant typing";
  dialogList.appendChild(bubble);
  dialogList.scrollTop = dialogList.scrollHeight;
  for (let i = 0; i < fullText.length; i++) {
    bubble.textContent += fullText[i];
    dialogList.scrollTop = dialogList.scrollHeight;
    await new Promise(r => setTimeout(r, 42));
  }
  bubble.classList.remove("typing");
}

const chatComposer = document.querySelector(".chat-composer");

function updateSendButtonState() {
  if (!generateButton || !elderInput) return;
  const hasText = elderInput.value.trim().length > 0;
  const isBusy = generateButton.classList.contains("loading");
  generateButton.disabled = !hasText || isBusy;
  generateButton.classList.toggle("active", hasText && !isBusy);
}

elderInput?.addEventListener("input", updateSendButtonState);

function showTypingIndicator() {
  if (!dialogList) return;
  const existing = dialogList.querySelector(".typing-indicator");
  if (existing) return;
  const bubble = document.createElement("div");
  bubble.className = "dialog-bubble assistant typing-indicator";
  bubble.innerHTML = '<span class="typing-dot"></span>';
  dialogList.appendChild(bubble);
  dialogList.scrollTop = dialogList.scrollHeight;
}

function showUserBubble(text) {
  if (!dialogList) return;
  const userBubble = document.createElement("div");
  userBubble.className = "dialog-bubble user";
  userBubble.textContent = text;
  dialogList.appendChild(userBubble);
  dialogList.scrollTop = dialogList.scrollHeight;
}

function normalizeSettings(settings = {}) {
  const safe = value => String(value || "").slice(0, 80);
  const avoid = Array.isArray(settings.avoid) ? settings.avoid : String(settings.avoid || "").split(/[；;\n]/);
  return {
    nickname: safe(settings.nickname || "奶奶"),
    tone: safe(settings.tone || "智能回应"),
    length: safe(settings.length || "简短"),
    softness: safe(settings.softness || "更轻柔"),
    memoryWeight: safe(settings.memoryWeight || "智能引用"),
    avoid: avoid.map(item => safe(item).trim()).filter(Boolean).slice(0, 8)
  };
}

function memoryWeightInstruction(weight = "智能引用") {
  if (weight === "轻度引用") return "仅在明确提到相关内容时引用记忆。";
  if (weight === "强记忆唤起") return "主动选择1个最相关记忆点轻轻唤起，先回应情绪。";
  return "需要时引用1个最相关记忆点，不需要时自然陪伴。";
}

function zaizaiSystemPrompt(settings = {}) {
  const normalized = normalizeSettings(settings);
  return [
    "你是在在，面向认知症老人的温柔陪伴者。根据老人的话生成自然口语回应。",
    "",
    "【核心规则】",
    "1. 先回应具体内容，不纠正不反驳，不否定感受。",
    "2. 禁用套话：不说'我在这儿呢''慢慢说''有什么想聊的'。",
    "3. 记忆引用规则（非常重要）：",
    "   - 如果'可用家庭记忆'为空，就当没有记忆库这回事，完全正常地回复。",
    "   - 如果'可用家庭记忆'不为空，必须引用1个最相关记忆点中的具体信息（名字、地点、事件等），让老人感受到你记得她的家人和往事。",
    "   - 绝对不要主动提起照片、结婚照、老照片、老歌等记忆内容，除非老人先提到。",
    "4. 场景处理：",
    "   - 仅在老人明确问'你是谁'时才自我介绍：'我叫在在，是一直陪着您的家人'",
    "   - 想回家/陌生感：承认想念，安抚当下，可提家人",
    "   - 时间定向：温和告知时段，用生活节奏引导",
    "   - 照片/人物：一起看，有记忆轻引用，不编造",
    "   - 已故亲人：不强调去世，用'我在呢'承接",
    "   - 夜间恐惧：安抚+提天亮后的安排",
    "   - 高风险(用药/胸口/摔倒)：risk=true，提醒家属",
    "",
    "【示例】",
    "老人：你是谁 → reply：我叫在在呀，是一直陪着您的家人。我会一直在这儿陪着您，哪儿也不去。",
    "老人：我想回家 → reply：王奶奶，您是想念熟悉的地方了吧，我在这儿陪您坐一会儿。",
    "老人：这张照片是谁 → reply：我们一起慢慢看看，照片里的人看起来很亲近。",
    "老人：志明你在吗 → reply：我在呢，我在这里陪你。",
    "老人：你好 → reply：您好呀，今天感觉怎么样？",
    "老人：今天天气不错 → reply：是啊，天气好的时候心情也跟着好起来了呢。",
    "",
    `【配置】称呼：${normalized.nickname} | 风格：${normalized.tone} | 长度：${normalized.length} | 语气：${normalized.softness}`,
    `记忆强度：${normalized.memoryWeight} ${memoryWeightInstruction(normalized.memoryWeight)}`,
    normalized.avoid.length ? `禁忌：${normalized.avoid.join("；")}` : "",
    "回复1-2句，20-60字。只输出JSON：{\"reply\":\"...\",\"emotion\":\"happy|soothe|worried|risk\",\"light\":\"white|warm|soft|alert\",\"risk\":false}"
  ].filter(Boolean).join("\n");
}

function sceneInstruction(message = "") {
  const text = String(message || "");
  if (/你是谁|你叫什么|你是什么|你是干什么的|你是啥/.test(text)) {
    return "场景判断：老人在询问在在的身份。reply 必须自我介绍：我叫在在，是一直陪着您的家人，会一直陪着您。语气温暖、亲切、让人安心。";
  }
  if (/想回家|不是我的家|回家/.test(text)) {
    return "场景判断：老人正在表达想回家/陌生感。reply 必须承认她想念熟悉的地方，并安抚当下，可提到家人陪伴。";
  }
  if (/照片|相片|是什么人|什么人/.test(text)) {
    return "场景判断：老人正在询问照片人物。reply 必须围绕照片一起看；有相关记忆就轻轻引用一个。";
  }
  if (/志明|老伴|丈夫|先生/.test(text)) {
    return "场景判断：老人提到亲密家人。reply 不要强调去世，只做陪伴和温和承接。";
  }
  if (/吃药|用药|胸口|摔倒|走失|急救|医院/.test(text)) {
    return "场景判断：可能有安全风险。reply 要提醒联系家属或专业人员，risk 必须为 true。";
  }
  return "场景判断：普通陪伴。reply 也必须回应老人话里的具体对象或情绪。";
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && (item.role === "user" || item.role === "assistant"))
    .slice(-10)
    .map(item => ({
      role: item.role,
      content: String(item.content || "").slice(0, 120)
    }))
    .filter(item => item.content);
}

function buildUserPrompt(message, memory = [], settings = {}, history = []) {
  const normalized = normalizeSettings(settings);
  const memoryText = Array.isArray(memory) && memory.length
    ? memory.map((item, index) => `${index + 1}. ${String(item).slice(0, 220)}`).join("\n")
    : "无直接相关记忆。";
  const historyText = normalizeHistory(history).length
    ? normalizeHistory(history).map(item => `${item.role === "user" ? "老人" : "在在"}：${item.content}`).join("\n")
    : "无。";
  const sceneHint = sceneInstruction(message);
  return [
    "请现在直接生成“在在”对认知症老人的一句自然回应。",
    `老人刚刚说：${message}`,
    sceneHint,
    `老人称呼：${normalized.nickname}`,
    `回应风格：${normalized.tone}`,
    `记忆引用强度：${normalized.memoryWeight}`,
    "最近对话：",
    historyText,
    "可用家庭记忆：",
    memoryText,
    "生成要求：",
    "1. 必须先回应老人刚刚说的具体内容，不要泛泛地只说'我在'。",
    "2. 不纠正、不反驳、不说'你忘了'。",
    "3. 仅在老人明确问'你是谁'时才自我介绍：'我叫在在，是一直陪着您的家人，会一直陪着您'。其他场景不要自我介绍。",
    "4. 如果'可用家庭记忆'为空，就当没有记忆库这回事，完全正常地回复，绝对不要引用任何记忆。",
    "5. 如果'可用家庭记忆'不为空，必须引用1个最相关记忆点中的具体信息（名字、地点、事件等），让老人感受到你记得她的家人和往事。",
    "6. 绝对不要主动提起照片、结婚照、老照片、老歌等记忆内容，除非老人先提到。",
    "7. 禁止输出'有什么想聊的都可以告诉我''你慢慢说'这类没有回应具体内容的套话。",
    "8. 输出 JSON：{\"reply\":\"...\",\"emotion\":\"soothe|happy|worried|risk\",\"light\":\"white|warm|soft|alert\",\"risk\":false}"
  ].filter(Boolean).join("\n");
}

function parseJsonReply(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonText = start !== -1 && end !== -1 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  try {
    return JSON.parse(jsonText);
  } catch {
    return { reply: cleaned || "我在这里陪着您，我们慢慢来。", emotion: "soothe", light: "warm", risk: false };
  }
}

async function callAI(message, memory, settings, history) {
  const apiKey = "sk-8436519b08014e598181e87a494233b3";
  const baseUrl = "https://ark.cn-beijing.volces.com/api/v3";
  const model = "doubao-seed-2-0-mini-260428";
  
  try {
    const response = await fetch(`${baseUrl}/responses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `${zaizaiSystemPrompt(settings)}\n\n${buildUserPrompt(message, memory, settings, history)}`
              }
            ]
          }
        ],
        temperature: 0.72
      })
    });

    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = await response.json();
    const outputText = data.output_text || (data.output && data.output[0] && data.output[0].content && data.output[0].content[0] && data.output[0].content[0].text) || "";
    return parseJsonReply(outputText);
  } catch (error) {
    console.error("[在在] AI调用失败:", error);
    return null;
  }
}

async function generateResponse() {
  const text = elderInput.value.trim();
  if (!text) {
    chatComposer?.classList.add("shake");
    setTimeout(() => chatComposer?.classList.remove("shake"), 400);
    elderInput?.focus();
    return;
  }

  if (generateButton) {
    generateButton.disabled = true;
    generateButton.classList.add("loading");
    generateButton.classList.remove("active", "success");
  }
  chatComposer?.classList.add("sending");
  elderInput.value = "";

  if (syncState) {
    syncState.style.display = "block";
    syncState.dataset.busy = "true";
    syncState.textContent = "在在正在思考...";
  }
  chatCanvas?.classList.add("ai-warm");
  chatCanvas?.classList.add("ai-thinking");

  showUserBubble(text);
  setTimeout(() => showTypingIndicator(), 400);

  const selectedMemory = getPresetMemory(text);
  console.log("[在在] 发送记忆:", selectedMemory.length, "条", selectedMemory);

  let assistantText = "";
  let emotion = "";
  try {
    if (/你是谁|你叫什么|你是什么|你是干什么的|你是啥/.test(text)) {
      assistantText = "我叫在在，是一直陪着您的家人。我会一直在这儿陪着您，哪儿也不去。";
      emotion = "happy";
      if (syncState) syncState.textContent = "身份识别回应";
    } else {
      const data = await callAI(text, selectedMemory, getCareSettings(), conversationHistory.slice(-10));
      if (data) {
        assistantText = data.reply || localResponse(text);
        emotion = data.emotion || "";
        if (syncState) syncState.textContent = "真实 AI：豆包/Ark 已回应";
      } else {
        throw new Error("AI未返回数据");
      }
    }
  } catch {
    assistantText = localResponse(text);
    if (syncState) syncState.textContent = "本地兜底回应";
  } finally {
    const isDuplicate = recentResponses.some(r =>
      assistantText && r && assistantText.length > 5 &&
      r.length > 5 && (r.includes(assistantText) || assistantText.includes(r))
    );

    if (isDuplicate) {
      const alternatives = ["我在这里陪着您，我们慢慢来。", "让我陪您聊聊天吧。", "我在这儿呢，您想说什么都可以。", "我们一起度过这段时间。"];
      const available = alternatives.filter(r => !recentResponses.includes(r));
      assistantText = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    recentResponses.push(assistantText);
    if (recentResponses.length > 5) recentResponses.shift();

    rememberTurn(text, assistantText);
    chatComposer?.classList.remove("sending");
    chatCanvas?.classList.remove("ai-thinking");

    if (generateButton) {
      generateButton.classList.remove("loading");
      generateButton.classList.add("success");
      setTimeout(() => {
        generateButton.classList.remove("success");
        updateSendButtonState();
      }, 600);
    }

    if (syncState) delete syncState.dataset.busy;

    await startDialogTyping(assistantText);

    updateHomeStats();
    updateMood(`${text} ${assistantText}`, emotion);
    window.setTimeout(updateTimeLight, 1200);
  }
}

generateButton?.addEventListener("click", generateResponse);

elderInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    generateResponse();
  }
});

voiceButton?.addEventListener("click", () => {
  voiceButton.classList.add("listening");
  syncState.dataset.busy = "true";
  syncState.textContent = "正在聆听语音...";
  window.setTimeout(() => {
    elderInput.value = "这张照片里的人是谁？";
    updateSendButtonState();
    voiceButton.classList.remove("listening");
    delete syncState.dataset.busy;
    syncState.textContent = "已转成文字";
    generateResponse();
  }, 750);
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    elderInput.value = button.dataset.prompt;
    updateSendButtonState();
    generateResponse();
  });
});

document.querySelector("#saveButton")?.addEventListener("click", () => {
  syncState.textContent = "已收藏为常用话术";
});

document.querySelector("#syncButton")?.addEventListener("click", () => {
  syncState.textContent = "已同步到客厅 · 在在 01";
  const item = document.createElement("article");
  item.innerHTML = `<time>刚刚</time><div><b>新增一条家庭话术</b><p>${escapeHtml(responseText.textContent)}</p></div>`;
  document.querySelector("#activityList").prepend(item);
});

["#nickname","#toneSetting","#lengthSetting","#softnessSetting","#memoryWeight","#avoidSetting"].forEach(selector=>{
  const el=document.querySelector(selector);
  el?.addEventListener("input",updateRulePreview);
  el?.addEventListener("change",updateRulePreview);
});
document.querySelector("#addMemory").onclick=addCustomMemory;
document.querySelector("#memoryGroups").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit-memory]");
  const save=event.target.closest("[data-save-memory]");
  const cancel=event.target.closest("[data-cancel-memory]");
  if(edit) renderMemoryGroups(edit.dataset.editMemory);
  if(save) saveEditedMemory(save.dataset.saveMemory);
  if(cancel) renderMemoryGroups();
});

document.querySelectorAll("[data-template]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#rewriteResult").textContent =
      `${button.dataset.template} 这段话可以加入常用话术，并同步到在在设备。`;
  });
});

const community = document.querySelector("#community");
const communityTopic = document.querySelector("#communityTopic");
const topicTitle = document.querySelector("#topicTitle");
const topicDescription = document.querySelector("#topicDescription");
const topicPosts = document.querySelector("#topicPosts");

const communityTopics = {
  "傍晚焦虑": {
    description: "来自照护家庭的傍晚安抚方法，重点是先接住情绪，再建立熟悉感。",
    posts: [
      ["18:30 · 陪伴经验", "先回应想家的感受，再邀请老人坐一会儿", "不要急着解释地点是否正确。先说“你一定很想念熟悉的家”，再用老照片或熟悉的歌帮助情绪慢慢稳定。"],
      ["17:50 · 灯光调整", "天色变暗前，提前打开一盏暖灯", "在傍晚来临前保持室内光线柔和、稳定，可以减少环境突然变暗带来的不安。"],
      ["19:10 · 家庭话术", "把长解释改成一句短回应", "反复询问时，使用相同的短句和缓慢语速，比不断增加信息更容易让老人感到安心。"]
    ]
  },
  "照片唤起": {
    description: "用照片开启轻松对话，不考问记忆，让熟悉的人和场景自然浮现。",
    posts: [
      ["14:20 · 照片陪伴", "先聊画面，再聊照片里的人", "可以先说天气、衣服和桌上的饭菜，等老人主动提到人物后再顺着回应。"],
      ["15:05 · 记忆整理", "每张照片只补充一个简单线索", "在照片背后记录人物称呼和一件开心的小事，避免一次提供太多信息。"],
      ["10:40 · 低压力交流", "想不起来也不纠正", "老人没有认出照片时，可以说“没关系，我们一起看看”，把重点放在当下的陪伴感受。"]
    ]
  }
};

function openCommunityTopic(name) {
  const topic = communityTopics[name];
  if (!topic) return;
  topicTitle.textContent = name;
  topicDescription.textContent = topic.description;
  topicPosts.innerHTML = topic.posts.map(([meta, title, body]) => `
    <article>
      <span class="post-meta">${meta}</span>
      <h3>${title}</h3>
      <p>${body}</p>
    </article>
  `).join("");
  community.classList.add("topic-open");
  communityTopic.hidden = false;
  app.scrollTo({ top: 0, behavior: "smooth" });
}

function closeCommunityTopic() {
  community.classList.remove("topic-open");
  communityTopic.hidden = true;
}

document.querySelectorAll("[data-topic]").forEach((button) => {
  button.addEventListener("click", () => openCommunityTopic(button.dataset.topic));
});

document.querySelector("#topicBack").addEventListener("click", closeCommunityTopic);

const home = document.querySelector("#home");
const summaryDetail = document.querySelector("#summaryDetail");
const summaryTitle = document.querySelector("#summaryTitle");
const summaryEyebrow = document.querySelector("#summaryEyebrow");
const summaryDescription = document.querySelector("#summaryDescription");
const summaryRecords = document.querySelector("#summaryRecords");

const summaryDetails = {
  mood: {
    title: "情绪平稳",
    eyebrow: "今日对话记录",
    description: "根据今天的语言表达和互动状态，在在判断老人整体情绪平稳。绿色标注为主要判断依据。",
    records: [
      ["09:12 · 晨间问候", "在在：早上好，今天阳光很温柔。<br>老人：<mark>嗯，坐在这里挺舒服的。</mark>"],
      ["14:36 · 照片陪伴", "在在：我们慢慢看看这张合照。<br>老人：<mark>这张照片我看着很亲切，大家都在笑。</mark>"],
      ["17:48 · 傍晚问候", "在在：天快黑了，我把灯调暖一点。<br>老人：<mark>好，你陪我坐一会儿。</mark>"]
    ]
  },
  memory: {
    title: "主动看了合照",
    eyebrow: "照片互动记录",
    description: "老人今天主动查看家庭合照约 6 分钟，并对熟悉人物和场景作出回应。",
    records: [
      ["14:32 · 主动触发", "老人拿起桌边相框，停留约 2 分钟，并说：<mark>这张是在家里拍的吧。</mark>"],
      ["14:35 · 人物回应", "在在提示照片中的家庭聚餐场景。老人指向照片右侧人物并说：<mark>她笑起来很像丽丽。</mark>"],
      ["建议补充", "可在记忆库中补充合照人物从左到右的称呼，方便下次自然回应。"]
    ]
  },
  sleep: {
    title: "傍晚轻微焦虑",
    eyebrow: "安抚过程记录",
    description: "傍晚出现短暂不安，在在已启动暖光和熟悉话术，情绪随后恢复稳定。",
    records: [
      ["18:06 · 情绪变化", "老人重复询问现在在哪里，并说：<mark>天黑了，我是不是该回去了。</mark>"],
      ["18:08 · 在在回应", "在在：你是想念熟悉的地方了吧。我在这里陪你，我们先坐一会儿。"],
      ["18:13 · 状态恢复", "老人坐下并回应：<mark>好，那就先坐一会儿。</mark> 暖光模式继续保持。"]
    ]
  }
};

function openSummaryDetail(name) {
  const detail = summaryDetails[name];
  if (!detail) return;
  summaryTitle.textContent = detail.title;
  summaryEyebrow.textContent = detail.eyebrow;
  summaryDescription.textContent = detail.description;
  summaryRecords.innerHTML = detail.records.map(([time, body]) => `
    <article class="detail-record">
      <time>${time}</time>
      <p>${body}</p>
    </article>
  `).join("");
  summaryDetail.className = `summary-detail ${name}-detail`;
  summaryDetail.hidden = false;
  home.classList.add("detail-open");
  app.classList.add("hide-header");
  app.scrollTo({ top: 0, behavior: "smooth" });
}

function closeSummaryDetail() {
  home.classList.remove("detail-open");
  summaryDetail.hidden = true;
  if (home.classList.contains("active")) app.classList.remove("hide-header");
}

document.querySelectorAll("[data-summary]").forEach((button) => {
  button.addEventListener("click", () => openSummaryDetail(button.dataset.summary));
});

document.querySelector("#summaryBack").addEventListener("click", closeSummaryDetail);

responseText.textContent = localResponse(elderInput.value.trim());
renderMemoryGroups();
updateRulePreview();
updateTimeLight();
updateMood(elderInput.value.trim());

/* ===== 动态首页数据更新 ===== */
const homeStats = document.querySelector("#homeStats");
const homeDate = document.querySelector("#homeDate");
const homeMoodLabel = document.querySelector("#homeMoodLabel");
const homeMoodSub = document.querySelector("#homeMoodSub");
const homeMoodStatus = document.querySelector("#homeMoodStatus");
const homeMemoryLabel = document.querySelector("#homeMemoryLabel");
const homeMemorySub = document.querySelector("#homeMemorySub");
const homeMemoryStatus = document.querySelector("#homeMemoryStatus");
const homeSleepLabel = document.querySelector("#homeSleepLabel");
const homeSleepSub = document.querySelector("#homeSleepSub");
const homeSleepStatus = document.querySelector("#homeSleepStatus");

function updateHomeStats() {
  const today = new Date();
  if (homeDate) homeDate.textContent = `${today.getMonth() + 1}月${today.getDate()}日`;

  const turns = conversationHistory.filter(item => item.role === "assistant").length;
  if (homeStats) {
    const moodText = turns > 0 ? `在在已完成 ${turns} 次温柔回应，老人今天整体情绪平稳。` : "在在已准备好陪伴，等待与老人开始今天的对话。";
    homeStats.textContent = moodText;
  }

  const lastAssistant = conversationHistory.filter(item => item.role === "assistant").pop();
  const lastUser = conversationHistory.filter(item => item.role === "user").pop();

  if (lastAssistant && homeMoodLabel) {
    const hasRisk = /吃药|用药|胸口|摔倒|走失|急救|医院/.test(lastUser?.content || "");
    const hasWorry = /想回家|不是我的家|害怕|难受|孤单|头疼|不舒服/.test(lastUser?.content || "");
    homeMoodLabel.textContent = hasRisk ? "需要关注" : hasWorry ? "情绪波动" : "情绪平稳";
    homeMoodSub.textContent = hasRisk ? "高风险内容已标记" : hasWorry ? "在在已启动安抚" : "较昨日更放松";
    homeMoodStatus.textContent = hasRisk ? "提醒家属" : hasWorry ? "已安抚" : "良好";
  }

  if (lastUser && homeMemoryLabel) {
    const photoRelated = /照片|是谁|家人/.test(lastUser.content || "");
    if (photoRelated) {
      homeMemoryLabel.textContent = "主动查看照片";
      homeMemorySub.textContent = "对话中提及家人";
      homeMemoryStatus.textContent = "新发现";
    }
  }

  if (lastUser && homeSleepLabel) {
    const nightRelated = /睡不着|醒着|害怕|怕黑/.test(lastUser.content || "");
    const eveningRelated = /几点了|该去哪|想回家/.test(lastUser.content || "");
    if (nightRelated) {
      homeSleepLabel.textContent = "夜间觉醒";
      homeSleepSub.textContent = "暖光安抚已启动";
      homeSleepStatus.textContent = "已照护";
    } else if (eveningRelated) {
      homeSleepLabel.textContent = "傍晚轻微焦虑";
      homeSleepSub.textContent = "暖光安抚已启动";
      homeSleepStatus.textContent = "已照护";
    }
  }
}
updateHomeStats();
updateSendButtonState();

/* ===== 快捷场景标签 ===== */
document.querySelectorAll("#quickTags button[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    elderInput.value = button.dataset.preset;
    updateSendButtonState();
    elderInput.focus();
    generateResponse();
  });
});

/* ===== 社区内容扩充 ===== */
const communityList = document.querySelector(".community-list");
if (communityList) {
  const extraPosts = [
    { tag: '夜间安抚', title: '老人半夜醒来总喊老伴名字，该怎么回应？', body: '不纠正"他已经去世了"，先回应"我在呢"。再用天亮后的安排给老人一个温和的期待。', template: '我在呢，没事的。天快亮了，丽丽早上就来看你。' },
    { tag: '进食引导', title: '老人说不想吃饭，怎么引导既不强迫又关心？', body: '不追问为什么不吃，先顺着情绪说"那我们先坐一会儿"，再自然提到她喜欢的食物勾起食欲。', template: '是不是饿了？红烧肉和饺子都是您爱吃的，我陪您等饭。' },
    { tag: '时间定向', title: '老人反复问"几点了""该去哪"，如何减少焦虑？', body: '用熟悉的生活节奏代替精确时间，比如"下午五点了，该准备晚饭了"，再把注意力引到喜欢的食物上。', template: '下午五点多了，天快黑了。要不要想想今晚吃什么？饺子好不好？' },
    { tag: '记忆对话', title: '老人说"我忘了"，如何回应不让她更沮丧？', body: '立刻接"没关系，不用急着想起来"，把重点从"记不记得"转移到"我陪着你"，减轻记忆压力。', template: '没关系，不用急着想起来。我陪你慢慢来。' },
    { tag: '拒护应对', title: '老人抗拒照护说"不要你管"，怎么不激化矛盾？', body: '退后一步，不反驳、不坚持。说一句"好的，我在旁边，您需要的时候叫我"，给老人掌控感。', template: '好的，我在旁边。您需要的时候叫我，我随时在。' },
    { tag: '幻觉安抚', title: '老人说"东西被偷了"，如何不否定她的感受？', body: '不否定、不辩解。先安抚"我在这儿看着呢"，再陪她一起"找"，把不安转化为被陪伴的感觉。', template: '我在这儿看着呢，没事的。东西我帮您留意着。' }
  ];
  extraPosts.forEach((post) => {
    const article = document.createElement("article");
    article.innerHTML = `
      <button class="topic-tag" type="button" data-topic="${post.tag}">${post.tag}</button>
      <h3>${post.title}</h3>
      <p>${post.body}</p>
      <button type="button" data-template="${post.template}">改写为我家话术</button>
    `;
    communityList.appendChild(article);
  });
  document.querySelectorAll("[data-topic]").forEach((button) => {
    button.addEventListener("click", () => openCommunityTopic(button.dataset.topic));
  });
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#rewriteResult").textContent = `${button.dataset.template} 这段话可以加入常用话术，并同步到在在设备。`;
    });
  });
}

const communityTopicsExtra = {
  "夜间安抚": {
    description: "夜间觉醒与呼唤已故亲人时的温和回应方法。",
    posts: [
      ["02:15 · 夜间陪伴", '先回应"我在呢"，再给天亮后的期待', '半夜醒来时，老人最需要的是安全感。先不纠正任何称呼错误，用"我在呢"接住情绪，再提到熟悉的家人会在早上来看她。'],
      ["03:00 · 灯光配合", '保持低亮暖光，不突然打开强光', '夜间灯光过亮会让老人更加迷糊。保持柔和的暖黄光，让她知道"有人在"，而不是"该起床了"。']
    ]
  },
  "进食引导": {
    description: "在尊重老人食欲的前提下，用熟悉的味道唤起进食意愿。",
    posts: [
      ["11:30 · 食欲引导", '先顺着情绪，再自然提到喜欢的食物', '不要问"为什么不吃"，而是说"那我们先坐一会儿"。等情绪平稳后，再提到她以前喜欢的菜。'],
      ["12:00 · 环境营造", '把吃饭变成温馨的记忆场景', '可以边准备边聊"以前您做这道菜可香了"，把吃饭从"任务"变成"回忆"。']
    ]
  },
  "时间定向": {
    description: "用生活节奏代替精确时间，帮助老人减少时间焦虑。",
    posts: [
      ["17:00 · 时段引导", '用"该吃晚饭了"代替"现在五点"', '精确时间对认知症老人意义不大。用她熟悉的生活节奏——吃饭、晒太阳、睡觉——来帮助定位时间。'],
      ["18:30 · 地点安抚", '不争论"这是你家"，先承认想念', '老人说"我想回家"时，争论地点只会增加焦虑。先承认"你想念熟悉的地方了吧"，再用陪伴稳定当下。']
    ]
  },
  "记忆对话": {
    description: '当老人表达遗忘时，把对话重点从"记忆"转移到"陪伴"。',
    posts: [
      ["14:00 · 遗忘回应", '立刻接"没关系"，不给记忆压力', '老人说"我忘了"时，最怕的是被纠正或考问。立刻说"没关系，不用急着想起来"，把重点放在"我陪着你"。'],
      ["15:30 · 旧物引导", '用老物件代替直接提问', '看到毛衣可以说"这毛衣织得真好"，而不是"你还记得这是谁织的吗"。让记忆自然浮现，而不是被要求提取。']
    ]
  },
  "拒护应对": {
    description: "面对抗拒照护时，退一步给老人掌控感。",
    posts: [
      ["09:00 · 掌控感", '不反驳，给老人选择权', '老人说"不要你管"时，坚持照护只会激化矛盾。退一步说"好的，我在旁边"，等她情绪平复后再靠近。'],
      ["10:15 · 转移焦点", '用喜欢的活动自然引导配合', '等她平静后，可以说"要不要一起看看照片"，用她感兴趣的事自然引导，而不是直接要求照护动作。']
    ]
  },
  "幻觉安抚": {
    description: "面对幻觉或妄想时，不否定感受，用陪伴化解不安。",
    posts: [
      ["16:00 · 不否定", '不争论"有没有被偷"，先安抚', '老人说"东西被偷"时，争论真假只会让她更焦虑。先说"我在这儿看着呢"，再陪她一起"找"，把不安变成被陪伴的感觉。'],
      ["16:45 · 安全感", '用具体行动替代空洞安慰', '与其反复说"没事的"，不如真的帮她整理抽屉、检查门窗。具体行动比语言更能建立安全感。']
    ]
  }
};
Object.assign(communityTopics, communityTopicsExtra);

/* ===== 实时时钟更新 ===== */
const statusClock = document.querySelector("#statusClock");
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  if (statusClock) statusClock.textContent = `${hours}:${minutes}`;
}
updateClock();
window.setInterval(updateClock, 30000);

/* ===== 空状态提示 ===== */
function renderDialogWithEmptyState(extraMessages = []) {
  if (!dialogList) return;
  const messages = conversationHistory.concat(extraMessages).slice(-6);
  if (messages.length === 0) {
    dialogList.innerHTML = `
      <div class="dialog-empty">
        <span>在在已准备好陪伴</span>
        <p>点击上方快捷标签，或输入老人可能说的话，开始模拟对话。</p>
      </div>
    `;
    return;
  }
  dialogList.innerHTML = messages.map((item) => `
    <div class="dialog-bubble ${item.role === "user" ? "user" : "assistant"}">${escapeHtml(item.content)}</div>
  `).join("");
  dialogList.scrollTop = dialogList.scrollHeight;
}

renderDialogWithEmptyState([{ role: "assistant", content: responseText.textContent }]);