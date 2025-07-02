/* ─────────────────  SPLASH  ───────────────── */
const splash = document.getElementById('splash');
if (splash) {
  splash.addEventListener('click', () => {
    splash.classList.add('fade');
    setTimeout(() => splash.remove(), 400);
  });
}

/* ─────────────────  TOAST  ───────────────── */
const toast = document.getElementById('toast');
function showToast(msg, type = "") {
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  
  // Auto hide after 3 seconds
  setTimeout(() => hideToast(), 3000);
}

function hideToast() {
  if (!toast) return;
  toast.className = "toast";
}

/* ─────────────────  SUPABASE  ───────────────── */
let sb;
try {
  if (typeof supabase !== 'undefined' && SUPABASE_CONFIG.url && SUPABASE_CONFIG.key) {
    sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
  } else {
    console.error('Supabase yapılandırması eksik');
    showToast('Veritabanı bağlantısı kurulamadı', 'error');
  }
} catch (error) {
  console.error('Supabase bağlantı hatası:', error);
  showToast('Veritabanı bağlantı hatası', 'error');
}

/* ─────────────────  HARİTA  ───────────────── */
let map, cluster, osm, sat;

function initializeMap() {
  try {
    osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    });
    
    sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri" }
    );

    map = L.map("map", { 
      layers: [osm],
      zoomControl: true
    }).setView([41.015, 28.979], 12);
    
    L.control.layers({ 
      "OpenStreetMap": osm, 
      "Uydu": sat 
    }).addTo(map);

    // Marker cluster
    cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50
    });
    map.addLayer(cluster);

    // Map click event
    map.on("click", e => selectLocation(e.latlng));
    
  } catch (error) {
    console.error('Harita başlatma hatası:', error);
    showToast('Harita yüklenemedi', 'error');
  }
}

/* ─────────────────  DOM ELEMENTS  ───────────────── */
const camBtn = document.getElementById("camBtn");
const photoIn = document.getElementById("photoInput");
const sendBtn = document.getElementById("sendBtn");
const sendTxt = sendBtn?.querySelector("span");
const btnCreate = document.getElementById("btnCreate");
const btnBrowse = document.getElementById("btnBrowse");
const listBtn = document.getElementById("listBtn");
const panel = document.getElementById("panel");
const closePan = document.getElementById("closePanel");
const filterIn = document.getElementById("filter");
const listUl = document.getElementById("list");
const locBtn = document.getElementById("locBtn");
const confirm = document.getElementById("confirm");
const addrTxt = document.getElementById("addrText");
const okBtn = document.getElementById("ok");
const cancelBtn = document.getElementById("cancel");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const modalAddr = document.getElementById("modalAddr");
const modalDate = document.getElementById("modalDate");
const modalClose = document.getElementById("modalClose");

/* Helper functions */
const setSend = (txt, dis) => {
  if (sendTxt) sendTxt.textContent = txt;
  if (sendBtn) sendBtn.disabled = dis;
};

/* Event Listeners */
if (btnCreate) btnCreate.onclick = () => camBtn?.click();
if (btnBrowse) btnBrowse.onclick = () => {
  panel?.classList.add("open");
  renderList(reports);
};

