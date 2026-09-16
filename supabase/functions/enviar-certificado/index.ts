import { createClient } from "npm:@supabase/supabase-js";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from "npm:pdf-lib";

// ============================================================
// CASA ORUS
// CERTIFICADO PREMIUM V2
// WhatsApp Cloud API + Plantilla garantias_orus
// ============================================================

// ============================================================
// VARIABLES DE ENTORNO
// ============================================================

const supabaseUrl =
  Deno.env.get("SUPABASE_URL")!;

const serviceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const whatsappToken =
  Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;

const whatsappPhoneNumberId =
  Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

// ============================================================
// CLIENTE SUPABASE
// ============================================================

const supabase = createClient(
  supabaseUrl,
  serviceRoleKey
);

// ============================================================
// CORS
// ============================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
};

// ============================================================
// UTILIDADES
// ============================================================

function normalizarTelefono(
  telefono: string
) {
  let numero =
    telefono.replace(/\D/g, "");

  if (numero.startsWith("00")) {
    numero = numero.substring(2);
  }

  if (numero.startsWith("57")) {
    return numero;
  }

  if (
    numero.startsWith("3") &&
    numero.length === 10
  ) {
    return `57${numero}`;
  }

  return numero;
}

// ------------------------------------------------------------

function ajustarTexto(
  texto: string,
  maxCaracteres: number
) {
  if (!texto) {
    return "";
  }

  if (texto.length <= maxCaracteres) {
    return texto;
  }

  return (
    texto.substring(
      0,
      maxCaracteres - 3
    ) + "..."
  );
}

// ------------------------------------------------------------

function dibujarTextoCentrado(
  page: any,
  texto: string,
  y: number,
  font: any,
  size: number,
  color: any,
  anchoPagina = 595
) {
  const anchoTexto =
    font.widthOfTextAtSize(
      texto,
      size
    );

  page.drawText(texto, {
    x:
      (anchoPagina - anchoTexto) /
      2,
    y,
    size,
    font,
    color,
  });
}

// ============================================================
// CARGAR ARCHIVO DESDE BUCKET PÚBLICO
// ============================================================

async function cargarImagen(
  bucket: string,
  ruta: string
) {
  const partesRuta =
    ruta
      .split("/")
      .map((parte) =>
        encodeURIComponent(parte)
      )
      .join("/");

  const url =
    `${supabaseUrl}/storage/v1/object/public/${bucket}/${partesRuta}`;

  console.log(
    "🖼️ Cargando:",
    url
  );

  const response =
    await fetch(url);

  if (!response.ok) {
    console.error(
      `❌ No se pudo cargar ${bucket}/${ruta}`,
      response.status,
      response.statusText
    );

    return null;
  }

  const bytes =
    new Uint8Array(
      await response.arrayBuffer()
    );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  return {
    bytes,
    contentType,
  };
}

// ============================================================
// SERVIDOR
// ============================================================

