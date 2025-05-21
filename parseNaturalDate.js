const { format, addDays, nextSaturday, parse } = require('date-fns');
const es = require('date-fns/locale/es');

function parseNaturalDate(text) {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // elimina tildes

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
    const saturday = nextSaturday(today);
    return format(saturday, 'yyyy-MM-dd');
  }

  // Detecta expresiones tipo “14 de junio” o “1ro de julio”
  const match = lower.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)/i);
  if (match) {
    const day = match[1];
    const monthName = match[2];
    const monthMap = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };

    const monthIndex = monthMap[monthName];
    if (monthIndex !== undefined) {
      const currentYear = today.getFullYear();
      const parsedDate = new Date(currentYear, monthIndex, parseInt(day));
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  return null;
}

module.exports = parseNaturalDate;
