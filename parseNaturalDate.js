const { parse, format } = require('date-fns');
const { es } = require('date-fns/locale');

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3,
  mayo: 4, junio: 5, julio: 6, agosto: 7,
  septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function parseNaturalDate(text) {
  const regex = /(\d{1,2})(?:\s*de\s*)(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i;
  const match = text.match(regex);

  if (!match) return null;

  const day = parseInt(match[1]);
  const monthName = match[2].toLowerCase();
  const month = MESES[monthName];
  const year = new Date().getFullYear();

  const date = new Date(year, month, day);
  return format(date, 'yyyy-MM-dd', { locale: es });
}

module.exports = parseNaturalDate;
