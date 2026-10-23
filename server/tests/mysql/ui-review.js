import assert from 'node:assert/strict';
export async function acceptPostingReview(page,text){
 if(!/post|record expense|record receipt|dispatch|clear|receive into|receive returned|release|confirm receipt/i.test(text)||/^(new|review|draft|request|submit|approve|history)/i.test(text))return;
 const modal=await page.waitForSelector('dialog[open]',{timeout:1800}).catch(()=>null);
 if(!modal)return;
 const content=await modal.evaluate(e=>e.textContent);assert.ok(content.includes('Review before posting'));assert.ok(content.includes('Classification'));assert.ok(content.includes('Money account'));
 await page.evaluate(()=>[...document.querySelectorAll('dialog button')].find(b=>b.textContent==='Confirm posting').click());
}
