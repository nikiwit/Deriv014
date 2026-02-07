// Service to handle external messaging APIs (Telegram & WhatsApp)

// --- Telegram API ---
const TELEGRAM_BASE_URL = 'https://api.telegram.org/bot';

export const validateTelegramToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${TELEGRAM_BASE_URL}${token}/getMe`);
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error('Telegram Validation Error:', error);
    return false;
  }
};

export const getTelegramUpdates = async (token: string, offset: number = 0) => {
  try {
    const response = await fetch(`${TELEGRAM_BASE_URL}${token}/getUpdates?offset=${offset}`);
    const data = await response.json();
    if (data.ok) {
      return data.result;
    }
    return [];
  } catch (error) {
    console.error('Telegram Polling Error:', error);
    return [];
  }
};

export const sendTelegramMessage = async (token: string, chatId: string, text: string) => {
  try {
    await fetch(`${TELEGRAM_BASE_URL}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Telegram Send Error:', error);
  }
};

// --- WhatsApp Cloud API ---
const WHATSAPP_BASE_URL = 'https://graph.facebook.com/v18.0';

export const sendWhatsAppMessage = async (token: string, phoneNumberId: string, to: string, text: string) => {
  try {
    const response = await fetch(`${WHATSAPP_BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      })
    });
    return await response.json();
  } catch (error) {
    console.error('WhatsApp Send Error:', error);
  }
};