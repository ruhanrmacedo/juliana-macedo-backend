export function toDateOnlyString(date: Date): string {
    // Garantir que temos uma data válida
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        throw new Error("Data inválida fornecida para toDateOnlyString");
    }

    // Usar toISOString e pegar apenas a parte da data (YYYY-MM-DD)
    return date.toISOString().split('T')[0];
}

export function weeksBetween(startDate: Date, endDate: Date): number {
    // Validar as datas
    if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
        throw new Error("Data de início inválida");
    }
    if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        throw new Error("Data de fim inválida");
    }

    const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
}

export function parseDate(dateInput: string | Date): Date {
    if (dateInput instanceof Date) {
        return dateInput;
    }

    if (typeof dateInput === 'string') {
        // Tentar diferentes formatos de data
        let parsedDate: Date;

        // Formato ISO (YYYY-MM-DD)
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            parsedDate = new Date(dateInput + 'T00:00:00.000Z');
        }
        // Formato brasileiro (DD/MM/YYYY)
        else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateInput)) {
            const [day, month, year] = dateInput.split('/');
            parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Outros formatos
        else {
            parsedDate = new Date(dateInput);
        }

        if (isNaN(parsedDate.getTime())) {
            throw new Error(`Formato de data inválido: ${dateInput}`);
        }

        return parsedDate;
    }

    throw new Error("Entrada de data deve ser string ou Date");
}