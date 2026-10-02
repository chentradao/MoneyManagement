import { NextRequest,NextResponse } from "next/server";
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
async function valid(value:string,password:string,secret:string){
 try{const [exp,sig]=value.split(".");if(Number(exp)<Date.now()||!sig)return false;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);const expected=Uint8Array.from(atob(sig.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((sig.length+3)%4)),c=>c.charCodeAt(0));return crypto.subtle.verify("HMAC",key,expected,new TextEncoder().encode(exp+":"+password))}catch{return false}
}
export async function middleware(req:NextRequest){
 const isApi=req.nextUrl.pathname.startsWith("/api/");
 if(req.nextUrl.pathname==="/login"||req.nextUrl.pathname==="/api/auth")return NextResponse.next();
 const password=process.env.APP_PASSWORD,secret=process.env.SESSION_SECRET;
 if(!password){if(process.env.NODE_ENV!=="production")return NextResponse.next();return isApi?NextResponse.json({error:"Website chưa được cấu hình mật khẩu bảo vệ."},{status:503}):NextResponse.redirect(new URL("/login?setup=1",req.url))}
 if(!secret)return isApi?NextResponse.json({error:"Thiếu SESSION_SECRET."},{status:503}):NextResponse.redirect(new URL("/login?setup=1",req.url));
 const cookie=req.cookies.get("personal_session")?.value;
 if(cookie&&await valid(cookie,password,secret))return NextResponse.next();
 return isApi?NextResponse.json({error:"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."},{status:401}):NextResponse.redirect(new URL("/login",req.url));
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
