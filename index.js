const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require("cors");
const { format, addDays } = require('date-fns');
require('dotenv').config();
const { sugerirAlternativa, formatToHuman } = require('./sugerirAlternativa');
const parseNaturalDate = require('./parseNaturalDate');
const parseDateRange = require('./parseDateRange');
const { checkAvailability, checkAvailabilityRange, getDomosDisponibles, isDateAvailable } = require('./checkAvailability');

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;
app.use(bodyParser.json());

const SYSTEM_PROMPT = `
Eres Alma, el agente conversacional de Alma Glamping, un glamping boutique ubicado en Escazú, Costa Rica.

🧠 Estructura interna:
Actuás como un anfitrión real, dividido en 5 módulos mentales:
1. Interpretación de intención del visitante.
2. Memoria contextual (fechas, tono, historial).
3. Interacción emocional (adaptación del lenguaje).
4. Consulta técnica (disponibilidad, errores, links).
5. Acción estratégica (seguir conversación, reservar, sugerir).

✨ Antes de responder:
- Reflexioná brevemente: ¿quién está hablando? ¿qué tipo de emoción/situación transmite? ¿qué ya se dijo?
- Elegí tu tono y objetivo en función de eso.
- Evitá sonar a servicio al cliente. No repetís frases de sistema.

🌟 Tu personalidad:
Cálida, humana, empática y emocionalmente conectada. Sonás como alguien que vivió la experiencia y está ayudando a planear una escapada mágica. Usás un lenguaje cotidiano, fluido y participativo.

🎯 Tu propósito:
Inspirar al visitante a reservar una escapada a Alma Glamping. No vendés ni convencés, sino que transmitís la magia del lugar, incluso si llueve o está nublado. Inspirás sin presión.

📅 Reservas:
- Detectás fechas naturales como “el 14”, “14 de junio”, “sábado”.
- Si no hay disponibilidad, sugerís fechas cercanas.
- Si dicen “otra fecha”, retomás la última recordada.
- Solo compartís el link si el usuario lo pide o hay clara intención:
  https://www.simplebooking.it/ibe2/hotel/8772

🔁 Seguimiento:
Si alguien muestra intención pero desaparece, podés hacer seguimiento una sola vez con tono suave:
“Hola de nuevo 🌿 ¿Seguís interesado en reservar para esa fecha? ”

🏕️ Alojamiento:
- 3 Domos Junior Suite ($280 USD/noche)
- 1 Domo Suite ($300 USD/noche)
Todos incluyen: cama king, jacuzzi privado, fogata, minibar, A/C y desayuno.

📍 Ubicación:
A solo 4.4 km del Estadio Nacional, en las montañas de Escazú.
“Buscanos como ALMA Glamping Escazú en Google Maps o Waze.”

🎁 Servicios adicionales:
Cena romántica, masajes, decoración especial, fotografía, letras “Cásate conmigo”.
Si alguien propone una idea nueva, respondé: “Contame lo que tenés en mente y vemos cómo hacerlo realidad.”

🐾 Políticas:
- Aceptamos mascotas pequeñas.
- El pago es 100% en línea.
- La política de cancelación se muestra al reservar.

🛑 Reglas clave:
- Solo saludás con “Hola 👋” la primera vez.
- No repetís el link ni saludos.
- Nunca decís que sos un bot o modelo de lenguaje.
- No usás frases como “estoy aquí para ayudarte”.
- Mostrás los enlaces directamente (sin markdown).
- Si no sabés algo: “No tengo esa info exacta, pero podés consultarla por WhatsApp 👉 https://wa.link/r8p2rp”
- Si preguntan algo extraño: “¡Qué pregunta tan original! 😅 No está permitido, pero si tenés otra duda real, contame.”

🎭 Tonos posibles según el tipo de visitante:
- Curioso → tono inspirador.
- Dudoso por clima → tono reconfortante (lluvia = magia, niebla = desconexión).
- Decidido → tono claro y resolutivo.
- Cliente frecuente → tono familiar y agradecido.
- Romántico → tono íntimo y emocional.
- Explorador → tono aventurero y relajado.
- Práctico → tono directo, sin adornos.
`;
const sessionMemory = {};

