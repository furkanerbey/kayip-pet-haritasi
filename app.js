/* ---------- Supabase ---------- */
const SUPABASE_URL = "https://bgfpafluczyxrvbfvijg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZnBhZmx1Y3p5eHJ2YmZ2aWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjYyNDAsImV4cCI6MjA2NTkwMjI0MH0.IJiNbVTDjZeOyvaIeYvQJRE4EHbxPdVHF46DdKV74-s";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Harita & Katmanlar ---------- */
const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OSM" });
const sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" });
const map = L.map("map", { layers: [osm] }).setView([41.015, 28.979], 12);
L.control.layers({ OSM: osm, Uydu: sat }).addTo(map);

/* ---------- Marker-cluster ---------- */
const cluster = L.markerClusterGroup();
map.addLayer(cluster);

/* ---------- DOM ---------- */
const camBtn   = document.getElementById("camBtn");
const photoIn  = document.getElementById("photoInput");
const sendBtn  = document.getElementById("sendBtn");
const sendTxt  = sendBtn.querySelector("span");
const btnCreate= document.getElementById("btnCreate");
const btnBrowse= document.getElementById("btnBrowse");
const listBtn  = document.getElementById("listBtn");
const panel    = document.getElementById("panel");
const closePan = document.getElementById("closePanel");
const filterIn = document.getElementById("filter");
const listUl   = document.getElementById("list");
const locBtn   = document.getElementById("locBtn");
const confirm  = document.getElementById("confirm");
const addrTxt  = document.getElementById("addrText");
const okBtn    = document.getElementById("ok");
const cancelBtn= document.getElementById("cancel");
const modal    = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const modalAddr= document.getElementById("modalAddr");
const modalDate= document.getElementById("modalDate");
const modalClose=document.getElementById("modalClose");

/* ---------- Yardımcılar ---------- */
const setSend = (t,d)=>{sendTxt.textContent=t;sendBtn.disabled=d;};
btnCreate.onclick=()=>camBtn.click();
btnBrowse.onclick=()=>{panel.classList.add("open");renderList(reports);};

