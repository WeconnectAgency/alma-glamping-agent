const XLSX = require('xlsx');
const { parse, format, addDays, isAfter } = require('date-fns');
const { es } = require('date-fns/locale');

const FILE_PATH = './Reservas_Alma_Glamping.xlsx';

function formatToHuman(dateStr) {
  const date = parse(dateStr, 'yyyy-MM-dd', new Date());
  return format(date, "d 'de' MMMM", { locale: es });
}

function checkAvailabilityRange(startDateStr, endDateStr) {
  try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    const start = parse(startDateStr, 'yyyy-MM-dd', new Date());
    const end = parse(endDateStr, 'yyyy-MM-dd', new Date());

    if (isAfter(start, end)) {
      return 'La fecha de inicio no puede ser posterior a la fecha final. 😅';
    }

    const disponibles = [];

    for (
      let current = start;
      !isAfter(current, end);
      current = addDays(current, 1)
    ) {
      const fechaStr = format(current, 'yyyy-MM-dd');
      const row = data.find(r => format(new Date(r['Fecha']), 'yyyy-MM-dd') === fechaStr);

      if (!row) continue;

      const domosDisponibles = Object.keys(row).filter(
        col => col !== 'Fecha' && (!row[col] || row[col].toString().trim() === '')
      );

      if (domosDisponibles.length > 0) {
        disponibles.push({
          fecha: formatToHuman(fechaStr),
          domos: domosDisponibles
        });
      }
    }

    if (disponibles.length === 0) {
      return `Entre el ${formatToHuman(startDateStr)} y el ${formatToHuman(endDateStr)} no hay disponibilidad en ningún domo. 😔 Si tenés flexibilidad en tus fechas, puedo ayudarte a buscar otras opciones.`;
    }

    const lista = disponibles.map(d => `• ${d.fecha}: ${d.domos.join(', ')}`).join('\n');
    return `Encontré disponibilidad entre esas fechas 🎉:\n\n${lista}\n\n¿Querés que te comparta el link para reservar alguna?`;
  } catch (error) {
    console.error('Error al leer Excel para rango de fechas:', error);
    return 'Hubo un problema al revisar el rango de fechas. 😕';
  }
}

module.exports = checkAvailabilityRange;
