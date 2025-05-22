const { format, addDays, getDay, parse } = require('date-fns');
const { es } = require('date-fns/locale');

function normalizarTexto(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseNaturalDate(text) {
  const lower = normalizarTexto(text);
  const today = new Date();

  // Hoy, mañana, pasado mañana
  if (lower.includes('hoy')) return format(today, 'yyyy-MM-dd');
  if (lower.includes('mañana')) return format(addDays(today, 1), 'yyyy-MM-dd');
  if (lower.includes('pasado mañana')) return format(addDays(today, 2), 'yyyy-MM-dd');

  // Fin de semana (viernes a domingo)
  if (lower.includes('fin de semana')) {
    const day = today.getDay();
    const daysUntilFriday = (5 - day + 7) % 7;
    const friday = addDays(today, daysUntilFriday);
    return format(friday, 'yyyy-MM-dd');
  }

  // Día de la semana ("el sábado", "el domingo")
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  for (let i = 0; i < dias.length; i++) {
    if (lower.includes(`el ${dias[i]}`)) {
      const dayDiff = (i - today.getDay() + 7) % 7 || 7;
      const nextDay = addDays(today, dayDiff);
      return format(nextDay, 'yyyy-MM-dd');
    }
  }

  // Frases como "14 de junio" o "1ro de julio"
  const match = lower.match(/(\d{1,2}|1ro)\s+de\s+([a-záéíóú]+)/i);
  if (match) {
    let day = match[1] === '1ro' ? 1 : parseInt(match[1]);
    const monthName = match[2];
    const monthMap = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };
    const monthIndex = monthMap[monthName];
    if (monthIndex !== undefined) {
      const year = today.getFullYear();
      const parsed = new Date(year, monthIndex, day);
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  // Frases como "el 24"
  const simpleMatch = lower.match(/\bel\s*(\d{1,2})\b/);
  if (simpleMatch) {
    const day = parseInt(simpleMatch[1]);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
    if (thisMonth >= today) {
      return format(thisMonth, 'yyyy-MM-dd');
    } else {
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, day);
      return format(nextMonth, 'yyyy-MM-dd');
    }
  }

  return null;
}

module.exports = parseNaturalDate;
