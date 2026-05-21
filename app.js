async function loadData(){
  try{
    const res = await fetch('data.json');
    if(!res.ok) throw new Error('Failed to load data.json');
    const data = await res.json();
    return data;
  }catch(e){
    console.error(e);
    document.getElementById('list').innerHTML = '<li style="color:red">Erro ao carregar data.json</li>';
    return [];
  }
}

function detectImageKey(item){
  const keys = Object.keys(item);
  const candidates = keys.filter(k=>/url|imagem|image|img|thumb|path|arquivo.*imagem|file.*name/i.test(k));
  return candidates.length?candidates[0]:null;
}

function isUrl(value){
  return typeof value==='string' && /^(https?:)?\/\//i.test(value);
}

function isImageNameKey(key){
  return /imagem|image|img|arquivo.*imagem|file.*name/i.test(key);
}

function getPotentialLink(value, key){
  if(!value) return null;
  const v = String(value).trim();
  if(isUrl(v)) return v;
  if(/[\\/].+|\.[a-zA-Z0-9]{2,5}$/.test(v)) return v;
  if(isImageNameKey(key)) return `./${v}`;
  return null;
}

function createValueElement(key, value){
  const text = value===null ? '' : String(value);
  const link = getPotentialLink(text, key);
  if(link){
    const a = document.createElement('a');
    a.href = link;
    a.target = '_blank';
    a.rel = 'noreferrer';
    a.textContent = text;
    return a;
  }
  return document.createTextNode(text);
}

function getItemLabel(item, idx){
  const keys = [
    'Identificador único da paciente',
    'Nome do arquivo da imagem',
    'Identificador amostra',
    'Patient ID',
    'ID',
    'id',
    'title'
  ];
  for(const key of keys){
    if(item[key]) return item[key];
  }
  return `Item ${idx+1}`;
}

let selectedButton = null;

function renderList(data){
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.forEach((item,idx)=>{
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = getItemLabel(item, idx);
    button.addEventListener('click',()=>selectItem(button, item));
    li.appendChild(button);
    list.appendChild(li);
    if(idx===0){
      selectItem(button, item);
    }
  });
}

function selectItem(button, item){
  if(selectedButton){
    selectedButton.classList.remove('selected');
  }
  selectedButton = button;
  selectedButton.classList.add('selected');
  showDetail(item);
}

function showDetail(item){
  const meta = document.getElementById('meta');
  meta.innerHTML = '';
  Object.entries(item).forEach(([k,v])=>{
    const div = document.createElement('div');
    div.className = 'field';
    const label = document.createElement('strong');
    label.textContent = `${k}: `;
    div.appendChild(label);
    div.appendChild(createValueElement(k, v));
    meta.appendChild(div);
  });

  const imageKey = detectImageKey(item);
  const imgCont = document.getElementById('imageContainer');
  imgCont.innerHTML = '';
  if(imageKey && item[imageKey]){
    const imgValue = String(item[imageKey]).trim();
    const imgHref = getPotentialLink(imgValue, imageKey);
    if(imgHref && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(imgHref)){
      const img = document.createElement('img');
      img.src = imgHref;
      img.alt = 'image';
      imgCont.appendChild(img);
    }
  }
}

function escapeHtml(s){return s.replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]})}

function setupFilter(data){
  const input = document.getElementById('filter');
  input.addEventListener('input',()=>{
    const q = input.value.trim().toLowerCase();
    const filtered = data.filter(item=>JSON.stringify(item).toLowerCase().includes(q));
    renderList(filtered);
    renderDashboard(filtered);
  });
}

function valueByKeys(item, keys){
  for(const key of keys){
    if(item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== ''){
      return String(item[key]).trim();
    }
  }
  return '';
}

