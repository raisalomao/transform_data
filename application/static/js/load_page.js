window.addEventListener('DOMContentLoaded', () => {
    
    const filenameInput = document.getElementById('filename-input');
    const csvBtn = document.getElementById('download-csv-btn');
    const jsonBtn = document.getElementById('download-json-btn');
    const excelBtn = document.getElementById('download-excel-btn');
    const cardTitle = document.getElementById('card-file-title');

    function updateDownloadLinks() {
        let baseName = filenameInput.value.trim();
        if (!baseName) {
            baseName = 'save_transform_data';
        }

        csvBtn.download = baseName + '.csv';
        jsonBtn.download = baseName + '.json';
        excelBtn.download = baseName + '.xlsx';
        
        if (cardTitle) {
            cardTitle.textContent = `${baseName}`; 
        }
    }

    if (filenameInput) {
        filenameInput.addEventListener('input', updateDownloadLinks);
    }
    
    updateDownloadLinks();

});