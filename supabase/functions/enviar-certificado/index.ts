import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { nombre, telefono, codigo } = await req.json();

    if (!nombre || !telefono || !codigo) {
      throw new Error("Faltan nombre, teléfono o código.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const whatsappToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Faltan las variables de Supabase.");
    }

    if (!whatsappToken || !phoneNumberId) {
      throw new Error("Faltan las variables de WhatsApp.");
    }

    // ==========================================
    // 1. BUSCAR CERTIFICADO
    // ==========================================

    const certificadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/certificados?codigo=eq.${encodeURIComponent(
        codigo
      )}&select=codigo,fecha_emision,estado,ventas(numero_venta,fecha_compra,garantia_anios,foto_url,clientes(nombre,telefono),productos(referencia,nombre,material,piedra,precio))`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!certificadoResponse.ok) {
      throw new Error(
        `Error consultando certificado: ${await certificadoResponse.text()}`
      );
    }

    const certificados = await certificadoResponse.json();

    if (!certificados.length) {
      throw new Error(`No existe el certificado ${codigo}.`);
    }

    const certificado = certificados[0];
    const venta = certificado.ventas;
    const producto = venta.productos;

    if (!venta) {
      throw new Error("El certificado no tiene una venta asociada.");
    }

    // ==========================================
    // 2. CREAR PDF
    // ==========================================

    const pdfDoc = await PDFDocument.create();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const width = 595;
    const height = 842;

    const marfil = rgb(0.97, 0.95, 0.90);
    const dorado = rgb(0.70, 0.52, 0.20);
    const gris = rgb(0.25, 0.25, 0.25);

    function centeredText(
      page: any,
      text: string,
      y: number,
      size: number,
      font: any,
      color: any
    ) {
      const textWidth = font.widthOfTextAtSize(text, size);

      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    }

    // ==========================================
    // PÁGINA 1 — CERTIFICADO
    // ==========================================

    const page1 = pdfDoc.addPage([width, height]);

    page1.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    page1.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: dorado,
      borderWidth: 2,
    });

    page1.drawRectangle({
      x: 35,
      y: 35,
      width: width - 70,
      height: height - 70,
      borderColor: dorado,
      borderWidth: 0.7,
    });

    centeredText(page1, "CASA ORUS", 745, 28, fontBold, dorado);

    centeredText(
      page1,
      "CERTIFICADO DE AUTENTICIDAD",
      700,
      18,
      fontBold,
      gris
    );

    centeredText(
      page1,
      "Joyería que trasciende",
      670,
      11,
      fontRegular,
      dorado
    );

    page1.drawLine({
      start: { x: 120, y: 640 },
      end: { x: width - 120, y: 640 },
      thickness: 1,
      color: dorado,
    });

    centeredText(
      page1,
      "Esta pieza pertenece oficialmente a",
      590,
      11,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      nombre.toUpperCase(),
      550,
      20,
      fontBold,
      dorado
    );

    centeredText(
      page1,
      "Código de certificado",
      495,
      10,
      fontRegular,
      gris
    );

    centeredText(page1, codigo, 465, 17, fontBold, gris);

    centeredText(
      page1,
      `Venta: ${venta.numero_venta}`,
      425,
      11,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      `Referencia: ${producto.referencia}`,
      400,
      11,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      producto.nombre,
      370,
      14,
      fontBold,
      dorado
    );

    centeredText(
      page1,
      `Material: ${producto.material || "Oro laminado"}`,
      335,
      10,
      fontRegular,
      gris
    );

    if (producto.piedra) {
      centeredText(
        page1,
        `Piedra natural: ${producto.piedra}`,
        315,
        10,
        fontRegular,
        gris
      );
    }

    centeredText(
      page1,
      `Garantía: ${venta.garantia_anios || 5} años`,
      270,
      12,
      fontBold,
      dorado
    );

    centeredText(
      page1,
      "Gracias por elegir Casa Orus.",
      190,
      11,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      "Una joya para siempre.",
      165,
      12,
      fontBold,
      dorado
    );

    // ==========================================
    // 3. OBTENER FOTO
    // ==========================================

    let fotoBytes: Uint8Array | null = null;
    let fotoTipo = "";

    if (venta.foto_url) {
      const fotoUrl =
        `${supabaseUrl}/storage/v1/object/public/joyas/${venta.foto_url}`;

      const fotoResponse = await fetch(fotoUrl);

      if (fotoResponse.ok) {
        fotoBytes = new Uint8Array(
          await fotoResponse.arrayBuffer()
        );

        fotoTipo =
          fotoResponse.headers.get("content-type") || "";
      }
    }

    // ==========================================
    // PÁGINA 2 — FOTO
    // ==========================================

    const page2 = pdfDoc.addPage([width, height]);

    page2.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    page2.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: dorado,
      borderWidth: 2,
    });

    centeredText(
      page2,
      "CASA ORUS",
      755,
      24,
      fontBold,
      dorado
    );

    centeredText(
      page2,
      "REGISTRO FOTOGRÁFICO DE LA PIEZA",
      715,
      15,
      fontBold,
      gris
    );

    centeredText(
      page2,
      codigo,
      685,
      11,
      fontRegular,
      dorado
    );

    if (fotoBytes) {
      try {
        let imagen;

        if (fotoTipo.includes("png")) {
          imagen = await pdfDoc.embedPng(fotoBytes);
        } else {
          imagen = await pdfDoc.embedJpg(fotoBytes);
        }

        const escala = Math.min(
          430 / imagen.width,
          470 / imagen.height
        );

        const imagenWidth = imagen.width * escala;
        const imagenHeight = imagen.height * escala;

        page2.drawImage(imagen, {
          x: (width - imagenWidth) / 2,
          y: 220,
          width: imagenWidth,
          height: imagenHeight,
        });
      } catch (error) {
        console.error("No se pudo insertar la fotografía:", error);

        centeredText(
          page2,
          "Fotografía no disponible",
          430,
          14,
          fontBold,
          gris
        );
      }
    } else {
      centeredText(
        page2,
        "Fotografía no disponible",
        430,
        14,
        fontBold,
        gris
      );
    }

    centeredText(
      page2,
      `Cliente: ${nombre}`,
      165,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page2,
      `Venta: ${venta.numero_venta}`,
      145,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page2,
      "Registro oficial de Casa Orus",
      100,
      10,
      fontBold,
      dorado
    );

    // ==========================================
    // 4. CONVERTIR PDF A BYTES
    // ==========================================

    const pdfBytes = await pdfDoc.save();

    // ==========================================
    // 5. GUARDAR PDF EN STORAGE
    // ==========================================

    const nombrePdf = `certificados/${codigo}.pdf`;

    const uploadPdfResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/certificados/${nombrePdf}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/pdf",
          "x-upsert": "true",
        },
        body: pdfBytes,
      }
    );

    if (!uploadPdfResponse.ok) {
      throw new Error(
        `Error guardando PDF: ${await uploadPdfResponse.text()}`
      );
    }

    // ==========================================
    // 6. URL PÚBLICA DEL PDF
    // ==========================================

    const pdfPublicUrl =
      `${supabaseUrl}/storage/v1/object/public/certificados/${nombrePdf}`;

    console.log("PDF generado:", pdfPublicUrl);

    // ==========================================
    // 7. NORMALIZAR TELÉFONO
    // ==========================================

    let telefonoWhatsApp = telefono.replace(/\D/g, "");

    if (telefonoWhatsApp.startsWith("0")) {
      telefonoWhatsApp = telefonoWhatsApp.substring(1);
    }

    if (!telefonoWhatsApp.startsWith("57")) {
      telefonoWhatsApp = "57" + telefonoWhatsApp;
    }

    // ==========================================
    // 8. ENVIAR DOCUMENTO POR META WHATSAPP
    // ==========================================

    const whatsappUrl =
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;

    const whatsappResponse = await fetch(whatsappUrl, {
      method: "POST",

      headers: {
        Authorization: `Bearer ${whatsappToken}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        messaging_product: "whatsapp",

        to: telefonoWhatsApp,

        type: "document",

        document: {
          link: pdfPublicUrl,
          filename: `Certificado-Casa-Orus-${codigo}.pdf`,
          caption:
            `✨ Casa Orus\n\nTu certificado de garantía está listo.\nCódigo: ${codigo}`,
        },
      }),
    });

    const whatsappResult = await whatsappResponse.text();

    console.log(
      "Respuesta WhatsApp:",
      whatsappResult
    );

    if (!whatsappResponse.ok) {
      throw new Error(
        `WhatsApp rechazó el mensaje: ${whatsappResult}`
      );
    }

    // ==========================================
    // 9. RESPUESTA
    // ==========================================

    return new Response(
      JSON.stringify({
        ok: true,
        codigo,
        pdf: pdfPublicUrl,
        whatsapp: telefonoWhatsApp,
        mensaje:
          "Certificado creado y enviado por WhatsApp.",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    console.error("ERROR:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});