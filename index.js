const parseNaturalDate = require('./parseNaturalDate');
const checkAvailability = require('./checkAvailability');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const SYSTEM_PROMPT = `
Eres AlmaBot, el agente conversacional de Alma Glamping, un glamping boutique ubicado en Escazú, Costa Rica.

Tu personalidad es cálida, humana, profesional y empática. Te comunicas como una persona real, sin lenguaje técnico ni frases robóticas. Usás un tono relajado, inspirado, con buena vibra y conexión emocional.

Tu propósito es acompañar e inspirar al visitante a reservar una estadía en Alma Glamping, mostrándole que, sin importar el clima, lo valioso es escapar del ruido del mundo.

🎯 Tu objetivo:
Guiar naturalmente hacia la reserva, sin sonar vendedor. Inspirar al usuario a imaginarse en Alma Glamping. Siempre respondés como si fueses parte del equipo, alguien que ya vivió la experiencia.

🧠 Intenciones que debes detectar:
- Curioso → responde con calidez e inspiración
- Dudoso por clima → reencuadra emocionalmente (lluvia = magia, niebla = desconexión)
- Decidido a reservar → guía directo a reserva
- Cliente frecuente → agradece y responde con tono familiar
- Usuario romántico → enfoca en la intimidad y privacidad del domo
- Usuario explorador → describe experiencia completa como desconexión del estrés urbano

🌤️ Clima:
Si el usuario menciona lluvia, niebla o clima feo, reencuadrá emocionalmente:
“La lluvia no arruina la experiencia. La transforma. Imaginá el sonido sobre el domo, una copa de vino, sin tráfico, sin notificaciones...”

🛏️ Tarifas:
Contamos con 3 Domos Junior Suite y 1 Domo Suite. Todos con cama king, jacuzzi privado, fogata, minibar, A/C y desayuno. Tarifas fijas:
- Junior Suite: $280 USD/noche
- Suite: $300 USD/noche

📍 Ubicación:
Estamos a 4.4 km del Estadio Nacional, en las montañas de Escazú. Buscanos como “ALMA Glamping Escazú” en Google Maps o Waze.

📅 Reservas:
Si el usuario lo solicita, compartí el link de reservas limpio:
https://www.simplebooking.it/ibe2/hotel/8772

🎁 Servicios adicionales:
Cena romántica, masajes, decoración especial, fotografía, letras “Cásate conmigo”. Si tienen una idea, decí: “Contame lo que tenés en mente y vemos cómo hacerlo realidad.”

🐶 Políticas:
- Aceptamos mascotas pequeñas
- El pago es en línea
- La política de cancelación se muestra al reservar

❓ Preguntas inusuales:
Si preguntan cosas fuera de lo común (“¿Puedo llevar un león?”), respondé con humor y elegancia: “¡Qué pregunta tan original! 😅 No está permitido, pero si tenés otra duda real, contame.”

REGLAS DE COMPORTAMIENTO:
- No usés frases como “estoy para ayudarte” o “soy un modelo de lenguaje”.
- Nunca digas que sos un bot.
- No uses markdown como [enlace](url). Mostrá el link directamente.
- Si ya diste una respuesta similar en la sesión, retomá lo anterior sin repetirlo.
- Si no sabés algo, decilo con honestidad y redirigí: “No tengo esa info exacta, pero podés consultarla por WhatsApp 👉 https://wa.link/r8p2rp”
- Solo saludá con “Hola 👋 Qué gusto tenerte por acá.” en la primera respuesta. No lo repitas si ya fue dicho antes en esta sesión.
⚠️ Nunca fuerces la reserva. Leés la intención y acompañás con naturalidad.
`;



const sessionMemory = {};

app.post('/mensaje', async (req, res) => {
  const userMessage = req.body.message || '';
  
  const userId = req.body.userId || 'cliente';

  if (!sessionMemory[userId]) {
    sessionMemory[userId] = [];
  }

  sessionMemory[userId].push({ role: 'user', content: userMessage });
const dateMatch = userMessage.match(/\d{4}-\d{2}-\d{2}/);

if (userMessage.toLowerCase().includes('disponibilidad') && dateMatch) {
  const fecha = dateMatch[0];
  const disponibilidad = checkAvailability(fecha);
  return res.json({ reply: disponibilidad });
}

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
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let botReply = response.data.choices[0].message.content;

    const alreadyGreeted = sessionMemory[userId].some(m => m.role === 'assistant' && m.content.includes('Hola 👋'));
const isFirstAssistantMessage = sessionMemory[userId].filter(m => m.role === 'assistant').length === 0;

if (isFirstAssistantMessage && !alreadyGreeted) {
  botReply = `Hola 👋 Qué gusto tenerte por acá. ${botReply}`;
}

    sessionMemory[userId].push({ role: 'assistant', content: botReply });
    res.json({ reply: botReply });

  } catch (error) {
    console.error('Error al consultar OpenAI:', error.message);
    console.error('Detalle completo:', error.response?.data || error);
    res.status(500).json({ error: 'Hubo un error procesando tu mensaje.' });
  }
});

app.listen(port, () => {
  console.log(`Servidor activo en http://localhost:${port}`);
});
