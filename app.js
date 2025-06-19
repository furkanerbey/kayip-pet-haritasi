// Supabase ayarları (değiştir)
const SUPABASE_URL = 'https://bgfpafluczyxrvbfvijg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZnBhZmx1Y3p5eHJ2YmZ2aWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzMjYyNDAsImV4cCI6MjA2NTkwMjI0MH0.IJiNbVTDjZeOyvaIeYvQJRE4EHbxPdVHF46DdKV74-s';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Harita başlangıcı
const map = L.map('map').setView([41.015137, 28.979530], 12); // İstanbul merkez
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Haritaya marker ekleme
function addMarker(report) {
  const { lat, lon, photourl } = report;
  const marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(`<img src="${photourl}" alt="pet" style="width:150px" />`);
}

// Var olan raporları getir
(async () => {
  const { data, error } = await supabase.from('reports').select('*');
  if (error) {
    console.error(error);
    return;
  }
  data.forEach(addMarker);
})();

// Realtime dinleme
supabase
  .channel('public:reports')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, payload => {
    addMarker(payload.new);
  })
  .subscribe();

// Form submit
const form = document.getElementById('reportForm');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // Konum al
  if (!navigator.geolocation) {
    alert('Konum servislerine erişilemiyor');
    return;
  }
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const fileInput = document.getElementById('photoInput');
    const file = fileInput.files[0];
    if (!file) return;

    // Fotoğrafı yükle
    const filename = Date.now() + '-' + file.name;
    const { data: uploadData, error: uploadErr } = await supabase
      .storage
      .from('pet-photos')
      .upload(filename, file, { contentType: file.type });

    if (uploadErr) {
      alert('Fotoğraf yüklenemedi');
      console.error(uploadErr);
      return;
    }

    const { data: urlData } = supabase.storage.from('pet-photos').getPublicUrl(uploadData.path);
    const photourl = urlData.publicUrl;

    const { latitude: lat, longitude: lon } = pos.coords;

    // Veritabanına ekle
    const { error: insertErr } = await supabase.from('reports').insert({ lat, lon, photourl });
    if (insertErr) {
      alert('Kayıt eklenemedi');
      console.error(insertErr);
      return;
    }

    fileInput.value = '';
  }, () => {
    alert('Konum alınamadı');
  });
};
