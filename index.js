const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require("cors");
const { format, addDays } = require('date-fns');
require('dotenv').config();

const { sugerirAlternativa, formatToHuman } = require('./sugerirAlternativa');
const { parseNaturalDate } = require('./parseNaturalDate');
const parseDateRange = require('./parseDateRange');
const {
  checkAvailability,
  checkAvailabilityRange,
  getDomosDisponibles,
  isDateAvailable,
} = require('./checkAvailability');

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

function isAffirmative(text) {
  const afirmaciones = ['sí', 'claro', 'dale', 'va', 'me parece', 'hagámoslo', 'perfecto'];
  return afirmaciones.some(palabra => text.includes(palabra));
}

app.post('/mensaje', async (req, res) => {
  const userMessage = req.body.message || '';
  const userId = req.body.userId || 'cliente';
  const lower = userMessage.toLowerCase();

  if (!sessionMemory[userId]) {
    sessionMemory[userId] = {
      history: {},
      conversation: []
    };
  }

  const memory = sessionMemory[userId];
  memory.conversation.push({ role: 'user', content: userMessage });

  try {
    // ✅ Seguimiento a sugerencia anterior
    if (isAffirmative(lower) && memory.history.suggestedDate) {
      const fecha = memory.history.suggestedDate;
      delete memory.history.suggestedDate;
      const disponibles = getDomosDisponibles(fecha);

      if (disponibles.length === 0) {
        return res.json({
          reply: `Uff, parece que mientras tanto se reservaron todos los domos para el ${formatToHuman(fecha)} 😢. ¿Querés que revise otra fecha?`
        });
      }

      return res.json({
        reply: `¡Perfecto! Para el ${formatToHuman(fecha)} tenemos disponibles: ${disponibles.join(', ')}. ¿Cuál te gustaría reservar?`,
        availableDomes: disponibles
      });
    }

    // 🔎 Rango de fechas
    const rangoFechas = parseDateRange(userMessage);
    if (rangoFechas) {
      memory.history.lastDateRange = rangoFechas;
      const disponibilidad = checkAvailabilityRange(rangoFechas.start, rangoFechas.end);
      return res.json({ reply: disponibilidad });
    }

    // 📆 Fin de semana
    if (lower.includes('fin de semana')) {
      const today = new Date();
      const friday = addDays(today, (5 - today.getDay() + 7) % 7);
      const sunday = addDays(friday, 2);
      const disponibilidad = checkAvailabilityRange(format(friday, 'yyyy-MM-dd'), format(sunday, 'yyyy-MM-dd'));
      return res.json({ reply: disponibilidad });
    }

    // 📅 Fecha puntual o natural
    let parsedDate = parseNaturalDate(userMessage);
    if (!parsedDate) {
      const strictMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);
      parsedDate = strictMatch ? strictMatch[0] : null;
    }

    const contieneFechaNatural = /\d{1,2}\s*de\s*\w+/.test(userMessage);
    const tieneIntencion =
      lower.includes('disponibilidad') ||
      lower.includes('fecha') ||
      lower.includes('reservar') ||
      lower.includes('libre') ||
      contieneFechaNatural ||
      lower.includes('quiero ir') ||
      lower.includes('quiero hospedarme') ||
      lower.includes('quiero domo');

if (tieneIntencion && !parsedDate && !rangoFechas) {
  // Seguimos a fallback para que salude igual
  parsedDate = null;
}


 if (parsedDate && tieneIntencion) {
const fechaISO = typeof parsedDate === 'object'
  ? parsedDate.date || parsedDate.options?.[0]?.date
  : parsedDate;

  if (typeof fechaISO !== 'string') {
    console.error('[❌ ERROR] isDateAvailable recibió un tipo no válido:', fechaISO);
    return res.json({ reply: 'Para no cometer errores, ¿me confirmás el día con el mes, por fa? 😊' });
  }

  memory.history.lastDate = fechaISO;

  const disponible = await isDateAvailable(fechaISO); // ✅ Este también necesitaba `await`

  if (!disponible) {
    const respuesta = await sugerirAlternativa(fechaISO, userId, sessionMemory);
    return res.json({ reply: String(respuesta) });
  }

  return res.json({
    reply: `¡Genial! El ${formatToHuman(fechaISO)} está disponible 😊. ¿Querés que lo reservemos?`
  });
}



   // 🔁 Otra fecha
if (lower.includes('otra fecha') || lower.includes('cerca') || lower.includes('alternativa')) {
  const rememberedDate = memory.history.lastDate;
  if (rememberedDate) {
    const respuesta = await sugerirAlternativa(rememberedDate, userId, sessionMemory); // ✅ await agregado
    return res.json({ reply: String(respuesta) });
  } else {
    return res.json({ reply: '¿Para qué fecha te gustaría que revise disponibilidad?' });
  }
}

// 👉 Opción numérica directa: "1", "2", "3" (solo si hay fechas sugeridas)
if (memory.history.ultimasFechasSugeridas && /^\s*[1-3]\s*$/.test(lower)) {
  const index = parseInt(lower.trim(), 10) - 1;
  const alternativas = memory.history.ultimasFechasSugeridas;

  if (alternativas[index]) {
    const elegida = alternativas[index];
    delete memory.history.ultimasFechasSugeridas;

    return res.json({
      reply: `¡Perfecto! El ${elegida.fecha} está disponible con ${elegida.domos.join(', ')}. ¿Querés que avancemos con esa fecha?`,
      availableDomes: elegida.domos
    });
  } else {
    return res.json({
      reply: `Esa opción no es válida. ¿Querés que te recuerde las opciones disponibles?`
    });
  }
}

// 💬 Fallback con GPT
const response = await axios.post(
  'https://api.openai.com/v1/chat/completions',
  {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...memory.conversation
    ],
    temperature: 0.7
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
);

// ✅ Saludo solo una vez
const isFirstMessage = memory.conversation.filter(m => m.role === 'user').length === 1;
const alreadyGreeted = memory.conversation.some(
  m => m.role === 'assistant' && m.content.toLowerCase().includes('hola 👋')
);

console.log('[🧠 DEBUG] memory.conversation:', memory.conversation);
console.log('[🧪 DEBUG] isFirstMessage:', isFirstMessage);
console.log('[🧪 DEBUG] alreadyGreeted:', alreadyGreeted);

let botReply = response.data.choices[0].message.content;

if (isFirstMessage && !alreadyGreeted) {
  botReply = `Hola 👋 Pura Vida. ${botReply}`;
}

memory.conversation.push({ role: 'assistant', content: botReply });
return res.json({ reply: botReply });


  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Hubo un error procesando tu mensaje.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});
