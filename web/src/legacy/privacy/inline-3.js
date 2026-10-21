
  /* the mobile bar needs a backdrop once the document scrolls under it */
  (function () {
    var bar = document.getElementById('mNavbar');
    if (!bar) return;
    function upd() { bar.classList.toggle('solid', window.scrollY > 10); }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  })();
