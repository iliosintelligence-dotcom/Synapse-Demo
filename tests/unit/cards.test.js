// Checks for the card renderer's safety rules (from the Greptile audit):
// ids cannot break out of attributes, unknown status is never 'Verified', and
// only https links are rendered. Run: node tests/unit/cards.test.js
const fs = require('fs');
const root = require('path').join(__dirname, '..', '..', 'app') + '/';
global.window = { addEventListener() {}, SynIcons: null, location: { pathname: '/app/browse.html' } };
global.document = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; }, createElement() { return {}; } };
global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
global.location = window.location; global.navigator = {};
new Function(fs.readFileSync(root + 'matches-shared.js', 'utf8'))();
const M = window.SynMatches;
const results = [];
const ok = (name, cond) => results.push((cond ? 'PASS ' : 'FAIL ') + name);

const evil = M.listingCardHtml({ id: 'x" onmouseover="alert(1)', ttl: 'T', loc: 'L', priceN: 1, vstatus: 'verified' }, 0,
  { saves: new Set(), picked: new Set(), compare: true });
ok('hostile id cannot break out of an attribute', !/data-(id|save|cmp)="x" onmouseover/.test(evil) && evil.includes('&quot;'));

const unknown = M.listingCardHtml({ id: 'a1', ttl: 'T', loc: 'L', priceN: 1 }, 0, { saves: new Set(), picked: new Set() });
ok('unknown status is not drawn as Verified', !/chip-pass/.test(unknown) && /Not verified/.test(unknown));
ok('explicit verified still shows Verified', /chip-pass/.test(M.listingCardHtml({ id: 'a2', ttl: 'T', loc: 'L', priceN: 1, vstatus: 'verified' }, 0, { saves: new Set(), picked: new Set() })));

ok('returned id with quotes is replaced', M.shapeTojuMatch({ id: 'a"b' }, 3).id === 'r3');
ok('normal uuid id is kept', M.shapeTojuMatch({ id: '6a4d2d33-8bf4-491a-97bb-a00b987a6326' }, 0).id === '6a4d2d33-8bf4-491a-97bb-a00b987a6326');

// the price-history link filter, as written in toju.html
const okUrl = (u) => /^https:\/\/[^\s"'<>]+$/i.test(String(u || ''));
ok('javascript: source link rejected', !okUrl('javascript:alert(1)'));
ok('https source link kept', okUrl('https://example.com/report'));

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
