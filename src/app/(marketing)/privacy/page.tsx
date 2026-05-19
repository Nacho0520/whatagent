export const metadata = {
  title: 'Política de Privacidad — WhatAgent',
}

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 prose prose-slate">
      <h1>Política de Privacidad</h1>
      <p><strong>Última actualización:</strong> 19 de mayo de 2026</p>

      <h2>1. Datos que Recopilamos</h2>
      <p>Recopilamos: nombre del negocio, email, datos de configuración de WhatsApp y conversaciones procesadas por la IA.</p>

      <h2>2. Uso de los Datos</h2>
      <p>Utilizamos tus datos exclusivamente para operar el servicio: procesar mensajes de WhatsApp, generar respuestas de IA y gestionar tu suscripción.</p>

      <h2>3. Almacenamiento</h2>
      <p>Los datos se almacenan en servidores de Supabase (UE) con cifrado en tránsito y en reposo.</p>

      <h2>4. Terceros</h2>
      <p>Compartimos datos con: Twilio (entrega de mensajes), OpenAI (generación de respuestas IA), Stripe (pagos). Ningún proveedor vende tus datos.</p>

      <h2>5. Retención</h2>
      <p>Conservamos las conversaciones durante 90 días. Puedes solicitar la eliminación de tus datos en cualquier momento.</p>

      <h2>6. Derechos RGPD</h2>
      <p>Tienes derecho a acceder, rectificar y eliminar tus datos. Contacta: privacidad@whatagent.es</p>

      <h2>7. Cookies</h2>
      <p>Usamos cookies de sesión necesarias para el funcionamiento del servicio. No usamos cookies de seguimiento de terceros.</p>
    </div>
  )
}
