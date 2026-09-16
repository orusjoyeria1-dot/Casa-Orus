import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const {
      nombre,
      telefono,
      codigo,
    } = await req.json();

    if (!nombre || !telefono || !codigo) {
      return new Response(
        JSON.stringify({
          error: "Faltan datos: nombre, telefono o codigo.",
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

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || "";

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const whatsappToken =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";

    const phoneNumberId =
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !whatsappToken ||
      !phoneNumberId
    ) {
      throw new Error(
        "Faltan variables de entorno de Supabase o WhatsApp."
      );
    }

    // ============================================================
    // 1. BUSCAR CERTIFICADO
    // ============================================================

    const certificadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/certificados` +
        `?select=` +
        `codigo,fecha_emision,estado,` +
        `ventas(` +
        `id,numero_venta,fecha_compra,garantia_anios,foto_url,` +
        `clientes(nombre,correo,telefono),` +
        `productos(referencia,nombre,material,piedra,precio)` +
        `)` +
        `&codigo=eq.${encodeURIComponent(codigo)}` +
        `&limit=1`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    if (!certificadoResponse.ok) {
      throw new Error(
        "No se pudo consultar el certificado."
      );
    }

    const certificados =
      await certificadoResponse.json();

    if (
      !certificados ||
      certificados.length === 0
    ) {
      throw new Error(
        `No existe el certificado ${codigo}.`
      );
    }

    const certificado = certificados[0];
    const venta = certificado.ventas;

    if (!venta) {
      throw new Error(
        "El certificado no tiene una venta asociada."
      );
    }

    const cliente = venta.clientes;
    const producto = venta.productos;

    // ============================================================
    // 2. CREAR PDF
    // ============================================================

    const pdfDoc = await PDFDocument.create();

    const width = 595;
    const height = 842;

    const marfil = rgb(
      0.96,
      0.94,
      0.89
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

    // ============================================================
    // 3. CARGAR LOGO DESDE RENDER
    // ============================================================

    let logoBytes: Uint8Array | null = null;

    try {
      const logoUrl =
        "https://casa-orus.onrender.com/logo-casa-orus.png";

      const logoResponse =
        await fetch(logoUrl);

      if (logoResponse.ok) {
        logoBytes =
          new Uint8Array(
            await logoResponse.arrayBuffer()
          );

        console.log(
          "✅ Logo cargado desde Render"
        );
      } else {
        console.error(
          "❌ Error cargando logo desde Render:",
          logoResponse.status
        );
      }
    } catch (error) {
      console.error(
        "❌ Error descargando logo:",
        error
      );
    }

    // ============================================================
    // 4. FUNCIÓN PARA TEXTO CENTRADO
    // ============================================================

    function centeredText(
      page: any,
      text: string,
      y: number,
      size: number,
      font: any,
      color: any
    ) {
      const textWidth =
        font.widthOfTextAtSize(
          text,
          size
        );

      page.drawText(text, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    }

    // ============================================================
    // 5. PÁGINA 1 - CERTIFICADO
    // ============================================================

    const page =
      pdfDoc.addPage([
        width,
        height,
      ]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    // Bordes elegantes

    page.drawRectangle({
      x: 25,
      y: 25,
      width: width - 50,
      height: height - 50,
      borderColor: dorado,
      borderWidth: 2,
    });

    page.drawRectangle({
      x: 34,
      y: 34,
      width: width - 68,
      height: height - 68,
      borderColor: dorado,
      borderWidth: 0.7,
    });

    // ============================================================
    // LOGO
    // ============================================================

    if (logoBytes) {
      try {
        const logoImage =
          await pdfDoc.embedPng(
            logoBytes
          );

        const logoWidth = 170;

        const logoHeight =
          (logoImage.height /
            logoImage.width) *
          logoWidth;

        page.drawImage(
          logoImage,
          {
            x:
              (width -
                logoWidth) /
              2,

            y: 700,

            width:
              logoWidth,

            height:
              logoHeight,
          }
        );
      } catch (error) {
        console.error(
          "❌ Error insertando logo:",
          error
        );

        centeredText(
          page,
          "CASA ORUS",
          710,
          25,
          fontBold,
          dorado
        );
      }
    } else {
      centeredText(
        page,
        "CASA ORUS",
        710,
        25,
        fontBold,
        dorado
      );
    }

    // ============================================================
    // TÍTULO
    // ============================================================

    centeredText(
      page,
      "CERTIFICADO DE GARANTÍA",
      635,
      20,
      fontBold,
      negro
    );

    centeredText(
      page,
      "Certificado de autenticidad y garantía",
      610,
      10,
      fontRegular,
      gris
    );

    // Línea decorativa

    page.drawLine({
      start: {
        x: 150,
        y: 590,
      },

      end: {
        x: 445,
        y: 590,
      },

      thickness: 1,
      color: dorado,
    });

    // ============================================================
    // CLIENTE
    // ============================================================

    centeredText(
      page,
      "CLIENTE",
      545,
      9,
      fontBold,
      dorado
    );

    centeredText(
      page,
      cliente?.nombre ||
        nombre,
      515,
      18,
      fontBold,
      negro
    );

    // ============================================================
    // PRODUCTO
    // ============================================================

    centeredText(
      page,
      "PIEZA REGISTRADA",
      465,
      9,
      fontBold,
      dorado
    );

    centeredText(
      page,
      producto?.nombre ||
        "Joyería Casa Orus",
      438,
      14,
      fontBold,
      negro
    );

    centeredText(
      page,
      `Referencia: ${
        producto?.referencia ||
        "N/A"
      }`,
      415,
      10,
      fontRegular,
      gris
    );

    if (producto?.material) {
      centeredText(
        page,
        `Material: ${producto.material}`,
        397,
        10,
        fontRegular,
        gris
      );
    }

    if (producto?.piedra) {
      centeredText(
        page,
        `Piedra natural: ${producto.piedra}`,
        379,
        10,
        fontRegular,
        gris
      );
    }

    // ============================================================
    // DATOS DE VENTA
    // ============================================================

    centeredText(
      page,
      `Número de venta: ${
        venta.numero_venta ||
        "N/A"
      }`,
      340,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page,
      `Fecha de compra: ${
        venta.fecha_compra ||
        "N/A"
      }`,
      322,
      10,
      fontRegular,
      gris
    );

    // ============================================================
    // GARANTÍA
    // ============================================================

    centeredText(
      page,
      "GARANTÍA",
      275,
      9,
      fontBold,
      dorado
    );

    centeredText(
      page,
      `Esta pieza cuenta con ${
        venta.garantia_anios ||
        5
      } años de garantía sobre el oro laminado.`,
      250,
      10,
      fontRegular,
      negro
    );

    // ============================================================
    // CÓDIGO
    // ============================================================

    page.drawRectangle({
      x: 150,
      y: 160,
      width: 295,
      height: 58,
      color: blanco,
      borderColor: dorado,
      borderWidth: 1,
    });

    centeredText(
      page,
      "CÓDIGO DE CERTIFICADO",
      200,
      8,
      fontBold,
      dorado
    );

    centeredText(
      page,
      codigo,
      177,
      15,
      fontBold,
      negro
    );

    // ============================================================
    // FRASE FINAL
    // ============================================================

    centeredText(
      page,
      "Joyería que trasciende,",
      110,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page,
      "creada para acompañarte en cada historia.",
      94,
      10,
      fontRegular,
      gris
    );

    centeredText(
      page,
      "CASA ORUS",
      60,
      8,
      fontBold,
      dorado
    );

    // ============================================================
    // 6. DESCARGAR FOTO DE LA JOYA
    // ============================================================

    let fotoBytes:
      Uint8Array | null = null;

    let fotoTipo = "";

    if (venta.foto_url) {
      try {
        const partes =
          venta.foto_url
            .split("/")
            .map(
              (parte: string) =>
                encodeURIComponent(parte)
            )
            .join("/");

        const fotoUrl =
          `${supabaseUrl}` +
          `/storage/v1/object/public/joyas/` +
          partes;

        console.log(
          "📸 Descargando foto:",
          fotoUrl
        );

        const fotoResponse =
          await fetch(fotoUrl);

        if (fotoResponse.ok) {
          fotoBytes =
            new Uint8Array(
              await fotoResponse.arrayBuffer()
            );

          fotoTipo =
            fotoResponse.headers.get(
              "content-type"
            ) || "";

          console.log(
            "✅ Foto descargada:",
            fotoTipo,
            fotoBytes.length,
            "bytes"
          );
        } else {
          console.error(
            "❌ No se pudo descargar la foto:",
            fotoResponse.status
          );
        }
      } catch (error) {
        console.error(
          "❌ Error descargando foto:",
          error
        );
      }
    }

    // ============================================================
    // 7. PÁGINA 2 - REGISTRO FOTOGRÁFICO
    // ============================================================

    const page2 =
      pdfDoc.addPage([
        width,
        height,
      ]);

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

    page2.drawRectangle({
      x: 34,
      y: 34,
      width: width - 68,
      height: height - 68,
      borderColor: dorado,
      borderWidth: 0.7,
    });

    // ============================================================
    // LOGO EN PÁGINA 2
    // ============================================================

    if (logoBytes) {
      try {
        const logoImage =
          await pdfDoc.embedPng(
            logoBytes
          );

        const logoWidth = 120;

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

            width:
              logoWidth,

            height:
              logoHeight,
          }
        );
      } catch (error) {
        console.error(
          "❌ Error insertando logo página 2:",
          error
        );
      }
    }

    centeredText(
      page2,
      "REGISTRO FOTOGRÁFICO",
      690,
      18,
      fontBold,
      negro
    );

    centeredText(
      page2,
      "Pieza registrada en el momento de la compra",
      665,
      9,
      fontRegular,
      gris
    );

    // ============================================================
    // FOTO SIN DEFORMAR
    // ============================================================

    if (fotoBytes) {
      try {
        let imagen: any;

        if (
          fotoTipo
            .toLowerCase()
            .includes("png")
        ) {
          imagen =
            await pdfDoc.embedPng(
              fotoBytes
            );
        } else if (
          fotoTipo
            .toLowerCase()
            .includes("jpeg") ||
          fotoTipo
            .toLowerCase()
            .includes("jpg")
        ) {
          imagen =
            await pdfDoc.embedJpg(
              fotoBytes
            );
        } else {
          throw new Error(
            `Formato de imagen no compatible: ${fotoTipo}`
          );
        }

        const imageWidth =
          imagen.width;

        const imageHeight =
          imagen.height;

        // Área máxima para la foto

        const maxWidth = 470;
        const maxHeight = 525;

        // Escala manteniendo proporción

        const escala = Math.min(
          maxWidth /
            imageWidth,

          maxHeight /
            imageHeight
        );

        const finalWidth =
          imageWidth *
          escala;

        const finalHeight =
          imageHeight *
          escala;

        // Centrada horizontalmente

        const x =
          (width -
            finalWidth) /
          2;

        // Centrada dentro del área disponible

        const y =
          105 +
          (525 -
            finalHeight) /
            2;

        // Marco de la fotografía

        page2.drawRectangle({
          x: 55,
          y: 95,
          width: 485,
          height: 545,
          color: blanco,
          borderColor: dorado,
          borderWidth: 1,
        });

        page2.drawImage(
          imagen,
          {
            x,
            y,
            width:
              finalWidth,
            height:
              finalHeight,
          }
        );

        console.log(
          "✅ Foto insertada sin deformar:",
          imageWidth,
          "x",
          imageHeight,
          "→",
          finalWidth,
          "x",
          finalHeight
        );
      } catch (error) {
        console.error(
          "❌ No se pudo insertar la fotografía:",
          error
        );

        centeredText(
          page2,
          "No fue posible insertar la fotografía.",
          380,
          10,
          fontRegular,
          gris
        );
      }
    } else {
      centeredText(
        page2,
        "No se encontró fotografía de la pieza.",
        380,
        10,
        fontRegular,
        gris
      );
    }

    // ============================================================
    // PIE DE PÁGINA
    // ============================================================

    centeredText(
      page2,
      `Certificado: ${codigo}`,
      65,
      8,
      fontRegular,
      gris
    );

    centeredText(
      page2,
      "CASA ORUS",
      48,
      8,
      fontBold,
      dorado
    );

    // ============================================================
    // 8. GUARDAR PDF
    // ============================================================

    const pdfBytes =
      await pdfDoc.save();

    const pdfBase64 =
      Uint8Array.from(
        pdfBytes
      );

    let binary = "";

    for (
      let i = 0;
      i < pdfBase64.length;
      i++
    ) {
      binary += String.fromCharCode(
        pdfBase64[i]
      );
    }

    const base64Pdf =
      btoa(binary);

    // ============================================================
    // 9. SUBIR PDF A SUPABASE STORAGE
    // ============================================================

    const nombrePdf =
      `certificados/${codigo}.pdf`;

    const uploadResponse =
      await fetch(
        `${supabaseUrl}` +
          `/storage/v1/object/certificados/` +
          `${encodeURIComponent(codigo)}.pdf`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${serviceRoleKey}`,

            apikey:
              serviceRoleKey,

            "Content-Type":
              "application/pdf",

            "x-upsert":
              "true",
          },

          body:
            pdfBytes,
        }
      );

    if (
      !uploadResponse.ok
    ) {
      const uploadError =
        await uploadResponse.text();

      throw new Error(
        "No se pudo subir el PDF: " +
          uploadError
      );
    }

    console.log(
      "✅ PDF guardado en Storage"
    );

    // ============================================================
    // 10. URL PÚBLICA DEL PDF
    // ============================================================

    const pdfPublicUrl =
      `${supabaseUrl}` +
      `/storage/v1/object/public/certificados/` +
      `${encodeURIComponent(codigo)}.pdf`;

    console.log(
      "📄 URL PDF:",
      pdfPublicUrl
    );

    // ============================================================
    // 11. NORMALIZAR TELÉFONO
    // ============================================================

    let numero =
      String(telefono)
        .replace(/\D/g, "");

    if (
      numero.startsWith("57")
    ) {
      // Ya tiene código Colombia
    } else if (
      numero.startsWith("3") &&
      numero.length === 10
    ) {
      numero =
        "57" + numero;
    } else {
      throw new Error(
        "Número de teléfono colombiano inválido."
      );
    }

    console.log(
      "📱 Número WhatsApp:",
      numero
    );

    // ============================================================
    // 12. ENVIAR PDF POR WHATSAPP - META
    // ============================================================

    const whatsappUrl =
      `https://graph.facebook.com/v23.0/` +
      `${phoneNumberId}/messages`;

    const whatsappBody = {
      messaging_product:
        "whatsapp",

      to: numero,

      type: "document",

      document: {
        link:
          pdfPublicUrl,

        filename:
          `Certificado-Casa-Orus-${codigo}.pdf`,

        caption:
          `✨ Casa Orus\n\n` +
          `Tu certificado de garantía está listo.\n` +
          `Código: ${codigo}`,
      },
    };

    const whatsappResponse =
      await fetch(
        whatsappUrl,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${whatsappToken}`,

            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify(
              whatsappBody
            ),
        }
      );

    const whatsappResult =
      await whatsappResponse.json();

    console.log(
      "📲 Respuesta WhatsApp:",
      JSON.stringify(
        whatsappResult
      )
    );

    if (
      !whatsappResponse.ok
    ) {
      throw new Error(
        "Meta WhatsApp rechazó el envío: " +
          JSON.stringify(
            whatsappResult
          )
      );
    }

    // ============================================================
    // 13. RESPUESTA FINAL
    // ============================================================

    return new Response(
      JSON.stringify({
        success: true,

        codigo,

        numeroVenta:
          venta.numero_venta,

        pdf:
          pdfPublicUrl,

        whatsapp:
          whatsappResult,

        mensaje:
          "Certificado creado y enviado correctamente.",
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
    console.error(
      "❌ ERROR GENERAL:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
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
