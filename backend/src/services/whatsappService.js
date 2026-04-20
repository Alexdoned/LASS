const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const QRCodeImg = require('qrcode');
const path = require('path');
const fs = require('fs');

let client;
let isReady = false;

const initializeWhatsApp = () => {
  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: './whatsapp_session'
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ],
    }
  });

  client.on('qr', async (qr) => {
    console.log('\n--- SCAN THIS QR CODE WITH WHATSAPP ---');
    qrcode.generate(qr, { small: true });
    console.log('----------------------------------------\n');

    try {
      // Also save as image for the user to see in the UI
      const qrPath = path.join(process.cwd(), 'whatsapp_qr.png');
      await QRCodeImg.toFile(qrPath, qr);
      console.log(`[WhatsApp Service] QR Code saved as image to: ${qrPath}`);
    } catch (err) {
      console.error('[WhatsApp Service] Failed to save QR image:', err);
    }
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp Client is ready!');
    isReady = true;
    
    // Remove QR image once ready
    const qrPath = path.join(process.cwd(), 'whatsapp_qr.png');
    if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);
  });

  client.on('authenticated', () => {
    console.log('✅ WhatsApp Authenticated!');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp Auth Failure:', msg);
  });

  client.initialize();
};

const sendWhatsAppMessage = async (to, message) => {
  if (!isReady) {
    console.warn('[WhatsApp Service] Client not ready. Logging message:');
    console.log(`To: ${to} | Message: ${message}`);
    return;
  }

  try {
    // Format number: remove all non-digits
    let formattedNumber = to.replace(/\D/g, '');
    
    // Handle local format (starting with 0) - common in Nigeria (+234)
    if (formattedNumber.startsWith('0') && formattedNumber.length === 11) {
      formattedNumber = '234' + formattedNumber.substring(1);
    }

    if (!formattedNumber.endsWith('@c.us')) {
      formattedNumber += '@c.us';
    }

    await client.sendMessage(formattedNumber, message);
    console.log(`[WhatsApp Service] Message sent successfully to ${to}`);
  } catch (error) {
    console.error('[WhatsApp Service] Failed to send message:', error);
  }
};

module.exports = { initializeWhatsApp, sendWhatsAppMessage };
