// Ledger history remains unchanged; convert every row before adding, never SUM REALs.
export function coinTenths(amount){
 if(typeof amount!=='number'||!Number.isFinite(amount))throw Object.assign(new Error('金币数额必须是有限数字'),{status:400});
 const scaled=amount*10,tenths=Math.round(scaled);
 if(!Number.isSafeInteger(tenths)||Math.abs(scaled-tenths)>Math.min(1e-7,Number.EPSILON*Math.max(1,Math.abs(scaled))*4))throw Object.assign(new Error('金币数额只支持0.1精度或数额过大'),{status:400});
 return tenths;
}
export function validCoinAmount(amount){try{return coinTenths(amount)>0&&amount<=5000}catch{return false}}
export function ledgerBalance(db,userId){
 let total=0;
 for(const row of db.prepare('SELECT amount FROM ledger WHERE user_id=?').iterate(userId)){
  total+=coinTenths(row.amount);
  if(!Number.isSafeInteger(total))throw Object.assign(new Error('金币余额超出安全范围'),{status:409});
 }
 return total/10;
}
