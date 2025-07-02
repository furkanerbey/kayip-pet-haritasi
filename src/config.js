// Supabase yapılandırması
// Bu dosyayı .env dosyasından okuyacak şekilde güncelleyin
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL_HERE',
  key: 'YOUR_SUPABASE_ANON_KEY_HERE'
};

// Eğer environment variables varsa onları kullan
if (typeof process !== 'undefined' && process.env) {
  SUPABASE_CONFIG.url = process.env.SUPABASE_URL || SUPABASE_CONFIG.url;
  SUPABASE_CONFIG.key = process.env.SUPABASE_ANON_KEY || SUPABASE_CONFIG.key;
}