/* The 9 starter businesses: ONE list for the whole app (First $100 Plan, the demo, the Money ladder), with a price for
   teens and a price for adults. price, lo-hi: a fair price per job for someone starting out (US, 2026). A guide, not a
   promise. cost and hrs are per job. who: who to ask first. ask: the 4 sales questions for "Make the sale".
   Keep in sync: BIZ in sharp/assets/cherry-offline.js and in functions/_lib/practice.js (prices and names). */
(function(){
"use strict";
var B = {
  lawn:   { name: 'Lawn and yard care', biz: 'lawn care', job: 'mowing and edging a front and back yard', act: 'mow and edge your front and back yard', cost: 2, hrs: 1.5,
    tip: 'Offer every-week mowing. One regular customer is worth ten one-offs.',
    ask: ["Who looks after your yard right now?", "What's the hardest part of keeping it tidy?", "What happens when it gets overgrown? Is that something you want sorted soon?", "You said weekends are busy. I can mow every Saturday morning, so you never have to think about it."],
    teen: { price: 25, lo: 20, hi: 40, who: 'neighbours with big yards, older neighbours and busy families' },
    adult: { price: 40, lo: 30, hi: 60, who: 'neighbours, busy families and older homeowners nearby' } },
  pets:   { name: 'Dog walking and pet sitting', biz: 'dog walking', job: 'a 30-minute dog walk', act: 'take your dog on a 30-minute walk', cost: 0, hrs: .75,
    tip: 'Ask to meet the dog first, free. Owners book people their dog already likes.',
    ask: ["What does your dog do while you're at work?", "What's tricky about that?", "How does that affect your dog, or you? Do you want to change it soon?", "You mentioned he's alone all day. I can walk him at lunchtime every weekday."],
    teen: { price: 15, lo: 10, hi: 20, who: 'dog owners who work all day, and families going away' },
    adult: { price: 20, lo: 15, hi: 30, who: 'dog owners who work long days, and local pet owner groups' } },
  car:    { name: 'Car washing', biz: 'car washing', job: 'washing a car inside and out', act: 'wash your car and clean the inside', cost: 3, hrs: 1,
    tip: 'Before-and-after photos sell this. Take them every time (with permission).',
    ask: ["How do you usually get your car cleaned?", "What don't you like about that?", "How often does it bug you? Is it worth fixing?", "You said the car wash eats your Saturday. I can wash it in your driveway while you do other things."],
    teen: { price: 20, lo: 15, hi: 35, who: 'neighbours, family friends and people who drive for work' },
    adult: { price: 40, lo: 30, hi: 70, who: 'neighbours, coworkers and people who drive for work' } },
  tutor:  { name: 'Tutoring', biz: 'tutoring', job: 'a 1-hour homework or reading session', act: 'do a 1-hour homework or reading session', cost: 0, hrs: 1,
    tip: 'Tell parents one thing their child got better at after each session.',
    ask: ["How is homework going for them right now?", "Which subject is hardest?", "How is that affecting their grades or mood? Do you want help with it this term?", "You said reading is the struggle. I can do two reading sessions a week with them."],
    teen: { name: 'Tutoring younger kids', price: 15, lo: 12, hi: 25, who: 'parents of younger kids at your school or in your area' },
    adult: { price: 35, lo: 25, hi: 60, who: 'parents in your area, local community groups and people you know' } },
  bake:   { name: 'Baked goods', biz: 'baking', job: 'a box of a dozen cookies', act: 'bake you a box of a dozen cookies', cost: 4, hrs: 1.5,
    tip: 'Take orders first, then bake. You never waste ingredients that way.',
    ask: ["What do you usually get for parties or events?", "What don't you love about that?", "Is there an event coming up you need it for?", "You've got a birthday in two weeks. I can make a dozen cookies for it, decorated how you like."],
    teen: { price: 12, lo: 10, hi: 18, who: 'family friends, neighbours and people planning parties' },
    adult: { price: 20, lo: 15, hi: 35, who: 'friends, coworkers and people planning parties or events' } },
  tech:   { name: 'Phone and tech help', biz: 'tech help', job: 'setting up a phone, tablet or TV', act: 'set up your phone, tablet or TV and show you how it works', cost: 0, hrs: 1,
    tip: 'Leave a short written how-to behind. People call back the helper who did that.',
    ask: ["How are you getting on with your phone, tablet or TV?", "What's confusing about it?", "What do you miss out on because of that? Want it fixed this week?", "You said video calls with family are hard. I can set that up and show you step by step."],
    teen: { price: 20, lo: 15, hi: 30, who: 'grandparents, older neighbours and busy parents' },
    adult: { price: 40, lo: 30, hi: 75, who: 'older neighbours, small shops and busy parents' } },
  resell: { name: 'Reselling (buy low, sell higher)', biz: 'reselling', job: 'one item bought cheap, cleaned up and sold', act: 'sell you a checked, cleaned-up item for less than new', cost: 10, hrs: 1,
    tip: 'Only buy things you have already seen sell for at least double.',
    ask: ["What are you looking for?", "What have you found so far, and what was wrong with it?", "When do you need it by?", "You need a bike for school. This one's checked, cleaned and ready to ride."],
    teen: { price: 25, lo: 15, hi: 40, who: 'buyers on local selling apps and at school (with a parent\'s okay)' },
    adult: { price: 40, cost: 15, lo: 20, hi: 80, who: 'buyers on local selling apps and marketplaces' } },
  sitter: { name: 'Babysitting', biz: 'babysitting', job: 'a 3-hour evening of babysitting', act: 'babysit for a 3-hour evening', cost: 0, hrs: 3,
    tip: 'A first-aid course makes parents say yes faster, and lets you charge more.',
    ask: ["Who watches the kids when you go out?", "What makes that hard?", "How often does that stop you going out? Would a regular sitter help?", "You said you rarely get a night out. I'm free most Friday evenings."],
    teen: { price: 45, lo: 36, hi: 60, who: 'families you or your parents already know' },
    adult: { price: 60, lo: 50, hi: 90, who: 'families you know, and parents your friends can vouch for you to' } },
  social: { name: 'Social posts for local shops', biz: 'social media', job: 'a pack of 8 photos and posts for a shop\'s page', act: 'make a pack of 8 photos and posts for your page', cost: 0, hrs: 3,
    tip: 'Make one free sample post for the shop first. Showing beats telling.',
    ask: ["How do new customers find you, and what do they see when they visit your page?", "What's hard about posting?", "What does a quiet page cost you? Is fixing it a priority right now?", "You said nobody has time to post. I can make 8 posts a month, so your page looks busy and people know what you sell."],
    teen: { price: 40, lo: 30, hi: 75, who: 'small local shops, cafés and salons with quiet social pages' },
    adult: { price: 150, lo: 100, hi: 300, who: 'small local shops, cafés and salons with quiet social pages' } }
};
function get(key, who){
  var b = B[key]; if(!b) return null;
  var a = b[who === 'adult' ? 'adult' : 'teen'], o = {};
  for(var k in b) if(k !== 'teen' && k !== 'adult') o[k] = b[k];
  for(k in a) o[k] = a[k];
  return o;
}
function all(who){ var o = {}; Object.keys(B).forEach(function(k){ o[k] = get(k, who); }); return o; }
window.SharpBiz = { get: get, all: all, keys: Object.keys(B), who: function(){ return window.SharpWho ? window.SharpWho.get() : ''; } };
})();
