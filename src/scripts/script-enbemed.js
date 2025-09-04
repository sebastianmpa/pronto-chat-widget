<script>
(function() {
  var d = document, s = d.createElement("script");
  s.type = "text/javascript";
  s.defer = true;
  s.src = "https://pronto-chat-widget-qw53.vercel.app/pronto-chat-widget.iife.js";
  s.onload = function() {
    if (!d.querySelector('pronto-chat')) {
      var w = d.createElement('pronto-chat');
      w.setAttribute('data-endpoint', 'https://rag-chat.prontomowers.app');
      w.setAttribute('data-title', 'Pronto Mowers');
      w.setAttribute('data-primary', '#ff6a00');
      w.setAttribute('data-bg', '#f3f6fc');
      w.setAttribute('data-bubble-radius', '12');
      w.setAttribute('data-logo-url', 'https://pronto-chat-widget-qw53.vercel.app/imagen2.png');
      w.setAttribute('data-draggable', 'true');
      w.setAttribute('data-terms-url', 'https://briggs.lawnmowers.parts/terms-conditions/');
      w.setAttribute('hide-fab', '');
      d.body.appendChild(w);

      // Esperar un momento y luego configurar el evento click en el botón
      setTimeout(function() {
        var chatButton = d.querySelector('.btn-rag-chat');
        if (chatButton) {
          chatButton.onclick = function(e) {
            e.preventDefault();
            if (typeof window.openProntoChat === 'function') {
              window.openProntoChat();
            }
            return false;
          };
          console.log('Chat widget: Botón configurado correctamente');
        } else {
          console.log('Chat widget: Botón no encontrado');
        }
      }, 1000);
    }
  };
  d.body.appendChild(s);
})();
</script>