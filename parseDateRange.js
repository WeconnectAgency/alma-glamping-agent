const { parse, format, isValid, isAfter, addYears } = require('date-fns');
const { es } = require('date-fns/locale');

function normalizarTexto(text) {
  return text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(1ro|1°|1ero)\b/g, '1');
}

function parseDateRange(text, referenceDate = new Date()) {
  const clean = normalizarTexto(text);
  const year = referenceDate.getFullYear();

  // 1. Patrón: "del 10 al 12 de julio [de 2023]?"
  const pattern1 = /(?:del|entre)\s*(\d{1,2})\s*(?:al|y)\s*(\d{1,2})\s*de\s*(\w+)(?:\s*de\s*(\d{4}))?/;
  // 2. Patrón: "julio 10-12" o "10-12 de julio"
  const pattern2 = /(?:(\w+)\s*(\d{1,2})\s*-\s*(\d{1,2})|(\d{1,2})\s*-\s*(\d{1,2})\s*de\s*(\w+))(?:\s*de\s*(\d{4}))?/;

  const match = clean.match(pattern1) || clean.match(pattern2);
  if (!match) return null;

  // Extraer componentes según el patrón encontrado
  let diaInicio, diaFin, mesNombre, año;
  if (match[0].includes('de')) { // Patrón 1
    [, diaInicio, diaFin, mesNombre, año] = match;
  } else { // Patrón 2
    if (match[1]) { // "mes 10-12"
      [, mesNombre, diaInicio, diaFin, , , , año] = match;
    } else { // "10-12 de mes"
      [, , , diaInicio, diaFin, mesNombre, año] = match;
    }
  }

  // Mapeo de meses (con variantes)
  const monthMap = {
    enero: 0, ene: 0, feb: 1, febrero: 1, mar: 2, marzo: 2,
    abr: 3, abril: 3, may: 4, mayo: 4, jun: 5, junio: 5,
    jul: 6, julio: 6, ago: 7, agosto: 7, sep: 8, septiembre: 8,
    oct: 9, octubre: 9, nov: 10, noviembre: 10, dic: 11, diciembre: 11
  };

  const monthIndex = monthMap[mesNombre];
  if (monthIndex === undefined) return null;

  // Manejo de año (si no se especifica, usar el actual o próximo si ya pasó)
  const currentYear = año ? parseInt(año) : year;
  let startDate = new Date(currentYear, monthIndex, parseInt(diaInicio));
  let endDate = new Date(currentYear, monthIndex, parseInt(diaFin));

  // Validación de fechas inválidas (ej. 31 de abril)
  if (!isValid(startDate) startDate = new Date(currentYear, monthIndex + 1, 0);
  if (!isValid(endDate)) endDate = new Date(currentYear, monthIndex + 1, 0);

  // Ajuste automático de año si las fechas ya pasaron
  if (isAfter(new Date(), endDate) {
    startDate = addYears(startDate, 1);
    endDate = addYears(endDate, 1);
  }

  if (isAfter(startDate, endDate)) return null;

  return {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
    exactMatch: !!match[0].includes('de') // Indica si fue patrón completo
  };
}

module.exports = parseDateRange;