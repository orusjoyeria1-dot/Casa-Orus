import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib";

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// FUNCIÓN PRINCIPAL
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
    const codigo = String(body.codigo || "").trim().toUpperCase();

    if (!nombre || !telefono || !codigo) {
      return new Response(
        JSON.stringify({
          error: "Faltan nombre, teléfono o código.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // ========================================================
    // VARIABLES DE SUPABASE
    // ========================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") || "";

    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    // ========================================================
    // VARIABLES DE WHATSAPP
    // ========================================================

    const whatsappToken =
      Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";

    const whatsappPhoneNumberId =
      Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
      );
    }

    if (!whatsappToken || !whatsappPhoneNumberId) {
      throw new Error(
        "Faltan las variables de WhatsApp.",
      );
    }

    // ========================================================
    // CONSULTAR CERTIFICADO
    // ========================================================

    const certificadoResponse = await fetch(
      `${supabaseUrl}/rest/v1/certificados` +
        `?codigo=eq.${encodeURIComponent(codigo)}` +
        `&select=` +
        `codigo,fecha_emision,estado,` +
        `ventas(` +
        `id,numero_venta,fecha_compra,garantia_anios,foto_url,` +
        `clientes(nombre,correo,telefono),` +
        `productos(referencia,nombre,material,piedra,precio)` +
        `)`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!certificadoResponse.ok) {
      const errorText =
        await certificadoResponse.text();

      throw new Error(
        `Error consultando certificado: ${errorText}`,
      );
    }

    const certificados =
      await certificadoResponse.json();

    if (
      !Array.isArray(certificados) ||
      certificados.length === 0
    ) {
      throw new Error(
        `No se encontró el certificado ${codigo}.`,
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
    // DATOS DEL PRODUCTO
    // ========================================================

    const nombreCliente =
      cliente?.nombre || nombre;

    const telefonoCliente =
      cliente?.telefono || telefono;

    const nombreProducto =
      producto?.nombre || "Joyería Casa Orus";

    const referencia =
      producto?.referencia || "Sin referencia";

    const material =
      producto?.material || "Oro laminado";

    const piedra =
      producto?.piedra || "Piedra natural";

    const precio =
      producto?.precio ?? null;

    const numeroVenta =
      venta.numero_venta || "Sin número";

    const fechaCompra =
      venta.fecha_compra || certificado.fecha_emision;

    const garantiaAnios =
      venta.garantia_anios || 5;

    // ========================================================
    // DESCARGAR LOGO DESDE BUCKET "logos"
    // ========================================================

    let logoBytes: Uint8Array | null = null;

    const logoUrl =
      `${supabaseUrl}/storage/v1/object/public/` +
      `logos/logo-casa-orus.png`;

    console.log(
      "Cargando logo desde:",
      logoUrl,
    );

    const logoResponse =
      await fetch(logoUrl);

    if (logoResponse.ok) {
      logoBytes = new Uint8Array(
        await logoResponse.arrayBuffer(),
      );

      console.log(
        "Logo Casa Orus cargado correctamente.",
      );
    } else {
      console.error(
        "No se pudo cargar el logo.",
        logoResponse.status,
      );
    }

    // ========================================================
    // DESCARGAR FOTO DEL PRODUCTO
    // ========================================================

    let fotoBytes: Uint8Array | null = null;
    let fotoTipo = "";

    if (venta.foto_url) {
      const partesRuta =
        String(venta.foto_url)
          .split("/")
          .map((parte) =>
            encodeURIComponent(parte)
          )
          .join("/");

      const fotoUrl =
        `${supabaseUrl}/storage/v1/object/public/joyas/${partesRuta}`;

      console.log(
        "Cargando fotografía:",
        fotoUrl,
      );

      const fotoResponse =
        await fetch(fotoUrl);

      if (fotoResponse.ok) {
        fotoBytes = new Uint8Array(
          await fotoResponse.arrayBuffer(),
        );

        fotoTipo =
          fotoResponse.headers.get(
            "content-type",
          ) || "";

        console.log(
          "Fotografía cargada:",
          fotoTipo,
        );
      } else {
        console.error(
          "No se pudo cargar la fotografía:",
          fotoResponse.status,
        );
      }
    }

    // ========================================================
    // CREAR PDF
    // ========================================================

    const pdfDoc =
      await PDFDocument.create();

    const width = 595;
    const height = 842;

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
    // COLORES CASA ORUS
    // ========================================================

    const marfil = rgb(
      0.97,
      0.955,
      0.92,
    );

    const marfilClaro = rgb(
      0.985,
      0.98,
      0.95,
    );

    const dorado = rgb(
      0.72,
      0.56,
      0.23,
    );

    const doradoClaro = rgb(
      0.82,
      0.69,
      0.40,
    );

    const negro = rgb(
      0.10,
      0.09,
      0.08,
    );

    const gris = rgb(
      0.40,
      0.38,
      0.35,
    );

    const grisClaro = rgb(
      0.70,
      0.68,
      0.63,
    );

    const blanco = rgb(
      1,
      1,
      1,
    );

    // ========================================================
    // FUNCIONES AUXILIARES
    // ========================================================

    function centrarTexto(
      page: any,
      texto: string,
      y: number,
      size: number,
      font: any,
      color: any,
    ) {
      const textWidth =
        font.widthOfTextAtSize(
          texto,
          size,
        );

      page.drawText(texto, {
        x: (width - textWidth) / 2,
        y,
        size,
        font,
        color,
      });
    }

    function dibujarLinea(
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

    function dibujarCaja(
      page: any,
      x: number,
      y: number,
      w: number,
      h: number,
      fill: any,
      border = doradoClaro,
    ) {
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        color: fill,
        borderColor: border,
        borderWidth: 1,
      });
    }

    function textoEnvuelto(
      page: any,
      texto: string,
      x: number,
      y: number,
      maxWidth: number,
      size: number,
      font: any,
      color: any,
      lineHeight: number,
    ) {
      const palabras =
        texto.split(" ");

      const lineas: string[] = [];

      let lineaActual = "";

      for (const palabra of palabras) {
        const prueba =
          lineaActual.length === 0
            ? palabra
            : `${lineaActual} ${palabra}`;

        const ancho =
          font.widthOfTextAtSize(
            prueba,
            size,
          );

        if (
          ancho <= maxWidth ||
          lineaActual.length === 0
        ) {
          lineaActual = prueba;
        } else {
          lineas.push(lineaActual);
          lineaActual = palabra;
        }
      }

      if (lineaActual) {
        lineas.push(lineaActual);
      }

      lineas.forEach(
        (linea, index) => {
          page.drawText(linea, {
            x,
            y:
              y -
              index * lineHeight,
            size,
            font,
            color,
          });
        },
      );

      return lineas.length;
    }

    function dibujarTituloSeccion(
      page: any,
      titulo: string,
      y: number,
    ) {
      centrarTexto(
        page,
        titulo,
        y,
        11,
        fontBold,
        dorado,
      );

      dibujarLinea(
        page,
        180,
        y - 8,
        415,
        y - 8,
        0.8,
        doradoClaro,
      );
    }

    // ========================================================
    // PREPARAR LOGO
    // ========================================================

    let logoImage: any = null;

    if (logoBytes) {
      try {
        logoImage =
          await pdfDoc.embedPng(
            logoBytes,
          );

        console.log(
          "Logo incrustado en PDF.",
        );
      } catch (error) {
        console.error(
          "No se pudo incrustar el logo:",
          error,
        );
      }
    }

    // ========================================================
    // PREPARAR FOTO
    // ========================================================

    let fotoImage: any = null;

    if (fotoBytes) {
      try {
        if (
          fotoTipo.includes("png")
        ) {
          fotoImage =
            await pdfDoc.embedPng(
              fotoBytes,
            );
        } else if (
          fotoTipo.includes("jpeg") ||
          fotoTipo.includes("jpg")
        ) {
          fotoImage =
            await pdfDoc.embedJpg(
              fotoBytes,
            );
        } else {
          console.error(
            "Formato de fotografía no compatible:",
            fotoTipo,
          );
        }
      } catch (error) {
        console.error(
          "No se pudo incrustar la fotografía:",
          error,
        );
      }
    }

    // ============================================================
    // PÁGINA 1 — CERTIFICADO
    // ============================================================

    const page1 =
      pdfDoc.addPage([
        width,
        height,
      ]);

    page1.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    // Marco exterior
    page1.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: dorado,
      borderWidth: 1.5,
    });

    page1.drawRectangle({
      x: 29,
      y: 29,
      width: width - 58,
      height: height - 58,
      borderColor: doradoClaro,
      borderWidth: 0.6,
    });

    // Logo
    if (logoImage) {
      const logoScale =
        Math.min(
          190 / logoImage.width,
          80 / logoImage.height,
        );

      const logoW =
        logoImage.width *
        logoScale;

      const logoH =
        logoImage.height *
        logoScale;

      page1.drawImage(
        logoImage,
        {
          x:
            (width - logoW) / 2,
          y: 705,
          width: logoW,
          height: logoH,
        },
      );
    } else {
      centrarTexto(
        page1,
        "CASA ORUS",
        720,
        25,
        fontBold,
        dorado,
      );
    }

    centrarTexto(
      page1,
      "CERTIFICADO DE GARANTÍA",
      650,
      20,
      fontBold,
      negro,
    );

    centrarTexto(
      page1,
      "Joyería que trasciende",
      625,
      10,
      fontOblique,
      gris,
    );

    dibujarLinea(
      page1,
      150,
      602,
      445,
      602,
      1,
      dorado,
    );

    // Nombre cliente
    centrarTexto(
      page1,
      "CERTIFICADO EMITIDO A",
      560,
      9,
      fontBold,
      dorado,
    );

    centrarTexto(
      page1,
      nombreCliente,
      530,
      22,
      fontBold,
      negro,
    );

    // Caja producto
    dibujarCaja(
      page1,
      75,
      315,
      445,
      185,
      marfilClaro,
      doradoClaro,
    );

    dibujarTituloSeccion(
      page1,
      "DETALLES DE LA PIEZA",
      470,
    );

    // Columna izquierda
    page1.drawText(
      "PRODUCTO",
      {
        x: 105,
        y: 430,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      nombreProducto,
      {
        x: 105,
        y: 410,
        size: 12,
        font: fontBold,
        color: negro,
      },
    );

    page1.drawText(
      "REFERENCIA",
      {
        x: 105,
        y: 378,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      referencia,
      {
        x: 105,
        y: 359,
        size: 11,
        font: fontRegular,
        color: negro,
      },
    );

    // Columna derecha
    page1.drawText(
      "MATERIAL",
      {
        x: 325,
        y: 430,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      material,
      {
        x: 325,
        y: 410,
        size: 11,
        font: fontRegular,
        color: negro,
      },
    );

    page1.drawText(
      "PIEDRA",
      {
        x: 325,
        y: 378,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      piedra,
      {
        x: 325,
        y: 359,
        size: 11,
        font: fontRegular,
        color: negro,
      },
    );

    // Fecha / venta
    page1.drawText(
      "FECHA DE COMPRA",
      {
        x: 105,
        y: 330,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      String(fechaCompra),
      {
        x: 105,
        y: 313,
        size: 10,
        font: fontRegular,
        color: negro,
      },
    );

    page1.drawText(
      "N.º DE VENTA",
      {
        x: 325,
        y: 330,
        size: 8,
        font: fontBold,
        color: gris,
      },
    );

    page1.drawText(
      String(numeroVenta),
      {
        x: 325,
        y: 313,
        size: 10,
        font: fontRegular,
        color: negro,
      },
    );

    // Garantía
    page1.drawCircle({
      x: 297.5,
      y: 235,
      size: 48,
      color: marfilClaro,
      borderColor: dorado,
      borderWidth: 1.5,
    });

    centrarTexto(
      page1,
      `${garantiaAnios}`,
      238,
      23,
      fontBold,
      dorado,
    );

    centrarTexto(
      page1,
      "AÑOS",
      220,
      7,
      fontBold,
      gris,
    );

    centrarTexto(
      page1,
      "GARANTÍA SOBRE EL ORO LAMINADO",
      170,
      10,
      fontBold,
      negro,
    );

    centrarTexto(
      page1,
      "Respaldamos la calidad y autenticidad de nuestras piezas.",
      148,
      9,
      fontRegular,
      gris,
    );

    // Código
    dibujarCaja(
      page1,
      155,
      82,
      285,
      42,
      marfilClaro,
      dorado,
    );

    centrarTexto(
      page1,
      "CÓDIGO DE CERTIFICADO",
      108,
      7,
      fontBold,
      gris,
    );

    centrarTexto(
      page1,
      codigo,
      90,
      13,
      fontBold,
      dorado,
    );

    centrarTexto(
      page1,
      "CASA ORUS • JOYERÍA ARTESANAL",
      52,
      7,
      fontRegular,
      gris,
    );

    // ============================================================
    // PÁGINA 2 — REGISTRO FOTOGRÁFICO
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
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: dorado,
      borderWidth: 1.5,
    });

    // Logo página 2
    if (logoImage) {
      const logoScale =
        Math.min(
          150 / logoImage.width,
          60 / logoImage.height,
        );

      const logoW =
        logoImage.width *
        logoScale;

      const logoH =
        logoImage.height *
        logoScale;

      page2.drawImage(
        logoImage,
        {
          x:
            (width - logoW) / 2,
          y: 720,
          width: logoW,
          height: logoH,
        },
      );
    }

    centrarTexto(
      page2,
      "REGISTRO FOTOGRÁFICO",
      665,
      19,
      fontBold,
      negro,
    );

    centrarTexto(
      page2,
      "Pieza registrada al momento de la compra",
      640,
      9,
      fontRegular,
      gris,
    );

    dibujarLinea(
      page2,
      150,
      620,
      445,
      620,
      1,
      dorado,
    );

    // ------------------------------------------------------------
    // ÁREA VERTICAL PARA LA FOTO
    // ------------------------------------------------------------

    const fotoAreaX = 105;
    const fotoAreaY = 145;
    const fotoAreaW = 385;
    const fotoAreaH = 440;

    // Marco de fotografía
    page2.drawRectangle({
      x: fotoAreaX,
      y: fotoAreaY,
      width: fotoAreaW,
      height: fotoAreaH,
      color: blanco,
      borderColor: doradoClaro,
      borderWidth: 1,
    });

    if (fotoImage) {
      // ==========================================================
      // ESCALADO PROPORCIONAL
      // La foto SIEMPRE queda dentro de un área vertical.
      // Nunca se estira ni se deforma.
      // ==========================================================

      const margen = 18;

      const maxW =
        fotoAreaW - margen * 2;

      const maxH =
        fotoAreaH - margen * 2;

      const escala =
        Math.min(
          maxW / fotoImage.width,
          maxH / fotoImage.height,
        );

      const imagenW =
        fotoImage.width *
        escala;

      const imagenH =
        fotoImage.height *
        escala;

      const imagenX =
        fotoAreaX +
        (fotoAreaW - imagenW) / 2;

      const imagenY =
        fotoAreaY +
        (fotoAreaH - imagenH) / 2;

      page2.drawImage(
        fotoImage,
        {
          x: imagenX,
          y: imagenY,
          width: imagenW,
          height: imagenH,
        },
      );
    } else {
      centrarTexto(
        page2,
        "FOTOGRAFÍA NO DISPONIBLE",
        360,
        11,
        fontBold,
        gris,
      );

      centrarTexto(
        page2,
        "La pieza fue registrada sin fotografía.",
        338,
        8,
        fontRegular,
        grisClaro,
      );
    }

    // Información inferior
    dibujarCaja(
      page2,
      90,
      82,
      415,
      38,
      marfilClaro,
      doradoClaro,
    );

    centrarTexto(
      page2,
      `REFERENCIA: ${referencia}  •  CÓDIGO: ${codigo}`,
      97,
      8,
      fontBold,
      negro,
    );

    centrarTexto(
      page2,
      "CASA ORUS • REGISTRO DE PIEZA",
      50,
      7,
      fontRegular,
      gris,
    );

    // ============================================================
    // PÁGINA 3 — GARANTÍA Y CUIDADOS
    // ============================================================

    const page3 =
      pdfDoc.addPage([
        width,
        height,
      ]);

    page3.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: marfil,
    });

    page3.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: dorado,
      borderWidth: 1.5,
    });

    // Logo
    if (logoImage) {
      const logoScale =
        Math.min(
          140 / logoImage.width,
          55 / logoImage.height,
        );

      const logoW =
        logoImage.width *
        logoScale;

      const logoH =
        logoImage.height *
        logoScale;

      page3.drawImage(
        logoImage,
        {
          x:
            (width - logoW) / 2,
          y: 735,
          width: logoW,
          height: logoH,
        },
      );
    }

    centrarTexto(
      page3,
      "GARANTÍA Y CUIDADOS",
      690,
      19,
      fontBold,
      negro,
    );

    centrarTexto(
      page3,
      "Información importante para conservar tu joya",
      668,
      9,
      fontRegular,
      gris,
    );

    dibujarLinea(
      page3,
      150,
      650,
      445,
      650,
      1,
      dorado,
    );

    // ------------------------------------------------------------
    // COMPROMISO DE CALIDAD
    // ------------------------------------------------------------

    dibujarTituloSeccion(
      page3,
      "COMPROMISO DE CALIDAD",
      615,
    );

    textoEnvuelto(
      page3,
      `En Casa Orus respaldamos nuestras piezas con una garantía de ${garantiaAnios} años sobre el oro laminado, sujeta a las condiciones descritas en este certificado.`,
      80,
      588,
      435,
      9,
      fontRegular,
      negro,
      15,
    );

    // ------------------------------------------------------------
    // QUÉ CUBRE
    // ------------------------------------------------------------

    dibujarTituloSeccion(
      page3,
      "¿QUÉ CUBRE LA GARANTÍA?",
      525,
    );

    const cubre = [
      "Defectos de fabricación.",
      "Problemas relacionados con la adherencia del oro laminado.",
      "Revisión de la pieza por parte de Casa Orus.",
    ];

    let yCubre = 498;

    cubre.forEach(
      (texto) => {
        page3.drawCircle({
          x: 90,
          y: yCubre + 3,
          size: 2.5,
          color: dorado,
        });

        page3.drawText(
          texto,
          {
            x: 103,
            y: yCubre,
            size: 9,
            font: fontRegular,
            color: negro,
          },
        );

        yCubre -= 21;
      },
    );

    // ------------------------------------------------------------
    // CUIDADOS
    // ------------------------------------------------------------

    dibujarTituloSeccion(
      page3,
      "CUIDADOS DE TU JOYA",
      420,
    );

    const cuidados = [
      "Evita químicos y humedad prolongada.",
      "Evita perfumes, cremas, cloro y productos de limpieza.",
      "Retira la joya antes de ducharte o nadar.",
      "Guárdala siempre en su empaque.",
      "Límpiala suavemente con un paño limpio y suave.",
    ];

    let yCuidados = 393;

    cuidados.forEach(
      (texto) => {
        page3.drawCircle({
          x: 90,
          y: yCuidados + 3,
          size: 2.5,
          color: dorado,
        });

        textoEnvuelto(
          page3,
          texto,
          103,
          yCuidados,
          400,
          9,
          fontRegular,
          negro,
          13,
        );

        yCuidados -= 27;
      },
    );

    // ------------------------------------------------------------
    // NO CUBRE
    // ------------------------------------------------------------

    dibujarTituloSeccion(
      page3,
      "LA GARANTÍA NO CUBRE",
      255,
    );

    const noCubre = [
      "Golpes, caídas, tirones o deformaciones.",
      "Desgaste normal ocasionado por el uso.",
      "Daños ocasionados por químicos o humedad.",
      "Pérdida de la pieza, piedras o dijes.",
    ];

    let yNoCubre = 228;

    noCubre.forEach(
      (texto) => {
        page3.drawCircle({
          x: 90,
          y: yNoCubre + 3,
          size: 2.5,
          color: dorado,
        });

        textoEnvuelto(
          page3,
          texto,
          103,
          yNoCubre,
          400,
          9,
          fontRegular,
          negro,
          13,
        );

        yNoCubre -= 25;
      },
    );

    // ------------------------------------------------------------
    // SOLICITUD DE GARANTÍA
    // ------------------------------------------------------------

    dibujarCaja(
      page3,
      75,
      73,
      445,
      78,
      marfilClaro,
      doradoClaro,
    );

    centrarTexto(
      page3,
      "SOLICITUD DE GARANTÍA",
      128,
      9,
      fontBold,
      dorado,
    );

    textoEnvuelto(
      page3,
      "Para solicitar una revisión, presenta este certificado junto con la pieza. Casa Orus realizará la inspección correspondiente.",
      100,
      107,
      395,
      8,
      fontRegular,
      negro,
      13,
    );

    centrarTexto(
      page3,
      "✨ Joyería que trasciende, creada para acompañarte en cada historia.",
      49,
      7.5,
      fontOblique,
      gris,
    );

    // ============================================================
    // GUARDAR PDF
    // ============================================================

    const pdfBytes =
      await pdfDoc.save();

    const pdfBase64 =
      uint8ArrayToBase64(
        pdfBytes,
      );

    console.log(
      "PDF creado correctamente.",
    );

    // ============================================================
    // SUBIR PDF A BUCKET "certificados"
    // ============================================================

    const nombreArchivo =
      `certificados/${codigo}.pdf`;

    const uploadResponse =
      await fetch(
        `${supabaseUrl}/storage/v1/object/${nombreArchivo}`,
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${serviceRoleKey}`,
            apikey: serviceRoleKey,
            "Content-Type":
              "application/pdf",
            "x-upsert": "true",
          },
          body: pdfBytes,
        },
      );

    if (!uploadResponse.ok) {
      const uploadError =
        await uploadResponse.text();

      throw new Error(
        `Error subiendo PDF a Storage: ${uploadError}`,
      );
    }

    console.log(
      "PDF guardado en bucket certificados.",
    );

    // ============================================================
    // URL PÚBLICA DEL PDF
    // ============================================================

    const pdfPublicUrl =
      `${supabaseUrl}/storage/v1/object/public/` +
      `certificados/${encodeURIComponent(codigo)}.pdf`;

    console.log(
      "URL pública PDF:",
      pdfPublicUrl,
    );

    // ============================================================
    // NORMALIZAR TELÉFONO COLOMBIANO
    // ============================================================

    let numeroWhatsApp =
      telefonoCliente.replace(
        /\D/g,
        "",
      );

    if (
      numeroWhatsApp.startsWith(
        "00",
      )
    ) {
      numeroWhatsApp =
        numeroWhatsApp.substring(2);
    }

    if (
      numeroWhatsApp.startsWith(
        "57",
      )
    ) {
      // Ya tiene código de Colombia
    } else if (
      numeroWhatsApp.length === 10 &&
      numeroWhatsApp.startsWith(
        "3",
      )
    ) {
      numeroWhatsApp =
        `57${numeroWhatsApp}`;
    }

    console.log(
      "Número WhatsApp:",
      numeroWhatsApp,
    );

    // ============================================================
    // ENVIAR PDF POR WHATSAPP
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
      "Respuesta WhatsApp:",
      JSON.stringify(
        whatsappResult,
      ),
    );

    if (!whatsappResponse.ok) {
      throw new Error(
        `WhatsApp rechazó el mensaje: ${JSON.stringify(
          whatsappResult,
        )}`,
      );
    }

    // ============================================================
    // RESPUESTA FINAL
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
      "ERROR GENERAL:",
      error,
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
      },
    );
  }
});

// ============================================================
// UINT8ARRAY → BASE64
// ============================================================

function uint8ArrayToBase64(
  bytes: Uint8Array,
): string {
  let binary = "";

  const chunkSize = 0x8000;

  for (
    let i = 0;
    i < bytes.length;
    i += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        i,
        Math.min(
          i + chunkSize,
          bytes.length,
        ),
      );

    binary += String.fromCharCode(
      ...chunk,
    );
  }

  return btoa(binary);
}
