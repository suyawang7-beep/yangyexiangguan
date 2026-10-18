// Start is inclusive; end is exclusive. Reads and account recovery remain available.
export function activityPhase({startsAt,endsAt},at=Date.now()){
 if(startsAt!==null&&at<Date.parse(startsAt))return 'upcoming';
 if(endsAt!==null&&at>=Date.parse(endsAt))return 'ended';
 return 'active';
}
function timestamp(value){
 if(value===null)return null;
 if(typeof value!=='string')throw Error('时间必须包含时区，或留空');
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
 if(!m)throw Error('时间必须包含时区，或留空');
 const [,year,month,date,hour,minute,second,,zone]=m;
 const days=new Date(Date.UTC(Number(year),Number(month),0)).getUTCDate();
 if(Number(year)<1000||Number(month)<1||Number(month)>12||Number(date)<1||Number(date)>days||Number(hour)>23||Number(minute)>59||Number(second)>59|| (zone!=='Z'&&(Number(zone.slice(1,3))>14||Number(zone.slice(4))>59||(Number(zone.slice(1,3))===14&&Number(zone.slice(4))!==0))))throw Error('日期或时区无效');
 const n=Date.parse(value);if(!Number.isFinite(n))throw Error('日期无效');
 return new Date(n).toISOString();
}
export function validateActivity(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).length!==2||!Object.hasOwn(payload,'startsAt')||!Object.hasOwn(payload,'endsAt'))throw Error('请同时提供开始和结束时间，留空使用 null');
 const startsAt=timestamp(payload.startsAt),endsAt=timestamp(payload.endsAt);
 if(startsAt!==null&&endsAt!==null&&Date.parse(endsAt)<=Date.parse(startsAt))throw Error('结束时间必须晚于开始时间');
 return {startsAt,endsAt};
}
