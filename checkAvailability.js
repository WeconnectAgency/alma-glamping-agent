const XLSX = require('xlsx');
const { parse, format, addDays, eachDayOfInterval } = require('date-fns');
const { es } = require('date-fns/locale');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function formatearFechaNatural(dateString) {
  const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());
  return format(parsedDate, "d 'de' MMMM", { locale: es });
}

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
    const fechaBonita = formatearFechaNatural(targetDate);

    const row = data.find(r => {
      const rowDate = format(
  typeof r['Fecha'] === 'string'
    ? parse(r['Fecha'], 'yyyy-MM-dd', new Date())
    : new Date((r['Fecha'] - 25569) * 86400 * 1000),
  'yyyy-MM-dd'
);
      return rowDate === targetDate;
    });

    if (!row) return `No encontré información para el ${fechaBonita}.`;

    const disponibles = [];
    Object.keys(row).forEach(col => {
      if (col !== 'Fecha' && (!row[col] || row[col].toString().trim() === '')) {
        disponibles.push(col);
      }
    });

    if (disponibles.length === 0) {
      // Buscar próximas fechas disponibles
      const alternativas = [];
      const maxSugerencias = 3;
      const fechaInicial = new Date(targetDate);

      for (let i = 1; i <= 7 && alternativas.length < maxSugerencias; i++) {
        const nuevaFecha = format(addDays(fechaInicial, i), 'yyyy-MM-dd');
        const otraRow = data.find(r => format(new Date(r['Fecha']), 'yyyy-MM-dd') === nuevaFecha);
        if (otraRow) {
          const domosDisponibles = Object.keys(otraRow).filter(
            col => col !== 'Fecha' && (!otraRow[col] || otraRow[col].toString().trim() === '')
          );
          if (domosDisponibles.length > 0) {
            alternativas.push(formatearFechaNatural(nuevaFecha));
          }
        }
      }

      if (alternativas.length > 0) {
        return `El ${fechaBonita} todos los domos están reservados. 😕 Pero tenemos disponibilidad en: ${alternativas.join(', ')}. ¿Querés que te comparta el link para reservar alguna de esas fechas?`;
      }

      return `El ${fechaBonita} todos los domos están reservados. 😕`;
    } else {
      return `El ${fechaBonita} están disponibles: ${disponibles.join(', ')}. ¿Querés que te comparta el link para reservar?`;
    }

  } catch (error) {
    console.error('Error leyendo el archivo de reservas:', error);
    return 'Hubo un problema al consultar la disponibilidad.';
  }
}

function checkAvailabilityRange(startDate, endDate) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const fechas = eachDayOfInterval({
      start: parse(startDate, 'yyyy-MM-dd', new Date()),
      end: parse(endDate, 'yyyy-MM-dd', new Date())
    });

    const resultados = fechas.map(date => {
      const fechaISO = format(date, 'yyyy-MM-dd');
      const fila = data.find(r => format(new Date(r['Fecha']), 'yyyy-MM-dd') === fechaISO);

      if (!fila) {
        return `No encontré información para el ${formatearFechaNatural(fechaISO)}.`;
      }

      const disponibles = Object.keys(fila).filter(
        col => col !== 'Fecha' && (!fila[col] || fila[col].toString().trim() === '')
      );

      if (disponibles.length === 0) {
        return `El ${formatearFechaNatural(fechaISO)} todos los domos están reservados. 😕`;
      } else {
        return `El ${formatearFechaNatural(fechaISO)} están disponibles: ${disponibles.join(', ')}.`;
      }
    });

    return resultados.join('\n');

  } catch (error) {
    console.error('Error leyendo el rango:', error);
    return 'Ocurrió un error al verificar las fechas.';
  }
}

module.exports = {
  checkAvailability,
  checkAvailabilityRange
};
