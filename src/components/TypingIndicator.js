import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import cn from "classnames";
export default function TypingIndicator({ botName }) {
    return (_jsxs("div", { className: cn("pc-row", "pc-row-bot"), children: [_jsx("div", { className: "pc-name pc-name-bot", children: botName }), _jsx("div", { className: "pc-bubble pc-bot", children: _jsxs("div", { className: "pc-typing", children: [_jsx("span", { className: "d" }), _jsx("span", { className: "d" }), _jsx("span", { className: "d" })] }) })] }));
}
