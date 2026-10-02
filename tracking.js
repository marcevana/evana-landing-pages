/* =====================================================================
   Evana Designs: shared tracking for every landing page
   Meta Pixel + Google Analytics 4, loaded ONLY after the visitor accepts
   cookies (GDPR / UK PECR). Nothing is sent to Meta or Google before that.

   Load it in <head> (not async/defer) so the page scripts can use it:
     <script src="tracking.js"></script>

   From any page:
     evana.track("generate_lead", { lead_tier: "A" }, "Lead", { status: "A" });
       arg 1/2: GA4 event name + params
       arg 3/4: Meta standard event name + params (null to skip)
       arg 5:   { metaCustom: true } for a Meta custom event, { once: "key" } to fire once per browser
     evana.onConsent(fn) runs fn as soon as tracking is allowed (page-level events).
   Add ?debug=1 to any URL to see every event in the console and in GA4 DebugView.
   ===================================================================== */

const PIXEL_ID = "1174429707476188";     // Meta Pixel (same as evanadesigns.com)
const GA4_ID = "G-4N45QD6TMR";           // GA4 property (same as evanadesigns.com)
const LINKED_DOMAINS = ["evanadesigns.net", "evanadesigns.com"]; // GA4 cross-domain linking
const CONSENT_KEY = "evana_cookie_consent";
const CONSENT_MAX_AGE_DAYS = 365; // ask again after a year

function readConsent() {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY));
    if (!c || Date.now() - c.ts > CONSENT_MAX_AGE_DAYS * 864e5) return null;
    return c;
  } catch (e) { return null; }
}

window.evana = (function () {
  "use strict";
  const DEBUG = /[?&]debug=1\b/.test(location.search);
  let loaded = false;
  const onLoadQueue = [];

  function log() { if (DEBUG) console.info.apply(console, ["[evana-tracking]"].concat([].slice.call(arguments))); }
  function eventId(name) { return name + "." + Date.now().toString(36) + "." + Math.random().toString(36).slice(2, 8); }
  function pageType() { return (location.pathname.split("/").pop() || "index").replace(/\.html$/, "") || "index"; }

  function loadMeta() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq("consent", "grant");
    fbq("init", PIXEL_ID);
    fbq("track", "PageView", {}, { eventID: eventId("PageView") });
  }

  function loadGoogle() {
    if (window.gtag && window.__evanaGtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    window.__evanaGtag = true;
    gtag("consent", "default", {
      ad_storage: "granted", analytics_storage: "granted",
      ad_user_data: "granted", ad_personalization: "granted"
    });
    gtag("js", new Date());
    gtag("config", GA4_ID, {
      linker: { domains: LINKED_DOMAINS },
      page_type: pageType(),
      debug_mode: DEBUG || undefined
    });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
  }

  /* Called on page load (if already accepted) and when "Accept cookies" is clicked */
  function load() {
    if (loaded) return;
    loaded = true;
    window["ga-disable-" + GA4_ID] = false;
    if (window.fbq) fbq("consent", "grant"); else loadMeta();
    if (window.__evanaGtag) gtag("consent", "update", {
      ad_storage: "granted", analytics_storage: "granted",
      ad_user_data: "granted", ad_personalization: "granted"
    }); else loadGoogle();
    log("loaded Meta Pixel", PIXEL_ID, "and GA4", GA4_ID);
    while (onLoadQueue.length) { try { onLoadQueue.shift()(); } catch (e) { console.error(e); } }
  }

  /* Run fn once tracking is allowed: now if already accepted, or right after "Accept cookies" */
  function onConsent(fn) { if (loaded) fn(); else onLoadQueue.push(fn); }

  /* Called when cookies are rejected after having been accepted */
  function revoke() {
    if (window.fbq) fbq("consent", "revoke");
    if (window.gtag) gtag("consent", "update", {
      ad_storage: "denied", analytics_storage: "denied",
      ad_user_data: "denied", ad_personalization: "denied"
    });
    window["ga-disable-" + GA4_ID] = true;
    const domain = location.hostname.replace(/^www\./, ".");
    document.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); })
      .filter(function (n) { return n === "_fbp" || n === "_fbc" || n === "_ga" || n.indexOf("_ga_") === 0 || n === "_gid" || n === "_gcl_au"; })
      .forEach(function (n) {
        document.cookie = n + "=; Max-Age=0; path=/";
        document.cookie = n + "=; Max-Age=0; path=/; domain=" + domain;
      });
    loaded = false;
    log("consent revoked, cookies cleared");
  }

  function hasConsent() { const c = readConsent(); return !!(c && c.marketing); }

  /* One call sends the same moment to GA4 and Meta */
  function track(gaName, gaParams, metaName, metaParams, opts) {
    opts = opts || {};
    if (!hasConsent()) { log("skipped (no consent):", gaName); return false; }
    if (opts.once) {
      try { if (localStorage.getItem("evana_once_" + opts.once)) { log("skipped (already sent):", gaName); return false; } } catch (e) {}
    }
    load();
    const id = eventId(metaName || gaName);
    if (gaName && window.gtag) gtag("event", gaName, Object.assign({ page_type: pageType() }, gaParams || {}));
    if (metaName && window.fbq) fbq(opts.metaCustom ? "trackCustom" : "track", metaName, metaParams || {}, { eventID: id });
    if (opts.once) { try { localStorage.setItem("evana_once_" + opts.once, String(Date.now())); } catch (e) {} }
    log("event", gaName, gaParams || {}, "| meta:", metaName || "-", metaParams || {}, id);
    return true;
  }

  /* Meta Advanced Matching: lets Meta match a lead to a Facebook/Instagram user.
     The pixel hashes the values (SHA-256) in the browser before sending. */
  function identify(data) {
    if (!hasConsent() || !window.fbq) return;
    const am = {};
    if (data.email) am.em = String(data.email).trim().toLowerCase();
    if (data.firstName) am.fn = String(data.firstName).trim().toLowerCase();
    fbq("init", PIXEL_ID, am);
  }

  /* ---- Automatic events on every page (no extra code needed) ---- */
  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a, button");
    if (!a) return;
    // Video play (click-to-load Wistia/YouTube boxes)
    if (a.classList.contains("lv-play")) {
      const box = a.closest(".lazy-video");
      track("video_start", { video_title: (box && box.dataset.title) || "" }, "VideoPlay", { title: (box && box.dataset.title) || "" }, { metaCustom: true });
      return;
    }
    const href = a.getAttribute("href") || "";
    // Booking-call links (Google appointment page)
    if (/calendar\.app\.google|calendar\.google\.com\/calendar\/appointments|calendly\.com/.test(href)) {
      track("book_call_click", { link_text: a.textContent.trim().slice(0, 80) }, "BookCallClick", {}, { metaCustom: true });
      return;
    }
    // Email / phone
    if (/^mailto:|^tel:/.test(href)) {
      track("contact_click", { method: href.split(":")[0] }, "Contact", {});
    }
  }, true);

  if (hasConsent()) load();

  return { load: load, revoke: revoke, track: track, identify: identify, hasConsent: hasConsent, onConsent: onConsent, debug: DEBUG };
})();

/* Backwards compatible name used by the page scripts */
function loadPixel() { window.evana.load(); }
