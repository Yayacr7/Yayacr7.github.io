/* Local demonstration storage.
 * The household is kept in this browser's localStorage. Other tabs of the same
 * browser see changes at once (storage event), which lets you open two tabs as
 * two people. Writes run inside a Web Lock so two tabs cannot overwrite each
 * other: each write re-reads the latest data, then the rules engine checks the
 * task revision. Nothing is sent to any server. */
(function (root) {
  'use strict';
  const KEY = 'family-handoff-demo-v1';
  const ACTOR = 'family-handoff-actor';
  let memory = null, memActor = null, works = true;
  try { const k = '__fh'; localStorage.setItem(k, '1'); localStorage.removeItem(k); } catch (e) { works = false; }

  function load() {
    if (!works) return memory ? JSON.parse(memory) : null;
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function save(s) {
    const raw = JSON.stringify(s);
    if (!works) { memory = raw; return true; }
    try { localStorage.setItem(KEY, raw); return true; } catch (e) { return false; }
  }
  function clear() { memory = null; if (works) try { localStorage.removeItem(KEY); } catch (e) {} }

  let chain = Promise.resolve();
  function locked(fn) {
    if (root.navigator && navigator.locks && navigator.locks.request) return navigator.locks.request(KEY, () => fn());
    const p = chain.then(fn); chain = p.catch(() => {}); return p;
  }
  // fn(latestState) -> result {ok, state}. Saved only when ok.
  function transact(fn) {
    return locked(() => {
      const latest = load();
      const r = fn(latest);
      if (r && r.ok && r.state) {
        if (!save(r.state)) return { ok: false, code: 'storage_full', error: 'This browser is out of room for demo data. Remove an attachment and try again.' };
      }
      return r;
    });
  }
  function onChange(cb) { root.addEventListener('storage', e => { if (e.key === KEY || e.key === null) cb(); }); }

  // Which member this tab is acting as. Per tab, so two tabs can be two people.
  function getActor() { try { return sessionStorage.getItem(ACTOR) || memActor; } catch (e) { return memActor; } }
  function setActor(id) { memActor = id; try { sessionStorage.setItem(ACTOR, id); } catch (e) {} }

  root.FHStore = { load, save, clear, transact, onChange, getActor, setActor, persistent: () => works, KEY };
})(typeof self !== 'undefined' ? self : this);
