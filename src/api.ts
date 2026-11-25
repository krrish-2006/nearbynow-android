import {auth} from './auth';
export const BASE='https://nearbynow-local-market-ks.navycrown131.chatgpt.site';
export type Product={id:string;shop_id:string;shop:string;name:string;category:string;unit:string;price:number;stock:number;photo:string|null};
export type Address={id?:string;label:string;address:string;pin:string;coordinates?:{lat:number;lng:number}};
export type Order={id:string;shop:string;status:string;total:number;created:number;address:string;pin:string;lines:{id:string;name:string;unit:string;price:number;photo:string|null;qty:number}[];position?:{lat:number;lng:number;time:number}|null};
export const money=(n:number)=>'₹'+(n/100).toLocaleString('en-IN',{maximumFractionDigits:2,minimumFractionDigits:2});
export function photo(url:string|null){return url?BASE+url:null}
export async function api<T>(route:string,body?:unknown):Promise<T>{const token=await auth.currentUser?.getIdToken();if(!token)throw Error('Sign in to continue.');let response:Response;try{response=await fetch(BASE+'/api/v1/'+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)})}catch{throw Error('Could not reach NearbyNow. Check your connection and retry.')}let data:any;try{data=await response.json()}catch{throw Error('The service is temporarily unavailable.')}if(!response.ok)throw Error(data.error||'Request failed.');return data as T}
