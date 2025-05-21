const { format, addDays, nextSaturday, parse } = require('date-fns');

function parseNaturalDate(text) {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const today = new Date();

  if (lower.includes('hoy')) {
    return format(today, 'yyyy-MM-dd');
  }

  if (lower.includes('mañana')) {
    return format(addDays(today, 1), 'yyyy-MM-dd');
  }

  if (lower.includes('pasado mañana')) {
    return format(addDays(today, 2), 'yyyy-MM-dd');
  }

  if (lower.includes('fin de semana')) {
    return format(nextSaturday(today), 'yyyy-MM-dd');
  }

  // Detecta: “14 de junio”
  const fullDateMatch = lower.match(/(\d{1,2})\s+de\s+([a-z]+)/i);
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1]);
    const monthName = fullDateMatch[2];
    const monthMap = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const monthIndex = monthMap[monthName];
    if (monthIndex !== undefined) {
      const year = today.getFullYear();
      const date = new Date(year, monthIndex, day);
      return format(date, 'yyyy-MM-dd');
    }
  }

  // Detecta: “el 14”, “para el 20”, etc.
  const dayOnlyMatch = lower.match(/\b(?:el|para|hacia|en)\s+(\d{1,2})\b/);
  if (dayOnlyMatch) {
    const day = parseInt(dayOnlyMatch[1]);
    const currentMonth = today.getMonth();
    const year = today.getFullYear();
    const date = new Date(year, currentMonth, day);

    // Si la fecha ya pasó este mes, ir al próximo
    if (date < today) {
      const nextMonthDate = new Date(year, currentMonth + 1, day);
      return format(nextMonthDate, 'yyyy-MM-dd');
    }

    return format(date, 'yyyy-MM-dd');
  }

  return null;
}

module.exports = parseNaturalDate;
