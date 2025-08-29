import React, { useEffect, useState } from "react";

type Toast = { id: string; text: string };
let pushFn: (t: Toast) => void;

export function pushToast(text: string) {
  pushFn?.({ id: crypto.randomUUID(), text });
}

export default function Toasts() {
  const [list,setList] = useState<Toast[]>([]);
  useEffect(()=>{ pushFn = (t)=>{ setList(l=>[...l,t]); setTimeout(()=>setList(l=>l.filter(x=>x.id!==t.id)), 3000); }; },[]);
  return (
    <div style={{ position:"fixed", right:20, bottom:120, display:"grid", gap:8, zIndex:2147483647 }}>
      {list.map(t => (
        <div key={t.id} style={{ background:"#111", color:"#fff", padding:"8px 12px", borderRadius:10, boxShadow:"0 6px 20px rgba(0,0,0,.3)" }}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
