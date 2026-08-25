// ga4.js — GA4 loader for fouroceansgroup.co.za.
// Swap GA4_ID below with the real Measurement ID once info@fouroceansgroup.co.za's
// GA4 property is created. That is the ONLY change needed to go live.
(function () {
  var GA4_ID = 'G-XXXXXXXXXX'; // TODO: replace with real Measurement ID
  if (GA4_ID.indexOf('XXXX') !== -1) return; // no-op guard: never fires with placeholder ID
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date());
  gtag('config', GA4_ID);
})();
