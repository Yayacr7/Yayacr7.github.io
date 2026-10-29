/* The demo is the main screen for someone's first 3 visits (owner asked): the home page sends them to the 60-second demo
   first, once per visit. From the 4th visit, the home page is the app. Runs in <head> of the home page, before anything draws.
   A visit = one browser session (sessionStorage), counted in localStorage `sharp-visits`.
   Skips for: links into the app (#something), ?home, and search-engine bots / test browsers. */
(function(){
  try{
    if(location.hash || /[?&]home\b/.test(location.search)) return;
    if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent)) return;
    var n = parseInt(localStorage.getItem('sharp-visits'), 10) || 0;
    if(sessionStorage.getItem('sharp-visit') !== '1'){ n++; localStorage.setItem('sharp-visits', String(n)); sessionStorage.setItem('sharp-visit', '1'); }
    if(n > 3 || sessionStorage.getItem('sharp-demo-visit') === '1') return;
    location.replace('demo/index.html');
  }catch(e){}
})();
