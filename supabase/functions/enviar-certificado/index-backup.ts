import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "npm:pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // =====================================================
    // DATOS RECIBIDOS
    // =====================================================

    const {
      nombre,
      telefono,
      codigo,
    } = await req.json();

    if (!nombre || !telefono || !codigo) {
      return new Response(
        JSON.stringify({
          error:
            "Faltan nombre, teléfono o código.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    // =====================================================
    // SECRETOS
    // =====================================================

    const SUPABASE_URL =
      Deno.env.get("SUPABASE_URL")!;

    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!;

    const TWILIO_ACCOUNT_SID =
      Deno.env.get(
        "TWILIO_ACCOUNT_SID"
      )!;

    const TWILIO_AUTH_TOKEN =
      Deno.env.get(
        "TWILIO_AUTH_TOKEN"
      )!;

    const TWILIO_FROM =
      Deno.env.get(
        "TWILIO_FROM"
      )!;

    // =====================================================
    // BUSCAR CERTIFICADO
    // =====================================================

    const certificadoResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/certificados?codigo=eq.${encodeURIComponent(
          codigo
        )}&select=id,venta_id,fecha_emision,estado,ventas(numero_venta,fecha_compra,garantia_anios,foto_url,clientes(nombre,telefono),productos(referencia,nombre,material,piedra,precio))`,
        {
          headers: {
            apikey:
              SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

    if (!certificadoResponse.ok) {
      throw new Error(
        `Error consultando certificado: ${await certificadoResponse.text()}`
      );
    }

    const certificados =
      await certificadoResponse.json();

    if (!certificados.length) {
      throw new Error(
        "No se encontró el certificado."
      );
    }

    const certificado =
      certificados[0];

    const venta =
      certificado.ventas;

    if (!venta) {
      throw new Error(
        "El certificado no tiene una venta asociada."
      );
    }

    const producto =
      venta.productos;

    const fotoUrl =
      venta.foto_url;

    // =====================================================
    // CREAR PDF
    // =====================================================

    const pdfDoc =
      await PDFDocument.create();

    const width = 595;
    const height = 842;

    const marfil = rgb(
      0.97,
      0.95,
      0.90
    );

    const dorado = rgb(
      0.72,
      0.55,
      0.20
    );

    const gris = rgb(
      0.30,
      0.30,
      0.30
    );

    const negro = rgb(
      0.10,
      0.10,
      0.10
    );

    const blanco = rgb(
      1,
      1,
      1
    );

    const fontRegular =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const fontBold =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    // =====================================================
    // LOGO
    // =====================================================

    let logoImage = null;

    try {
      const logoUrl =
        `${SUPABASE_URL}/storage/v1/object/public/Orus%20joyeria/logos/Logo-Casa-Orus-Real.png`;

      const logoResponse =
        await fetch(logoUrl);

      if (logoResponse.ok) {
        const logoBytes =
          new Uint8Array(
            await logoResponse.arrayBuffer()
          );

        const contentType =
          logoResponse.headers.get(
            "content-type"
          ) || "";

        if (
          contentType.includes("png")
        ) {
          logoImage =
            await pdfDoc.embedPng(
              logoBytes
            );
        } else {
          logoImage =
            await pdfDoc.embedJpg(
              logoBytes
            );
        }
      }
    } catch (error) {
      console.error(
        "Error cargando logo:",
        error
      );
    }

    // =====================================================
    // FOTO
    // =====================================================

    let fotoImagen = null;

    if (fotoUrl) {
      try {
        const fotoResponse =
          await fetch(
            `${SUPABASE_URL}/storage/v1/object/public/joyas/${fotoUrl}`
          );

        if (fotoResponse.ok) {
          const fotoBytes =
            new Uint8Array(
              await fotoResponse.arrayBuffer()
            );

          const contentType =
            fotoResponse.headers.get(
              "content-type"
            ) || "";

          if (
            contentType.includes("png")
          ) {
            fotoImagen =
              await pdfDoc.embedPng(
                fotoBytes
              );
          } else {
            fotoImagen =
              await pdfDoc.embedJpg(
                fotoBytes
              );
          }
        }
      } catch (error) {
        console.error(
          "Error cargando foto:",
          error
        );
      }
    }

    // =====================================================
    // FUNCIONES
    // =====================================================

    function crearFondo(page: any) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: marfil,
      });

      page.drawRectangle({
        x: 22,
        y: 22,
        width: width - 44,
        height: height - 44,
        borderColor: dorado,
        borderWidth: 2,
      });

      page.drawRectangle({
        x: 30,
        y: 30,
        width: width - 60,
        height: height - 60,
        borderColor: dorado,
        borderWidth: 0.5,
      });
    }

    function centeredText(
      page: any,
      text: string,
      y: number,
      size: number,
      font = fontRegular,
      color = negro
    ) {
      const textWidth =
        font.widthOfTextAtSize(
          text,
          size
        );

      page.drawText(text, {
        x:
          (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    }

    // =====================================================
    // PÁGINA 1
    // =====================================================

    const page1 =
      pdfDoc.addPage([
        width,
        height,
      ]);

    crearFondo(page1);

    if (logoImage) {
      const logoWidth = 150;

      const logoHeight =
        (logoImage.height /
          logoImage.width) *
        logoWidth;

      page1.drawImage(
        logoImage,
        {
          x:
            (width -
              logoWidth) /
            2,
          y: 735,
          width: logoWidth,
          height: logoHeight,
        }
      );
    }

    centeredText(
      page1,
      "CERTIFICADO DE AUTENTICIDAD",
      690,
      20,
      fontBold,
      dorado
    );

    centeredText(
      page1,
      "Casa Orus",
      662,
      13,
      fontRegular,
      gris
    );

    page1.drawLine({
      start: {
        x: 120,
        y: 642,
      },
      end: {
        x: 475,
        y: 642,
      },
      thickness: 1,
      color: dorado,
    });

    centeredText(
      page1,
      "Este certificado pertenece a",
      615,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      nombre,
      588,
      19,
      fontBold,
      negro
    );

    centeredText(
      page1,
      "DETALLES DE LA PIEZA",
      510,
      11,
      fontBold,
      dorado
    );

    centeredText(
      page1,
      `Referencia: ${
        producto?.referencia ||
        "N/A"
      }`,
      485,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      `Pieza: ${
        producto?.nombre ||
        "N/A"
      }`,
      468,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      `Material: ${
        producto?.material ||
        "Oro laminado"
      }`,
      451,
      9,
      fontRegular,
      gris
    );

    if (producto?.piedra) {
      centeredText(
        page1,
        `Piedra natural: ${producto.piedra}`,
        434,
        9,
        fontRegular,
        gris
      );
    }

    centeredText(
      page1,
      `Certificado: ${codigo}`,
      390,
      10,
      fontBold,
      negro
    );

    centeredText(
      page1,
      `Venta: ${
        venta.numero_venta ||
        "N/A"
      }`,
      372,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      `Fecha de compra: ${
        venta.fecha_compra ||
        "N/A"
      }`,
      356,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      `Garantía: ${
        venta.garantia_anios ||
        5
      } años`,
      340,
      9,
      fontRegular,
      gris
    );

    page1.drawLine({
      start: {
        x: 150,
        y: 175,
      },
      end: {
        x: 445,
        y: 175,
      },
      thickness: 0.7,
      color: dorado,
    });

    centeredText(
      page1,
      "Joyería que trasciende,",
      145,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      "creada para acompañarte en cada historia.",
      130,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page1,
      "CASA ORUS",
      85,
      10,
      fontBold,
      dorado
    );

    // =====================================================
    // PÁGINA 2 - FOTO
    // =====================================================

    const page2 =
      pdfDoc.addPage([
        width,
        height,
      ]);

    crearFondo(page2);

    if (logoImage) {
      const logoWidth = 125;

      const logoHeight =
        (logoImage.height /
          logoImage.width) *
        logoWidth;

      page2.drawImage(
        logoImage,
        {
          x:
            (width -
              logoWidth) /
            2,
          y: 735,
          width: logoWidth,
          height: logoHeight,
        }
      );
    }

    centeredText(
      page2,
      "REGISTRO FOTOGRÁFICO",
      680,
      20,
      fontBold,
      dorado
    );

    centeredText(
      page2,
      "DE LA PIEZA",
      652,
      15,
      fontRegular,
      gris
    );

    page2.drawLine({
      start: {
        x: 120,
        y: 630,
      },
      end: {
        x: 475,
        y: 630,
      },
      thickness: 1,
      color: dorado,
    });

    if (fotoImagen) {
      const maxWidth = 430;
      const maxHeight = 400;

      const ratio =
        Math.min(
          maxWidth /
            fotoImagen.width,
          maxHeight /
            fotoImagen.height
        );

      const fotoWidth =
        fotoImagen.width *
        ratio;

      const fotoHeight =
        fotoImagen.height *
        ratio;

      const fotoX =
        (width - fotoWidth) /
        2;

      const fotoY = 280;

      page2.drawRectangle({
        x: fotoX - 12,
        y: fotoY - 12,
        width:
          fotoWidth + 24,
        height:
          fotoHeight + 24,
        color: blanco,
        borderColor: dorado,
        borderWidth: 2,
      });

      page2.drawImage(
        fotoImagen,
        {
          x: fotoX,
          y: fotoY,
          width: fotoWidth,
          height: fotoHeight,
        }
      );
    } else {
      centeredText(
        page2,
        "No se encontró fotografía de la pieza.",
        450,
        11,
        fontRegular,
        gris
      );
    }

    centeredText(
      page2,
      `Referencia: ${
        producto?.referencia ||
        "N/A"
      }`,
      225,
      10,
      fontBold,
      negro
    );

    centeredText(
      page2,
      `Certificado: ${codigo}`,
      205,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page2,
      `Venta: ${
        venta.numero_venta ||
        "N/A"
      }`,
      187,
      9,
      fontRegular,
      gris
    );

    centeredText(
      page2,
      `Cliente: ${nombre}`,
      169,
      9,
      fontRegular,
      gris
    );

    page2.drawLine({
      start: {
        x: 150,
        y: 125,
      },
      end: {
        x: 445,
        y: 125,
      },
      thickness: 0.7,
      color: dorado,
    });

    centeredText(
      page2,
      "CASA ORUS",
      92,
      10,
      fontBold,
      dorado
    );

    centeredText(
      page2,
      "Registro fotográfico de autenticidad",
      75,
      8,
      fontRegular,
      gris
    );

    // =====================================================
    // GUARDAR PDF EN STORAGE
    // =====================================================

    const pdfBytes =
      await pdfDoc.save();

    const pdfPath =
      `certificados/${codigo}.pdf`;

    const uploadResponse =
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/certificados/${pdfPath}`,
        {
          method: "POST",
          headers: {
            apikey:
              SUPABASE_SERVICE_ROLE_KEY,

            Authorization:
              `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,

            "Content-Type":
              "application/pdf",

            "x-upsert":
              "true",
          },
          body: pdfBytes,
        }
      );

    if (!uploadResponse.ok) {
      throw new Error(
        `Error guardando PDF: ${await uploadResponse.text()}`
      );
    }

    // =====================================================
    // URL PÚBLICA DEL PDF
    // =====================================================

    const pdfPublicUrl =
      `${SUPABASE_URL}/storage/v1/object/public/certificados/${pdfPath}`;

    console.log(
      "PDF público:",
      pdfPublicUrl
    );

    // =====================================================
    // PREPARAR TELÉFONO
    // =====================================================

    let telefonoWhatsApp =
      String(telefono).trim();

    telefonoWhatsApp =
      telefonoWhatsApp.replace(
        /[\s()-]/g,
        ""
      );

    if (
      !telefonoWhatsApp.startsWith("+")
    ) {
      telefonoWhatsApp =
        "+" + telefonoWhatsApp;
    }

    const to =
      `whatsapp:${telefonoWhatsApp}`;

    // =====================================================
    // ENVIAR WHATSAPP CON TWILIO
    // =====================================================

    const contentVariables =
      JSON.stringify({
        "1": pdfPublicUrl,
      });

    const parametros =
      new URLSearchParams();

    parametros.append(
      "To",
      to
    );

    parametros.append(
      "From",
      TWILIO_FROM
    );

    parametros.append(
      "ContentSid",
      "HXfe5ab5f00277942d4d4200328b4d403c"
    );

    parametros.append(
      "ContentVariables",
      contentVariables
    );

    const credenciales =
      btoa(
        `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
      );

    const twilioResponse =
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",

            Authorization:
              `Basic ${credenciales}`,
          },

          body:
            parametros.toString(),
        }
      );

    const twilioResultado =
      await twilioResponse.text();

    if (!twilioResponse.ok) {
      throw new Error(
        `Error de Twilio: ${twilioResultado}`
      );
    }

    console.log(
      "Respuesta Twilio:",
      twilioResultado
    );

    // =====================================================
    // RESPUESTA
    // =====================================================

    return new Response(
      JSON.stringify({
        success: true,
        codigo,
        pdf_url: pdfPublicUrl,
        whatsapp: true,
        mensaje:
          "Certificado generado y enviado por WhatsApp.",
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});