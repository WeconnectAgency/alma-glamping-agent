const { parse, format, addDays, getDay, isValid, isAfter, addMonths, isWithinInterval } = require('date-fns');
const { es } = require('date-fns/locale');

function normalizarTexto(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(1ro|1°|1ero)\b/g, '1')
    .replace(/\s+/g, ' ')
    .trim();
}

function esFinDeSemana(date) {
  const day = getDay(date);
  return day === 5 || day === 6 || day === 0; // viernes, sábado, domingo
}

function parseNaturalDate(text, referenceDate = new Date()) {
  const lower = normalizarTexto(text);
  const today = referenceDate;
  const currentYear = today.getFullYear();

  // 1. Manejo de expresiones relativas
  if (lower.includes('hoy')) return format(today, 'yyyy-MM-dd');
  if (lower.includes('mañana') || lower.includes('mañana')) return format(addDays(today, 1), 'yyyy-MM-dd');
  if (lower.includes('pasado mañana')) return format(addDays(today, 2), 'yyyy-MM-dd');

  // 2. Fin de semana
  if (lower.includes('fin de semana') || lower.includes('finde')) {
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = addDays(today, daysUntilFriday);
    return format(nextFriday, 'yyyy-MM-dd');
  }

  // 3. Días de la semana
  const diasSemana = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  for (let i = 0; i < diasSemana.length; i++) {
    if (new RegExp(`(el\\s+)?${diasSemana[i]}`).test(lower)) {
      const daysToAdd = (i - today.getDay() + 7) % 7 || 7;
      return format(addDays(today, daysToAdd), 'yyyy-MM-dd');
    }
  }

  // 4. Fechas ambiguas (solo día)
  const matchDia = lower.match(/\bel\s*(\d{1,2})\b/);
  if (matchDia) {
    const day = parseInt(matchDia[1]);
    const options = [];

    // Opción mes actual
    const thisMonth = new Date(currentYear, today.getMonth(), day);
    if (isValid(thisMonth) && isAfter(thisMonth, today)) {
      options.push({
        date: format(thisMonth, 'yyyy-MM-dd'),
        label: format(thisMonth, "d 'de' MMMM", { locale: es })
      });
    }

    // Opción próximo mes
    const nextMonth = new Date(currentYear, today.getMonth() + 1, day);
    if (isValid(nextMonth)) {
      options.push({
        date: format(nextMonth, 'yyyy-MM-dd'),
        label: format(nextMonth, "d 'de' MMMM", { locale: es })
      });
    }

    if (options.length > 0) {
      return {
        needsConfirmation: true,
        options,
        day,
        isAmbiguous: true
      };
    }
  }

  // 5. Fechas completas (día y mes)
  const monthPattern = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)';
  const datePattern = new RegExp(`(\\d{1,2})\\s*(?:de\\s*)?${monthPattern}(?:\\s*(?:de\\s*)?(\\d{4})?`, 'i');
  const matchFull = lower.match(datePattern);

  if (matchFull) {
    const [, dia, mesNombre, año] = matchFull;
    const monthMap = {
      enero: 0, ene: 0, feb: 1, febrero: 1, mar: 2, marzo: 2,
      abr: 3, abril: 3, may: 4, mayo: 4, jun: 5, junio: 5,
      jul: 6, julio: 6, ago: 7, agosto: 7, sep: 8, septiembre: 8,
      oct: 9, octubre: 9, nov: 10, noviembre: 10, dic: 11, diciembre: 11
    };

    const monthIndex = monthMap[mesNombre.toLowerCase()];
    if (monthIndex === undefined) return null;

    const year = año ? parseInt(año) : currentYear;
    let parsedDate = new Date(year, monthIndex, parseInt(dia));

    // Ajuste para fechas inválidas (ej. 31 de abril)
    if (!isValid(parsedDate)) {
      parsedDate = new Date(year, monthIndex + 1, 0); // Último día del mes
    }

    // Ajuste automático de año si la fecha ya pasó
    if (isAfter(today, parsedDate) && !año) {
      parsedDate = addYears(parsedDate, 1);
    }

    return format(parsedDate, 'yyyy-MM-dd');
  }

  // 6. Fechas numéricas (14/06 o 06-14)
  const numericPattern = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
  const matchNumeric = lower.match(numericPattern);

  if (matchNumeric) {
    const [, dia, mes, año] = matchNumeric;
    const year = año ? (año.length === 2 ? 2000 + parseInt(año) : parseInt(año)) : currentYear;
    const parsedDate = new Date(year, parseInt(mes) - 1, parseInt(dia));
    
    if (isValid(parsedDate)) {
      return format(parsedDate, 'yyyy-MM-dd');
    }
  }

  return null;
}

function formatToHuman(dateStr) {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isValid(date) ? format(date, "d 'de' MMMM", { locale: es }) : dateStr;
  } catch {
    return dateStr;
  }
}

module.exports = {
  parseNaturalDate,
  formatToHuman,
  esFinDeSemana
};