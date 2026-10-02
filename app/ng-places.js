/* ─────────────────────────────────────────────────────────────────────────────
   Synapse — Nigerian places, for filling a listing without typing.

   State, city and area were three free-text boxes. That meant "Lagos", "lagos",
   "Lagos State" and "LAG" were four different cities as far as search, matching
   and the map were concerned — and an agency posting its first property had to
   type all three from memory.

   WHY STATE IS A HARD SELECT AND THE OTHERS ARE NOT.
   There are exactly 36 states and the FCT. That list does not change, so any
   value outside it is a mistake and the control should refuse it.

   Cities and areas are the opposite: Nigeria has thousands of towns and every
   neighbourhood name below is a convenience, not a register. A hard select
   would block a legitimate listing in a town we forgot, which is a worse
   failure than an inconsistent spelling. Both are therefore type-ahead —
   suggestions that fill themselves in, with typing still allowed.

   The area lists cover the cities this product actually serves. Everywhere
   else falls back to the city list alone, and the agency types the area, which
   is honest: inventing neighbourhood names for a town we have never listed in
   would put words in an agent's mouth about their own city.
   ──────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* 36 states plus the Federal Capital Territory, alphabetical. */
  var STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
    'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
    'Federal Capital Territory', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
    'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
    'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe',
    'Zamfara',
  ];

  /* Main towns per state — the capital first, then the places somebody would
     plausibly list a home in. Not exhaustive by design. */
  var CITIES = {
    'Abia': ['Umuahia', 'Aba', 'Ohafia', 'Arochukwu'],
    'Adamawa': ['Yola', 'Mubi', 'Numan', 'Jimeta'],
    'Akwa Ibom': ['Uyo', 'Eket', 'Ikot Ekpene', 'Oron'],
    'Anambra': ['Awka', 'Onitsha', 'Nnewi', 'Ekwulobia'],
    'Bauchi': ['Bauchi', 'Azare', 'Misau', 'Jama’are'],
    'Bayelsa': ['Yenagoa', 'Ogbia', 'Sagbama', 'Brass'],
    'Benue': ['Makurdi', 'Gboko', 'Otukpo', 'Katsina-Ala'],
    'Borno': ['Maiduguri', 'Biu', 'Bama', 'Dikwa'],
    'Cross River': ['Calabar', 'Ugep', 'Ogoja', 'Ikom'],
    'Delta': ['Asaba', 'Warri', 'Sapele', 'Ughelli', 'Agbor'],
    'Ebonyi': ['Abakaliki', 'Afikpo', 'Onueke'],
    'Edo': ['Benin City', 'Auchi', 'Ekpoma', 'Uromi'],
    'Ekiti': ['Ado-Ekiti', 'Ikere-Ekiti', 'Oye-Ekiti'],
    'Enugu': ['Enugu', 'Nsukka', 'Oji River', 'Awgu'],
    'Federal Capital Territory': ['Abuja', 'Gwagwalada', 'Kuje', 'Bwari', 'Kubwa'],
    'Gombe': ['Gombe', 'Kaltungo', 'Billiri'],
    'Imo': ['Owerri', 'Orlu', 'Okigwe'],
    'Jigawa': ['Dutse', 'Hadejia', 'Gumel'],
    'Kaduna': ['Kaduna', 'Zaria', 'Kafanchan', 'Zonkwa'],
    'Kano': ['Kano', 'Wudil', 'Gaya', 'Rano'],
    'Katsina': ['Katsina', 'Daura', 'Funtua', 'Malumfashi'],
    'Kebbi': ['Birnin Kebbi', 'Argungu', 'Yauri'],
    'Kogi': ['Lokoja', 'Okene', 'Idah', 'Kabba'],
    'Kwara': ['Ilorin', 'Offa', 'Jebba', 'Omu-Aran'],
    'Lagos': ['Lagos', 'Ikeja', 'Epe', 'Badagry', 'Ikorodu'],
    'Nasarawa': ['Lafia', 'Keffi', 'Akwanga', 'Karu'],
    'Niger': ['Minna', 'Suleja', 'Bida', 'Kontagora'],
    'Ogun': ['Abeokuta', 'Ijebu-Ode', 'Sagamu', 'Ota', 'Ilaro'],
    'Ondo': ['Akure', 'Ondo', 'Owo', 'Okitipupa'],
    'Osun': ['Osogbo', 'Ile-Ife', 'Ilesa', 'Ede'],
    'Oyo': ['Ibadan', 'Ogbomoso', 'Oyo', 'Iseyin', 'Saki'],
    'Plateau': ['Jos', 'Bukuru', 'Pankshin', 'Shendam'],
    'Rivers': ['Port Harcourt', 'Bonny', 'Omoku', 'Bori'],
    'Sokoto': ['Sokoto', 'Tambuwal', 'Illela'],
    'Taraba': ['Jalingo', 'Wukari', 'Bali'],
    'Yobe': ['Damaturu', 'Potiskum', 'Nguru'],
    'Zamfara': ['Gusau', 'Kaura Namoda', 'Talata Mafara'],
  };

  /* Areas, for the cities this product serves. Keyed by city. */
  var AREAS = {
    'Lagos': [
      'Lekki Phase 1', 'Lekki Phase 2', 'Ikoyi', 'Victoria Island', 'Ikeja GRA',
      'Ajah', 'Sangotedo', 'Yaba', 'Surulere', 'Maryland', 'Magodo', 'Gbagada',
      'Ogudu', 'Oniru', 'Chevron', 'Ilupeju', 'Anthony', 'Festac', 'Apapa',
      'Ogba', 'Agege', 'Isolo', 'Ikotun', 'Ojodu Berger', 'Ibeju-Lekki',
    ],
    'Ikeja': ['Ikeja GRA', 'Allen Avenue', 'Opebi', 'Oregun', 'Alausa', 'Ogba'],
    'Abuja': [
      'Maitama', 'Asokoro', 'Wuse 2', 'Wuse', 'Garki', 'Jabi', 'Utako', 'Gwarinpa',
      'Life Camp', 'Katampe', 'Guzape', 'Lokogoma', 'Lugbe', 'Apo', 'Durumi',
      'Jahi', 'Kado', 'Mabushi', 'Wuye', 'Galadimawa',
    ],
    'Ibadan': [
      'Bodija', 'Old Bodija', 'New Bodija', 'Jericho', 'Akobo', 'Agodi GRA',
      'Ikolaba', 'Samonda', 'Mokola', 'Ring Road', 'Challenge', 'Apata',
      'Eleyele', 'Oluyole', 'Alalubosa', 'Agbowo', 'Sango', 'Iwo Road',
      'Basorun', 'Ashi', 'Idi-Ishin', 'Kolapo Ishola GRA',
    ],
    'Port Harcourt': [
      'GRA Phase 1', 'GRA Phase 2', 'GRA Phase 3', 'Trans-Amadi', 'Rumuokoro',
      'Rumuola', 'Woji', 'Ada George', 'Eliozu', 'Peter Odili Road', 'D-Line',
    ],
    'Benin City': ['GRA', 'Ugbowo', 'Sapele Road', 'Ikpoba Hill', 'Ekenwan'],
    'Enugu': ['Independence Layout', 'GRA', 'New Haven', 'Trans-Ekulu', 'Achara Layout'],
    'Kano': ['Nassarawa GRA', 'Bompai', 'Sabon Gari', 'Farm Centre'],
    'Kaduna': ['Barnawa', 'Malali', 'Ungwan Rimi', 'Kawo', 'Sabon Tasha'],
    'Uyo': ['Ewet Housing', 'Osongama', 'Shelter Afrique', 'Nwaniba Road'],
    'Asaba': ['Okpanam Road', 'Summit Road', 'Infant Jesus', 'Cable Point'],
    'Warri': ['Effurun', 'Airport Road', 'Enerhen', 'Jakpa Road'],
    'Abeokuta': ['Oke-Ilewo', 'Ibara GRA', 'Asero', 'Kobape'],
    'Akure': ['Alagbaka', 'Ijapo Estate', 'Oba-Ile', 'FUTA Area'],
    'Ilorin': ['GRA', 'Tanke', 'Fate Road', 'Basin'],
    'Jos': ['Rayfield', 'Jos GRA', 'Bukuru', 'Lamingo'],
    'Osogbo': ['Oke-Fia', 'Ilesa Road', 'Dada Estate'],
    'Awka': ['Ifite', 'Amaenyi', 'Udoka Estate'],
    'Onitsha': ['GRA', 'Awka Road', 'Nkpor'],
    'Owerri': ['New Owerri', 'Ikenegbu', 'Aladinma', 'World Bank'],
  };

  /** The state a city sits in, so choosing the city can fill the state in. */
  var STATE_OF = {};
  Object.keys(CITIES).forEach(function (st) {
    CITIES[st].forEach(function (c) { if (!STATE_OF[c]) STATE_OF[c] = st; });
  });

  function citiesIn(state) { return (CITIES[state] || []).slice(); }

  /** Areas for a city, plus anything already listed there. */
  function areasIn(city, extra) {
    var base = (AREAS[city] || []).slice();
    (extra || []).forEach(function (a) {
      if (a && base.indexOf(a) === -1) base.push(a);
    });
    return base;
  }

  /* Every city we know, for when no state is chosen yet. Typing the city first
     is a perfectly reasonable order and should not be punished. */
  function allCities() {
    var out = [];
    Object.keys(CITIES).forEach(function (st) {
      CITIES[st].forEach(function (c) { if (out.indexOf(c) === -1) out.push(c); });
    });
    return out.sort();
  }

  /* WHAT IS ALREADY IN THE DATABASE.
     The same state is stored as "Oyo" on one listing and "Oyo state" on six
     others -- which is the whole argument for a select, and also a problem the
     select creates if ignored: an existing value that does not match an option
     leaves the control blank, and saving then wipes the state off a listing
     that had one.

     So a stored value is mapped onto the canonical list before the select is
     set: trailing "state", case and spacing are all forgiven. Anything that
     still does not match is returned as-is and the agency picks. */
  function canonicalState(raw) {
    var v = String(raw || '').trim();
    if (!v) return '';
    var probe = v.toLowerCase().replace(/\s+state$/, '').replace(/\s+/g, ' ').trim();
    for (var i = 0; i < STATES.length; i++) {
      var st = STATES[i].toLowerCase();
      if (st === probe) return STATES[i];
    }
    /* The FCT goes by several names in the wild. */
    if (/^(fct|abuja|federal capital)/.test(probe)) return 'Federal Capital Territory';
    return v;
  }

  window.SynPlaces = {
    canonicalState: canonicalState,
    STATES: STATES,
    citiesIn: citiesIn,
    areasIn: areasIn,
    allCities: allCities,
    stateOf: function (city) { return STATE_OF[city] || ''; },
  };
})();
