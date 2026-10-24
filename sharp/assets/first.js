/* First visit: show the 60-second demo before the app (owner asked). Runs in <head> of the home page, before anything draws.
   Skips for: anyone who has seen the demo or the app before, links into the app (#something), ?home, and search-engine bots. */
(function(){
  try{
    if(location.hash || /[?&]home\b/.test(location.search)) return;
    if(/bot|crawl|spider|slurp|preview|lighthouse|headless/i.test(navigator.userAgent)) return;
    if(localStorage.getItem('sharp-demo') === '1' || localStorage.getItem('sharp-intro') === '1') return;
    location.replace('demo/index.html');
  }catch(e){}
})();