app.post('/mensaje', async (req, res) => {
  const userMessage = req.body.message || '';
  const userId = req.body.userId || 'cliente';

  if (!sessionMemory[userId]) {
    sessionMemory[userId] = [];
    sessionMemory[userId].history = {};
  }

  sessionMemory[userId].push({ role: 'user', content: userMessage });
  const lower = userMessage.toLowerCase();

  // 🔁 Procesa afirmaciones como "sí" para fechas sugeridas
  if ((lower.includes('sí') || lower.includes('claro') || lower.includes('dale')) && sessionMemory[userId]?.history?.ultimaFechaSugerida) {
    const fecha = sessionMemory[userId].history.ultimaFechaSugerida;
    delete sessionMemory[userId].history.ultimaFechaSugerida;

    const disponibles = getDomosDisponibles(fecha);
    const fechaBonita = formatToHuman(fecha);

    if (disponibles.length === 0) {
      return res.json({
        reply: `Uff, parece que mientras tanto se reservaron todos los domos para el ${fechaBonita} 😢. ¿Querés que revise otra fecha?`
      });
    }

    return res.json({
      reply: `¡Perfecto! Para el ${fechaBonita} tenemos disponibles: ${disponibles.join(', ')}. ¿Cuál te gustaría reservar?`
    });
  }

  // 🔎 Rango de fechas como “del 10 al 12 de julio”
  const rangoFechas = parseDateRange(userMessage);
  if (rangoFechas) {
    sessionMemory[userId].history.lastDateRange = rangoFechas;
    const disponibilidad = checkAvailabilityRange(rangoFechas.start, rangoFechas.end);
    const saludo = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋')) ? '' : 'Hola 👋, ';
    return res.json({ reply: `${saludo}${disponibilidad}` });
  }

  // 📆 Fin de semana
  if (lower.includes('fin de semana')) {
    const today = new Date();
    const friday = addDays(today, (5 - today.getDay() + 7) % 7);
    const sunday = addDays(friday, 2);
    const disponibilidad = checkAvailabilityRange(format(friday, 'yyyy-MM-dd'), format(sunday, 'yyyy-MM-dd'));
    const saludo = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋')) ? '' : 'Hola 👋, ';
    return res.json({ reply: `${saludo}${disponibilidad}` });
  }

  // 📅 Fecha puntual
  let parsedDate = parseNaturalDate(userMessage);
  if (!parsedDate) {
    const strictMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
    parsedDate = strictMatch ? strictMatch[0] : null;
  }

  const contieneFechaNatural = /\d{1,2}\s*de\s*\w+/.test(userMessage);
  const tieneIntencionGeneral = lower.includes('disponibilidad') || lower.includes('fecha') || lower.includes('reservar') || lower.includes('libre') || contieneFechaNatural || lower.includes('quiero ir') || lower.includes('quiero hospedarme') || lower.includes('quiero domo');

  if (tieneIntencionGeneral && !parsedDate && !parseDateRange(userMessage)) {
    const saludo = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋')) ? '' : 'Hola 👋, ';
    return res.json({ reply: `${saludo}¿Qué fechas tenés en mente para verificar la disponibilidad?` });
  }

  if (parsedDate && tieneIntencionGeneral) {
    sessionMemory[userId].history.lastDate = parsedDate;
    const disponibilidad = isDateAvailable(parsedDate);
    const saludo = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋')) ? '' : 'Hola 👋, ';

    if (!disponibilidad) {
      const respuesta = sugerirAlternativa(parsedDate, userId, sessionMemory);
      return res.json({ reply: `${saludo}${respuesta}` });
    }

    return res.json({
      reply: `${saludo}¡Genial! El ${parsedDate} está disponible 😊. ¿Querés que lo reservemos?`
    });
  }

  if (['otra fecha', 'cerca de esa', 'otra opción', 'algo disponible', 'fecha similar', 'parecida'].some(p => lower.includes(p))) {
    const rememberedDate = sessionMemory[userId].history.lastDate;
    if (rememberedDate) {
      const disponibilidad = checkAvailability(rememberedDate);
      return res.json({ reply: `Como me consultaste antes por el ${rememberedDate}, te cuento lo que encontré:\n\n${disponibilidad}` });
    }
  }

  // 🧠 Fallback a OpenAI
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...sessionMemory[userId]
      ],
      temperature: 0.7
    }, {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let botReply = response.data.choices[0].message.content;
    const saludo = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋')) ? '' : 'Hola 👋 Qué gusto tenerte por acá. ';
    botReply = `${saludo}${botReply}`;

    sessionMemory[userId].push({ role: 'assistant', content: botReply });
    res.json({ reply: botReply });

  } catch (error) {
    console.error('Error al consultar OpenAI:', error.message);
    res.status(500).json({ error: 'Hubo un error procesando tu mensaje.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});



