export function assertSupportedRuntime(version=process.versions.node){
 const [major,minor,patch]=version.replace(/^v/,'').split('.').map(Number),minimum=major===22?[23,4]:major===24?[22,0]:null;
 if(!minimum||minor<minimum[0]||minor===minimum[0]&&patch<minimum[1])throw Error('Use the tested Node 22.23.4+ or Node 24.22.0+ release line');
 return major;
}
