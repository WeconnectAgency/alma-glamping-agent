const XLSX = require('xlsx');
const { parse, format } = require('date-fns');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');

    // 🪵 Logs para Render
    console.log("📥 Fecha solicitada:", dateString);
    console.log("🎯 TargetDate:", targetDate);

    data.forEach(r => {
      const rawFecha = r['Fecha'];
      let interpretedDate;

      if (typeof rawFecha === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(rawFecha);
        interpretedDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
      } else if (typeof rawFecha === 'string') {
        interpretedDate = parse(rawFecha, 'yyyy-MM-dd', new Date());
      } else {
        interpretedDate = rawFecha;
      }

      const interpreted = format(interpretedDate, 'yyyy-MM-dd');
      console.log("📄 Fila:", rawFecha, "Interpretada como:", interpreted);
    });

    const row = data.find(r => {
      const rawFecha = r['Fecha'];
      let interpretedDate;

      if (typeof rawFecha === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(rawFecha);
        interpretedDate = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
      } else if (typeof rawFecha === 'string') {
        interpretedDate = parse(rawFecha, 'yyyy-MM-dd', new Date());
      } else {
        interpretedDate = rawFecha;
      }

      const rowDate = format(interpretedDate, 'yyyy-MM-dd');
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
