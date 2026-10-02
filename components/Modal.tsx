"use client";
import { X } from "lucide-react";
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19}/></button></div>{children}</section></div>}
