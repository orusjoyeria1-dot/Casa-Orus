import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "npm:pdf-lib";

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// SERVIDOR
// ============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    // ========================================================
    // DATOS RECIBIDOS
    // ========================================================

    const body = await req.json();

    const nombre = String(body.nombre || "").trim();
    const telefono = String(body.telefono || "").trim();
    const codigo = String(body.codigo || "")
      .trim()
      .toUpperCase();

    if (!nombre || !telefono || !codigo) {
      return respuestaError(
        "Faltan nombre, teléfono o código.",
        400,
      );
    }

    // ========================================================
    // VARIABLES SUPABASE
    // ========================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || "";

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // ========================================================
    // VARIABLES WHATSAPP
    // ========================================================

    const whatsappToken =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";

    const whatsappPhoneNumberId =
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Faltan las variables de Supabase.",
      );
    }

    if (!whatsappToken || !whatsappPhoneNumberId) {
      throw new Error(
        "Faltan las variables de WhatsApp.",
      );
    }

    // ========================================================
    // BUSCAR CERTIFICADO
    // ========================================================

    const consultaUrl =
      `${supabaseUrl}/rest/v1/certificados` +
      `?codigo=eq.${encodeURIComponent(codigo)}` +
      `&select=` +
      `codigo,fecha_emision,estado,` +
      `ventas(` +
      `id,numero_venta,fecha_compra,garantia_anios,foto_url,` +
      `clientes(nombre,correo,telefono),` +
      `productos(referencia,nombre,material,piedra,precio)` +
      `)`;

    const certificadoResponse =
      await fetch(consultaUrl, {
        headers: {
          apikey: serviceRoleKey,
          Authorization:
            `Bearer ${serviceRoleKey}`,
        },
      });

    if (!certificadoResponse.ok) {
      throw new Error(
        `Error consultando certificado: ${await certificadoResponse.text()}`,
      );
    }

    const certificados =
      await certificadoResponse.json();

    if (
      !Array.isArray(certificados) ||
      certificados.length === 0
    ) {
      throw new Error(
        `No existe el certificado ${codigo}.`,
      );
    }

    const certificado = certificados[0];
    const venta = certificado.ventas;

    if (!venta) {
      throw new Error(
        "El certificado no tiene una venta asociada.",
      );
    }

    const cliente = venta.clientes;
    const producto = venta.productos;

    // ========================================================
    // DATOS
    // ========================================================

    const nombreCliente =
      cliente?.nombre || nombre;

    const telefonoCliente =
      cliente?.telefono || telefono;

    const nombreProducto =
      producto?.nombre ||
      "Joyería Casa Orus";

    const referencia =
      producto?.referencia ||
      "Sin referencia";

    const material =
      producto?.material ||
      "Oro laminado";

    const piedra =
      producto?.piedra ||
      "Piedra natural";

    const precio =
      producto?.precio ?? null;

    const numeroVenta =
      venta.numero_venta ||
      "Sin número";

    const fechaCompra =
      venta.fecha_compra ||
      certificado.fecha_emision;

    const garantiaAnios =
      venta.garantia_anios || 5;

    // ========================================================
    // CREAR PDF
    // ========================================================

    const pdfDoc =
      await PDFDocument.create();

    const PAGE_W = 595;
    const PAGE_H = 842;

    // ========================================================
    // FUENTES
    // ========================================================

    const fontRegular =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica,
      );

    const fontBold =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold,
      );

    const fontOblique =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique,
      );

    // ========================================================
    // PALETA
    // ========================================================

    const marfil = rgb(
      0.975,
      0.965,
      0.935,
    );

    const marfil2 = rgb(
      0.992,
      0.988,
      0.975,
    );

    const dorado = rgb(
      0.67,
      0.49,
      0.18,
    );

    const doradoClaro = rgb(
      0.80,
      0.68,
      0.42,
    );

    const doradoSuave = rgb(
      0.91,
      0.85,
      0.69,
    );

    const negro = rgb(
      0.12,
      0.11,
      0.10,
    );

    const gris = rgb(
      0.42,
      0.40,
      0.36,
    );

    const grisClaro = rgb(
      0.62,
      0.60,
      0.55,
    );

    const blanco = rgb(
      1,
      1,
      1,
    );

    // ========================================================
    // FUNCIONES
    // ========================================================

    function centerText(
      page: any,
      text: string,
      y: number,
      size: number,
      font: any,
      color: any,
    ) {
      const textWidth =
        font.widthOfTextAtSize(
          text,
          size,
        );

      page.drawText(text, {
        x:
          (PAGE_W - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    }

    function line(
      page: any,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      thickness = 1,
      color = doradoClaro,
    ) {
      page.drawLine({
        start: {
          x: x1,
          y: y1,
        },
        end: {
          x: x2,
          y: y2,
        },
        thickness,
        color,
      });
    }

    function box(
      page: any,
      x: number,
      y: number,
      w: number,
      h: number,
      fill: any,
      border = doradoClaro,
      borderWidth = 1,
    ) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: fill,
        borderColor: border,
        borderWidth,
      });
    }

    function wrapText(
      page: any,
      text: string,
      x: number,
      y: number,
      maxWidth: number,
      size: number,
      font: any,
      color: any,
      lineHeight: number,
    ) {
      const words =
        text.split(" ");

      const lines: string[] = [];

      let current = "";

      for (const word of words) {
        const test =
          current.length === 0
            ? word
            : `${current} ${word}`;

        const testWidth =
          font.widthOfTextAtSize(
            test,
            size,
          );

        if (
          testWidth <= maxWidth ||
          current.length === 0
        ) {
          current = test;
        } else {
          lines.push(current);
          current = word;
        }
      }

      if (current) {
        lines.push(current);
      }

      lines.forEach(
        (textLine, index) => {
          page.drawText(
            textLine,
            {
              x,
              y:
                y -
                index * lineHeight,
              size,
              font,
              color,
            },
          );
        },
      );

      return lines.length;
    }

    function sectionTitle(
      page: any,
      text: string,
      y: number,
    ) {
      centerText(
        page,
        text,
        y,
        10,
        fontBold,
        dorado,
      );

      line(
        page,
        175,
        y - 8,
        420,
        y - 8,
        0.7,
        doradoClaro,
      );
    }

    // ========================================================
    // LOGO DESDE SUPABASE
    // ========================================================

    let logoImage: any = null;

    const logoUrl =
      `${supabaseUrl}/storage/v1/object/public/` +
      `logos/logo-casa-orus.png`;

    console.log(
      "Logo:",
      logoUrl,
    );

    const logoResponse =
      await fetch(logoUrl);

    if (logoResponse.ok) {
      const logoBytes =
        new Uint8Array(
          await logoResponse.arrayBuffer(),
        );

      try {
        logoImage =
          await pdfDoc.embedPng(
            logoBytes,
          );

        console.log(
          "Logo cargado correctamente.",
        );
      } catch (error) {
        console.error(
          "Error incrustando logo:",
          error,
        );
      }
    } else {
      console.error(
        "No se pudo descargar logo:",
        logoResponse.status,
      );
    }

    // ========================================================
    // FOTO
    // ========================================================

    let fotoImage: any = null;

    if (venta.foto_url) {
      const rutaFoto =
        String(venta.foto_url)
          .split("/")
          .map(
            (parte: string) =>
              encodeURIComponent(parte),
          )
          .join("/");

      const fotoUrl =
        `${supabaseUrl}/storage/v1/object/public/` +
        `joyas/${rutaFoto}`;

      console.log(
        "Foto:",
        fotoUrl,
      );

      const fotoResponse =
        await fetch(fotoUrl);

      if (fotoResponse.ok) {
        const fotoBytes =
          new Uint8Array(
            await fotoResponse.arrayBuffer(),
          );

        const contentType =
          fotoResponse.headers.get(
            "content-type",
          ) || "";

        try {
          if (
            contentType.includes("png")
          ) {
            fotoImage =
              await pdfDoc.embedPng(
                fotoBytes,
              );
          } else if (
            contentType.includes(
              "jpeg",
            ) ||
            contentType.includes(
              "jpg",
            )
          ) {
            fotoImage =
              await pdfDoc.embedJpg(
                fotoBytes,
              );
          } else {
            console.error(
              "Formato de foto no compatible:",
              contentType,
            );
          }
        } catch (error) {
          console.error(
            "Error incrustando foto:",
            error,
          );
        }
      } else {
        console.error(
          "No se pudo descargar foto:",
          fotoResponse.status,
        );
      }
    }

    // ============================================================
    // PÁGINA 1
    // CERTIFICADO
    // ============================================================

    const page1 =
      pdfDoc.addPage([
        PAGE_W,
        PAGE_H,
      ]);

    page1.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: marfil,
    });

    // Marco
    page1.drawRectangle({
      x: 24,
      y: 24,
      width: PAGE_W - 48,
      height: PAGE_H - 48,
      borderColor: dorado,
      borderWidth: 1.3,
    });

    page1.drawRectangle({
      x: 31,
      y: 31,
      width: PAGE_W - 62,
      height: PAGE_H - 62,
      borderColor: doradoSuave,
      borderWidth: 0.5,
    });

    // ------------------------------------------------------------
    // LOGO
    // ------------------------------------------------------------

    if (logoImage) {
      const maxLogoW = 205;
      const maxLogoH = 125;

      const scale =
        Math.min(
          maxLogoW /
            logoImage.width,
          maxLogoH /
            logoImage.height,
        );

      const logoW =
        logoImage.width * scale;

      const logoH =
        logoImage.height * scale;

      page1.drawImage(
        logoImage,
        {
          x:
            (PAGE_W - logoW) / 2,
          y: 675,
          width: logoW,
          height: logoH,
        },
      );
    }

    centerText(
      page1,
      "CERTIFICADO DE GARANTÍA",
      625,
      19,
      fontBold,
      negro,
    );

    centerText(
      page1,
      "AUTENTICIDAD • CALIDAD • RESPALDO",
      603,
      7,
      fontBold,
      dorado,
    );

    line(
      page1,
      175,
      585,
      420,
      585,
      1,
      dorado,
    );

    // ------------------------------------------------------------
    // CLIENTE
    // ------------------------------------------------------------

    centerText(
      page1,
      "CERTIFICADO EMITIDO A",
      545,
      8,
      fontBold,
      gris,
    );

    centerText(
      page1,
      nombreCliente,
      510,
      24,
      fontBold,
      negro,
    );

    // ------------------------------------------------------------
    // PIEZA
    // ------------------------------------------------------------

    sectionTitle(
      page1,
      "DETALLES DE LA PIEZA",
      462,
    );

    // Tarjeta principal
    box(
      page1,
      75,
      290,
      445,
      145,
      marfil2,
      doradoSuave,
      0.8,
    );

    // Línea vertical central
    line(
      page1,
      297.5,
      305,
      297.5,
      420,
      0.5,
      doradoSuave,
    );

    // Producto
    page1.drawText(
      "PIEZA",
      {
        x: 105,
        y: 395,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    wrapText(
      page1,
      nombreProducto,
      105,
      374,
      160,
      12,
      fontBold,
      negro,
      16,
    );

    // Referencia
    page1.drawText(
      "REFERENCIA",
      {
        x: 105,
        y: 335,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      referencia,
      {
        x: 105,
        y: 317,
        size: 10,
        font: fontRegular,
        color: negro,
      },
    );

    // Material
    page1.drawText(
      "MATERIAL",
      {
        x: 325,
        y: 395,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    wrapText(
      page1,
      material,
      325,
      374,
      155,
      11,
      fontRegular,
      negro,
      15,
    );

    // Piedra
    page1.drawText(
      "PIEDRA",
      {
        x: 325,
        y: 335,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    wrapText(
      page1,
      piedra,
      325,
      317,
      155,
      10,
      fontRegular,
      negro,
      14,
    );

    // ------------------------------------------------------------
    // DATOS DE COMPRA
    // ------------------------------------------------------------

    page1.drawText(
      "FECHA DE COMPRA",
      {
        x: 105,
        y: 270,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      String(fechaCompra),
      {
        x: 105,
        y: 252,
        size: 10,
        font: fontRegular,
        color: negro,
      },
    );

    page1.drawText(
      "NÚMERO DE VENTA",
      {
        x: 325,
        y: 270,
        size: 7,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      String(numeroVenta),
      {
        x: 325,
        y: 252,
        size: 10,
        font: fontRegular,
        color: negro,
      },
    );

    // ------------------------------------------------------------
    // GARANTÍA
    // ------------------------------------------------------------

    page1.drawCircle({
      x: PAGE_W / 2,
      y: 175,
      size: 49,
      color: marfil2,
      borderColor: dorado,
      borderWidth: 1.5,
    });

    centerText(
      page1,
      String(garantiaAnios),
      179,
      24,
      fontBold,
      dorado,
    );

    centerText(
      page1,
      "AÑOS",
      161,
      7,
      fontBold,
      gris,
    );

    centerText(
      page1,
      "GARANTÍA SOBRE EL ORO LAMINADO",
      115,
      9,
      fontBold,
      negro,
    );

    centerText(
      page1,
      "Respaldamos la calidad de nuestras piezas.",
      97,
      8,
      fontRegular,
      gris,
    );

    // ------------------------------------------------------------
    // CÓDIGO
    // ------------------------------------------------------------

    box(
      page1,
      165,
      48,
      265,
      36,
      marfil2,
      doradoClaro,
      0.8,
    );

    centerText(
      page1,
      `CÓDIGO  ${codigo}`,
      61,
      9,
      fontBold,
      dorado,
    );

    centerText(
      page1,
      "CASA ORUS • JOYERÍA QUE TRASCIENDE",
      35,
      6.5,
      fontRegular,
      gris,
    );

    // ============================================================
    // PÁGINA 2
    // REGISTRO FOTOGRÁFICO
    // ============================================================

    const page2 =
      pdfDoc.addPage([
        PAGE_W,
        PAGE_H,
      ]);

    page2.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: marfil,
    });

    page2.drawRectangle({
      x: 24,
      y: 24,
      width: PAGE_W - 48,
      height: PAGE_H - 48,
      borderColor: dorado,
      borderWidth: 1.3,
    });

    // Logo pequeño
    if (logoImage) {
      const maxLogoW = 135;
      const maxLogoH = 65;

      const scale =
        Math.min(
          maxLogoW /
            logoImage.width,
          maxLogoH /
            logoImage.height,
        );

      const logoW =
        logoImage.width * scale;

      const logoH =
        logoImage.height * scale;

      page2.drawImage(
        logoImage,
        {
          x:
            (PAGE_W - logoW) / 2,
          y: 710,
          width: logoW,
          height: logoH,
        },
      );
    }

    centerText(
      page2,
      "REGISTRO FOTOGRÁFICO",
      665,
      19,
      fontBold,
      negro,
    );

    centerText(
      page2,
      "Identificación visual de la pieza",
      643,
      9,
      fontRegular,
      gris,
    );

    line(
      page2,
      170,
      625,
      425,
      625,
      1,
      dorado,
    );

    // ------------------------------------------------------------
    // MARCO VERTICAL
    // ------------------------------------------------------------

    const photoX = 105;
    const photoY = 145;
    const photoW = 385;
    const photoH = 445;

    // Sombra visual
    page2.drawRectangle({
      x: photoX + 5,
      y: photoY - 5,
      width: photoW,
      height: photoH,
      color: rgb(
        0.93,
        0.92,
        0.89,
      ),
    });

    // Marco
    page2.drawRectangle({
      x: photoX,
      y: photoY,
      width: photoW,
      height: photoH,
      color: blanco,
      borderColor: doradoClaro,
      borderWidth: 1,
    });

    if (fotoImage) {
      // ==========================================================
      // FOTO SIEMPRE PRESENTADA EN ÁREA VERTICAL
      // ==========================================================

      const innerMargin = 20;

      const availableW =
        photoW -
        innerMargin * 2;

      const availableH =
        photoH -
        innerMargin * 2;

      const originalW =
        fotoImage.width;

      const originalH =
        fotoImage.height;

      // Si la imagen es horizontal,
      // la rotamos 90 grados.
      const esHorizontal =
        originalW > originalH;

      const effectiveW =
        esHorizontal
          ? originalH
          : originalW;

      const effectiveH =
        esHorizontal
          ? originalW
          : originalH;

      const scale =
        Math.min(
          availableW /
            effectiveW,
          availableH /
            effectiveH,
        );

      const drawW =
        effectiveW * scale;

      const drawH =
        effectiveH * scale;

      const centerX =
        photoX +
        (photoW - drawW) / 2;

      const centerY =
        photoY +
        (photoH - drawH) / 2;

      if (esHorizontal) {
        // Rotación alrededor del centro
        page2.drawImage(
          fotoImage,
          {
            x:
              centerX +
              drawW / 2,
            y:
              centerY +
              drawH / 2,
            width: drawW,
            height: drawH,
            rotate: degrees(90),
            xScale: 1,
            yScale: 1,
          },
        );
      } else {
        page2.drawImage(
          fotoImage,
          {
            x: centerX,
            y: centerY,
            width: drawW,
            height: drawH,
          },
        );
      }
    } else {
      centerText(
        page2,
        "SIN FOTOGRAFÍA",
        375,
        12,
        fontBold,
        gris,
      );

      centerText(
        page2,
        "No se registró una imagen de la pieza.",
        352,
        8,
        fontRegular,
        grisClaro,
      );
    }

    // ------------------------------------------------------------
    // INFORMACIÓN
    // ------------------------------------------------------------

    box(
      page2,
      90,
      83,
      415,
      38,
      marfil2,
      doradoSuave,
      0.8,
    );

    centerText(
      page2,
      `PIEZA: ${referencia}  •  ${codigo}`,
      98,
      8,
      fontBold,
      negro,
    );

    centerText(
      page2,
      "REGISTRO REALIZADO AL MOMENTO DE LA COMPRA",
      52,
      6.5,
      fontRegular,
      gris,
    );

    // ============================================================
    // PÁGINA 3
    // GARANTÍA Y CUIDADOS
    // ============================================================

    const page3 =
      pdfDoc.addPage([
        PAGE_W,
        PAGE_H,
      ]);

    page3.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_W,
      height: PAGE_H,
      color: marfil,
    });

    page3.drawRectangle({
      x: 24,
      y: 24,
      width: PAGE_W - 48,
      height: PAGE_H - 48,
      borderColor: dorado,
      borderWidth: 1.3,
    });

    if (logoImage) {
      const maxLogoW = 130;
      const maxLogoH = 60;

      const scale =
        Math.min(
          maxLogoW /
            logoImage.width,
          maxLogoH /
            logoImage.height,
        );

      const logoW =
        logoImage.width * scale;

      const logoH =
        logoImage.height * scale;

      page3.drawImage(
        logoImage,
        {
          x:
            (PAGE_W - logoW) / 2,
          y: 735,
          width: logoW,
          height: logoH,
        },
      );
    }

    centerText(
      page3,
      "GARANTÍA Y CUIDADOS",
      690,
      19,
      fontBold,
      negro,
    );

    centerText(
      page3,
      "Todo lo que debes saber sobre tu pieza",
      668,
      9,
      fontRegular,
      gris,
    );

    line(
      page3,
      170,
      650,
      425,
      650,
      1,
      dorado,
    );

    // ------------------------------------------------------------
    // COMPROMISO
    // ------------------------------------------------------------

    sectionTitle(
      page3,
      "COMPROMISO DE CALIDAD",
      615,
    );

    wrapText(
      page3,
      `En Casa Orus respaldamos nuestras piezas con una garantía de ${garantiaAnios} años sobre el oro laminado, de acuerdo con las condiciones establecidas en este certificado.`,
      80,
      588,
      435,
      9,
      fontRegular,
      negro,
      15,
    );

    // ------------------------------------------------------------
    // CUBRE
    // ------------------------------------------------------------

    sectionTitle(
      page3,
      "LA GARANTÍA CUBRE",
      525,
    );

    const cubre = [
      "Defectos de fabricación.",
      "Problemas relacionados con la adherencia del oro laminado.",
      "Revisión técnica de la pieza.",
    ];

    let y = 497;

    for (const item of cubre) {
      page3.drawCircle({
        x: 88,
        y: y + 3,
        size: 2.4,
        color: dorado,
      });

      wrapText(
        page3,
        item,
        102,
        y,
        400,
        9,
        fontRegular,
        negro,
        13,
      );

      y -= 27;
    }

    // ------------------------------------------------------------
    // CUIDADOS
    // ------------------------------------------------------------

    sectionTitle(
      page3,
      "CUIDADOS DE TU JOYA",
      405,
    );

    const cuidados = [
      "Evita químicos y humedad prolongada.",
      "Evita perfumes, cremas, cloro y productos de limpieza.",
      "Retira la joya antes de ducharte o nadar.",
      "Guárdala siempre en su empaque.",
      "Límpiala con un paño limpio y suave.",
    ];

    y = 377;

    for (const item of cuidados) {
      page3.drawCircle({
        x: 88,
        y: y + 3,
        size: 2.4,
        color: dorado,
      });

      wrapText(
        page3,
        item,
        102,
        y,
        400,
        9,
        fontRegular,
        negro,
        13,
      );

      y -= 27;
    }

    // ------------------------------------------------------------
    // NO CUBRE
    // ------------------------------------------------------------

    sectionTitle(
      page3,
      "LA GARANTÍA NO CUBRE",
      230,
    );

    const noCubre = [
      "Golpes, caídas, tirones o deformaciones.",
      "Desgaste normal producido por el uso.",
      "Daños ocasionados por químicos o humedad.",
      "Pérdida de la pieza, piedras o dijes.",
    ];

    y = 202;

    for (const item of noCubre) {
      page3.drawCircle({
        x: 88,
        y: y + 3,
        size: 2.4,
        color: dorado,
      });

      wrapText(
        page3,
        item,
        102,
        y,
        400,
        8.5,
        fontRegular,
        negro,
        12,
      );

      y -= 23;
    }

    // ------------------------------------------------------------
    // SOLICITUD
    // ------------------------------------------------------------

    box(
      page3,
      75,
      62,
      445,
      70,
      marfil2,
      doradoClaro,
      0.8,
    );

    centerText(
      page3,
      "SOLICITUD DE GARANTÍA",
      111,
      9,
      fontBold,
      dorado,
    );

    wrapText(
      page3,
      "Para solicitar una revisión, presenta este certificado junto con la pieza. Casa Orus realizará la inspección correspondiente.",
      100,
      92,
      395,
      8,
      fontRegular,
      negro,
      12,
    );

    centerText(
      page3,
      "Joyería que trasciende, creada para acompañarte en cada historia.",
      39,
      7,
      fontOblique,
      gris,
    );

    // ============================================================
    // GENERAR BYTES
    // ============================================================

    const pdfBytes =
      await pdfDoc.save();

    console.log(
      "PDF premium de 3 páginas generado.",
    );

    // ============================================================
    // SUBIR PDF
    // ============================================================

    const archivoPDF =
      `certificados/${codigo}.pdf`;

    const uploadResponse =
      await fetch(
        `${supabaseUrl}/storage/v1/object/${archivoPDF}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type":
              "application/pdf",
            "x-upsert":
              "true",
          },
          body: pdfBytes,
        },
      );

    if (!uploadResponse.ok) {
      throw new Error(
        `Error subiendo PDF: ${await uploadResponse.text()}`,
      );
    }

    // ============================================================
    // URL PÚBLICA
    // ============================================================

    const pdfPublicUrl =
      `${supabaseUrl}/storage/v1/object/public/` +
      `certificados/${encodeURIComponent(codigo)}.pdf`;

    console.log(
      "PDF:",
      pdfPublicUrl,
    );

    // ============================================================
    // NORMALIZAR TELÉFONO
    // ============================================================

    let numeroWhatsApp =
      String(
        telefonoCliente,
      ).replace(
        /\D/g,
        "",
      );

    if (
      numeroWhatsApp.startsWith("00")
    ) {
      numeroWhatsApp =
        numeroWhatsApp.substring(2);
    }

    if (
      !numeroWhatsApp.startsWith("57") &&
      numeroWhatsApp.length === 10 &&
      numeroWhatsApp.startsWith("3")
    ) {
      numeroWhatsApp =
        `57${numeroWhatsApp}`;
    }

    // ============================================================
    // WHATSAPP META
    // ============================================================

    const whatsappUrl =
      `https://graph.facebook.com/v23.0/` +
      `${whatsappPhoneNumberId}/messages`;

    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: numeroWhatsApp,
      type: "document",
      document: {
        link: pdfPublicUrl,
        filename:
          `Certificado-Casa-Orus-${codigo}.pdf`,
        caption:
          `✨ Casa Orus\n\n` +
          `Hola ${nombreCliente}, tu certificado de garantía está listo.\n\n` +
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
          body: JSON.stringify(
            whatsappPayload,
          ),
        },
      );

    const whatsappResult =
      await whatsappResponse.json();

    console.log(
      "WhatsApp:",
      JSON.stringify(
        whatsappResult,
      ),
    );

    if (!whatsappResponse.ok) {
      throw new Error(
        `WhatsApp rechazó el envío: ${JSON.stringify(
          whatsappResult,
        )}`,
      );
    }

    // ============================================================
    // TODO CORRECTO
    // ============================================================

    return new Response(
      JSON.stringify({
        success: true,
        codigo,
        numeroVenta,
        pdfUrl: pdfPublicUrl,
        whatsapp: whatsappResult,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      },
    );
  } catch (error) {
    console.error(
      "ERROR:",
      error,
    );

    return respuestaError(
      error instanceof Error
        ? error.message
        : String(error),
      500,
    );
  }
});

// ============================================================
// RESPUESTA ERROR
// ============================================================

function respuestaError(
  mensaje: string,
  status: number,
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: mensaje,
    }),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}
