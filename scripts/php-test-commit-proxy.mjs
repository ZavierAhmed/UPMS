import {createServer,connect} from 'node:net';

// Test-only plain loopback MySQL protocol proxy. Frame TCP streams before inspection:
// PDO can coalesce COM_STMT_CLOSE and COMMIT into the same TCP chunk.
export async function lostCommitProxy({host,port}){
 const sockets=new Set();let dropped=false;
 function frames(consume){let pending=Buffer.alloc(0);return chunk=>{pending=Buffer.concat([pending,chunk]);while(pending.length>=4){const length=pending.readUIntLE(0,3)+4;if(pending.length<length)break;const packet=pending.subarray(0,length);pending=pending.subarray(length);if(consume(packet)===false){pending=Buffer.alloc(0);break;}}};}
 const proxy=createServer(client=>{const upstream=connect({host,port});sockets.add(client);sockets.add(upstream);let armed=false,commit=false;
  for(const socket of [client,upstream]){socket.on('error',()=>{});socket.on('close',()=>{sockets.delete(socket);client.destroy();upstream.destroy();});}
  client.on('data',frames(packet=>{if(packet.length>5&&[3,22].includes(packet[4])){const sql=packet.subarray(5).toString().trim();if(/insert into [`]?v1_commands/i.test(sql))armed=true;if(armed&&/^COMMIT\s*;?$/i.test(sql))commit=true;}upstream.write(packet);}));
  upstream.on('data',frames(packet=>{if(commit&&armed&&!dropped&&packet.length>4&&packet[4]===0){dropped=true;client.destroy();upstream.destroy();return false;}client.write(packet);}));
 });await new Promise(r=>proxy.listen(0,host,r));return{proxy,sockets,port:proxy.address().port,dropped:()=>dropped};
}
