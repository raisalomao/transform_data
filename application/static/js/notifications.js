export function exibirNotificacao(mensagem, tipo = 'primary') {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        console.warn("Container de notificações não encontrado. Usando alert() como fallback.", mensagem);
        alert(mensagem);
        return;
    }
    const notificationId = `notif-${Date.now()}`;
    const notificationHtml = `
        <div id="${notificationId}" class="alert alert-${tipo} alert-dismissible fade show" role="alert">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>`;
    notificationContainer.insertAdjacentHTML('beforeend', notificationHtml);
    const notifEl = document.getElementById(notificationId);
    setTimeout(() => {
        if (notifEl) new bootstrap.Alert(notifEl).close();
    }, 5000);
}