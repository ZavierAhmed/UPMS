// Public-only loopback preview. No management, database, credentials or SMTP.
import {createApp} from '../server/src/app.js';
import {loadConfig} from '../server/src/config/index.js';
const config=loadConfig({NODE_ENV:'testing',ALLOWED_HOSTS:'127.0.0.1',INQUIRY_MODE:'Disabled'});
createApp({config,management:null,delivery:async()=> 'Unavailable'}).listen(3126,'127.0.0.1',()=>console.log('UAT-3A public preview: http://127.0.0.1:3126/'));
