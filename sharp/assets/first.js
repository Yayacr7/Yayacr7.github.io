/* The demo comes first (owner asked): every time someone opens Sharp, the home page shows the 60-second demo before the app.
   Runs in <head> of the home page, before anything draws. Once per visit (sessionStorage): after the demo, Home goes to the app.
   Skips for: links into the app (#something), ?home, and search-engine bots / test browsers. */
(function(){
  try{
    if(location.hash || /[?&]home\b/.test(location.search)) return;
    if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent)) return;
    if(sessionStorage.getItem('sharp-demo-visit') === '1') return;
    location.replace('demo/index.html');
  }catch(e){}
})();
