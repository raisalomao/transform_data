document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('arquivo_dados');
    const separatorSection = document.getElementById('csv-separator-section');
    const validExtensions = ['.csv', '.xlsx', '.json'];

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) {
            separatorSection.style.display = 'none';
            return;
        }
        const fileName = file.name.toLowerCase();

        if (!validExtensions.some(ext => fileName.endsWith(ext))) {
            alert('Formato inválido! Por favor, selecione um arquivo CSV, XLSX ou JSON.');
            fileInput.value = '';
            separatorSection.style.display = 'none';
            return;
        }

        if (fileName.endsWith('.csv')) {
            separatorSection.style.display = 'block';
        } else {
            separatorSection.style.display = 'none';
        }
    });

    const previewModalEl = document.getElementById('previewModal');
    if (previewModalEl) {
        const previewContent = document.getElementById('preview-content');
        if (previewContent && previewContent.innerHTML.trim() !== '') {
            sessionStorage.removeItem('passosAplicados');
            const previewModal = new bootstrap.Modal(previewModalEl);
            previewModal.show();
        }
    }
});