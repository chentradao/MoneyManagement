import { NextRequest,NextResponse } from "next/server";
import { createHmac,timingSafeEqual } from "node:crypto";
export const runtime="nodejs";
export async function GET(req:NextRequest){
 if(!process.env.APP_PASSWORD)return NextResponse.json({authenticated:process.env.NODE_ENV!=="production",configurationRequired:process.env.NODE_ENV==="production"});
 const secret=process.env.SESSION_SECRET,cookie=req.cookies.get("personal_session")?.value;
 if(secret&&cookie){const [expires,sig]=cookie.split(".");const expected=createHmac("sha256",secret).update(expires+":"+process.env.APP_PASSWORD).digest();try{const actual=Buffer.from(sig,"base64url");if(Number(expires)>Date.now()&&actual.length===expected.length&&timingSafeEqual(actual,expected))return NextResponse.json({authenticated:true})}catch{}}
 return NextResponse.json({authenticated:false});
}
export async function POST(req:NextRequest){
 const password=process.env.APP_PASSWORD,secret=process.env.SESSION_SECRET;
 if(!password||!secret)return NextResponse.json({error:"Hãy cấu hình APP_PASSWORD và SESSION_SECRET trước khi bật website."},{status:503});
 let input="";try{input=(await req.json()).password||""}catch{}
 const a=Buffer.from(String(input)),b=Buffer.from(password);
 if(a.length!==b.length||!timingSafeEqual(a,b))return NextResponse.json({error:"Mật khẩu chưa đúng."},{status:401});
 const expires=String(Date.now()+7*24*60*60*1000),signature=createHmac("sha256",secret).update(expires+":"+password).digest("base64url");
 const response=NextResponse.json({authenticated:true});response.cookies.set("personal_session",expires+"."+signature,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:7*24*60*60});return response;
}
export async function DELETE(){const response=NextResponse.json({authenticated:false});response.cookies.set("personal_session","",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:0});return response}
