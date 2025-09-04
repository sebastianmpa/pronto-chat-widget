<script>
document.addEventListener('DOMContentLoaded', function () {
    try {
        // Verificar si el botón ya existe
        if (!document.querySelector('.btn-rag-chat')) {
            const container = document.querySelector('.productView-description') || document.body;
            const btnHtml = `
                <button class="btn-rag-chat" style="
                    margin-top: 10px;
                    padding: 10px 20px;
                    background-color: #ff6a00;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">Abrir chat</button>
            `;
            container.insertAdjacentHTML('beforeend', btnHtml);
            console.log('Botón de chat creado');
        }
    } catch (error) {
        console.error('Error creando el botón de chat:', error);
    }
});
</script>