// Analytics. The app sends events with gtag('event', ...), which land in window.dataLayer.
// Option A (used now): Google Tag Manager container. Put the Google tag (your GA4 Measurement ID) inside the container.
// Option B: set GA_ID to load gtag.js directly, and leave GTM_ID empty.
// While both are empty, no analytics script is loaded at all.
window.LEARNOTE_GTM_ID = 'GTM-5GWB7M6W';
window.LEARNOTE_GA_ID = '';

(function () {
  var gtm = window.LEARNOTE_GTM_ID, ga = window.LEARNOTE_GA_ID;
  var useGtm = /^GTM-[A-Z0-9]{4,}$/.test(gtm || '');
  var useGa = !useGtm && /^G-[A-Z0-9]{6,}$/.test(ga || '');
  if (!useGtm && !useGa) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };

  var optedOut = false;
  try { var s = JSON.parse(localStorage.getItem('learnote.v1')); optedOut = !!(s && s.settings && s.settings.analytics === false); } catch (e) {}
  gtag('consent', 'default', { analytics_storage: optedOut ? 'denied' : 'granted' });

  var el = document.createElement('script');
  el.async = true;
  if (useGtm) {
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    el.src = 'https://www.googletagmanager.com/gtm.js?id=' + gtm;
  } else {
    gtag('js', new Date());
    gtag('config', ga, { send_page_view: false });
    el.src = 'https://www.googletagmanager.com/gtag/js?id=' + ga;
  }
  document.head.appendChild(el);
})();
