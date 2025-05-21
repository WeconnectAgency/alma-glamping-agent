const XLSX = require('xlsx');
const { parse, format, addDays } = require('date-fns');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');

    const row = data.find(r => {
      const rowDate = format(new Date(r['Fecha']), 'yyyy-MM-dd');
      return rowDate === targetDate;
    });

    if (!row) return `No encontré información para la fecha ${targetDate}.`;

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
            alternativas.push(nuevaFecha);
          }
        }
      }

      if (alternativas.length > 0) {
        return `Para el ${targetDate}, todos los domos están reservados. 😕 Pero tenemos disponibilidad en: ${alternativas.join(', ')}. ¿Querés que te comparta el link para reservar alguna de esas fechas?`;
      }

      return `Para el ${targetDate}, todos los domos están reservados. 😕`;
    } else {
      return `Para el ${targetDate}, están disponibles: ${disponibles.join(', ')}. ¿Querés que te comparta el link para reservar?`;
    }

  } catch (error) {
    console.error('Error leyendo el archivo de reservas:', error);
    return 'Hubo un problema al consultar la disponibilidad.';
  }
}

module.exports = checkAvailability;
