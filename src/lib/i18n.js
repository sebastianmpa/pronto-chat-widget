const dict = {
    es: {
        open: "Chat",
        send: "Enviar",
        typing: "Escribiendo…",
        welcome: "¡Hola{name}! Puedo ayudarte a identificar partes compatibles, descargar manuales y añadir productos al carrito.",
        name: "Nombre",
        email: "Correo",
        lastName: "Apellido",
        consent: "Acepto la política de privacidad",
        start: "Comenzar",
        invalidEmail: "Correo inválido",
        required: "Campo requerido",
        loadMore: "Cargar más",
        clear: "Borrar conversación",
        minimize: "Minimizar",
        close: "Cerrar",
        language: "Idioma",
        // Rating system
        rateExperience: "Califica tu experiencia",
        ratePrompt: "¿Cómo fue tu experiencia con el asistente?",
        good: "Bueno",
        neutral: "Neutral",
        bad: "Malo",
        commentOptional: "Comentario (opcional)",
        submitRating: "Enviar calificación",
        thankYou: "¡Gracias por tu calificación!",
        conversationEnded: "Conversación finalizada",
        disclaimer: "Este Asistente AI puede cometer errores. Comprueba la información importante.",
        endChat: "Finalizar chat",
        turnOffSignal: "Haz clic en la señal de apagado para salir del chat",
        confirmEndChat: "¿Estás seguro que deseas finalizar el chat?",
        yes: "Sí",
        no: "No"
    },
    en: {
        open: "Chat",
        send: "Send",
        typing: "Typing…",
        welcome: "Hi{name}! I can help identify compatible parts, download manuals and add products to your cart.",
        name: "Name",
        email: "Email",
        lastName: "Last Name",
        consent: "I accept the privacy policy",
        start: "Start",
        invalidEmail: "Invalid email",
        required: "Required",
        loadMore: "Load more",
        clear: "Clear conversation",
        minimize: "Minimize",
        close: "Close",
        language: "Language",
        // Rating system
        rateExperience: "Rate your experience",
        ratePrompt: "How was your experience with the assistant?",
        good: "Good",
        neutral: "Neutral",
        bad: "Bad",
        commentOptional: "Comment (optional)",
        submitRating: "Submit rating",
        thankYou: "Thank you for your rating!",
        conversationEnded: "Conversation ended",
        disclaimer: "This AI Assistant may make mistakes. Check important information.",
        endChat: "End chat",
        turnOffSignal: "Click the turn-off signal to leave the chat",
        confirmEndChat: "Are you sure you want to end the chat?",
        yes: "Yes",
        no: "No"
    }
};
export function detectLang() {
    const n = (navigator.language || "en").slice(0, 2).toLowerCase();
    return n === "es" ? "es" : "en";
}
export function t(lang, key, params) {
    const template = dict[lang][key];
    if (params === null || params === void 0 ? void 0 : params.name) {
        return template.replace("{name}", ` ${params.name}`);
    }
    return template.replace("{name}", "");
}
