import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs";
const apiUrl=()=>process.env.NEXT_PUBLIC_API_URL;
async function forward(req:NextRequest, method:string){
  const url=apiUrl(); if(!url || url.includes("REPLACE_WITH")) return NextResponse.json({error:"Chưa cấu hình NEXT_PUBLIC_API_URL trong .env.local."},{status:503});
  const segments=req.nextUrl.pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean);
  const offset=segments[0]==="finance"?1:0;
  const query=Object.fromEntries(req.nextUrl.searchParams.entries());
  let body:any={};
  if(method!=="GET"){try{body=await req.json()}catch{body={}}}
  const resource=segments[offset]||"";
  if(segments.length>offset+1) body.id=decodeURIComponent(segments[offset+1]);
  if(req.headers.get("x-record-id"))body.id=req.headers.get("x-record-id");
  const action=segments[offset+2]==="restore"?"restore":resource==="data"?(query.resources?"getData":"getAll"):resource==="dashboard"?"dashboard":method==="GET"?"list":method==="POST"?"create":method==="PUT"?"update":method==="DELETE"?"delete":"";
  if(!action) return NextResponse.json({error:"API không hỗ trợ phương thức này."},{status:405});
  try{
    const result=await fetch(url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,resource,...query,...body,apiToken:process.env.APP_API_TOKEN||""}),cache:"no-store",redirect:"follow"});
    const contentType=result.headers.get("content-type")||"";
    const text=await result.text();
    let data:any;
    try{data=JSON.parse(text)}catch{
      console.error("Apps Script returned a non-JSON response",{status:result.status,contentType});
      return NextResponse.json({error:"Google Apps Script không trả dữ liệu JSON. Hãy kiểm tra URL /exec, quyền truy cập và bản triển khai Web App."},{status:502});
    }
    if(!result.ok){
      console.error("Apps Script request failed",{status:result.status,contentType});
      return NextResponse.json({error:data.error||`Google Apps Script trả mã HTTP ${result.status}.`},{status:502});
    }
    return NextResponse.json(data,{status:data.error?400:200});
  }catch(e){console.error("Apps Script proxy request failed",e instanceof Error?e.message:"unknown error");return NextResponse.json({error:"Không kết nối được tới Google Apps Script. Hãy kiểm tra bản triển khai và thử lại."},{status:502})}
}
export const GET=(r:NextRequest)=>forward(r,"GET");
export const POST=(r:NextRequest)=>forward(r,"POST");
export const PUT=(r:NextRequest)=>forward(r,"PUT");
export const DELETE=(r:NextRequest)=>forward(r,"DELETE");
