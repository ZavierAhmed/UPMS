import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import plugin from "@vitejs/plugin-react";
import { env } from "node:process";
import {productDocuments, productDownloadHeaders} from '../server/src/website/product-documents.js';
function productDownloads() {
 const configure = server => {
  server.middlewares.use((req,res,next)=>{
   const path=req.url?.split('?')[0];
   if (!path?.startsWith('/downloads/')) return next();
   const doc=productDocuments(fileURLToPath(new URL('./public',import.meta.url))).get(path);
   if (!doc) {res.statusCode=404;return res.end();}
   if(!['GET','HEAD'].includes(req.method)){res.statusCode=405;res.setHeader('Allow','GET, HEAD');return res.end();}
   for(const [key,value] of Object.entries(productDownloadHeaders(doc)))res.setHeader(key,value);
   next();
  });
 };
 return {name:'approved-product-downloads',configureServer:configure,configurePreviewServer:configure};
}
export default defineConfig({
  plugins: [plugin(),productDownloads()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: Number(env.DEV_SERVER_PORT || 58500),
    proxy: {
      "^/api": { target: env.API_PROXY_TARGET || "http://localhost:3000" },
    },
  },
});