/* ─────────────────  REVERSE-GEOCODE  ───────────────── */
async function addrOf(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=tr`;
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const data = await response.json();
    return data.display_name?.split(",")[0] || "";
  } catch (error) {
    console.error('Geocoding hatası:', error);
    return "";
  }
}

/* ─────────────────  KONUM SEÇİMİ  ───────────────── */
let selectedLocation = null;
let selectedAddress = "";

async function selectLocation(latlng) {
  selectedLocation = latlng;
  if (addrTxt) addrTxt.textContent = "Adres aranıyor…";
  confirm?.classList.remove("hide");
  
  selectedAddress = await addrOf(latlng.lat, latlng.lng);
  if (addrTxt) {
    addrTxt.textContent = selectedAddress ? 
      `Seçilen adres:\n${selectedAddress}` : 
      "Adres bulunamadı.";
  }
}

if (okBtn) {
  okBtn.onclick = () => {
    setSend("Gönder", false);
    confirm?.classList.add("hide");
  };
}

if (cancelBtn) {
  cancelBtn.onclick = () => {
    selectedLocation = null;
    selectedAddress = "";
    confirm?.classList.add("hide");
  };
}

/* ── "Konumum" butonu ── */
if (locBtn) {
  locBtn.onclick = () => {
    if (!navigator.geolocation) {
      return showToast("Tarayıcınız konum desteklemiyor", "error");
    }

    if (location.protocol !== "https:" &&
        location.hostname !== "localhost" &&
        location.hostname !== "127.0.0.1") {
      return showToast("Konum için HTTPS veya localhost gerekli", "error");
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        map.setView([lat, lon], 15);
        
        const userMarker = L.circleMarker([lat, lon], {
          radius: 8,
          color: "#1976d2",
          fillColor: "#2196f3",
          fillOpacity: 0.7,
          weight: 2
        }).addTo(map).bindPopup("Konumunuz").openPopup();
        
        userMarker.on("click", () => selectLocation(userMarker.getLatLng()));
        selectLocation({ lat, lng: lon });
      },
      error => {
        console.error('Konum hatası:', error);
        showToast("Konum alınamadı veya izin verilmedi", "error");
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };
}

/* ─────────────────  LİSTE & MODAL  ───────────────── */
const reports = [];

function showModal(report) {
  if (!modal || !modalImg || !modalAddr || !modalDate) return;
  
  modalImg.src = report.photourl;
  modalImg.alt = "Kayıp pet fotoğrafı";
  modalAddr.textContent = report.address || "Adres bulunamadı";
  modalDate.textContent = new Date(report.created_at).toLocaleString('tr-TR');
  modal.classList.remove("hide");
}

if (modalClose) {
  modalClose.onclick = () => modal?.classList.add("hide");
}

if (modal) {
  modal.onclick = e => {
    if (e.target === modal) modal.classList.add("hide");
  };
}

function renderList(arr) {
  if (!listUl) return;
  
  listUl.innerHTML = "";
  arr.forEach(report => {
    const li = document.createElement("li");
    li.innerHTML = `
      <img src="${report.photourl}" alt="Pet" loading="lazy">
      <div>
        <div>${(report.address || "Adres bulunamadı").slice(0, 35)}</div>
        <div style="font-size:11px;color:#666">
          ${new Date(report.created_at).toLocaleString('tr-TR')}
        </div>
      </div>`;
    
    li.onclick = () => {
      if (map) map.setView([report.lat, report.lon], 16);
      showModal(report);
      panel?.classList.remove("open");
    };
    
    listUl.appendChild(li);
  });
}

if (listBtn) {
  listBtn.onclick = () => {
    panel?.classList.add("open");
    renderList(reports);
  };
}

if (closePan) {
  closePan.onclick = () => panel?.classList.remove("open");
}

if (filterIn) {
  filterIn.oninput = () => {
    const query = filterIn.value.toLowerCase();
    const filtered = reports.filter(report =>
      report.address?.toLowerCase().includes(query) ||
      new Date(report.created_at).toLocaleDateString('tr-TR').includes(query)
    );
    renderList(filtered);
  };
}

/* ─────────────────  PIN & CLUSTER  ───────────────── */
function addReport(report) {
  if (!map || !cluster) return;
  
  try {
    const marker = L.marker([report.lat, report.lon])
      .bindPopup(`
        <div style="text-align: center;">
          <img src="${report.photourl}" width="150" style="border-radius: 4px;" alt="Pet">
          <div style="margin-top: 8px; font-size: 12px;">
            ${report.address || 'Adres bulunamadı'}
          </div>
        </div>
      `);
    
    marker.on("click", () => showModal(report));
    cluster.addLayer(marker);
    reports.unshift(report);
  } catch (error) {
    console.error('Marker ekleme hatası:', error);
  }
}

/* ─────────────────  VERİ YÜKLEME  ───────────────── */
async function loadReports() {
  if (!sb) return;
  
  try {
    const { data, error } = await sb
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error('Veri yükleme hatası:', error);
      showToast('Veriler yüklenemedi', 'error');
      return;
    }
    
    data?.forEach(addReport);
  } catch (error) {
    console.error('Veri yükleme hatası:', error);
    showToast('Veriler yüklenemedi', 'error');
  }
}

/* ─────────────────  REAL-TIME UPDATES  ───────────────── */
function setupRealTimeUpdates() {
  if (!sb) return;
  
  try {
    sb.channel("public:reports")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "reports"
      }, payload => {
        addReport(payload.new);
        showToast('Yeni kayıp pet bildirimi!', 'success');
      })
      .subscribe();
  } catch (error) {
    console.error('Real-time bağlantı hatası:', error);
  }
}

/* ─────────────────  FOTOĞRAF GÖNDERİM  ───────────────── */
if (camBtn) {
  camBtn.onclick = () => photoIn?.click();
}

if (photoIn) {
  photoIn.onchange = () => {
    if (photoIn.files.length && sendBtn) {
      sendBtn.hidden = false;
    }
  };
}

const reportForm = document.getElementById("reportForm");
if (reportForm) {
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!selectedLocation) {
      return showToast("Önce haritadan konum seçin", "error");
    }
    
    const file = photoIn?.files[0];
    if (!file) {
      return showToast("Lütfen fotoğraf seçin", "error");
    }
    
    if (!sb) {
      return showToast("Veritabanı bağlantısı yok", "error");
    }

    showToast("Yükleniyor…");
    setSend("Yükleniyor…", true);

    try {
      // Upload photo
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await sb.storage
        .from("pet-photos")
        .upload(fileName, file, { 
          contentType: file.type,
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Fotoğraf yükleme hatası: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = sb.storage
        .from("pet-photos")
        .getPublicUrl(uploadData.path);

      // Insert report
      const { error: dbError } = await sb
        .from("reports")
        .insert({
          lat: selectedLocation.lat,
          lon: selectedLocation.lng,
          photourl: urlData.publicUrl,
          address: selectedAddress
        });

      if (dbError) {
        throw new Error(`Veritabanı hatası: ${dbError.message}`);
      }

      hideToast();
      showToast("Başarıyla gönderildi!", "success");
      
      // Reset form
      setTimeout(() => {
        if (photoIn) photoIn.value = '';
        if (sendBtn) sendBtn.hidden = true;
        selectedLocation = null;
        selectedAddress = "";
        setSend("Gönder", true);
      }, 1500);

    } catch (error) {
      console.error('Gönderim hatası:', error);
      hideToast();
      setSend("Gönder", false);
      showToast(error.message || "Gönderim hatası", "error");
    }
  });
}

/* ─────────────────  INITIALIZATION  ───────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initializeMap();
  loadReports();
  setupRealTimeUpdates();
});