function parseFloatValue(item, keys){
  const text = valueByKeys(item, keys);
  if(!text) return NaN;
  const parsed = parseFloat(String(text).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function tally(values){
  return values.reduce((acc,value)=>{
    if(value==='') return acc;
    acc[value] = (acc[value]||0)+1;
    return acc;
  }, {});
}

function tallyDelimitedValues(data, keys, separators=/[,;|]/){
  const counts = {};
  data.forEach(item=>{
    const raw = valueByKeys(item, keys);
    if(!raw) return;
    raw.split(separators).map(v=>v.trim()).filter(Boolean).forEach(value=>{
      counts[value] = (counts[value]||0) + 1;
    });
  });
  return counts;
}

function createCategoryCard(title, data, keys, options = {}){
  const counts = options.delimited
    ? tallyDelimitedValues(data, keys, options.separators)
    : tally(data.map(item=>valueByKeys(item, keys)).filter(v=>v));
  const entries = Object.entries(counts)
    .sort((a,b)=>b[1]-a[1])
    .map(([label,value])=>({label,value}));
  const card = document.createElement('div');
  card.className = 'dashboard-card expandable';
  const heading = document.createElement('h3');
  heading.textContent = title;
  card.appendChild(heading);
  const hint = document.createElement('div');
  hint.className = 'expand-hint';
  hint.textContent = 'Clique para ampliar';
  card.appendChild(hint);
  if(!entries.length){
    card.innerHTML += '<div class="empty-state">Nenhum dado disponível para este tópico.</div>';
    return card;
  }
  const body = document.createElement('div');
  body.className = 'card-body';
  const label = `${title} por contagem`;
  if(options.chartType === 'pie'){
    body.appendChild(createPieChartElement(label, entries));
  } else if(options.chartType === 'donut'){
    body.appendChild(createDonutChartElement(label, entries));
  } else {
    body.appendChild(createBarChartElement(label, entries, data.length));
  }
  card.appendChild(body);
  makeCardExpandable(card);
  return card;
}

function makeCardExpandable(card){
  card.addEventListener('click', event=>{
    if(event.target.closest('a')) return;
    const expanded = card.classList.contains('expanded');
    document.querySelectorAll('.dashboard-card.expanded').forEach(c=>c.classList.remove('expanded'));
    if(!expanded) card.classList.add('expanded');
  });
}

function createDonutChartElement(title, counts){
  const total = counts.reduce((sum,c)=>sum+c.value,0);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chartWrap = document.createElement('div');
  chartWrap.className = 'pie-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 240 240');
  const radius = 72;
  const center = 120;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ['#7a1b31','#9c2f48','#bd4561','#d96d84','#e6a5b0','#f3d9de'];

  counts.forEach((count,index)=>{
    const portion = count.value/total;
    const dash = circumference * portion;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',center);
    circle.setAttribute('cy',center);
    circle.setAttribute('r',radius);
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke',colors[index % colors.length]);
    circle.setAttribute('stroke-width','26');
    circle.setAttribute('stroke-dasharray',`${dash} ${circumference-dash}`);
    circle.setAttribute('stroke-dashoffset',circumference-offset);
    circle.setAttribute('transform',`rotate(-90 ${center} ${center})`);
    circle.setAttribute('stroke-linecap','round');
    svg.appendChild(circle);
    offset += dash;
  });

  const hole = document.createElementNS('http://www.w3.org/2000/svg','circle');
  hole.setAttribute('cx',center);
  hole.setAttribute('cy',center);
  hole.setAttribute('r',46);
  hole.setAttribute('fill','#fff');
  svg.appendChild(hole);

  const label = document.createElementNS('http://www.w3.org/2000/svg','text');
  label.setAttribute('x',center);
  label.setAttribute('y',center+6);
  label.setAttribute('text-anchor','middle');
  label.setAttribute('fill','#7a1b31');
  label.setAttribute('font-size','18');
  label.setAttribute('font-weight','700');
  label.textContent = total;
  svg.appendChild(label);

  chartWrap.appendChild(svg);
  const legend = document.createElement('div');
  legend.className = 'pie-legend';
  counts.forEach((count,index)=>{
    const item = document.createElement('div');
    item.className = 'pie-item';
    const swatch = document.createElement('span');
    swatch.className = 'pie-swatch';
    swatch.style.background = colors[index % colors.length];
    const labelText = document.createElement('span');
    labelText.textContent = `${count.label} (${count.value})`;
    item.appendChild(swatch);
    item.appendChild(labelText);
    legend.appendChild(item);
  });

  wrapper.appendChild(chartWrap);
  wrapper.appendChild(legend);
  return wrapper;
}

function createStatBar(count, total){
  const wrapper = document.createElement('div');
  wrapper.className = 'stat-row';
  const label = document.createElement('span');
  label.textContent = `${count.label} (${count.value})`;
  const bar = document.createElement('div');
  bar.className = 'stat-bar';
  const fill = document.createElement('div');
  fill.className = 'stat-bar-fill';
  fill.style.width = `${Math.round((count.value/total)*100)}%`;
  bar.appendChild(fill);
  wrapper.appendChild(label);
  wrapper.appendChild(bar);
  return wrapper;
}

function createBarChartElement(title, counts, total){
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const maxValue = Math.max(...counts.map(c=>c.value),1);
  const rowHeight = 30;
  const width = 380;
  const height = counts.length * rowHeight + 20;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  counts.forEach((count,index)=>{
    const y = index * rowHeight + 16;
    const barWidth = Math.round((count.value / maxValue) * (width - 160));
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',150);
    rect.setAttribute('y',y);
    rect.setAttribute('width',barWidth);
    rect.setAttribute('height',16);
    rect.setAttribute('fill','#7a1b31');
    rect.setAttribute('rx','8');
    svg.appendChild(rect);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x',0);
    text.setAttribute('y',y+12);
    text.setAttribute('fill','#111');
    text.setAttribute('font-size','12');
    text.textContent = `${count.label} (${count.value})`;
    svg.appendChild(text);
  });
  chart.appendChild(svg);
  wrapper.appendChild(chart);
  return wrapper;
}

function createPieChartElement(title, counts){
  const total = counts.reduce((sum,c)=>sum+c.value,0);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chartWrap = document.createElement('div');
  chartWrap.className = 'pie-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 220 220');
  const radius = 90;
  const center = 110;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ['#7a1b31','#9c2f48','#bd4561','#d96d84','#e6a5b0','#f3d9de'];

  counts.forEach((count,index)=>{
    const value = count.value;
    const portion = value/total;
    const dash = circumference * portion;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',center);
    circle.setAttribute('cy',center);
    circle.setAttribute('r',radius);
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke',colors[index % colors.length]);
    circle.setAttribute('stroke-width','30');
    circle.setAttribute('stroke-dasharray',`${dash} ${circumference-dash}`);
    circle.setAttribute('stroke-dashoffset',circumference-offset);
    circle.setAttribute('transform',`rotate(-90 ${center} ${center})`);
    circle.setAttribute('stroke-linecap','round');
    svg.appendChild(circle);
    offset += dash;
  });

  chartWrap.appendChild(svg);
  const legend = document.createElement('div');
  legend.className = 'pie-legend';
  counts.forEach((count,index)=>{
    const item = document.createElement('div');
    item.className = 'pie-item';
    const swatch = document.createElement('span');
    swatch.className = 'pie-swatch';
    swatch.style.background = colors[index % colors.length];
    const label = document.createElement('span');
    label.textContent = `${count.label} (${count.value})`;
    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });
  wrapper.appendChild(chartWrap);
  wrapper.appendChild(legend);
  return wrapper;
}

