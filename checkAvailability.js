const XLSX = require('xlsx');
const { parse, format, addDays } = require('date-fns');
const { es } = require('date-fns/locale');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function parseExcelDate(value) {
  if (typeof value === 'string') {
    return format(parse(value, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
  } else {
    return format(new Date((value - 25569) * 86400 * 1000), 'yyyy-MM-dd');
  }
}

function loadWorkbookData() {
  const workbook = XLSX.readFile(FILE_PATH);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet);
}

function isDomoAvailable(cellValue) {
  if (!cellValue || cellValue.toString().trim() === '' || cellValue.toString().toLowerCase() === 'disponible') {
    return true;
  }
  return false;
}

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "d 'de' MMMM", { locale: es });
}

function buscarFechasAlternativas(data, startDate, cantidad = 3, diasMaximos = 15) {
  const alternativas = [];
  let fechaBase = parse(startDate, 'yyyy-MM-dd', new Date());

  for (let i = 1; i <= diasMaximos; i++) {
    const testDate = format(addDays(fechaBase, i), 'yyyy-MM-dd');
    const row = data.find(r => {
      if (!r['Fecha']) return false;
      return parseExcelDate(r['Fecha']) === testDate;
    });

    if (row) {
      const disponibles = Object.keys(row).filter(
        key => key !== 'Fecha' && isDomoAvailable(row[key])
      );
      if (disponibles.length > 0) {
        alternativas.push(formatToHuman(testDate));
      }
    }

    if (alternativas.length >= cantidad) break;
  }

  return alternativas;
}

function checkAvailability(dateStr) {
  try {
    const data = loadWorkbookData();
    const targetDate = format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
    const fechaBonita = formatToHuman(targetDate);

    const row = data.find(r => {
      if (!r['Fecha']) return false;
      return parseExcelDate(r['Fecha']) === targetDate;
    });

    if (!row) return `No encontré información para el ${fechaBonita}.`;

    const disponibles = Object.keys(row).filter(
      key => key !== 'Fecha' && isDomoAvailable(row[key])
    );

    if (disponibles.length === 0) {
      const sugerencias = buscarFechasAlternativas(data, targetDate);
      if (sugerencias.length > 0) {
        return `El ${fechaBonita} todos los domos están reservados 😢. Pero hay disponibilidad en: ${sugerencias.join(', ')}. ¿Querés que te comparta el link para reservar alguna de esas fechas?`;
      } else {
        return `El ${fechaBonita} todos los domos están reservados 😢 y no encontré otras fechas cercanas disponibles.`;
      }
    }

    return `El ${fechaBonita} están disponibles: ${disponibles.join(', ')}. ¿Querés que te comparta el link para reservar?`;
  } catch (err) {
    console.error('Error verificando disponibilidad:', err);
    return 'Tuvimos un problema al consultar la disponibilidad 😕.';
  }
}

module.exports = {
  checkAvailability,
  formatToHuman,
  isDomoAvailable,
  buscarFechasAlternativas
};
