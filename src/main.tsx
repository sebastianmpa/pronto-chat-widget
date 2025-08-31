import React from "react";
import { createRoot } from "react-dom/client";
import ChatWidget from "@/components/ChatWidget";
import "@/styles/widget.css";
import { setBase } from "@/lib/api";

// Apunta al mock API
setBase("https://rag-chat.prontomowers.app/");

createRoot(document.getElementById("root")!).render(
  <ChatWidget
    endpoint="https://rag-chat.prontomowers.app/"
    title="Pronto Mowers"
    primary="#ff6a00"
    bg="#f3f6fc"
    bubbleRadius={12}
    token={null}
    logoUrl="/vite.svg"
    enableDrag={true}
  />
);
