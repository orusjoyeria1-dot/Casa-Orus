const VERIFY_TOKEN = "CasaOrusWebhook2026";

Deno.serve(async (req) => {
  // Verificación de Meta
  if (req.method === "GET") {
    const url = new URL(req.url);

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ WEBHOOK VERIFICADO POR META");

      return new Response(challenge, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return new Response("Token incorrecto", {
      status: 403,
    });
  }

  // Recepción de eventos de WhatsApp
  if (req.method === "POST") {
    try {
      const body = await req.json();

      console.log(
        "📩 WEBHOOK WHATSAPP:",
        JSON.stringify(body)
      );

      return new Response("EVENT_RECEIVED", {
        status: 200,
      });
    } catch (error) {
      console.error("❌ Error leyendo webhook:", error);

      return new Response("Error", {
        status: 400,
      });
    }
  }

  return new Response("Método no permitido", {
    status: 405,
  });
});