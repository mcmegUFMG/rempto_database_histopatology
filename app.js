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
  const candidates = keys.filter(k=>/url|image|img|thumb|path/i.test(k));
  return candidates.length?candidates[0]:null;
}

function renderList(data){
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.forEach((item,idx)=>{
    const li = document.createElement('li');
    li.textContent = item.title || item.ID || item.id || item.Name || item.name || (`Item ${idx+1}`);
    li.addEventListener('click',()=>showDetail(item));
    list.appendChild(li);
  });
}

function showDetail(item){
  const meta = document.getElementById('meta');
  meta.innerHTML = '';
  Object.entries(item).forEach(([k,v])=>{
    const div = document.createElement('div');
    div.className = 'field';
    div.innerHTML = `<strong>${k}:</strong> ${v===null?'':escapeHtml(String(v))}`;
    meta.appendChild(div);
  });

  const imageKey = detectImageKey(item);
  const imgCont = document.getElementById('imageContainer');
  imgCont.innerHTML = '';
  if(imageKey && item[imageKey]){
    const img = document.createElement('img');
    img.src = item[imageKey];
    img.alt = 'image';
    imgCont.appendChild(img);
  }
}

function escapeHtml(s){return s.replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]})}

function setupFilter(data){
  const input = document.getElementById('filter');
  input.addEventListener('input',()=>{
    const q = input.value.trim().toLowerCase();
    const filtered = data.filter(item=>JSON.stringify(item).toLowerCase().includes(q));
    renderList(filtered);
  });
}

document.addEventListener('DOMContentLoaded',async ()=>{
  const data = await loadData();
  renderList(data);
  setupFilter(data);
});
