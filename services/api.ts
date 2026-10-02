import type { AppData, DashboardData } from "@/types";
export async function api<T>(path:string, options:RequestInit={}):Promise<T>{
  const response=await fetch("/api/"+path,{...options,headers:{"Content-Type":"application/json",...options.headers},cache:"no-store"});
  const body=await response.json().catch(()=>({error:"Không thể kết nối dữ liệu. Vui lòng thử lại."}));
  if(!response.ok) throw new Error(body.error||"Không thể kết nối dữ liệu. Vui lòng thử lại."); return body as T;
}
export const getAll=()=>api<AppData>("data");
export const getDashboard=(month:string,companyId="")=>api<DashboardData>("dashboard?month="+encodeURIComponent(month)+"&companyId="+encodeURIComponent(companyId));
export const save=(resource:string, body:unknown, id?:string)=>api(id?resource+"/"+encodeURIComponent(id):resource,{method:id?"PUT":"POST",body:JSON.stringify(body)});
export const remove=(resource:string,id:string)=>api(resource+"/"+encodeURIComponent(id),{method:"DELETE"});