function renderDashboard(data){
  const dashboard = document.getElementById('dashboard');
  dashboard.innerHTML = '';
  if(!data.length){
    dashboard.innerHTML = '<div class="empty-state">Nenhum dado disponível para gerar estatísticas.</div>';
    return;
  }

  const ageKeys = ['Age','Idade','Idade da paciente','Idade da amostra','Idade da amostra na coleta'];
  const stageKeys = ['Tumor Stage','Estadio','Stage','Tumor Stage','Tumor Stage'];
  const ethnicityKeys = ['Ethnicity','ethnicity','Etnia','etnia'];
  const raceKeys = ['Race','race','Raça'];
  const comorbidityKeys = ['Comorbidities','Comorbidities:','Comorbidity','Comorbidades','Comorbidades:'];
  const platinumKeys = ['Platinum','Sensibilidade ou resistência à platina','Platina','Platinum Status'];

  const ages = data.map(item=>parseFloatValue(item, ageKeys)).filter(v=>!Number.isNaN(v));
  const stages = data.map(item=>valueByKeys(item, stageKeys)).filter(v=>v);
  const ethnicities = data.map(item=>valueByKeys(item, ethnicityKeys)).filter(v=>v);
  const races = data.map(item=>valueByKeys(item, raceKeys)).filter(v=>v);
  const comorbidities = tallyDelimitedValues(data, comorbidityKeys);
  const platinum = data.map(item=>valueByKeys(item, platinumKeys)).filter(v=>v);

  const ageCard = document.createElement('div');
  ageCard.className = 'dashboard-card';
  ageCard.innerHTML = '<h3>Age</h3>';
  if(ages.length){
    const sum = ages.reduce((a,b)=>a+b,0);
    const avg = (sum/ages.length).toFixed(1);
    const min = Math.min(...ages);
    const max = Math.max(...ages);
    const smallStats = document.createElement('div');
    smallStats.className = 'stat-row';
    smallStats.innerHTML = `<span>Count: ${ages.length}</span><span>Avg: ${avg}</span>`;
    ageCard.appendChild(smallStats);
    const summary = document.createElement('div');
    summary.className = 'stat-row';
    summary.innerHTML = `<span>Min: ${min}</span><span>Max: ${max}</span>`;
    ageCard.appendChild(summary);
    const ageBuckets = [
      {label:'<40', value: ages.filter(v=>v<40).length},
      {label:'40-49', value: ages.filter(v=>v>=40 && v<50).length},
      {label:'50-59', value: ages.filter(v=>v>=50 && v<60).length},
      {label:'60+', value: ages.filter(v=>v>=60).length},
    ];
    ageCard.appendChild(createBarChartElement('Distribuição de idade', ageBuckets, ages.length));
  } else {
    ageCard.innerHTML += '<div class="empty-state">Não foi possível extrair valores de idade.</div>';
  }
  makeCardExpandable(ageCard);
  dashboard.appendChild(ageCard);

  const stageCard = createCategoryCard('Tumor Stage', data, stageKeys, {chartType:'bar'});
  dashboard.appendChild(stageCard);

  const ethnicityCard = createCategoryCard('Ethnicity', data, ethnicityKeys, {chartType:'pie'});
  dashboard.appendChild(ethnicityCard);

  const raceCard = createCategoryCard('Race', data, raceKeys, {chartType:'pie'});
  dashboard.appendChild(raceCard);

  const comorbidityCard = createCategoryCard('Comorbidities', data, comorbidityKeys, {chartType:'bar', delimited:true, separators:/[,;|]/});
  dashboard.appendChild(comorbidityCard);

  const platinumCard = createCategoryCard('Platinum', data, platinumKeys, {chartType:'donut'});
  dashboard.appendChild(platinumCard);

  const knownKeys = [...ageKeys, ...stageKeys, ...ethnicityKeys, ...raceKeys, ...comorbidityKeys, ...platinumKeys];
  const genericKeys = Array.from(new Set(data.flatMap(Object.keys)))
    .filter(key=>!knownKeys.includes(key))
    .filter(key=>!/url|image|img|path|arquivo/i.test(key));

  genericKeys.forEach(key=>{
    const values = data.map(item=>valueByKeys(item,[key])).filter(v=>v);
    const uniqueValues = Array.from(new Set(values));
    if(!values.length || uniqueValues.length < 2 || uniqueValues.length > 20) return;
    const counts = tally(values);
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
    const card = document.createElement('div');
    card.className = 'dashboard-card expandable';
    const heading = document.createElement('h3');
    heading.textContent = key;
    card.appendChild(heading);
    const hint = document.createElement('div');
    hint.className = 'expand-hint';
    hint.textContent = 'Clique para ampliar';
    card.appendChild(hint);
    card.appendChild(createBarChartElement(`${key} por contagem`, entries, data.length));
    makeCardExpandable(card);
    dashboard.appendChild(card);
  });
}

function showScreen(screenId){
  const targetScreen = document.getElementById(screenId);
  if(!targetScreen) return;

  document.querySelectorAll('.screenButton').forEach(button=>{
    button.classList.toggle('active', button.dataset.screen === screenId);
  });

  document.querySelectorAll('.screen').forEach(screen=>{
    screen.classList.toggle('active', screen.id === screenId);
  });
}

function setupScreens(){
  const buttons = Array.from(document.querySelectorAll('.screenButton'));
  buttons.forEach(button=>{
    button.type = 'button';
    button.addEventListener('click', event=>{
      event.preventDefault();
      showScreen(button.dataset.screen);
    });
  });
}

document.addEventListener('DOMContentLoaded',async ()=>{
  const data = await loadData();
  renderList(data);
  renderDashboard(data);
  setupFilter(data);
  setupScreens();
  showScreen('screenList');
});
