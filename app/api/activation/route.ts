const origin="https://vip666ai.com";
const products=new Set(["claude_pro","claude_max_5x","claude_max_20x","claude_max_5x_special","claude_max_20x_special"]);
const messages:Record<number,string>={100101:"This key is invalid. Check the key and try again.",100102:"This key has already been used.",100103:"This key has expired.",100301:"The provider could not complete activation. Check the original order before trying again.",100302:"This account already has an activation in progress. Do not submit again.",100303:"The provider requires an additional same-day activation confirmation. Continue on vip666ai.com.",100305:"The previous result is uncertain. Contact the provider before submitting again.",100307:"Activation for this plan is temporarily paused.",100401:"The provider requires membership overwrite confirmation. Continue on vip666ai.com.",100501:"This plan is currently out of stock.",100601:"The provider requires a security check. Continue on vip666ai.com.",100007:"The provider requires a security check. Continue on vip666ai.com.",42900:"Too many requests. Please wait a few minutes."};
class UserError extends Error{constructor(message:string,public status=400){super(message)}}
function str(v:unknown,max:number){if(typeof v!=="string"||!v.trim()||v.length>max)throw new UserError("Required information is missing or invalid.");return v.trim()}
function result(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
export async function POST(request:Request){try{
 const reqOrigin=request.headers.get("origin");if(reqOrigin&&reqOrigin!==new URL(request.url).origin)throw new UserError("This request must come from the activation page.",403);
 const raw=await request.text();if(raw.length>16000)throw new UserError("The request is too large.",413);
 let b:Record<string,any>;try{b=JSON.parse(raw)}catch{throw new UserError("Invalid request.")};if(!b||typeof b!=="object")throw new UserError("Invalid request.");
 const visitor=str(b.visitor,80);if(!/^[a-zA-Z0-9-]+$/.test(visitor))throw new UserError("Invalid visitor reference.");
 async function upstream(path:string,payload?:unknown,token?:string){const r=await fetch(origin+"/api/user"+path,{method:payload?"POST":"GET",headers:{"Content-Type":"application/json","Accept":"application/json","Accept-Language":"en","X-Visitor-Id":visitor,...token?{"X-Order-Query-Token":token}:{}},body:payload?JSON.stringify(payload):undefined,signal:AbortSignal.timeout(25000),redirect:"manual"});let j;try{j=await r.json() as {code:number|string;data:any}}catch{throw new UserError("The provider returned an unreadable response. Check the original order before retrying.",502)};if(!r.ok||Number(j.code)!==0)throw new UserError(messages[Number(j.code)]||(r.status===429?messages[42900]:"The provider could not process this request. Check the key or account details on vip666ai.com."),r.status===429?429:422);return j.data}
 async function probe(){const p=await upstream("/cards/probe",{code:str(b.code,64)});if(p?.valid!==true)throw new UserError("This key is invalid or unavailable. Check it with your seller.");if(!products.has(p.product_code))throw new UserError("This key is not for a supported Claude plan.");if(p.supported_recharge_modes&&!p.supported_recharge_modes.some((m:string)=>["claude_org","claude_session_key"].includes(m)))throw new UserError("This key requires an activation method available on vip666ai.com.");return p}
 function order(d:any,token?:string){if(!d||typeof d.order_no!=="string"||![1,2,3,4,5].includes(d.status))throw new UserError("The provider returned an unexpected order result. Check the original order on vip666ai.com.",502);return {order_no:d.order_no,status:d.status,query_token:token||d.query_token}}
 if(b.action==="verify"){const p=await probe();return result({data:{product_code:p.product_code,supported_recharge_modes:p.supported_recharge_modes}})}
 if(b.action==="redeem"){
  if(b.ack!==true)throw new UserError("Confirm your account and activation details first.");
  if(!["claude_org","claude_session_key"].includes(b.mode))throw new UserError("Choose a supported account method.");
  const payload:Record<string,unknown>={card_code:str(b.code,64),recharge_mode:b.mode,language:"en",confirm_overwrite:false};
  if(b.mode==="claude_org"){const id=str(b.account,128);if(id!==str(b.confirm,128))throw new UserError("Organization IDs must match.");if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new UserError("Enter a valid Organization ID.");payload.account_id=id;payload.account_id_confirm=id}else{const key=str(b.session,4096);if(!/^sk-\S+$/.test(key))throw new UserError("Enter a valid Claude SessionKey.");payload.account_id="";payload.claude_session_key=key}
  const p=await probe();if(p.supported_recharge_modes&&!p.supported_recharge_modes.includes(b.mode))throw new UserError("This key does not support the selected account method.");
  const d=await upstream("/redeem",payload);return result({data:order(d)});
 }
 if(b.action==="order"){const id=str(b.order,128),token=str(b.token,2048);if(!/^[a-zA-Z0-9_-]+$/.test(id))throw new UserError("Invalid order reference.");return result({data:order(await upstream("/orders/"+encodeURIComponent(id),undefined,token),token)})}
 if(b.action==="lookup"){const d=await upstream("/cards/query",{code:str(b.code,64)});const s=["success","processing","invalid","unused","failed","expired","disabled"].includes(d?.status)?d.status:"unknown";return result({data:{status:s}})}
 throw new UserError("Unknown request.");
 }catch(e){return result({error:e instanceof UserError?e.message:"Unable to reach the provider. If you submitted an activation, check its status before trying again."},e instanceof UserError?e.status:502)}}



