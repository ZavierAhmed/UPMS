import {execFileSync} from 'node:child_process';
import {chmod} from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function protectPrivateDirectory(directory){
 if(process.platform==='win32'){
  const owner=process.env.USERDOMAIN+'\\'+process.env.USERNAME;
  assert.ok(process.env.USERDOMAIN&&process.env.USERNAME);
  execFileSync('icacls.exe',[directory,'/inheritance:r','/grant:r',owner+':(OI)(CI)F','*S-1-5-18:(OI)(CI)F','*S-1-5-32-544:(OI)(CI)F'],{stdio:'ignore',windowsHide:true});
 }else await chmod(directory,0o700);
}
