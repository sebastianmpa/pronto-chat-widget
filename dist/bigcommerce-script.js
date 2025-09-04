// Widget initialization function
function initProntoChat() {
    // Create and configure widget
    var widget = document.createElement('pronto-chat');
    widget.setAttribute('data-endpoint', 'https://rag-chat.prontomowers.app');
    widget.setAttribute('data-title', 'Pronto Mowers');
    widget.setAttribute('data-primary', '#ff6a00');
    widget.setAttribute('data-bg', '#f3f6fc');
    widget.setAttribute('data-bubble-radius', '12');
    widget.setAttribute('data-terms-url', 'https://briggs.lawnmowers.parts/terms-conditions/');
    widget.setAttribute('hide-fab', '');
    document.body.appendChild(widget);

    // Setup chat button - Modificar el botón de manuales existente
    var manualButton = document.querySelector('a[href="/parts-manuals/"]');
    if (manualButton) {
        manualButton.onclick = function(e) {
            e.preventDefault();
            if (typeof window.openProntoChat === 'function') {
                window.openProntoChat();
            }
        };
    }
}

// Load widget script
var script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/gh/sebastianmpa/pronto-chat-widget@main/dist/pronto-chat-widget.iife.js';
script.onload = function() {
    // Initialize after script is loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initProntoChat();
    } else {
        document.addEventListener('DOMContentLoaded', initProntoChat);
    }
};
document.head.appendChild(script);
