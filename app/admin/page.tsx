"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [producto, setProducto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [piedra, setPiedra] = useState("");

  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState("");

  const [mensaje, setMensaje] = useState("");

  function seleccionarFoto(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      setMensaje("⚠️ Selecciona una imagen válida.");
      return;
    }

    setFoto(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
    setMensaje("");
  }

  async function crearCertificado(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!cliente || !telefono || !producto || !referencia) {
      setMensaje(
        "⚠️ Completa nombre, teléfono, producto y referencia."
      );
      return;
    }

    if (!foto) {
      setMensaje(
        "⚠️ Debes tomar o seleccionar una foto de la joya."
      );
      return;
    }

    setMensaje("Creando certificado...");

    // =====================================================
    // CREAR CLIENTE
    // =====================================================

    const { data: nuevoCliente, error: errorCliente } =
      await supabase
        .from("clientes")
        .insert({
          nombre: cliente,
          telefono: telefono,
        })
        .select()
        .single();

    if (errorCliente) {
      setMensaje(
        "Error creando el cliente: " +
          errorCliente.message
      );
      return;
    }

    // =====================================================
    // CREAR PRODUCTO
    // =====================================================

    const { data: nuevoProducto, error: errorProducto } =
      await supabase
        .from("productos")
        .insert({
          referencia: referencia,
          nombre: producto,
          material: "Oro laminado",
          piedra: piedra,
        })
        .select()
        .single();

    if (errorProducto) {
      setMensaje(
        "Error creando el producto: " +
          errorProducto.message
      );
      return;
    }

    // =====================================================
    // CREAR VENTA
    // =====================================================

    const { data: nuevaVenta, error: errorVenta } =
      await supabase
        .from("ventas")
        .insert({
          cliente_id: nuevoCliente.id,
          producto_id: nuevoProducto.id,
          garantia_anios: 5,
        })
        .select()
        .single();

    if (errorVenta) {
      setMensaje(
        "Error creando la venta: " +
          errorVenta.message
      );
      return;
    }

    // =====================================================
    // SUBIR FOTO
    // =====================================================

    const extension =
      foto.name.split(".").pop()?.toLowerCase() ||
      "jpg";

    const nombreArchivo =
      `ventas/${nuevaVenta.id}.${extension}`;

    const { error: errorFoto } =
      await supabase.storage
        .from("joyas")
        .upload(nombreArchivo, foto, {
          upsert: true,
          contentType: foto.type,
        });

    if (errorFoto) {
      setMensaje(
        "Error subiendo la foto: " +
          errorFoto.message
      );
      return;
    }

    // =====================================================
    // GUARDAR FOTO EN LA VENTA
    // =====================================================

    const {
      error: errorActualizarVenta,
    } = await supabase
      .from("ventas")
      .update({
        foto_url: nombreArchivo,
      })
      .eq("id", nuevaVenta.id);

    if (errorActualizarVenta) {
      setMensaje(
        "Error guardando la foto: " +
          errorActualizarVenta.message
      );
      return;
    }

    // =====================================================
    // CREAR CÓDIGO DE CERTIFICADO
    // =====================================================

    const codigo =
      `ORUS-${new Date().getFullYear()}-${String(
        Date.now()
      ).slice(-6)}`;

    const {
      error: errorCertificado,
    } = await supabase
      .from("certificados")
      .insert({
        venta_id: nuevaVenta.id,
        codigo: codigo,
        estado: "ACTIVO",
      })
      .select()
      .single();

    if (errorCertificado) {
      setMensaje(
        "Error creando el certificado: " +
          errorCertificado.message
      );
      return;
    }

    // =====================================================
    // GENERAR PDF + ENVIAR WHATSAPP
    // =====================================================

    setMensaje(
      "Generando certificado y enviándolo por WhatsApp..."
    );

    const {
      data: resultadoFuncion,
      error: errorFuncion,
    } = await supabase.functions.invoke(
      "enviar-certificado",
      {
        body: {
          nombre: cliente,
          telefono: telefono,
          codigo: codigo,
        },
      }
    );

    if (errorFuncion) {
      console.error(
        "Error enviando WhatsApp:",
        errorFuncion
      );

      setMensaje(
        `⚠️ Certificado creado: ${codigo}, pero hubo un error enviando WhatsApp.`
      );

      return;
    }

    console.log(
      "Resultado WhatsApp:",
      resultadoFuncion
    );

    setMensaje(
      `✅ Certificado creado: ${codigo} | Venta: ${nuevaVenta.numero_venta} | WhatsApp enviado`
    );

    // =====================================================
    // LIMPIAR FORMULARIO
    // =====================================================

    setCliente("");
    setTelefono("");
    setProducto("");
    setReferencia("");
    setPiedra("");
    setFoto(null);
    setVistaPrevia("");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f3eb",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          background: "white",
          padding: "35px",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img
            src="/logo-casa-orus.png"
            alt="Casa Orus"
            style={{
              width: "150px",
              marginBottom: "20px",
            }}
          />

          <h1
            style={{
              color: "#9b762d",
              marginBottom: "5px",
            }}
          >
            Crear certificado
          </h1>

          <p style={{ color: "#777" }}>
            Registra la venta y envía el certificado
            por WhatsApp.
          </p>
        </div>

        <form onSubmit={crearCertificado}>
          <label>Nombre del cliente</label>

          <input
            value={cliente}
            onChange={(e) =>
              setCliente(e.target.value)
            }
            style={inputStyle}
            placeholder="Nombre completo"
          />

          <label>Teléfono WhatsApp</label>

          <input
            value={telefono}
            onChange={(e) =>
              setTelefono(e.target.value)
            }
            style={inputStyle}
            placeholder="Ej: +573245192776"
          />

          <small
            style={{
              display: "block",
              color: "#777",
              marginTop: "-8px",
              marginBottom: "15px",
            }}
          >
            Usa el formato internacional, por ejemplo:
            +57 seguido del número.
          </small>

          <label>Producto</label>

          <input
            value={producto}
            onChange={(e) =>
              setProducto(e.target.value)
            }
            style={inputStyle}
            placeholder="Ej: Manilla amatista"
          />

          <label>Referencia</label>

          <input
            value={referencia}
            onChange={(e) =>
              setReferencia(e.target.value)
            }
            style={inputStyle}
            placeholder="Ej: CO-001"
          />

          <label>Piedra natural</label>

          <input
            value={piedra}
            onChange={(e) =>
              setPiedra(e.target.value)
            }
            style={inputStyle}
            placeholder="Ej: Amatista"
          />

          <label>Foto de la joya</label>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={seleccionarFoto}
            style={{
              marginTop: "10px",
              marginBottom: "15px",
            }}
          />

          {vistaPrevia && (
            <div
              style={{
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <img
                src={vistaPrevia}
                alt="Vista previa"
                style={{
                  width: "220px",
                  maxHeight: "220px",
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "2px solid #c49a45",
                }}
              />
            </div>
          )}

          <button
            type="submit"
            style={{
              width: "100%",
              padding: "15px",
              border: "none",
              borderRadius: "9px",
              background: "#b38a3d",
              color: "white",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Crear certificado y enviar por WhatsApp
          </button>
        </form>

        {mensaje && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "8px",
              background: "#f5f5f5",
              textAlign: "center",
              color: "#444",
            }}
          >
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}