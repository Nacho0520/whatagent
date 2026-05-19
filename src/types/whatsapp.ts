// Twilio WhatsApp webhook payload (sent as form-encoded POST)
export interface TwilioWebhookPayload {
  MessageSid: string        // Unique message SID — used for deduplication
  AccountSid: string
  From: string              // Format: 'whatsapp:+34612345678'
  To: string                // Format: 'whatsapp:+14155238886' (your Twilio number)
  Body: string              // Message text
  ProfileName: string       // Customer's WhatsApp display name
  WaId: string              // Customer phone without 'whatsapp:' prefix
  NumMedia: string          // '0' if no media
}

// Normalized message after parsing Twilio payload
export interface IncomingMessage {
  twilioMessageSid: string
  customerPhone: string     // E.164 format: +34612345678
  customerName: string      // From ProfileName
  messageText: string
  toNumber: string          // The Twilio number that received the message
  timestamp: Date
}

// Payload enqueued to QStash for async processing
export interface WorkerPayload {
  twilioMessageSid: string
  customerPhone: string
  customerName: string
  messageText: string
  twilioWhatsappNumber: string  // Used to look up which business this belongs to
  timestamp: string
}
