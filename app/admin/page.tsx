"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminPage() {
  const [cliente, setCliente] = useState("");
  const [correo, setCorreo] = useState("");
  const [producto, setProducto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [numeroVenta, setNumeroVenta] = useState("");
  const [piedra, setPiedra] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function crearCertificado(e: React.FormEvent) {
    e.preventDefault();
    setMensaje("Creando certificado...");

    // 1. Crear cliente
    const { data: nuevoCliente, error: errorCliente } = await supabase
      .from("clientes")
      .insert({
        nombre: cliente,
        correo: correo,
      })
      .select()
      .single();

    if (errorCliente) {
      setMensaje("Error creando el cliente: " + errorCliente.message);
      return;
    }

    // 2. Crear producto
    const { data: nuevoProducto, error: errorProducto } = await supabase
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
      setMensaje("Error creando el producto: " + errorProducto.message);
      return;
    }

    // 3. Crear venta
    const { data: nuevaVenta, error: errorVenta } = await supabase
      .from("ventas")
      .insert({
        cliente_id: nuevoCliente.id,
        producto_id: nuevoProducto.id,
        numero_venta: numeroVenta,
        garantia_anios: 5,
      })
      .select()
      .single();

    if (errorVenta) {
      setMensaje("Error creando la venta: " + errorVenta.message);
      return;
    }

    // 4. Crear código automático
    const codigo = `ORUS-${new Date().getFullYear()}-${String(
      Date.now()
    ).slice(-6)}`;

    // 5. Crear certificado
    const { data: nuevoCertificado, error: errorCertificado } =
      await supabase
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
        "Error creando el certificado: " + errorCertificado.message
      );
      return;
    }

    // 6. Enviar correo automáticamente
    setMensaje("Certificado creado. Enviando correo...");

    const { error: errorCorreo } = await supabase.functions.invoke(
      "enviar-certificado",
      {
        body: {
          correo: correo,
          nombre: cliente,
          codigo: codigo,
        },
      }
    );

    if (errorCorreo) {
      console.error("Error enviando correo:", errorCorreo);

      setMensaje(
        `⚠️ Certificado creado: ${codigo}, pero no se pudo enviar el correo.`
      );

      return;
    }

    setMensaje(
      `✅ Certificado creado y enviado al correo del cliente: ${codigo}`
    );

    // Limpiar formulario
    setCliente("");
    setCorreo("");
    setProducto("");
    setReferencia("");
    setNumeroVenta("");
    setPiedra("");
  }

  return (
    <main className="min-h-screen bg-[#f8f5ef] px-6 py-10">
      <div className="max-w-4xl mx-auto">

        <div className="mb-10">
          <h1 className="text-3xl tracking-[0.2em] text-[#b08d3c] font-serif">
            CASA ORUS
          </h1>

          <p className="mt-2 text-gray-500">
            Panel de administración
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-[#e5d7b8] p-8">

          <h2 className="text-2xl font-semibold text-gray-800">
            Registrar nueva venta
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Los datos se guardarán automáticamente en Supabase.
          </p>

          <form
            onSubmit={crearCertificado}
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5"
          >

            <div>
              <label className="text-sm font-medium text-gray-700">
                Nombre del cliente
              </label>

              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nombre completo"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Correo electrónico
              </label>

              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="cliente@email.com"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Producto
              </label>

              <input
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                placeholder="Ej: Manilla de amatista"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Referencia
              </label>

              <input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: MAN-001"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Piedra natural
              </label>

              <input
                value={piedra}
                onChange={(e) => setPiedra(e.target.value)}
                placeholder="Ej: Amatista"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Número de venta
              </label>

              <input
                value={numeroVenta}
                onChange={(e) => setNumeroVenta(e.target.value)}
                placeholder="Ej: VENTA-0002"
                required
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#b08d3c]"
              />
            </div>

            <div className="md:col-span-2 pt-4">

              <button
                type="submit"
                className="w-full rounded-xl bg-[#b08d3c] py-3 text-white font-medium hover:opacity-90 transition"
              >
                Crear certificado
              </button>

            </div>

          </form>

          {mensaje && (
            <div className="mt-6 rounded-xl bg-[#faf8f3] border border-[#e5d7b8] p-4 text-center">
              {mensaje}
            </div>
          )}

        </div>

        <p className="text-center mt-8 text-xs text-gray-400">
          Casa Orus · Panel de administración
        </p>

      </div>
    </main>
  );
}