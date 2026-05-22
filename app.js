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

function normalizeChartValue(key, value){
  if(value===undefined || value===null) return '';
  const text = String(value).trim();
  if(/lymph.*vascular|vascular.*lymph/i.test(key)){
    if(/^\?{1,2}$/.test(text)) return 'N/A';
  }
  if(/ascites/i.test(key)){
    if(/^S\s*\+$/.test(text)) return 'S+';
    if(/^S\s*-\s*$/.test(text)) return 'S-';
  }
  if(/chemotherapy\s*response/i.test(key)){
    if(/^sensitive$/i.test(text)) return 'Sensitive';
    if(/^refractory$/i.test(text)) return 'Refractory';
  }
  if(/comorbidit/i.test(key)){
    if(/^n$/i.test(text) || /^none$/i.test(text)) return 'None';
    if(/^s$/i.test(text) || /^sim$/i.test(text)) return 'Yes';
    if(/^dm$/i.test(text)) return 'DM';
    if(/^has$/i.test(text)) return 'HAS';
    return text
      .split(/\s+/)
      .map(word=>{
        if(/^[A-Za-z]{1,3}$/.test(word)) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
  if(/other\s*cancer\s*diagnosis/i.test(key)){
    if(/^N\/?A$/i.test(text)) return 'N/A';
  }
  return text;
}

function tally(values, key){
  return values.reduce((acc,value)=>{
    const normalized = normalizeChartValue(key, value);
    if(normalized === '') return acc;
    acc[normalized] = (acc[normalized]||0)+1;
    return acc;
  }, {});
}

function tallyDelimitedValues(data, keys, separators=/[+,;|/]/, keyHint=''){
  const counts = {};
  data.forEach(item=>{
    const raw = valueByKeys(item, keys);
    if(!raw) return;
    raw.split(separators).map(v=>v.trim()).filter(Boolean).forEach(value=>{
      const normalized = normalizeChartValue(keyHint, value);
      if(!normalized) return;
      counts[normalized] = (counts[normalized]||0) + 1;
    });
  });
  return counts;
}

function getChartTypeForCount(count){
  if(count <= 4) return 'column';
  if(count <= 8) return 'pie';
  return 'bar';
}

function getChartOptionsForKey(key){
  if(/(CA19\.9|LDH|CEA|AFP|HCG)/i.test(key)){
    return {
      labelFontSize: 28,
      valueFontSize: 32,
      labelWrap: 14,
      rowHeight: 140,
      labelArea: 320,
      width: 900,
      chartRadius: 140,
      strokeWidth: 52,
      centerFontSize: 42,
      legendFontSize: '1.4rem'
    };
  }
  if(/tumor stage|estadio|^stage$/i.test(key)){
    return {
      labelFontSize: 20,
      valueFontSize: 24,
      labelWrap: 20,
      rowHeight: 120,
      labelArea: 300,
      width: 900,
      height: 520,
      chartRadius: 120,
      strokeWidth: 38,
      centerFontSize: 40,
      legendFontSize: '1.2rem',
      paddingTop: 44,
      paddingRight: 44,
      paddingBottom: 140,
      paddingLeft: 64
    };
  }
  return {};
}

function createCategoryCard(title, data, keys, options = {}){
  const counts = options.delimited
    ? tallyDelimitedValues(data, keys, options.separators, keys[0])
    : tally(data.map(item=>valueByKeys(item, keys)).filter(v=>v), keys[0]);
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
  const chartType = options.chartType || getChartTypeForCount(entries.length);
  const chartOptions = {...getChartOptionsForKey(options.chartKey || keys[0]), ...options};
  if(chartType === 'pie'){
    body.appendChild(createPieChartElement(label, entries, chartOptions));
  } else if(chartType === 'donut'){
    body.appendChild(createDonutChartElement(label, entries, chartOptions));
  } else if(chartType === 'column'){
    body.appendChild(createColumnChartElement(label, entries, data.length, chartOptions));
  } else {
    body.appendChild(createBarChartElement(label, entries, data.length, chartOptions));
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

function createDonutChartElement(title, counts, options = {}){
  const total = counts.reduce((sum,c)=>sum+c.value,0);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chartWrap = document.createElement('div');
  chartWrap.className = 'pie-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const radius = options.chartRadius || 86;
  const center = radius + 44;
  const size = center * 2;
  svg.setAttribute('viewBox',`0 0 ${size} ${size}`);
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ['#7a1b31','#b23a48','#d9826d','#f0b19d','#f6d8a8','#81a6c1','#5f7d8a','#3f5564'];

  counts.forEach((count,index)=>{
    const portion = count.value/total;
    const dash = circumference * portion;
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx',center);
    circle.setAttribute('cy',center);
    circle.setAttribute('r',radius);
    circle.setAttribute('fill','none');
    circle.setAttribute('stroke',colors[index % colors.length]);
    circle.setAttribute('stroke-width', options.strokeWidth || 26);
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
  label.setAttribute('y',center + 8);
  label.setAttribute('text-anchor','middle');
  label.setAttribute('fill','#7a1b31');
  label.setAttribute('font-size', options.centerFontSize || 26);
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
    labelText.style.fontSize = options.legendFontSize || '1.05rem';
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

function splitTextLines(text, maxCharsPerLine){
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    if(!current){
      current = word;
      return;
    }
    if((current + ' ' + word).length <= maxCharsPerLine){
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if(current) lines.push(current);
  return lines;
}

function createWrappedSvgText(text, x, y, maxCharsPerLine, anchor = 'start'){ 
  const lines = splitTextLines(text, maxCharsPerLine);
  const textEl = document.createElementNS('http://www.w3.org/2000/svg','text');
  textEl.classList.add('wrapped-label');
  textEl.setAttribute('x', x);
  textEl.setAttribute('y', y);
  textEl.setAttribute('text-anchor', anchor);
  textEl.setAttribute('fill', '#111');
  textEl.setAttribute('font-size', '18');
  textEl.setAttribute('font-weight', '600');
  textEl.setAttribute('dominant-baseline', 'hanging');
  lines.forEach((line, index) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg','tspan');
    tspan.setAttribute('x', x);
    tspan.setAttribute('dy', index === 0 ? '0' : '1.4em');
    tspan.textContent = line;
    textEl.appendChild(tspan);
  });
  return textEl;
}

function createBarChartElement(title, counts, total, options = {}){
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chart = document.createElement('div');
  chart.className = 'bar-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const maxValue = Math.max(...counts.map(c=>c.value),1);
  const rowHeight = options.rowHeight || 96;
  const labelArea = options.labelArea || 240;
  const width = options.width || 760;
  const height = counts.length * rowHeight + 60;
  const barMaxWidth = width - labelArea - 56;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio','xMinYMin meet');
  counts.forEach((count,index)=>{
    const y = index * rowHeight + 42;
    const barWidth = Math.max(24, Math.round((count.value / maxValue) * barMaxWidth));
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',labelArea);
    rect.setAttribute('y',y-22);
    rect.setAttribute('width',barWidth);
    rect.setAttribute('height',46);
    rect.setAttribute('fill','#7a1b31');
    rect.setAttribute('rx','16');
    svg.appendChild(rect);

    const label = createWrappedSvgText(count.label, 8, y - 28, options.labelWrap || 16, 'start');
    label.setAttribute('font-size', options.labelFontSize || 16);
    svg.appendChild(label);

    const valueLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    valueLabel.setAttribute('x',labelArea + barWidth + 16);
    valueLabel.setAttribute('y',y + 6);
    valueLabel.setAttribute('fill','#111');
    valueLabel.setAttribute('font-weight','700');
    valueLabel.setAttribute('font-size', options.valueFontSize || 18);
    valueLabel.setAttribute('dominant-baseline', 'middle');
    valueLabel.textContent = count.value;
    svg.appendChild(valueLabel);
  });
  chart.appendChild(svg);
  wrapper.appendChild(chart);
  return wrapper;
}

function createColumnChartElement(title, counts, total, options = {}){
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chart = document.createElement('div');
  chart.className = 'column-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const barCount = counts.length;
  const width = options.width || Math.max(520, barCount * 96);
  const height = options.height || 420;
  const padding = {top:options.paddingTop || 36,right:options.paddingRight || 36,bottom:options.paddingBottom || 120,left:options.paddingLeft || 52};
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...counts.map(c=>c.value),1);
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  svg.setAttribute('preserveAspectRatio','xMinYMin meet');
  const barWidth = Math.min(76, innerWidth / barCount - 12);
  const rotateLabels = barCount > 5;

  counts.forEach((count,index)=>{
    const x = padding.left + index * (innerWidth / barCount) + ((innerWidth / barCount) - barWidth) / 2;
    const barHeight = Math.round((count.value / maxValue) * innerHeight);
    const y = padding.top + innerHeight - barHeight;

    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',x);
    rect.setAttribute('y',y);
    rect.setAttribute('width',barWidth);
    rect.setAttribute('height',barHeight);
    rect.setAttribute('fill','#7a1b31');
    rect.setAttribute('rx','10');
    svg.appendChild(rect);

    const valueLabel = document.createElementNS('http://www.w3.org/2000/svg','text');
    valueLabel.setAttribute('x',x + barWidth / 2);
    valueLabel.setAttribute('y',y - 12);
    valueLabel.setAttribute('text-anchor','middle');
    valueLabel.setAttribute('fill','#111');
    valueLabel.setAttribute('font-size', options.valueFontSize || 16);
    valueLabel.setAttribute('font-weight','700');
    valueLabel.setAttribute('dominant-baseline', 'middle');
    valueLabel.textContent = count.value;
    svg.appendChild(valueLabel);

    if(rotateLabels) {
      const label = document.createElementNS('http://www.w3.org/2000/svg','text');
      const labelX = x + barWidth / 2;
      const labelY = height - 22;
      label.setAttribute('x',labelX);
      label.setAttribute('y',labelY);
      label.setAttribute('text-anchor','end');
      label.setAttribute('fill','#111');
      label.setAttribute('font-size', options.labelFontSize || 14);
      label.setAttribute('transform',`rotate(-45 ${labelX} ${labelY})`);
      label.textContent = count.label;
      svg.appendChild(label);
    } else {
      const labelFontSize = options.labelFontSize || 14;
      const lines = splitTextLines(count.label, options.labelWrap || 14);
      const lineHeight = labelFontSize * 1.4;
      const labelY = height - padding.bottom - Math.max(0, lines.length - 1) * lineHeight - 8;
      const label = createWrappedSvgText(count.label, x + barWidth / 2, labelY, options.labelWrap || 14, 'middle');
      label.setAttribute('font-size', labelFontSize);
      svg.appendChild(label);
    }
  });

  const axis = document.createElementNS('http://www.w3.org/2000/svg','line');
  axis.setAttribute('x1',padding.left);
  axis.setAttribute('y1',padding.top + innerHeight);
  axis.setAttribute('x2',width - padding.right);
  axis.setAttribute('y2',padding.top + innerHeight);
  axis.setAttribute('stroke','#ccc');
  axis.setAttribute('stroke-width','1');
  svg.appendChild(axis);

  chart.appendChild(svg);
  wrapper.appendChild(chart);
  return wrapper;
}

function createPieChartElement(title, counts, options = {}){
  const total = counts.reduce((sum,c)=>sum+c.value,0);
  const wrapper = document.createElement('div');
  wrapper.className = 'card-body';
  const chartWrap = document.createElement('div');
  chartWrap.className = 'pie-chart';
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  const radius = options.chartRadius || 96;
  const center = radius + 24;
  const size = center * 2;
  svg.setAttribute('viewBox',`0 0 ${size} ${size}`);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const colors = ['#7a1b31','#b23a48','#d9826d','#f0b19d','#f6d8a8','#81a6c1','#5f7d8a','#3f5564'];

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
    circle.setAttribute('stroke-width', options.strokeWidth || 34);
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
    label.style.fontSize = options.legendFontSize || '1rem';
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
  const histologyKeys = ['Histological Type','Histologia','HistologicalType','Histological Type'];
  const tumorGradeKeys = ['Tumor Grade','Grau do Tumor','TumorGrade','Tumor Grade'];
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
    ageCard.appendChild(createColumnChartElement('Distribuição de idade', ageBuckets, ages.length));
  } else {
    ageCard.innerHTML += '<div class="empty-state">Não foi possível extrair valores de idade.</div>';
  }
  makeCardExpandable(ageCard);
  dashboard.appendChild(ageCard);

  const stageCard = createCategoryCard('Tumor Stage', data, stageKeys, {
    chartType: 'column',
    width: 900,
    height: 520,
    rowHeight: 120,
    labelArea: 300,
    labelFontSize: 20,
    valueFontSize: 24
  });
  dashboard.appendChild(stageCard);

  const histologyCard = createCategoryCard('Histological Type', data, histologyKeys);
  dashboard.appendChild(histologyCard);

  const tumorGradeCard = createCategoryCard('Tumor Grade', data, tumorGradeKeys);
  dashboard.appendChild(tumorGradeCard);

  const ethnicityCard = createCategoryCard('Ethnicity', data, ethnicityKeys);
  dashboard.appendChild(ethnicityCard);

  const raceCard = createCategoryCard('Race', data, raceKeys);
  dashboard.appendChild(raceCard);

  const comorbidityCard = createCategoryCard('Comorbidities', data, comorbidityKeys, {chartType:'donut'});
  dashboard.appendChild(comorbidityCard);

  const platinumCard = createCategoryCard('Platinum', data, platinumKeys);
  dashboard.appendChild(platinumCard);

  const tumorMarkerKeys = ['CA19.9','CEA','LDH','AFP','HCG'];
  const knownKeys = [...ageKeys, ...stageKeys, ...histologyKeys, ...tumorGradeKeys, ...ethnicityKeys, ...raceKeys, ...comorbidityKeys, ...platinumKeys, ...tumorMarkerKeys];
  const genericKeys = Array.from(new Set(data.flatMap(Object.keys)))
    .filter(key=>!knownKeys.includes(key))
    .filter(key=>!/url|image|img|path|arquivo/i.test(key))
    .filter(key=>!/death|deaht|dte|recurrence|recurrencia|date.*death|death.*date|date.*recurrence|recurrence.*date/i.test(key));

  genericKeys.forEach(key=>{
    const values = data.map(item=>valueByKeys(item,[key])).filter(v=>v);
    const uniqueValues = Array.from(new Set(values));
    if(!values.length || uniqueValues.length < 2 || uniqueValues.length > 20) return;
    const counts = tally(values, key);
    const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
    const chartOptions = getChartOptionsForKey(key);
    const card = document.createElement('div');
    card.className = 'dashboard-card expandable';
    const heading = document.createElement('h3');
    heading.textContent = key;
    card.appendChild(heading);
    const hint = document.createElement('div');
    hint.className = 'expand-hint';
    hint.textContent = 'Clique para ampliar';
    card.appendChild(hint);
    const chartType = getChartTypeForCount(entries.length);
    if(chartType === 'pie'){
      card.appendChild(createPieChartElement(`${key} por contagem`, entries, chartOptions));
    } else if(chartType === 'column'){
      card.appendChild(createColumnChartElement(`${key} por contagem`, entries, data.length, chartOptions));
    } else {
      card.appendChild(createBarChartElement(`${key} por contagem`, entries, data.length, chartOptions));
    }
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
