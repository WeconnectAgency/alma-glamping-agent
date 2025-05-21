const XLSX = require('xlsx');
const { parse, format } = require('date-fns');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');

    console.log("📥 Fecha solicitada:", dateString);
    console.log("🎯 TargetDate:", targetDate);

    const findRowDate = (rawFecha) => {
      if (typeof rawFecha === 'number') {
        const excelDate = XLSX.SSF.parse_date_code(rawFecha);
        return new Date(excelDate.y, excelDate.m - 1, excelDate.d);
      } else if (typeof rawFecha === 'string') {
        return parse(rawFecha, 'yyyy-MM-dd', new Date());
      } else {
        return rawFecha;
      }
    };

    const row = data.find(r => {
      const rowDate = format(findRowDate(r['Fecha']), 'yyyy-MM-dd');
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
      // Buscar hasta 3 fechas próximas con disponibilidad
      const alternativas = [];

      for (const r of data) {
        const rowDate = format(findRowDate(r['Fecha']), 'yyyy-MM-dd');
        if (rowDate <= targetDate) continue;

        const libres = Object.keys(r).filter(col =>
          col !== 'Fecha' && (!r[col] || r[col].toString().trim() === '')
        );

        if (libres.length > 0) {
          alternativas.push(rowDate);
        }

        if (alternativas.length >= 3) break;
      }

      if (alternativas.length === 0) {
        return `Para el ${dateString}, todos los domos están reservados. 😕`;
      }

      return `Para el ${dateString}, todos los domos están reservados. 😕 Pero tengo disponibilidad para: ${alternativas.join(', ')}. ¿Querés que te pase el link para reservar?`;
    }

    return `Para el ${dateString}, están disponibles: ${disponibles.join(', ')}. ¿Querés que te comparta el link para reservar?`;

  } catch (error) {
    console.error('❌ Error leyendo el archivo de reservas:', error);
    return 'Hubo un problema al consultar la disponibilidad.';
  }
}

module.exports = checkAvailability;