Deno.serve(async (req) => {
  // ==========================================================
  // OPTIONS / CORS
  // ==========================================================

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    console.log(
      "=========================================="
    );

    console.log(
      "🚀 CASA ORUS - CERTIFICADO PREMIUM V2"
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // DATOS RECIBIDOS
    // ========================================================

    const body =
      await req.json();

    const nombre =
      body.nombre;

    const telefono =
      body.telefono;

    const codigo =
      body.codigo;

    if (
      !nombre ||
      !telefono ||
      !codigo
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Faltan datos: nombre, telefono o codigo.",
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

    console.log(
      "👤 Cliente:",
      nombre
    );

    console.log(
      "📱 Teléfono:",
      telefono
    );

    console.log(
      "🔐 Código:",
      codigo
    );

    // ========================================================
    // BUSCAR CERTIFICADO
    // ========================================================

    const {
      data: certificado,
      error: errorCertificado,
    } =
      await supabase
        .from("certificados")
        .select(`
          id,
          codigo,
          fecha_emision,
          estado,
          ventas (
            id,
            numero_venta,
            fecha_compra,
            garantia_anios,
            foto_url,
            clientes (
              nombre,
              telefono
            ),
            productos (
              referencia,
              nombre,
              material,
              piedra,
              precio
            )
          )
        `)
        .eq(
          "codigo",
          codigo
        )
        .single();

    if (
      errorCertificado ||
      !certificado
    ) {
      console.error(
        "❌ Error buscando certificado:",
        errorCertificado
      );

      return new Response(
        JSON.stringify({
          error:
            "No se encontró el certificado.",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    const venta =
      certificado.ventas;

    if (!venta) {
      throw new Error(
        "El certificado no tiene una venta asociada."
      );
    }

    const cliente =
      venta.clientes;

    const producto =
      venta.productos;

    // ========================================================
    // CREAR PDF
    // ========================================================

    console.log(
      "📄 Generando PDF PREMIUM V2..."
    );

    const pdfDoc =
      await PDFDocument.create();

    const fontRegular =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const fontBold =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    // ========================================================
    // COLORES
    // ========================================================

    const marfil =
      rgb(
        0.97,
        0.95,
        0.91
      );

    const dorado =
      rgb(
        0.72,
        0.54,
        0.22
      );

    const doradoClaro =
      rgb(
        0.84,
        0.70,
        0.42
      );

    const negro =
      rgb(
        0.12,
        0.11,
        0.10
      );

    const gris =
      rgb(
        0.38,
        0.37,
        0.34
      );

    const blanco =
      rgb(
        1,
        1,
        1
      );

    const ancho =
      595;

    const alto =
      842;

    // ========================================================
    // CARGAR LOGO
    //
    // Bucket:
    // logos
    //
    // Archivo:
    // logo-casa-orus.png
    // ========================================================

    let logoBytes:
      Uint8Array | null = null;

    let logoContentType =
      "";

    const logo =
      await cargarImagen(
        "logos",
        "logo-casa-orus.png"
      );

    if (logo) {
      logoBytes =
        logo.bytes;

      logoContentType =
        logo.contentType;

      console.log(
        "✅ Logo cargado correctamente"
      );

      console.log(
        "Tipo:",
        logoContentType
      );

      console.log(
        "Bytes:",
        logoBytes.length
      );
    } else {
      console.error(
        "❌ NO se pudo cargar el logo."
      );
    }

    // ========================================================
    // PÁGINA 1
    // CERTIFICADO
    // ========================================================

    const page1 =
      pdfDoc.addPage([
        ancho,
        alto,
      ]);

    // Fondo
    page1.drawRectangle({
      x: 0,
      y: 0,
      width: ancho,
      height: alto,
      color: marfil,
    });

    // Marco exterior
    page1.drawRectangle({
      x: 24,
      y: 24,
      width: ancho - 48,
      height: alto - 48,
      borderColor: dorado,
      borderWidth: 2,
    });

    // Marco interior
    page1.drawRectangle({
      x: 31,
      y: 31,
      width: ancho - 62,
      height: alto - 62,
      borderColor:
        doradoClaro,
      borderWidth: 0.7,
    });

    // ========================================================
    // LOGO
    // ========================================================

    if (logoBytes) {
      try {
        let logoImage: any =
          null;

        if (
          logoContentType.includes(
            "png"
          )
        ) {
          logoImage =
            await pdfDoc.embedPng(
              logoBytes
            );
        } else if (
          logoContentType.includes(
            "jpeg"
          ) ||
          logoContentType.includes(
            "jpg"
          )
        ) {
          logoImage =
            await pdfDoc.embedJpg(
              logoBytes
            );
        }

        if (logoImage) {
          const dimensiones =
            logoImage.scale(1);

          const maxWidth =
            175;

          const maxHeight =
            82;

          const escala =
            Math.min(
              maxWidth /
                dimensiones.width,
              maxHeight /
                dimensiones.height
            );

          const logoWidth =
            dimensiones.width *
            escala;

          const logoHeight =
            dimensiones.height *
            escala;

          page1.drawImage(
            logoImage,
            {
              x:
                (ancho -
                  logoWidth) /
                2,

              y:
                700,

              width:
                logoWidth,

              height:
                logoHeight,
            }
          );

          console.log(
            "✅ Logo insertado en página 1"
          );
        }
      } catch (error) {
        console.error(
          "❌ Error insertando logo:",
          error
        );
      }
    }

    // ========================================================
    // TÍTULO
    // ========================================================

    dibujarTextoCentrado(
      page1,
      "CERTIFICADO DE AUTENTICIDAD",
      655,
      fontBold,
      19,
      negro
    );

    dibujarTextoCentrado(
      page1,
      "Y GARANTÍA",
      629,
      fontBold,
      19,
      dorado
    );

    page1.drawLine({
      start: {
        x: 155,
        y: 608,
      },

      end: {
        x: 440,
        y: 608,
      },

      thickness: 1.2,
      color: dorado,
    });

    // ========================================================
    // INTRODUCCIÓN
    // ========================================================

    dibujarTextoCentrado(
      page1,
      "Casa Orus certifica que la pieza registrada",
      575,
      fontRegular,
      10.5,
      gris
    );

    dibujarTextoCentrado(
      page1,
      "corresponde a una joya comercializada por nuestra marca.",
      558,
      fontRegular,
      10.5,
      gris
    );

    // ========================================================
    // CLIENTE
    // ========================================================

    page1.drawRectangle({
      x: 80,
      y: 440,
      width: 435,
      height: 88,
      color: blanco,
      borderColor:
        doradoClaro,
      borderWidth: 0.8,
    });

    dibujarTextoCentrado(
      page1,
      "CLIENTE",
      505,
      fontBold,
      8,
      dorado
    );

    dibujarTextoCentrado(
      page1,
      ajustarTexto(
        cliente?.nombre ||
          nombre,
        45
      ),
      475,
      fontBold,
      16,
      negro
    );

    // ========================================================
    // DETALLES DE LA PIEZA
    // ========================================================

    page1.drawRectangle({
      x: 80,
      y: 285,
      width: 435,
      height: 130,
      color: blanco,
      borderColor:
        doradoClaro,
      borderWidth: 0.8,
    });

    dibujarTextoCentrado(
      page1,
      "DETALLES DE LA PIEZA",
      389,
      fontBold,
      8,
      dorado
    );

    // Pieza
    page1.drawText(
      "Pieza",
      {
        x: 105,
        y: 357,
        size: 9,
        font: fontBold,
        color: gris,
      }
    );

    page1.drawText(
      ajustarTexto(
        producto?.nombre ||
          "Joyería Casa Orus",
        30
      ),
      {
        x: 205,
        y: 357,
        size: 10,
        font: fontRegular,
        color: negro,
      }
    );

    // Referencia
    page1.drawText(
      "Referencia",
      {
        x: 105,
        y: 330,
        size: 9,
        font: fontBold,
        color: gris,
      }
    );

    page1.drawText(
      ajustarTexto(
        producto?.referencia ||
          "N/A",
        30
      ),
      {
        x: 205,
        y: 330,
        size: 10,
        font: fontRegular,
        color: negro,
      }
    );

    // Material
    page1.drawText(
      "Material",
      {
        x: 105,
        y: 303,
        size: 9,
        font: fontBold,
        color: gris,
      }
    );

    page1.drawText(
      ajustarTexto(
        producto?.material ||
          "Oro laminado",
        30
      ),
      {
        x: 205,
        y: 303,
        size: 10,
        font: fontRegular,
        color: negro,
      }
    );

    // Piedra
    if (producto?.piedra) {
      page1.drawText(
        "Piedra",
        {
          x: 350,
          y: 357,
          size: 9,
          font: fontBold,
          color: gris,
        }
      );

      page1.drawText(
        ajustarTexto(
          producto.piedra,
          17
        ),
        {
          x: 400,
          y: 357,
          size: 9,
          font: fontRegular,
          color: negro,
        }
      );
    }

    // Venta
    page1.drawText(
      "Venta",
      {
        x: 350,
        y: 330,
        size: 9,
        font: fontBold,
        color: gris,
      }
    );

    page1.drawText(
      ajustarTexto(
        venta.numero_venta ||
          "N/A",
        17
      ),
      {
        x: 400,
        y: 330,
        size: 9,
        font: fontRegular,
        color: negro,
      }
    );

    // Fecha
    page1.drawText(
      "Fecha",
      {
        x: 350,
        y: 303,
        size: 9,
        font: fontBold,
        color: gris,
      }
    );

    page1.drawText(
      String(
        venta.fecha_compra ||
          certificado.fecha_emision ||
          ""
      ),
      {
        x: 400,
        y: 303,
        size: 9,
        font: fontRegular,
        color: negro,
      }
    );

    // ========================================================
    // SELLO DE GARANTÍA
    // ========================================================

    page1.drawCircle({
      x: 297.5,
      y: 205,
      size: 53,
      color: marfil,
      borderColor: dorado,
      borderWidth: 2,
    });

    page1.drawCircle({
      x: 297.5,
      y: 205,
      size: 43,
      borderColor:
        doradoClaro,
      borderWidth: 0.8,
    });

    dibujarTextoCentrado(
      page1,
      `${venta.garantia_anios || 5} AÑOS`,
      212,
      fontBold,
      12,
      dorado
    );

    dibujarTextoCentrado(
      page1,
      "GARANTÍA",
      195,
      fontBold,
      8,
      negro
    );

    dibujarTextoCentrado(
      page1,
      "CASA ORUS",
      178,
      fontBold,
      7,
      gris
    );

    // ========================================================
    // CÓDIGO
    // ========================================================

    dibujarTextoCentrado(
      page1,
      "CÓDIGO DE CERTIFICADO",
      118,
      fontBold,
      8,
      dorado
    );

    dibujarTextoCentrado(
      page1,
      codigo,
      88,
      fontBold,
      17,
      negro
    );

    // ========================================================
    // FRASE
    // ========================================================

    dibujarTextoCentrado(
      page1,
      "Joyería que trasciende, creada para acompañarte",
      60,
      fontRegular,
      8.5,
      gris
    );

    dibujarTextoCentrado(
      page1,
      "en cada historia.",
      46,
      fontRegular,
      8.5,
      gris
    );

    // ========================================================
    // PÁGINA 2
    // REGISTRO FOTOGRÁFICO
    // ========================================================

    const page2 =
      pdfDoc.addPage([
        ancho,
        alto,
      ]);

    page2.drawRectangle({
      x: 0,
      y: 0,
      width: ancho,
      height: alto,
      color: marfil,
    });

    page2.drawRectangle({
      x: 24,
      y: 24,
      width: ancho - 48,
      height: alto - 48,
      borderColor: dorado,
      borderWidth: 2,
    });

    page2.drawRectangle({
      x: 31,
      y: 31,
      width: ancho - 62,
      height: alto - 62,
      borderColor:
        doradoClaro,
      borderWidth: 0.7,
    });

    dibujarTextoCentrado(
      page2,
      "REGISTRO FOTOGRÁFICO",
      760,
      fontBold,
      20,
      negro
    );

    dibujarTextoCentrado(
      page2,
      "PIEZA REGISTRADA",
      735,
      fontBold,
      9,
      dorado
    );

    page2.drawLine({
      start: {
        x: 150,
        y: 715,
      },

      end: {
        x: 445,
        y: 715,
      },

      thickness: 1,
      color: dorado,
    });

    // ========================================================
    // CARGAR FOTO
    // ========================================================

    let fotoBytes:
      Uint8Array | null = null;

    let fotoContentType =
      "";

    if (venta.foto_url) {
      const foto =
        await cargarImagen(
          "joyas",
          venta.foto_url
        );

      if (foto) {
        fotoBytes =
          foto.bytes;

        fotoContentType =
          foto.contentType;

        console.log(
          "✅ Foto cargada"
        );

        console.log(
          "Tipo:",
          fotoContentType
        );

        console.log(
          "Bytes:",
          fotoBytes.length
        );
      }
    }

    // ========================================================
    // MARCO FOTO
    // ========================================================

    const marcoX =
      70;

    const marcoY =
      135;

    const marcoW =
      455;

    const marcoH =
      535;

    page2.drawRectangle({
      x: marcoX,
      y: marcoY,
      width: marcoW,
      height: marcoH,
      color: blanco,
      borderColor:
        doradoClaro,
      borderWidth: 1.2,
    });

    // ========================================================
    // INSERTAR FOTO
    // ========================================================

    if (fotoBytes) {
      try {
        let fotoImagen: any =
          null;

        if (
          fotoContentType.includes(
            "png"
          )
        ) {
          fotoImagen =
            await pdfDoc.embedPng(
              fotoBytes
            );
        } else if (
          fotoContentType.includes(
            "jpeg"
          ) ||
          fotoContentType.includes(
            "jpg"
          )
        ) {
          fotoImagen =
            await pdfDoc.embedJpg(
              fotoBytes
            );
        } else {
          console.error(
            "❌ Formato de foto no compatible:",
            fotoContentType
          );
        }

        if (fotoImagen) {
          const dimensiones =
            fotoImagen.scale(1);

          const anchoOriginal =
            dimensiones.width;

          const altoOriginal =
            dimensiones.height;

          // ==================================================
          // FOTO HORIZONTAL
          // ==================================================

          if (
            anchoOriginal >
            altoOriginal * 1.15
          ) {
            const maxAncho =
              400;

            const maxAlto =
              450;

            const escala =
              Math.min(
                maxAncho /
                  altoOriginal,

                maxAlto /
                  anchoOriginal
              );

            const nuevoAncho =
              altoOriginal *
              escala;

            const nuevoAlto =
              anchoOriginal *
              escala;

            const centroX =
              marcoX +
              marcoW / 2;

            const centroY =
              marcoY +
              marcoH / 2;

            page2.drawImage(
              fotoImagen,
              {
                x:
                  centroX -
                  nuevoAncho / 2,

                y:
                  centroY -
                  nuevoAlto / 2,

                width:
                  nuevoAncho,

                height:
                  nuevoAlto,

                rotate:
                  degrees(90),
              }
            );

            console.log(
              "✅ Foto horizontal girada 90°"
            );
          }

          // ==================================================
          // FOTO VERTICAL / CUADRADA
          // ==================================================

          else {
            const maxAncho =
              410;

            const maxAlto =
              485;

            const escala =
              Math.min(
                maxAncho /
                  anchoOriginal,

                maxAlto /
                  altoOriginal
              );

            const nuevoAncho =
              anchoOriginal *
              escala;

            const nuevoAlto =
              altoOriginal *
              escala;

            page2.drawImage(
              fotoImagen,
              {
                x:
                  marcoX +
                  (marcoW -
                    nuevoAncho) /
                    2,

                y:
                  marcoY +
                  (marcoH -
                    nuevoAlto) /
                    2,

                width:
                  nuevoAncho,

                height:
                  nuevoAlto,
              }
            );

            console.log(
              "✅ Foto insertada proporcionalmente"
            );
          }
        }
      } catch (error) {
        console.error(
          "❌ Error insertando fotografía:",
          error
        );

        dibujarTextoCentrado(
          page2,
          "No fue posible insertar la fotografía.",
          105,
          fontRegular,
          9,
          gris
        );
      }
    } else {
      dibujarTextoCentrado(
        page2,
        "No se encontró fotografía registrada.",
        105,
        fontRegular,
        10,
        gris
      );
    }

    // ========================================================
    // PIE PÁGINA 2
    // ========================================================

    dibujarTextoCentrado(
      page2,
      `Certificado: ${codigo}`,
      92,
      fontBold,
      8,
      dorado
    );

    dibujarTextoCentrado(
      page2,
      "La fotografía corresponde al registro realizado",
      62,
      fontRegular,
      8,
      gris
    );

    dibujarTextoCentrado(
      page2,
      "al momento de la venta de la pieza.",
      48,
      fontRegular,
      8,
      gris
    );

    // ========================================================
    // PÁGINA 3
    // GARANTÍA Y CUIDADOS
    // ========================================================

    const page3 =
      pdfDoc.addPage([
        ancho,
        alto,
      ]);

    page3.drawRectangle({
      x: 0,
      y: 0,
      width: ancho,
      height: alto,
      color: marfil,
    });

    page3.drawRectangle({
      x: 24,
      y: 24,
      width: ancho - 48,
      height: alto - 48,
      borderColor: dorado,
      borderWidth: 2,
    });

    page3.drawRectangle({
      x: 31,
      y: 31,
      width: ancho - 62,
      height: alto - 62,
      borderColor:
        doradoClaro,
      borderWidth: 0.7,
    });

    dibujarTextoCentrado(
      page3,
      "GARANTÍA Y CUIDADOS",
      760,
      fontBold,
      21,
      negro
    );

    dibujarTextoCentrado(
      page3,
      "CASA ORUS",
      735,
      fontBold,
      9,
      dorado
    );

    page3.drawLine({
      start: {
        x: 145,
        y: 716,
      },

      end: {
        x: 450,
        y: 716,
      },

      thickness: 1,
      color: dorado,
    });

    // ========================================================
    // COMPROMISO
    // ========================================================

    page3.drawRectangle({
      x: 65,
      y: 620,
      width: 465,
      height: 65,
      color: blanco,
      borderColor:
        doradoClaro,
      borderWidth: 0.8,
    });

    page3.drawText(
      "COMPROMISO DE CALIDAD",
      {
        x: 85,
        y: 660,
        size: 10,
        font: fontBold,
        color: dorado,
      }
    );

    page3.drawText(
      "Casa Orus respalda sus piezas con una garantía",
      {
        x: 85,
        y: 640,
        size: 8.5,
        font: fontRegular,
        color: negro,
      }
    );

    page3.drawText(
      `de ${venta.garantia_anios || 5} años sobre el oro laminado.`,
      {
        x: 85,
        y: 624,
        size: 8.5,
        font: fontRegular,
        color: negro,
      }
    );

    // ========================================================
    // QUÉ CUBRE
    // ========================================================

    page3.drawText(
      "¿QUÉ CUBRE LA GARANTÍA?",
      {
        x: 70,
        y: 575,
        size: 11,
        font: fontBold,
        color: dorado,
      }
    );

    const cubre = [
      "• Defectos de fabricación.",
      "• Problemas relacionados con la adherencia del laminado.",
      "• Revisión de la pieza cuando se presente una novedad.",
    ];

    let y =
      550;

    for (
      const texto of cubre
    ) {
      page3.drawText(
        texto,
        {
          x: 82,
          y,
          size: 8.7,
          font: fontRegular,
          color: negro,
        }
      );

      y -= 20;
    }

    // ========================================================
    // CUIDADOS
    // ========================================================

    page3.drawText(
      "CUIDADOS DE TU JOYA",
      {
        x: 70,
        y: 465,
        size: 11,
        font: fontBold,
        color: dorado,
      }
    );

    const cuidados = [
      "• Evita químicos y humedad prolongada.",
      "• Evita perfumes, cremas, cloro y productos de limpieza.",
      "• Retira la joya antes de ducharte o nadar.",
      "• Guárdala en su empaque cuando no la estés usando.",
      "• Límpiala suavemente con un paño limpio y suave.",
    ];

    y =
      440;

    for (
      const texto of cuidados
    ) {
      page3.drawText(
        texto,
        {
          x: 82,
          y,
          size: 8.7,
          font: fontRegular,
          color: negro,
        }
      );

      y -= 20;
    }

    // ========================================================
    // NO CUBRE
    // ========================================================

    page3.drawText(
      "LA GARANTÍA NO CUBRE",
      {
        x: 70,
        y: 330,
        size: 11,
        font: fontBold,
        color: dorado,
      }
    );

    const noCubre = [
      "• Golpes, caídas, tirones o deformaciones.",
      "• Desgaste normal ocasionado por el uso.",
      "• Daños producidos por químicos o humedad.",
      "• Pérdida de la pieza, piedras o dijes.",
    ];

    y =
      305;

    for (
      const texto of noCubre
    ) {
      page3.drawText(
        texto,
        {
          x: 82,
          y,
          size: 8.7,
          font: fontRegular,
          color: negro,
        }
      );

      y -= 20;
    }

    // ========================================================
    // SOLICITUD DE GARANTÍA
    // ========================================================

    page3.drawRectangle({
      x: 65,
      y: 145,
      width: 465,
      height: 85,
      color: blanco,
      borderColor:
        doradoClaro,
      borderWidth: 0.8,
    });

    page3.drawText(
      "SOLICITUD DE GARANTÍA",
      {
        x: 85,
        y: 200,
        size: 10,
        font: fontBold,
        color: dorado,
      }
    );

    page3.drawText(
      "Para solicitar una revisión presenta esta garantía",
      {
        x: 85,
        y: 179,
        size: 8.5,
        font: fontRegular,
        color: negro,
      }
    );

    page3.drawText(
      "y la pieza correspondiente. Casa Orus realizará",
      {
        x: 85,
        y: 163,
        size: 8.5,
        font: fontRegular,
        color: negro,
      }
    );

    page3.drawText(
      "la inspección correspondiente.",
      {
        x: 85,
        y: 147,
        size: 8.5,
        font: fontRegular,
        color: negro,
      }
    );

    // ========================================================
    // PIE PÁGINA 3
    // ========================================================

    dibujarTextoCentrado(
      page3,
      "Joyería que trasciende.",
      90,
      fontBold,
      10,
      dorado
    );

    dibujarTextoCentrado(
      page3,
      "Casa Orus",
      70,
      fontRegular,
      8,
      gris
    );

    // ========================================================
    // GENERAR BYTES DEL PDF
    // ========================================================

    const pdfBytes =
      await pdfDoc.save();

    console.log(
      "✅ PDF PREMIUM V2 GENERADO"
    );

    console.log(
      "Tamaño:",
      pdfBytes.length,
      "bytes"
    );

    // ========================================================
    // SUBIR PDF A SUPABASE
    //
    // IMPORTANTE:
    // usamos -v2 para NO reutilizar el PDF anterior.
    // ========================================================

    const nombrePdf =
      `certificados/${codigo}-v2.pdf`;

    console.log(
      "📤 Subiendo PDF:",
      nombrePdf
    );

    const {
      error: errorUpload,
    } =
      await supabase.storage
        .from(
          "certificados"
        )
        .upload(
          nombrePdf,
          pdfBytes,
          {
            contentType:
              "application/pdf",

            upsert:
              true,

            cacheControl:
              "0",
          }
        );

    if (errorUpload) {
      console.error(
        "❌ Error subiendo PDF:",
        errorUpload
      );

      throw new Error(
        "No se pudo subir el PDF: " +
          errorUpload.message
      );
    }

    console.log(
      "✅ PDF V2 subido correctamente"
    );

    // ========================================================
    // URL PÚBLICA DEL PDF
    // ========================================================

    const pdfPublicUrl =
      `${supabaseUrl}/storage/v1/object/public/certificados/${codigo}-v2.pdf`;

    console.log(
      "🔗 PDF:",
      pdfPublicUrl
    );

    // ========================================================
    // NORMALIZAR TELÉFONO
    // ========================================================

    const telefonoWhatsApp =
      normalizarTelefono(
        telefono
      );

    console.log(
      "📱 Número WhatsApp:",
      telefonoWhatsApp
    );

    // ========================================================
    // WHATSAPP CLOUD API
    // ========================================================

    const whatsappUrl =
      `https://graph.facebook.com/v23.0/${whatsappPhoneNumberId}/messages`;

    // ========================================================
    // PLANTILLA
    //
    // Nombre:
    // garantias_orus
    //
    // Idioma:
    // es_CO
    //
    // {{1}} = nombre
    // {{2}} = código
    //
    // HEADER = PDF
    // ========================================================

    const whatsappBody = {
      messaging_product:
        "whatsapp",

      to:
        telefonoWhatsApp,

      type:
        "template",

      template: {
        name:
          "garantias_orus",

        language: {
          code:
            "es_CO",
        },

        components: [
          // ==================================================
          // HEADER DEL DOCUMENTO
          // ==================================================

          {
            type:
              "header",

            parameters: [
              {
                type:
                  "document",

                document: {
                  link:
                    pdfPublicUrl,

                  filename:
                    `Certificado-Casa-Orus-${codigo}-v2.pdf`,
                },
              },
            ],
          },

          // ==================================================
          // CUERPO
          //
          // {{1}} = nombre
          // {{2}} = código
          // ==================================================

          {
            type:
              "body",

            parameters: [
              {
                type:
                  "text",

                text:
                  String(
                    nombre
                  ),
              },

              {
                type:
                  "text",

                text:
                  String(
                    codigo
                  ),
              },
            ],
          },
        ],
      },
    };

    console.log(
      "=========================================="
    );

    console.log(
      "📤 ENVIANDO PLANTILLA WHATSAPP"
    );

    console.log(
      "Plantilla: garantias_orus"
    );

    console.log(
      "Idioma: es_CO"
    );

    console.log(
      "Cliente:",
      nombre
    );

    console.log(
      "Código:",
      codigo
    );

    console.log(
      "PDF:",
      pdfPublicUrl
    );

    console.log(
      "=========================================="
    );

    // ========================================================
    // ENVIAR A META
    // ========================================================

    const whatsappResponse =
      await fetch(
        whatsappUrl,
        {
          method:
            "POST",

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
      "📩 RESPUESTA WHATSAPP:"
    );

    console.log(
      JSON.stringify(
        whatsappResult
      )
    );

    // ========================================================
    // ERROR META
    // ========================================================

    if (
      !whatsappResponse.ok
    ) {
      console.error(
        "❌ META RECHAZÓ EL MENSAJE"
      );

      throw new Error(
        "WhatsApp rechazó la plantilla: " +
          JSON.stringify(
            whatsappResult
          )
      );
    }

    // ========================================================
    // ÉXITO
    // ========================================================

    console.log(
      "=========================================="
    );

    console.log(
      "✅ PLANTILLA ENVIADA A META"
    );

    console.log(
      "✅ PDF PREMIUM V2 GENERADO"
    );

    console.log(
      "=========================================="
    );

    return new Response(
      JSON.stringify({
        success:
          true,

        codigo:
          codigo,

        pdf:
          pdfPublicUrl,

        plantilla:
          "garantias_orus",

        whatsapp:
          whatsappResult,
      }),
      {
        status:
          200,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );

  } catch (error) {

    console.error(
      "=========================================="
    );

    console.error(
      "❌ ERROR GENERAL"
    );

    console.error(
      error
    );

    console.error(
      "=========================================="
    );

    return new Response(
      JSON.stringify({
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status:
          500,

        headers: {
          ...corsHeaders,

          "Content-Type":
            "application/json",
        },
      }
    );
  }
});
