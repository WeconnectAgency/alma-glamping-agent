const { parse, format } = require('date-fns');
const { es } = require('date-fns/locale');

function normalizarTexto(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function parseDateRange(text) {
  const clean = normalizarTexto(text);

  // Ejemplo: “del 10 al 12 de julio” o “entre el 5 y el 7 de agosto”
  const match = clean.match(/(?:del|entre)?\s*(\d{1,2}|1ro)\s*(?:al|y)\s*(\d{1,2})\s*de\s*(\w+)/);
  if (match) {
    let [, diaInicio, diaFin, mesNombre] = match;

    if (diaInicio === '1ro') diaInicio = '1';

    const monthMap = {
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
    };

    const monthIndex = monthMap[mesNombre];
    if (monthIndex === undefined) return null;

    const now = new Date();
    const year = now.getFullYear();

    const startDate = new Date(year, monthIndex, parseInt(diaInicio));
    const endDate = new Date(year, monthIndex, parseInt(diaFin));

    if (startDate > endDate) return null; // Validación básica

    return {
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
    };
  }

  return null;
}

module.exports = parseDateRange;
