import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import cn from "classnames";
import { renderMarkdown } from "@/utils/markdownRenderer";
export default function ChatMessageComponent({ message, isUser, userName, botName }) {
    return (_jsxs("div", { className: cn("pc-row", isUser ? "pc-row-me" : "pc-row-bot"), children: [_jsx("div", { className: cn("pc-name", isUser ? "pc-name-me" : "pc-name-bot"), children: isUser ? userName : botName }), _jsx("div", { className: cn("pc-bubble", isUser ? "pc-me" : "pc-bot"), children: renderMarkdown(message.text) })] }));
}
