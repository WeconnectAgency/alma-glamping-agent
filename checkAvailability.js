const XLSX = require('xlsx');
const { parse, format } = require('date-fns');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');

    // 🪵 Logs para depuración
    console.log("📥 Fecha solicitada:", dateString);
    console.log("🎯 TargetDate:", targetDate);
    data.forEach(r => {
      const interpreted = format(
        typeof r['Fecha'] === 'string'
          ? parse(r['Fecha'], 'yyyy-MM-dd', new Date())
          : r['Fecha'],
        'yyyy-MM-dd'
      );
      console.log("📄 Fila:", r['Fecha'], "Interpretada como:", interpreted);
    });

    const row = data.find(r => {
      const rowDate = format(
        typeof r['Fecha'] === 'string'
          ? parse(r['Fecha'], 'yyyy-MM-dd', new Date())
          : r['Fecha'],
        'yyyy-MM-dd'
      );
      return rowDate === targetDate;
    });

    if (!row) return `No encontré información para la fecha ${dateString}.`;

    const disponibles = [];
    Object.keys(row).forEach(col => {
      if (col !== 'Fecha' && (!row[col] || row[col].toString().trim() === '')) {
        disponibles.push(col);
      }
    });

    if (disponibles.length === 0) {
      return `Para el ${dateString}, todos los domos están reservados. 😕`;
    } else {
      return `Para el ${dateString}, están disponibles: ${disponibles.join(', ')}. ¿Querés que te comparta el link para reservar?`;
    }

  } catch (error) {
    console.error('❌ Error leyendo el archivo de reservas:', error);
    return 'Hubo un problema al consultar la disponibilidad.';
  }
}

module.exports = checkAvailability;
