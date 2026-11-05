export function chequeReferencePreview(number,name,amount) {
 const normalized=number.replace(/^0+/,'');
 if(!/^[1-9][0-9]{0,29}$/.test(normalized)||!/^\d+(\.\d{1,2})?$/.test(amount)||!name)return '';
 const client=name.trim().replace(/[^A-Za-z0-9]+/g,'-').toUpperCase().replace(/^-+|-+$/g,'')||'CLIENT';
 const [whole,fraction='']=amount.split('.');
 const money=whole.replace(/^0+(?=\d)/,'')+'-'+fraction.padEnd(2,'0');
 const nameLimit=Math.max(1,Math.min(25,100-normalized.length-money.length-3-32));
 return `${normalized}-${client.slice(0,nameLimit).replace(/-+$/,'')}-${money}`;
}
