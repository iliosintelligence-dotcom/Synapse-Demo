/* What the map engine (inline-4.js) reads from the page's scope. These were top-level names in the old listing script
   (inline-3.js), which is React now (PropertyPage), so they are declared here, before the engine, and nowhere else. */
const PROP_ID = new URLSearchParams(window.location.search).get('id') || '';
const SUPABASE_URL = 'https://bhrhejpekmhbhwryjhgk.supabase.co';
const ANON_KEY = 'sb_publishable_D25gO3eui5oI4L3h7bx-vg_fCHbo3LV';
const esc = (t) => String(t == null ? '' : t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TITLE_LABEL = { c_of_o: 'Certificate of Occupancy', governors_consent: 'Governor’s Consent',
  registered_deed: 'Registered Deed', excision: 'Excision', gazette: 'Gazette', allocation: 'Allocation' };
