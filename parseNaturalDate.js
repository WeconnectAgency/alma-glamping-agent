const { parse, format } = require('date-fns');
const { es } = require('date-fns/locale');
const { addMonths } = require('date-fns');

function parseNaturalDate(input) {
  input = input.toLowerCase().trim();

  // 📌 Detectar fechas ambiguas tipo "el 14"
  const matchSoloDia = input.match(/(?:el\s*)?(\d{1,2})(?!\s*de)/);
  if (matchSoloDia) {
    const day = parseInt(matchSoloDia[1]);
    const today = new Date();

    const opciones = [0, 1].map(m => {
      const fecha = new Date(today.getFullYear(), today.getMonth() + m, day);
      return {
        date: format(fecha, 'yyyy-MM-dd'),
        label: format(fecha, "d 'de' MMMM", { locale: es })
      };
    });

    return {
      needsConfirmation: true,
      day,
      options: opciones
    };
  }

  // 📌 Detectar "14 de junio", "1 de julio", etc.
  const matchDiaMes = input.match(/(\d{1,2})\s*de\s*(\w+)/);
  if (matchDiaMes) {
    const dia = parseInt(matchDiaMes[1]);
    const mesTexto = matchDiaMes[2];

    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const mes = meses.indexOf(mesTexto);
    if (mes !== -1) {
      const añoActual = new Date().getFullYear();
      const fecha = new Date(añoActual, mes, dia);
      return format(fecha, 'yyyy-MM-dd');
    }
  }

  return null;
}

module.exports = parseNaturalDate;
