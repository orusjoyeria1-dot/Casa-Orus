import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const correo = body.correo;
    const nombre = body.nombre;
    const codigo = body.codigo;

    if (!correo || !nombre || !codigo) {
      return new Response(
        JSON.stringify({
          error: "Faltan datos para generar el certificado.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // --------------------------------------------------
    // 1. CREAR PDF
    // --------------------------------------------------

    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([595.28, 841.89]);

    const { width, height } = page.getSize();

    const marfil = rgb(0.97, 0.95, 0.90);
    const dorado = rgb(0.70, 0.55, 0.22);
    const doradoClaro = rgb(0.84, 0.72, 0.45);
    const negro = rgb(0.12, 0.11, 0.10);
    const gris = rgb(0.40, 0.38, 0.35);

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Fondo
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    // Marco exterior
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: dorado,
      borderWidth: 2,
    });

    // Marco interior
    page.drawRectangle({
      x: 29,
      y: 29,
      width: width - 58,
      height: height - 58,
      borderColor: doradoClaro,
      borderWidth: 0.7,
    });

    // --------------------------------------------------
    // 2. LOGO
    // --------------------------------------------------

    const logoUrl =
      "https://xpispufrnqgpyxbqixny.supabase.co/storage/v1/object/public/Orus%20joyeria/logos/Logo-Casa-Orus-Real.png";

    let logo = null;

    try {
      const logoResponse = await fetch(logoUrl);

      if (logoResponse.ok) {
        const logoBytes = new Uint8Array(
          await logoResponse.arrayBuffer()
        );

        logo = await pdfDoc.embedPng(logoBytes);
      }
    } catch (error) {
      console.error("No se pudo cargar el logo:", error);
    }

    if (logo) {
      const maxLogoWidth = 190;
      const maxLogoHeight = 105;

      const scale = Math.min(
        maxLogoWidth / logo.width,
        maxLogoHeight / logo.height
      );

      const logoWidth = logo.width * scale;
      const logoHeight = logo.height * scale;

      page.drawImage(logo, {
        x: (width - logoWidth) / 2,
        y: height - 155,
        width: logoWidth,
        height: logoHeight,
      });
    } else {
      // Respaldo si el logo no carga
      const logoText = "CASA ORUS";
      const logoSize = 26;
      const logoWidth = fontBold.widthOfTextAtSize(
        logoText,
        logoSize
      );

      page.drawText(logoText, {
        x: (width - logoWidth) / 2,
        y: height - 115,
        size: logoSize,
        font: fontBold,
        color: dorado,
      });
    }

    // --------------------------------------------------
    // 3. FUNCIONES PARA CENTRAR TEXTO
    // --------------------------------------------------

    function centeredText(
      text: string,
      y: number,
      size: number,
      font = fontRegular,
      color = negro
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

    function centeredLine(
      text: string,
      y: number,
      size: number,
      font = fontRegular,
      color = negro
    ) {
      centeredText(text, y, size, font, color);
    }

    // --------------------------------------------------
    // 4. TÍTULO
    // --------------------------------------------------

    centeredLine(
      "CERTIFICADO",
      height - 190,
      25,
      fontBold,
      dorado
    );

    centeredLine(
      "DE AUTENTICIDAD Y GARANTÍA",
      height - 216,
      12,
      fontBold,
      negro
    );

    // Línea decorativa
    page.drawLine({
      start: {
        x: 145,
        y: height - 235,
      },
      end: {
        x: width - 145,
        y: height - 235,
      },
      thickness: 1,
      color: doradoClaro,
    });

    // --------------------------------------------------
    // 5. TEXTO PRINCIPAL
    // --------------------------------------------------

    centeredLine(
      "Casa Orus certifica que la pieza adquirida",
      height - 275,
      11,
      fontRegular,
      gris
    );

    centeredLine(
      "forma parte de nuestra colección de joyería.",
      height - 292,
      11,
      fontRegular,
      gris
    );

    // --------------------------------------------------
    // 6. NOMBRE DEL CLIENTE
    // --------------------------------------------------

    centeredLine(
      "CLIENTE",
      height - 345,
      9,
      fontBold,
      dorado
    );

    centeredLine(
      nombre.toUpperCase(),
      height - 372,
      18,
      fontBold,
      negro
    );

    page.drawLine({
      start: {
        x: 145,
        y: height - 385,
      },
      end: {
        x: width - 145,
        y: height - 385,
      },
      thickness: 0.7,
      color: doradoClaro,
    });

    // --------------------------------------------------
    // 7. GARANTÍA
    // --------------------------------------------------

    centeredLine(
      "GARANTÍA",
      height - 425,
      9,
      fontBold,
      dorado
    );

    centeredLine(
      "5 AÑOS SOBRE EL ORO LAMINADO",
      height - 450,
      13,
      fontBold,
      negro
    );

    centeredLine(
      "Conserva este certificado como respaldo de tu pieza.",
      height - 475,
      9.5,
      fontRegular,
      gris
    );

    // --------------------------------------------------
    // 8. CÓDIGO DEL CERTIFICADO
    // --------------------------------------------------

    page.drawRectangle({
      x: 105,
      y: height - 560,
      width: width - 210,
      height: 62,
      borderColor: dorado,
      borderWidth: 1.2,
    });

    centeredLine(
      "CÓDIGO ÚNICO DEL CERTIFICADO",
      height - 525,
      8,
      fontBold,
      dorado
    );

    centeredLine(
      codigo,
      height - 548,
      15,
      fontBold,
      negro
    );

    // --------------------------------------------------
    // 9. ESTADO
    // --------------------------------------------------

    centeredLine(
      "CERTIFICADO ACTIVO",
      height - 600,
      9,
      fontBold,
      dorado
    );

    // --------------------------------------------------
    // 10. FRASE FINAL
    // --------------------------------------------------

    centeredLine(
      "“Joyería que trasciende, creada para acompañarte",
      150,
      10,
      fontRegular,
      gris
    );

    centeredLine(
      "en cada historia.”",
      134,
      10,
      fontRegular,
      gris
    );

    // Línea inferior
    page.drawLine({
      start: {
        x: 160,
        y: 105,
      },
      end: {
        x: width - 160,
        y: 105,
      },
      thickness: 0.8,
      color: doradoClaro,
    });

    centeredLine(
      "CASA ORUS",
      80,
      10,
      fontBold,
      dorado
    );

    centeredLine(
      "Joyería artesanal · Piedras naturales · Oro laminado",
      62,
      7.5,
      fontRegular,
      gris
    );

    // --------------------------------------------------
    // 11. CONVERTIR PDF A BASE64
    // --------------------------------------------------

    const pdfBytes = await pdfDoc.save();

    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...pdfBytes.subarray(i, i + chunkSize)
      );
    }

    const pdfBase64 = btoa(binary);

    // --------------------------------------------------
    // 12. ENVIAR POR RESEND
    // --------------------------------------------------

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("No existe RESEND_API_KEY.");
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Casa Orus <certificados@orusjoyeria.COM>",
          to: [correo],
          subject: `Certificado Casa Orus - ${codigo}`,
          html: `
            <div style="font-family:Arial,sans-serif;text-align:center;padding:30px;">
              <h2 style="color:#b08a3c;">
                Casa Orus
              </h2>

              <h3>
                Certificado de autenticidad y garantía
              </h3>

              <p>
                Hola <strong>${nombre}</strong>,
              </p>

              <p>
                Adjuntamos el certificado correspondiente a tu pieza Casa Orus.
              </p>

              <p>
                <strong>Código:</strong> ${codigo}
              </p>

              <p>
                Gracias por elegir Casa Orus.
              </p>

              <p style="color:#777;">
                Joyería que trasciende, creada para acompañarte en cada historia.
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `Certificado-Casa-Orus-${codigo}.pdf`,
              content: pdfBase64,
            },
          ],
        }),
      }
    );

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Error de Resend:", resendData);

      throw new Error(
        resendData?.message || "Error enviando el correo."
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        codigo,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
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
            : "Error desconocido.",
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