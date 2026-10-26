/* BEFORE THE FIRST PAINT, not after the main script parses the query string further down. Stamped here, the correct panel is
   the first one drawn; stamped later, every agency would see a beat of the buyer's photograph before it swapped. */
(function () {
  const agency = /(^|[?&])role=agency(&|$)/.test(location.search);
  document.documentElement.setAttribute('data-role', agency ? 'agency' : 'customer');
})();
