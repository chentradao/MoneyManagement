"use client";
import { useEffect } from "react";
export function Toast({message,kind="success",onClose}:{message:string;kind?:"success"|"error";onClose:()=>void}){useEffect(()=>{if(message){const t=setTimeout(onClose,3600);return()=>clearTimeout(t)}},[message,onClose]);if(!message)return null;return <div role="status" className={"toast "+kind}>{kind==="success"?"✓":"!"} {message}</div>}
