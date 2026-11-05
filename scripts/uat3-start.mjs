import {createApp} from '../server/src/app.js';import {loadConfig} from '../server/src/config/index.js';import {startUnifiedPreview} from './uat3-preview.mjs';
const config=loadConfig({NODE_ENV:'testing',ALLOWED_HOSTS:'127.0.0.1',MANAGEMENT_ENABLED:'false',INQUIRY_MODE:'Disabled',PUBLIC_ORIGIN:''});
const publicServer=createApp({config,management:null,delivery:async()=> 'Unavailable',log:()=>{}}).listen(3125,'127.0.0.1');
try{const management=await startUnifiedPreview();console.log(JSON.stringify({public:'http://127.0.0.1:3125',management:'http://127.0.0.1:5205/management',...management.status(),ownerDatabasesChanged:false,productionContacted:false,smtpEnabled:false}));}catch(error){publicServer.close();throw error;}
