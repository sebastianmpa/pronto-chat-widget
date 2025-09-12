import { getCustomerId, getConversationId, getRagSessionId, } from "@/lib/storage";
import { askQuestion } from "@/lib/api";
import { pushToast } from "@/components/Toast";
export async function sendMessage({ text, lang, onAddMessage, onSetTyping }) {
    const v = text.trim();
    if (!v)
        return;
    const customerId = getCustomerId();
    const user = {
        id: crypto.randomUUID(),
        who: "user",
        text: v
    };
    onAddMessage(user);
    onSetTyping(true);
    try {
        if (!customerId || customerId === "undefined") {
            pushToast(lang === "es" ? "Completa tus datos primero" : "Complete your info first");
            onSetTyping(false);
            return;
        }
        let conversationId = getConversationId();
        let session_id = getRagSessionId() || undefined;
        const payload = {
            customerId,
            question: v,
            metadata: { path: location.pathname, locale: lang },
        };
        if (session_id) {
            payload.session_id = session_id;
            if (conversationId)
                payload.conversationId = conversationId;
        }
        const r = await askQuestion(payload);
        /* if (r.session_id) {
           setRagSessionId(r.session_id);
           setConversationId(r.session_id);
         }*/
        const botMsg = {
            id: crypto.randomUUID(),
            who: "assistant",
            text: r.answer
        };
        onAddMessage(botMsg);
    }
    catch (error) {
        const errorMsg = {
            id: crypto.randomUUID(),
            who: "assistant",
            text: lang === "es" ? "Error, inténtalo de nuevo." : "Error, try again."
        };
        onAddMessage(errorMsg);
    }
    finally {
        onSetTyping(false);
    }
}
