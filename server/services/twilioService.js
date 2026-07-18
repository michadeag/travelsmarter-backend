/**
 * Twilio Service
 * Local-number search/purchase for the Local SEO call-forwarding feature,
 * plus the TwiML builders and signature verification the voice webhooks
 * (routes/localSeoVoiceRoutes.js) use.
 */

const twilio = require('twilio');
const pool = require('../config/database');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.travelsmarterapp.com';

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured');
  }
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// @desc Search available Brazilian local numbers for a city. Read-only,
// no cost — Twilio doesn't charge for searching, only for purchasing.
async function searchAvailableNumbers({ city, limit = 10 }) {
  const client = getClient();
  const results = await client.availablePhoneNumbers('BR').local.list({
    inLocality: city,
    voiceEnabled: true,
    pageSize: limit,
  });
  return results.map((r) => ({
    phoneNumber: r.phoneNumber,
    friendlyName: r.friendlyName,
    locality: r.locality,
    region: r.region,
  }));
}

// @desc Purchases a specific number and points its voice webhook at our
// incoming-call handler for this combination. This is a real, billed
// purchase — only called from an explicit admin action, never automatically.
async function purchaseNumberForCombination(combinationId, phoneNumber) {
  const client = getClient();

  const purchased = await client.incomingPhoneNumbers.create({
    phoneNumber,
    voiceUrl: `${API_BASE_URL}/api/local-seo/voice/incoming?combinationId=${combinationId}`,
    voiceMethod: 'POST',
  });

  await pool.query(
    `UPDATE local_seo_combinations SET twilio_phone_number = $1, twilio_phone_sid = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [purchased.phoneNumber, purchased.sid, combinationId]
  );

  return { phoneNumber: purchased.phoneNumber, sid: purchased.sid };
}

// @desc Builds the TwiML for an inbound call: simultaneously rings every
// recipient, each hearing a short "lead from Michael" whisper (in
// Portuguese) before being bridged, so they know why they're being called
// before the actual caller is on the line.
function buildIncomingCallTwiml({ combinationId, recipients, callerId }) {
  const response = new twilio.twiml.VoiceResponse();

  if (recipients.length === 0) {
    response.say({ language: 'pt-BR' }, 'No momento não há ninguém disponível para atender. Por favor, tente novamente mais tarde.');
    return response.toString();
  }

  const dial = response.dial({
    timeout: 30,
    callerId: callerId || undefined,
  });

  for (const recipient of recipients) {
    dial.number(
      {
        url: `${API_BASE_URL}/api/local-seo/voice/whisper`,
        statusCallback: `${API_BASE_URL}/api/local-seo/voice/leg-status?combinationId=${combinationId}&recipientId=${recipient.id}`,
        statusCallbackEvent: ['answered', 'completed'],
        statusCallbackMethod: 'POST',
      },
      recipient.phone
    );
  }

  return response.toString();
}

// @desc TwiML played to whichever recipient picks up, before they're
// bridged to the actual caller.
function buildWhisperTwiml() {
  const response = new twilio.twiml.VoiceResponse();
  response.say({ language: 'pt-BR' }, 'Nova indicação de cliente da Michael. Conectando agora.');
  return response.toString();
}

// @desc Verifies a request actually came from Twilio (X-Twilio-Signature
// header), using the exact webhook URL and the parsed form params.
function verifySignature({ signature, url, params }) {
  if (!process.env.TWILIO_AUTH_TOKEN) return false;
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, params);
}

module.exports = {
  searchAvailableNumbers,
  purchaseNumberForCombination,
  buildIncomingCallTwiml,
  buildWhisperTwiml,
  verifySignature,
};
