import { chromium } from 'playwright';
const b = await chromium.launch();
const shots = [
  ['home-desktop','/',1440,900,true],
  ['shop-desktop','/shop',1440,1100,false],
  ['product-desktop','/shop/glow-serum',1440,1100,false],
  ['home-mobile','/',390,844,true],
  ['product-mobile','/shop/glow-serum',390,844,false],
  ['checkout-desktop','/checkout',1440,1000,false],
];
for (const [name,route,w,h,full] of shots) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  const p = await ctx.newPage();
  if (route==='/checkout') {
    await p.goto('http://localhost:5173/shop/glow-serum',{waitUntil:'networkidle'});
    await p.getByRole('button',{name:'Add to cart'}).first().click();
    await p.waitForTimeout(700);
  }
  await p.goto('http://localhost:5173'+route,{waitUntil:'networkidle'});
  await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
  await p.waitForTimeout(1600);
  await p.evaluate(()=>window.scrollTo(0,0));
  await p.waitForTimeout(900);
  await p.screenshot({path:`.qa/${name}.png`, fullPage:full});
  await ctx.close();
}
await b.close(); console.log('done');
