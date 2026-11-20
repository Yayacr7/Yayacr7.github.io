// Makes the two sample schedule pictures in shiftsync/samples/ (made-up names and places).
// Run: node shiftsync/tests/make-samples.js
const { chromium } = require('playwright');
const path = require('path');
const team = `<html><body style="margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="padding:28px 30px;width:1040px">
<div style="font-size:26px;font-weight:bold">Corner Grocery - Front End</div>
<div style="font-size:18px;margin:6px 0 18px;color:#333">Schedule posted Nov 18</div>
<table style="border-collapse:collapse;font-size:20px;width:100%">
<tr style="background:#e8e8e8"><th style="text-align:left;padding:10px;border:1px solid #999;width:190px">Employee</th>
${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<th style="padding:10px 4px;border:1px solid #999">${d}</th>`).join('')}</tr>
<tr style="background:#f4f4f4"><td style="padding:6px 10px;border:1px solid #999"></td>
${['11/22','11/23','11/24','11/25','11/26','11/27','11/28'].map(d=>`<td style="padding:6px 4px;border:1px solid #999;text-align:center">${d}</td>`).join('')}</tr>
${[['Alex Rivera',['OFF','9a-5p','9a-5p','','12p-8p','10p-6a','OFF']],
   ['Sam Okafor',['7a-3p','OFF','','7a-3p','7a-3p','OFF','8a-4p']],
   ['Jordan Avery',['','8a-4p','8a-4p','OFF','4p-10p','','10a-6p']],
   ['Priya Nair',['10a-6p','','OFF','12p-8p','','9a-5p','9a-5p']],
   ['Chris Dale',['4p-10p','4p-10p','OFF','','10p-6a','4p-10p','']]]
 .map(([n,c])=>`<tr><td style="padding:12px 10px;border:1px solid #999">${n}</td>${c.map(x=>`<td style="padding:12px 4px;border:1px solid #999;text-align:center">${x}</td>`).join('')}</tr>`).join('')}
</table></div></body></html>`;
const mine = `<html><body style="margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#111">
<div style="padding:28px 26px;width:420px">
<div style="font-size:24px;font-weight:bold;margin-bottom:4px">My Schedule</div>
<div style="font-size:16px;color:#444;margin-bottom:18px">Night Diner</div>
${[['Mon, Nov 23','5:00 PM - 11:00 PM','Server'],['Wed, Nov 25','6:00 PM - 12:00 AM','Server'],['Fri, Nov 27','11:00 PM - 7:00 AM','Overnight'],['Sat, Nov 28','5:00 PM - 10:00 PM','Server']]
 .map(([d,t,r])=>`<div style="border-top:1px solid #ccc;padding:14px 0"><div style="font-size:19px;font-weight:bold">${d}</div><div style="font-size:19px;margin-top:4px">${t}</div><div style="font-size:15px;color:#555;margin-top:2px">${r}</div></div>`).join('')}
</div></body></html>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
  for (const [name, html] of [['team-schedule.png', team], ['my-schedule.png', mine]]) {
    await p.setContent(html); const el = await p.$('div');
    await el.screenshot({ path: path.join(__dirname, '..', 'samples', name) });
  }
  await b.close(); console.log('samples made');
})();
