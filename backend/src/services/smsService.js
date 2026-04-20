const twilio = require('twilio');

const sendSMS = async (to, message) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.warn('[SMS Service] Twilio credentials not configured. Logging message instead:');
    console.log(`To: ${to} | Message: ${message}`);
    return;
  }

  const client = twilio(accountSid, authToken);

  try {
    const result = await client.messages.create({
      body: message,
      from,
      to
    });
    console.log(`[SMS Service] Message sent successfully: ${result.sid}`);
    return result;
  } catch (error) {
    console.error(`[SMS Service] Failed to send SMS:`, error);
    throw error;
  }
};

module.exports = { sendSMS };