/* ---------- Reverse-geocode ---------- */
async function addrOf(lat,lon){
  const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=tr`;
  try{const r=await fetch(u);if(!r.ok) return"";const j=await r.json();
      return j.display_name.split(",")[0]||"";}catch{return"";}
}

/* ---------- Konum seçimi (ortak) ---------- */
let sel=null, selAddr="";
async function selectLocation(latlng){
  sel=latlng;
  addrTxt.textContent="Adres aranıyor…";
  confirm.classList.remove("hide");
  selAddr=await addrOf(sel.lat,sel.lng);
  addrTxt.textContent=selAddr?`Seçilen adres:\n${selAddr}`:"Adres bulunamadı.";
}
okBtn.onclick   =()=>{setSend("Gönder",false);confirm.classList.add("hide");};
cancelBtn.onclick=()=>{sel=null;selAddr="";confirm.classList.add("hide");};

/* ---------- Harita tıklaması ---------- */
map.on("click",e=>selectLocation(e.latlng));

/* ---------- “Konumum” düğmesi ---------- */
locBtn.onclick=()=>{
  if(!navigator.geolocation){
    alert("Tarayıcınız konum servisini desteklemiyor.");return;
  }
  if(location.protocol!=="https:" &&
     location.hostname!=="localhost" &&
     location.hostname!=="127.0.0.1"){
    alert("Konumu kullanmak için HTTPS veya localhost gerekir.");return;
  }
  navigator.geolocation.getCurrentPosition(
    pos=>{
      const {latitude:lat,longitude:lon}=pos.coords;
      map.setView([lat,lon],15);
      const me=L.circleMarker([lat,lon],
        {radius:6,color:"#1976d2",fillColor:"#2196f3",fillOpacity:.7})
        .addTo(map).bindPopup("Konumunuz").openPopup();
      /* Daireye tıklayınca da seçilsin */
      me.on("click",()=>selectLocation(me.getLatLng()));
      /* Konumu otomatik seçelim (tek tık yeter) */
      selectLocation({lat, lng:lon});
    },
    ()=>alert("Konum alınamadı veya izin verilmedi.")
  );
};

/* ---------- Liste & modal (değişmedi) ---------- */
const reports=[];
function showModal(r){
  modalImg.src=r.photourl;
  modalAddr.textContent=r.address||"Adres bulunamadı";
  modalDate.textContent=new Date(r.created_at).toLocaleString();
  modal.classList.remove("hide");
}
modalClose.onclick=()=>modal.classList.add("hide");
modal.onclick=e=>{if(e.target===modal) modal.classList.add("hide");};

function renderList(arr){
  listUl.innerHTML="";
  arr.forEach(r=>{
    const li=document.createElement("li");
    li.innerHTML=`<img src="${r.photourl}">
      <div><div>${(r.address||"-").slice(0,35)}</div>
      <div style="font-size:11px;color:#666">${new Date(r.created_at).toLocaleString()}</div></div>`;
    li.onclick=()=>{map.setView([r.lat,r.lon],16);showModal(r);};
    listUl.appendChild(li);
  });
}
listBtn.onclick =()=>{panel.classList.add("open");renderList(reports);};
closePan.onclick=()=>panel.classList.remove("open");
filterIn.oninput=()=>{
  const q=filterIn.value.toLowerCase();
  renderList(reports.filter(r=>
    r.address?.toLowerCase().includes(q)||
    new Date(r.created_at).toLocaleDateString().includes(q)));
};

/* ---------- Pin & cluster ---------- */
function addReport(r){
  const m=L.marker([r.lat,r.lon]).bindPopup(`<img src="${r.photourl}" width="130">`);
  m.on("click",()=>showModal(r));cluster.addLayer(m);reports.unshift(r);
}
(async()=>{
  const {data}=await sb.from("reports").select("*")
    .order("created_at",{ascending:false});
  data?.forEach(addReport);
})();
sb.channel("public:reports")
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"reports"},
      p=>addReport(p.new)).subscribe();

/* ---------- Fotoğraf gönder ---------- */
camBtn.onclick=()=>photoIn.click();
photoIn.onchange=()=>{if(photoIn.files.length) sendBtn.hidden=false;}

document.getElementById("reportForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!sel) return alert("Konum seçilmedi");
  const file=photoIn.files[0]; if(!file) return alert("Fotoğraf seçin");

  setSend("Yükleniyor…",true);
  const fn=Date.now()+"-"+file.name;
  const {data:up,error}=await sb.storage.from("pet-photos")
    .upload(fn,file,{contentType:file.type});
  if(error){alert("Yükleme hatası");return setSend("Gönder",false);}
  const url=sb.storage.from("pet-photos").getPublicUrl(up.path).data.publicUrl;

  await sb.from("reports").insert({lat:sel.lat,lon:sel.lng,photourl:url,address:selAddr});
  location.reload();
});
/* ---------- (üst kısımlar değişmedi) ---------- */

/* ---------- Toast yardımcıları ---------- */
const toast = document.getElementById("toast");
function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
}
function hideToast() {
  toast.className = "toast";
}

/* ---------- Fotoğraf gönder ---------- */
camBtn.onclick = () => photoIn.click();
photoIn.onchange = () => { if (photoIn.files.length) sendBtn.hidden = false; };

document.getElementById("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!sel)  return showToast("Önce konum seçin", "error");
  const file = photoIn.files[0];
  if (!file) return showToast("Fotoğraf seçin", "error");

  /* Yükleniyor göstergesi */
  showToast("Yükleniyor…");

  setSend("Yükleniyor…", true);
  const fn = Date.now() + "-" + file.name;
  const { data: up, error } = await sb.storage
    .from("pet-photos")
    .upload(fn, file, { contentType: file.type });

  if (error) {
    hideToast();
    setSend("Gönder", false);
    return showToast("Yükleme hatası", "error");
  }

  const url = sb.storage.from("pet-photos").getPublicUrl(up.path).data.publicUrl;
  const { error: dbErr } = await sb
    .from("reports")
    .insert({ lat: sel.lat, lon: sel.lng, photourl: url, address: selAddr });

  hideToast();
  if (dbErr) {
    setSend("Gönder", false);
    return showToast("Veritabanı hatası", "error");
  }

  showToast("Başarılı!", "success");
  setTimeout(() => location.reload(), 1200); /* 1,2 sn sonra yenile */
});

/* ---------- geri kalan kod (konum, liste, modal, cluster) aynı ---------- */