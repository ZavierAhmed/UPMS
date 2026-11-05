// Export the same approved catalog used by React; no brochure is republished.
import {createServer} from '../upms.client/node_modules/vite/dist/node/index.js';
import {mkdir, writeFile, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import puppeteer from 'puppeteer-core';
const directory=resolve('tmp/uat3a/pdf-input');
await mkdir(directory,{recursive:true});
const vite=await createServer({root:resolve('upms.client'),server:{middlewareMode:true},appType:'custom'});
let browser;
try {
 const {company,products}=await vite.ssrLoadModule('/src/data/company.js');
 browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage();
 await page.setViewport({width:1000,height:800,deviceScaleFactor:2});
 async function svgPng(path,name,width,height){
  const data=await readFile(path);
  await page.setContent(`<style>body{margin:0}img{display:block;width:${width}px;height:${height}px;object-fit:contain}</style><img src="data:image/svg+xml;base64,${data.toString('base64')}">`);
  await page.$eval('img',img=>img.decode());
  const output=resolve(directory,name+'.png');
  await (await page.$('img')).screenshot({path:output,omitBackground:true});return output;
 }
 const logo=await svgPng('upms.client/src/assets/unique_plastic_logos_hd/unique_plastic.svg','logo',160,100);
 const documents=[];
 for(const product of products){
  const image=product.image.startsWith('/assets/')?resolve('upms.client/public'+product.image):await svgPng(resolve('upms.client/src/assets/products/'+product.id+'-illustration.svg'),product.id,720,430);
  documents.push({...product,pdfImage:image,illustration:!product.catalogImage});
 }
 await writeFile(resolve(directory,'catalog.json'),JSON.stringify({company,logo,products:documents},null,2)+'\n');
 console.log('Exported five approved catalog categories and official logo.');
} finally {await browser?.close();await vite.close();}
