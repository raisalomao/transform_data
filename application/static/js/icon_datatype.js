export function getIconForDtype(dtype) {

    dtype = String(dtype).toLowerCase();
    if (dtype.includes('int') || dtype.includes('float')) {
        return '<i class="bi bi-123 text-muted" title="Número"></i>'; 
    }
    if (dtype.includes('datetime') || dtype.includes('timestamp')) {
        return '<i class="bi bi-calendar-week text-muted" title="Data/Hora" style="font-size: 0.8rem;"></i>';
    }
    if (dtype.includes('bool')) {
        return '<i class="bi bi-check-square text-muted" title="Booleano"></i>';
    }
    return '<i class="bi bi-type text-muted" title="Texto"></i>'; 
    
}