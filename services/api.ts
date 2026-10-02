import type { AppData, DashboardData } from "@/types";
export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch("/api/"+path,{...options,headers:{"Content-Type":"application/json",...options.headers},cache:"no-store"});
  const body=await response.json().catch(()=>({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."}));
  if(!response.ok) throw new Error(body.error||"Không thể kết nối dữ liệu. Vui lòng thử lại."); return body as T;
}
const resources:(keyof AppData)[]=["cash","accounts","investments","loans","companies","rates","attendance"];
function normalizeData(data:Partial<AppData>|null|undefined,requested: (keyof AppData)[]=resources):Partial<AppData>{
  return Object.fromEntries(requested.map(key=>[key,Array.isArray(data?.[key])?data[key]:[]])) as Partial<AppData>;
}
export const getAll=async()=>normalizeData(await api<Partial<AppData>>("data")) as AppData;
export const getData=async(requested:(keyof AppData)[])=>normalizeData(await api<Partial<AppData>>("data?resources="+encodeURIComponent(requested.join(","))),requested);
export const getDashboard=(month:string,companyId="")=>api<DashboardData>("dashboard?month="+encodeURIComponent(month)+"&companyId="+encodeURIComponent(companyId));
export const save=(resource:string, body:unknown, id?:string)=>api(id?resource+"/"+encodeURIComponent(id):resource,{method:id?"PUT":"POST",body:JSON.stringify(body)});
export const remove=(resource:string,id:string)=>api(resource+"/"+encodeURIComponent(id),{method:"DELETE"});
