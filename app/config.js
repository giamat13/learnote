// Google Analytics 4. Replace the placeholder with your Measurement ID (G-XXXXXXXXXX).
// While it is the placeholder, no analytics script is loaded at all.
window.LEARNOTE_GA_ID = 'G-XXXXXXXXXX';

(function () {
  var id = window.LEARNOTE_GA_ID;
  if (!/^G-[A-Z0-9]{6,}$/.test(id) || id === 'G-XXXXXXXXXX') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  var optedOut = false;
  try { var s = JSON.parse(localStorage.getItem('learnote.v1')); optedOut = s && s.settings && s.settings.analytics === false; } catch (e) {}
  gtag('consent', 'default', { analytics_storage: optedOut ? 'denied' : 'granted' });
  gtag('js', new Date());
  gtag('config', id, { send_page_view: false });
  var el = document.createElement('script');
  el.async = true;
  el.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.appendChild(el);
})();
