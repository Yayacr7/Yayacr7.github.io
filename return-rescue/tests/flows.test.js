// Return Rescue browser tests. Run: (from repo root) python3 -m http.server 8765 & node return-rescue/tests/flows.test.js
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.RR_BASE || 'http://localhost:8765/return-rescue/';
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL:', msg); } };
const url = (today, hash) => BASE + '?today=' + today + '#/' + (hash || 'home');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const text = async () => page.locator('#view').innerText();
  const goto = async (today, hash) => { await page.goto(url(today, hash)); await page.waitForSelector('#view h1, #view .hero'); };

  /* 1. Order text reader */
  await goto('2026-11-20');
  const P = s => page.evaluate(t => window.__RR.parseOrderText(t), s);
  let r = await P('Thank you for shopping at Example Store.\nOrder #A12345-678\nOrdered on November 3, 2026\nDelivered November 6, 2026\nBlue denim jacket   $64.00\nSubtotal $64.00\nTax $5.12\nOrder total $69.12\nReturn by December 6, 2026');
  ok(r.store === 'Example Store', 'store from thank-you line: ' + r.store);
  ok(r.orderNo === 'A12345-678', 'order number: ' + r.orderNo);
  ok(r.orderDate === '2026-11-03', 'order date: ' + r.orderDate);
  ok(r.deliveredDate === '2026-11-06', 'delivered date: ' + r.deliveredDate);
  ok(r.item === 'Blue denim jacket' && r.itemPrice === 64, 'item + price: ' + r.item + ' ' + r.itemPrice);
  ok(r.total === 69.12, 'total: ' + r.total);
  ok(r.returnBy === '2026-12-06', 'return by: ' + r.returnBy);
  r = await P('Your Amazon.com order of "Wireless Earbuds" has shipped\nOrder placed\nNov 12, 2026\nOrder number\n112-3456789-1234567\nWireless Earbuds\nQty: 1\n$49.99\nGrand Total: $53.24');
  ok(r.store === 'Amazon.com', 'store from "Your X order": ' + r.store);
  ok(r.orderNo === '112-3456789-1234567', 'order no on next line: ' + r.orderNo);
  ok(r.orderDate === '2026-11-12', 'date on next line: ' + r.orderDate);
  ok(r.item === 'Wireless Earbuds', 'item from line above price: ' + r.item);
  ok(r.total === 53.24, 'grand total: ' + r.total);
  r = await P('Sold by: Trail Gear Co\nPurchase date 11/02/2026\nItem: Hiking boots size 9\nYou have 45 days to return unused items.');
  ok(r.store === 'Trail Gear Co', 'sold by: ' + r.store);
  ok(r.orderDate === '2026-11-02', 'US m/d/y date: ' + r.orderDate);
  ok(r.item === 'Hiking boots size 9', 'Item: label: ' + r.item);
  ok(r.windowDays === 45, 'window days: ' + r.windowDays);
  r = await P('hello there, nothing useful here');
  ok(!r.store && !r.item && !r.orderNo && !r.orderDate, 'no false finds in junk text');
  r = await P('Order date: Dec 28\nScarf $20.00'); // no year, would be in the future -> last year
  ok(r.orderDate === '2025-12-28', 'missing year guessed as last year: ' + r.orderDate);
  r = await P('Order 2026 summary\nOrder # 77881\nFebruary 30, 2026 order date');
  ok(r.orderNo === '77881', 'skips year as order number: ' + r.orderNo);
  ok(!r.orderDate, 'invalid date Feb 30 rejected');

  /* 2. Empty state, start fresh */
  ok((await text()).includes('Keep track of your returns'), 'empty home shows the promise');
  ok((await text()).includes('not connected to stores, email, carriers or banks'), 'empty home says manual tracking');

  /* 3. Add via pasted text, real typing, deadline worked out from policy and confirmed */
  await page.click('a.tab.add');
  await page.click('[data-act=pick][data-val=paste]');
  await page.fill('#paste-text', 'Thank you for shopping at Example Store.\nOrder #A12345\nOrdered on November 3, 2026\nDelivered November 10, 2026\nBlue denim jacket   $64.00\nOrder total $69.12');
  await page.click('[data-act=wiz-next]');
  ok(await page.locator('.found').count() >= 5, 'step 2 marks found fields');
  ok(await page.inputValue('#f-item') === 'Blue denim jacket', 'item prefilled');
  ok(await page.inputValue('#f-price') === '64.00', 'price prefilled');
  ok(await page.inputValue('#f-deliveredDate') === '2026-11-10', 'delivered prefilled');
  await page.click('[data-act=wiz-next]');
  ok((await text()).includes('not always 30 days'), 'deadline step warns about assumptions');
  ok(await page.locator('[data-act=wiz-next]').isDisabled(), 'cannot continue without choosing a deadline option');
  await page.click('[data-act=pick][data-val=calc]');
  ok(await page.inputValue('#calc-days') === '', 'no default number of days');
  await page.locator('#calc-days').pressSequentially('30');
  ok((await page.locator('#calc-out').innerText()).includes('Thu, Dec 10, 2026'), 'calc: 30 days from Nov 10 = Dec 10: ' + await page.locator('#calc-out').innerText());
  await page.selectOption('#f-src', 'policy');
  await page.fill('#f-policyUrl', 'https://example.com/returns');
  await page.check('#f-confirm');
  await page.click('[data-act=wiz-next]');
  await page.click('[data-act=pick][data-val=mail]');
  ok(await page.locator('.chip.on').count() === 3, 'default reminders 7/3/1 selected');
  await page.click('[data-act=wiz-save]');
  await page.waitForSelector('.dhead');
  ok((await text()).includes('Return by Dec 10 · 20 days'), 'detail shows confirmed deadline + days left');
  ok((await text()).includes('Confirmed by you'), 'detail says confirmed by you');
  ok((await text()).includes('7d before, 3d before, 1d before'), 'reminder days shown');
  await page.click('.seg a:has-text("Checklist")');
  await page.waitForSelector('.cl input[type=checkbox]');
  ok(await page.locator('.cl li').count() === 7, 'mail checklist has 7 steps');
  await page.locator('.cl input[type=checkbox]').first().check();
  await page.waitForTimeout(50);
  ok((await text()).includes('1 of 7 done'), 'ticking a step updates progress');
  ok((await page.locator('.dhead .badge').innerText()).includes('Deciding'), 'ticking does not change status');
  await page.fill('[name=step]', 'Take photo of item before packing');
  await page.press('[name=step]', 'Enter');
  ok(await page.locator('.cl li').count() === 8, 'custom step added with Enter');
  const jacketId = await page.evaluate(() => location.hash.split('/')[2]);

  /* 4. Home sections + reminders over time */
  await goto('2026-11-20');
  let t = await text();
  ok(t.includes('Coming up') && !t.includes('Act soon'), '20 days out: in Coming up, not Act soon');
  ok(!t.includes('Reminders'), 'no reminder 20 days out');
  await goto('2026-12-03');
  t = await text();
  ok(t.includes('Act soon') && t.includes('7 days left'), 'Dec 3: Act soon with 7 days left');
  ok(await page.locator('.pcard.soon').count() === 1, 'act soon card uses orange style');
  ok(t.includes('7 days left to return Blue denim jacket'), '7-day reminder shows');
  await page.click('[data-act=dismiss]');
  ok(!(await text()).includes('Reminders'), 'dismissed reminder disappears');
  await goto('2026-12-05');
  ok(!(await text()).includes('Reminders'), 'Dec 5 (5 days): no new reminder until 3-day mark');
  await goto('2026-12-07');
  ok((await text()).includes('3 days left to return'), 'Dec 7: 3-day reminder');
  await goto('2026-12-10');
  ok((await text()).includes('Last day today'), 'deadline day says last day today');
  await goto('2026-12-11');
  t = await text();
  ok(t.includes('Deadline passed') && !t.includes('Act soon'), 'after deadline: Deadline passed section');
  await page.goto(url('2026-12-11', 'p/' + jacketId)); await page.waitForSelector('.dhead');
  ok((await text()).includes('Some sellers still accept returns'), 'detail offers passed-deadline options');

  /* 5. Unconfirmed deadline: labeled, no reminders, not in Act soon */
  await goto('2026-11-20', 'add');
  await page.click('[data-act=pick][data-val=type]');
  await page.click('[data-act=wiz-next]');
  await page.click('[data-act=wiz-next]');
  ok((await page.locator('.toast').innerText()).includes('Add what you bought'), 'validation: item or store required');
  await page.fill('#f-item', 'Desk lamp'); await page.fill('#f-store', 'Lamp Shop');
  await page.click('[data-act=wiz-next]');
  await page.click('[data-act=pick][data-val=exact]');
  await page.fill('#f-deadline', '2026-11-22');
  await page.selectOption('#f-src', 'other');
  ok(await page.locator('#f-confirm').isDisabled(), 'a guess cannot be confirmed');
  await page.click('[data-act=wiz-next]');
  await page.click('[data-act=wiz-save]');
  await page.waitForSelector('.dhead');
  ok((await text()).includes('Unconfirmed: Nov 22'), 'unconfirmed chip label');
  ok((await text()).includes('Deadline not confirmed'), 'detail nudges to confirm');
  ok((await text()).includes('Start once confirmed'), 'no reminders until confirmed');
  await goto('2026-11-21');
  t = await text();
  ok(t.includes('Check the deadline') && !t.includes('Act soon'), 'unconfirmed 1 day out: Check the deadline, not Act soon');
  ok(!t.includes('left to return Desk lamp'), 'no reminder for unconfirmed deadline');
  // confirm it via edit
  const lampId = await page.evaluate(() => window.__RR.state().purchases.find(p => p.item === 'Desk lamp').id);
  await page.goto(url('2026-11-21', 'edit/' + lampId + '?step=3')); await page.waitForSelector('#f-src');
  await page.selectOption('#f-src', 'policy');
  await page.check('#f-confirm');
  await page.click('[data-act=wiz-next]'); await page.click('[data-act=wiz-save]');
  await goto('2026-11-21');
  t = await text();
  ok(t.includes('Act soon') && t.includes('1 day left to return Desk lamp'), 'after confirming: Act soon + reminder');
  await page.goto(url('2026-11-21', 'p/' + lampId)); await page.waitForSelector('.dhead');
  ok((await text()).includes('Deadline changed to Nov 22 (confirmed)'), 'history records deadline change');

  /* 6. Status flow with confirmations */
  const nextBtn = () => page.locator('#view .btnrow .btn.primary, #view .btnrow .btn.mint').first();
  await page.click('text=I started the return');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.sheet .err').innerText()).includes('Tick the box'), 'requested needs seller confirmation tick');
  ok(await page.evaluate(id => window.__RR.state().purchases.find(p => p.id === id).status, lampId) === 'deciding', 'status unchanged without tick');
  await page.fill('#s-ref', 'RMA-42');
  await page.check('.sheet [name=confirm]');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.dhead .badge').innerText()) === 'Return requested', 'now Return requested');
  ok((await text()).includes('RMA-42'), 'return reference saved');
  await page.click("text=It's packed and ready");
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.dhead .badge').innerText()).startsWith('Ready'), 'now Ready');
  await page.click('text=I sent it / dropped it off');
  await page.fill('#s-trk', '1Z999AA10123456784'); await page.fill('#s-car', 'UPS');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.sheet .err').innerText()).length > 0, 'sent needs hand-over tick');
  await page.check('.sheet [name=confirm]');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.dhead .badge').innerText()) === 'Sent', 'now Sent');
  ok((await text()).includes('1Z999AA10123456784'), 'tracking reference saved');
  ok(!(await page.locator('.dhead').innerText()).includes('left'), 'no deadline countdown after sent');
  await page.click('text=Waiting for the refund');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.dhead .badge').innerText()) === 'Refund pending', 'now Refund pending');
  // follow-up reminder 14 days after sent date (Nov 21)
  await goto('2026-12-04'); ok(!(await text()).includes('No refund recorded yet'), 'no follow-up before 14 days');
  await goto('2026-12-05'); ok((await text()).includes('No refund recorded yet for Desk lamp'), 'follow-up reminder at 14 days');
  await page.click('[data-act=dismiss]');
  ok(!(await text()).includes('No refund recorded yet'), 'snoozed follow-up hidden');
  await goto('2026-12-12'); ok((await text()).includes('No refund recorded yet'), 'snoozed follow-up returns after 7 days');
  // Refund received: needs amount and tick
  await page.goto(url('2026-12-12', 'p/' + lampId + '/refund')); await page.waitForSelector('.dhead');
  await page.fill('#exp-in', '40'); await page.click('form[data-form=expected] button');
  await page.click('text=I received the refund');
  await page.check('.sheet [name=confirm]');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.sheet .err').innerText()).includes('amount'), 'refund needs an amount');
  await page.fill('#s-amt', '35.50');
  await page.click('.sheet button:has-text("Confirm")');
  await page.waitForSelector('.success');
  ok((await page.locator('.success').innerText()).includes('$35.50'), 'success animation shows recorded amount');
  await page.click('[data-act=close-success]');
  ok((await text()).includes('$4.50 less than you expected'), 'expected vs received difference explained');
  await goto('2026-12-12');
  ok((await page.locator('.stat.mint b').innerText()) === '$35.50', 'home: refunds recorded = $35.50');
  await goto('2026-12-12', 'archive');
  ok((await text()).includes('Desk lamp'), 'archive has the refunded item');
  await goto('2026-12-12', 'refunds');
  ok((await text()).includes('$4.50 less'), 'refunds page flags the shortfall');

  /* 7. Kept: closes with no refund */
  await page.goto(url('2026-12-12', 'p/' + jacketId)); await page.waitForSelector('.dhead');
  await page.click('[data-act=status][data-to=kept]');
  await page.click('.sheet button:has-text("Confirm")');
  ok((await page.locator('.dhead .badge').innerText()) === 'Kept it', 'kept status');
  await goto('2026-12-12');
  ok((await page.locator('.stat.mint b').innerText()) === '$35.50', 'kept item adds no money');
  // reopen via Change status
  await page.goto(url('2026-12-12', 'p/' + lampId)); await page.waitForSelector('.dhead');
  await page.click('[data-act=status-any]');
  await page.click('.sheet [data-to=refund_pending]');
  ok((await page.locator('.sheet').innerText()).includes('recorded refund will be removed'), 'reopening warns refund removed');
  await page.click('.sheet button:has-text("Confirm")');
  await goto('2026-12-12');
  ok((await page.locator('.stat.mint b').innerText()) === '$0.00', 'reopened refund no longer counted');

  /* 8. Search */
  await goto('2026-12-12', 'search');
  await page.locator('#q').pressSequentially('example');
  ok((await page.locator('#results').innerText()).includes('1 result') && (await page.locator('#results').innerText()).includes('Blue denim jacket'), 'search by store');
  await page.fill('#q', 'RMA-42'); await page.dispatchEvent('#q', 'input');
  ok((await page.locator('#results').innerText()).includes('Desk lamp'), 'search by return reference');
  await page.fill('#q', ''); await page.dispatchEvent('#q', 'input');
  await page.selectOption('[data-search=status]', 'kept');
  ok((await page.locator('#results').innerText()).includes('1 result'), 'filter by status');
  await page.selectOption('[data-search=status]', '');
  await page.selectOption('[data-search=dateField]', 'orderDate');
  await page.fill('[data-search=from]', '2026-11-01'); await page.dispatchEvent('[data-search=from]', 'input');
  await page.fill('[data-search=to]', '2026-11-05'); await page.dispatchEvent('[data-search=to]', 'input');
  ok((await page.locator('#results').innerText()).includes('1 result'), 'filter by purchase date range (lamp has no date)');

  /* 9. Photos */
  await page.goto(url('2026-12-12', 'p/' + jacketId)); await page.waitForSelector('.dhead');
  await page.setInputFiles('#add-photo', path.join(__dirname, '..', 'icon-512.png'));
  await page.waitForSelector('.photo-prev img[src^="blob:"]');
  ok(true, 'receipt photo stored and shown');
  await page.setInputFiles('#add-photo', { name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await page.waitForTimeout(300);
  ok((await page.locator('.toast').innerText()).includes('could not be opened'), 'bad image rejected with message');

  /* 10. Calendar file */
  const ics = await page.evaluate(id => window.__RR.makeICS(window.__RR.state().purchases.find(p => p.id === id)), jacketId);
  ok(ics.includes('DTSTART;VALUE=DATE:20261210') && ics.includes('TRIGGER:-PT159H') && ics.includes('TRIGGER:-PT63H') && ics.includes('TRIGGER:-PT15H'), 'ics: date + 7/3/1-day alarms at 9am');
  ok(ics.includes('SUMMARY:Return deadline: Blue denim jacket (Example Store)'), 'ics summary');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=ics]')]);
  ok(dl.suggestedFilename().endsWith('.ics'), 'calendar download: ' + dl.suggestedFilename());

  /* 11. Samples are labeled and never counted as money */
  await goto('2026-12-12', 'more');
  await page.click('[data-act=add-samples]');
  await page.waitForSelector('.notice.sand');
  ok((await text()).includes('Sample purchases are showing'), 'sample banner');
  ok((await page.locator('.stat.mint b').innerText()) === '$0.00', 'sample refund not counted');

  /* 12. Free plan limit (samples not counted) */
  const addQuick = async (name) => {
    await goto('2026-12-12', 'add');
    await page.click('[data-act=pick][data-val=type]'); await page.click('[data-act=wiz-next]');
    await page.fill('#f-item', name); await page.click('[data-act=wiz-next]');
    await page.click('[data-act=pick][data-val=unknown]'); await page.click('[data-act=wiz-next]'); await page.click('[data-act=wiz-save]');
  };
  // real active now: lamp (refund_pending) = 1. Add 4 -> 5, then 6th triggers.
  for (const n of ['A1', 'A2', 'A3', 'A4']) { await addQuick(n); await page.waitForSelector('.dhead'); }
  await addQuick('A5');
  await page.waitForSelector('.sheet');
  ok((await page.locator('.sheet').innerText()).includes('Idea, not for sale') && (await page.locator('.sheet').innerText()).includes('Nothing can be bought'), 'limit sheet is honest about Plus');
  await page.click('[data-act=force-save]');
  await page.waitForSelector('.dhead');
  ok((await page.locator('.dhead h1').innerText()) === 'A5', 'continue saves during test');

  /* 13. Backup export + import */
  await goto('2026-12-12', 'more');
  const [bk] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
  const bkPath = await bk.path();
  const bkJson = JSON.parse(require('fs').readFileSync(bkPath, 'utf8'));
  ok(bkJson.app === 'return-rescue' && bkJson.data.purchases.length === 12 && Object.keys(bkJson.photos).length === 1, 'backup has purchases and photo: ' + bkJson.data.purchases.length);
  page.once('dialog', d => d.accept());
  await page.click('[data-act=wipe]');
  await page.waitForSelector('.hero');
  ok((await page.evaluate(() => window.__RR.state().purchases.length)) === 0, 'delete everything');
  await goto('2026-12-12', 'more');
  page.once('dialog', d => d.accept());
  await page.setInputFiles('#imp', bkPath);
  await page.waitForFunction(() => window.__RR.state().purchases.length === 12);
  ok(true, 'backup restored');
  await page.goto(url('2026-12-12', 'p/' + jacketId)); await page.waitForSelector('.photo-prev img[src^="blob:"]');
  ok(true, 'restored photo shows');
  await page.setInputFiles('#imp', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') }).catch(() => {});

  /* 14. Persistence after reload */
  await page.reload(); await page.waitForSelector('.dhead');
  ok((await page.locator('.dhead h1').innerText()) === 'Blue denim jacket', 'data survives reload');

  /* 15. Layout on devices: no sideways scroll, no errors */
  const routes = ['home', 'add', 'search', 'refunds', 'archive', 'more', 'about', 'plans', 'p/' + jacketId, 'p/' + jacketId + '/checklist', 'p/' + jacketId + '/refund'];
  for (const vp of [[360, 740], [390, 844], [820, 1180], [1280, 720], [1440, 900]]) {
    await page.setViewportSize({ width: vp[0], height: vp[1] });
    for (const rt of routes) {
      await page.goto(url('2026-12-12', rt)); await page.waitForSelector('#view > *');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(over <= 0, `no sideways scroll ${vp.join('x')} ${rt} (${over}px)`);
    }
  }
  // small touch targets on phone
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url('2026-12-12', 'p/' + jacketId)); await page.waitForSelector('.dhead');
  const small = await page.evaluate(() => [...document.querySelectorAll('#view .btn, .tab')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.height < 34; }).map(b => b.textContent.trim()));
  ok(small.length === 0, 'buttons at least 34px tall: ' + small.join(', '));

  /* 16. Blocked storage */
  const ctx2 = await browser.newContext();
  await ctx2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const p2 = await ctx2.newPage(); const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(url('2026-12-12')); await p2.waitForSelector('.hero');
  ok(e2.length === 0, 'blocked storage: no crash ' + e2.join(';'));
  ok((await p2.locator('.toast').innerText()).includes('blocking storage'), 'blocked storage: user told');
  await ctx2.close();

  /* 17. Reduced motion success screen */
  const ctx3 = await browser.newContext({ reducedMotion: 'reduce' });
  const p3 = await ctx3.newPage();
  await p3.goto(url('2026-12-12')); await p3.waitForSelector('.hero');
  await p3.click('[data-act=add-samples]'); await p3.waitForSelector('.pcard');
  const sid = await p3.evaluate(() => window.__RR.state().purchases.find(p => p.status === 'refund_pending').id);
  await p3.goto(url('2026-12-12', 'p/' + sid + '/refund')); await p3.waitForSelector('.dhead');
  await p3.click('text=I received the refund'); await p3.fill('#s-amt', '120'); await p3.check('.sheet [name=confirm]'); await p3.click('.sheet button:has-text("Confirm")');
  await p3.waitForSelector('.success');
  ok(await p3.locator('.success .dot').first().isHidden(), 'reduced motion hides confetti dots');
  ok((await p3.locator('.success').innerText()).includes('sample, not counted'), 'sample refund celebration says not counted');
  await ctx3.close();

  ok(errors.length === 0, 'no JS errors: ' + errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
