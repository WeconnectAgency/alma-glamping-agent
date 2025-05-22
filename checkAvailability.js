const XLSX = require('xlsx');
const { parse, format, addDays, isValid } = require('date-fns');
const { es } = require('date-fns/locale');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function formatFechaNatural(dateString) {
  const date = new Date(dateString);
  return format(date, "d 'de' MMMM", { locale: es }); // ejemplo: 14 de junio
}

function checkAvailability(dateString) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const targetDate = format(parse(dateString, 'yyyy-MM-dd', new Date()), 'yyyy-MM-dd');
    const targetDateNatural = formatFechaNatural(targetDate);

    const row = data.find(r => {
      const raw = r['Fecha'];

      let rowDate;
      if (typeof raw === 'number') {
        // Fecha en formato serial Excel
        rowDate = XLSX.SSF.parse_date_code(raw);
        if (rowDate) {
          const jsDate = new Date(rowDate.y, rowDate.m - 1, rowDate.d);
          return format(jsDate, 'yyyy-MM-dd') === targetDate;
        }
      } else if (typeof raw === 'string' || raw instanceof Date) {
        const date = new Date(raw);
        if (isValid(date)) {
          return format(date, 'yyyy-MM-dd') === targetDate;
        }
      }

      return false;
    });

    if (!row) {
      return `No encontré información para el ${targetDateNatural}.`;
    }

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
        const otraRow = data.find(r => {
          const raw = r['Fecha'];
          let rowDate;
          if (typeof raw === 'number') {
            const parsed = XLSX.SSF.parse_date_code(raw);
            if (parsed) {
              rowDate = new Date(parsed.y, parsed.m - 1, parsed.d);
            }
          } else {
            rowDate = new Date(raw);
          }
          return rowDate && isValid(rowDate) && format(rowDate, 'yyyy-MM-dd') === nuevaFecha;
        });

        if (otraRow) {
          const domosDisponibles = Object.keys(otraRow).filter(
            col => col !== 'Fecha' && (!otraRow[col] || otraRow[col].toString().trim() === '')
          );
          if (domosDisponibles.length > 0) {
            alternativas.push(formatFechaNatural(nuevaFecha));
          }
        }
      }

      if (alternativas.length > 0) {
        return `El ${targetDateNatural} todos los domos están reservados. 😕 Pero tenemos disponibilidad en: ${alternativas.join(', ')}. ¿Querés que te pase el link para reservar?`;
      }

      return `El ${targetDateNatural} todos los domos están reservados. 😕`;
    } else {
      return `El ${targetDateNatural} están disponibles: ${disponibles.join(', ')}. ¿Querés que te pase el link para reservar?`;
    }

  } catch (error) {
    console.error('Error leyendo el archivo de reservas:', error);
    return 'Hubo un problema al consultar la disponibilidad.';
  }
}

module.exports = checkAvailability;
