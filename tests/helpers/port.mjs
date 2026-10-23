import {createServer} from 'node:net';
import {randomInt} from 'node:crypto';
// Linux client ephemeral ports overlap the old 60000 range. Use a probed low port.
export async function availablePort(start=20000+randomInt(10000)){
 if(!Number.isInteger(start)||start<20000||start>=30000)throw Error('Invalid fixture port range');
 for(let offset=0;offset<100;offset++){
  const port=20000+(start-20000+offset)%10000,probe=createServer();
  const result=await new Promise((resolve,reject)=>{probe.once('error',error=>error.code==='EADDRINUSE'?resolve(false):reject(error));probe.listen(port,'127.0.0.1',()=>probe.close(()=>resolve(true)))});
  if(result)return port;
 }
 throw Error('No fixture port available');
}
