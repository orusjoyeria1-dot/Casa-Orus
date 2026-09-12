"use client";

import { useState } from "react";
import { supabase } from "./lib/supabase";

export default function Home() {
  const [codigo, setCodigo] = useState("");
  const [certificado, setCertificado] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function consultar() {
    setCargando(true);
    setError("");
    setCertificado(null);

    const { data, error } = await supabase
      .from("certificados")
      .select(`
        codigo,
        fecha_emision,
        estado,
        ventas (
          numero_venta,
          fecha_compra,
          garantia_anios,
          clientes (
            nombre,
            correo,
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
      .eq("codigo", codigo.trim().toUpperCase())
      .single();

    setCargando(false);

    if (error || !data) {
      setError("No encontramos un certificado con ese código.");
      return;
    }

    setCertificado(data);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f0e8",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* ENCABEZADO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <img
            src="/logo-casa-orus.png"
            alt="Casa Orus"
            style={{
              width: "230px",
              maxWidth: "80%",
              marginBottom: "10px",
            }}
          />

          <p
            style={{
              color: "#8b6b2f",
              letterSpacing: "3px",
              fontSize: "13px",
              margin: 0,
            }}
          >
            VERIFICACIÓN DE CERTIFICADOS
          </p>
        </div>

        {/* BUSCADOR */}
        <div
          style={{
            background: "#ffffff",
            padding: "30px",
            borderRadius: "15px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            marginBottom: "35px",
          }}
        >
          <h2
            style={{
              textAlign: "center",
              color: "#5c4a2b",
              fontWeight: "500",
              marginTop: 0,
            }}
          >
            Consulta tu certificado
          </h2>

          <p
            style={{
              textAlign: "center",
              color: "#777",
              marginBottom: "25px",
            }}
          >
            Ingresa el código único de tu certificado.
          </p>

          <input
            type="text"
            placeholder="Ejemplo: ORUS-2026-000001"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") consultar();
            }}
            style={{
              width: "100%",
              padding: "15px",
              border: "1px solid #d8c9aa",
              borderRadius: "8px",
              boxSizing: "border-box",
              fontSize: "16px",
              outline: "none",
              marginBottom: "15px",
            }}
          />

          <button
            onClick={consultar}
            disabled={cargando || !codigo.trim()}
            style={{
              width: "100%",
              padding: "15px",
              background: "#b08d45",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              letterSpacing: "1px",
            }}
          >
            {cargando ? "Consultando..." : "Consultar certificado"}
          </button>

          {error && (
            <p
              style={{
                color: "#a33",
                textAlign: "center",
                marginTop: "18px",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* CERTIFICADO */}
        {certificado && (
          <>
            <div
              id="certificado"
              style={{
                background: "#fffdf8",
                border: "2px solid #c5a45b",
                padding: "50px",
                position: "relative",
                boxShadow: "0 10px 35px rgba(0,0,0,0.12)",
              }}
            >
              {/* DECORACIÓN */}
              <div
                style={{
                  border: "1px solid #d8c58f",
                  padding: "35px",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <img
                    src="/logo-casa-orus.png"
                    alt="Casa Orus"
                    style={{
                      width: "200px",
                      marginBottom: "15px",
                    }}
                  />

                  <div
                    style={{
                      height: "1px",
                      background: "#c5a45b",
                      margin: "10px auto 25px",
                      maxWidth: "500px",
                    }}
                  />

                  <h1
                    style={{
                      fontFamily: "Georgia, serif",
                      fontWeight: "400",
                      letterSpacing: "4px",
                      color: "#806328",
                      marginBottom: "8px",
                    }}
                  >
                    CERTIFICADO
                  </h1>

                  <h3
                    style={{
                      fontWeight: "400",
                      color: "#777",
                      letterSpacing: "2px",
                      marginTop: 0,
                    }}
                  >
                    DE AUTENTICIDAD Y GARANTÍA
                  </h3>
                </div>

                {/* ESTADO */}
                <div
                  style={{
                    textAlign: "center",
                    margin: "30px 0",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "8px 22px",
                      border: "1px solid #c5a45b",
                      color:
                        certificado.estado === "ACTIVO"
                          ? "#527044"
                          : "#9b3333",
                      letterSpacing: "2px",
                      fontSize: "12px",
                    }}
                  >
                    CERTIFICADO {certificado.estado}
                  </span>
                </div>

                {/* INFORMACIÓN */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "20px",
                    marginTop: "30px",
                  }}
                >
                  <Info
                    titulo="CLIENTE"
                    valor={certificado.ventas?.clientes?.nombre}
                  />

                  <Info
                    titulo="PRODUCTO"
                    valor={certificado.ventas?.productos?.nombre}
                  />

                  <Info
                    titulo="REFERENCIA"
                    valor={certificado.ventas?.productos?.referencia}
                  />

                  <Info
                    titulo="MATERIAL"
                    valor={certificado.ventas?.productos?.material}
                  />

                  <Info
                    titulo="PIEDRA NATURAL"
                    valor={certificado.ventas?.productos?.piedra || "No aplica"}
                  />

                  <Info
                    titulo="NÚMERO DE VENTA"
                    valor={certificado.ventas?.numero_venta}
                  />

                  <Info
                    titulo="FECHA DE COMPRA"
                    valor={certificado.ventas?.fecha_compra}
                  />

                  <Info
                    titulo="GARANTÍA"
                    valor={`${certificado.ventas?.garantia_anios || 5} años`}
                  />
                </div>

                {/* CÓDIGO */}
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "40px",
                    paddingTop: "25px",
                    borderTop: "1px solid #d8c58f",
                  }}
                >
                  <p
                    style={{
                      marginBottom: "7px",
                      fontSize: "11px",
                      letterSpacing: "2px",
                      color: "#777",
                    }}
                  >
                    CÓDIGO ÚNICO DE CERTIFICADO
                  </p>

                  <strong
                    style={{
                      fontSize: "20px",
                      letterSpacing: "3px",
                      color: "#806328",
                    }}
                  >
                    {certificado.codigo}
                  </strong>
                </div>

                {/* PIE */}
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "40px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      color: "#806328",
                      fontSize: "17px",
                    }}
                  >
                    Joyería que trasciende
                  </p>

                  <p
                    style={{
                      fontSize: "11px",
                      color: "#888",
                      maxWidth: "500px",
                      margin: "auto",
                    }}
                  >
                    Este certificado acredita el registro de la pieza
                    adquirida y su garantía correspondiente.
                  </p>
                </div>
              </div>
            </div>

            {/* BOTÓN IMPRIMIR */}
            <button
              onClick={() => window.print()}
              style={{
                display: "block",
                margin: "25px auto 0",
                padding: "14px 30px",
                background: "#b08d45",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              🖨️ Imprimir / Guardar como PDF
            </button>
          </>
        )}
      </div>

      {/* ESTILOS DE IMPRESIÓN */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          main {
            padding: 0 !important;
            background: white !important;
          }

          main > div > div:first-child,
          main > div > div:nth-child(2),
          button {
            display: none !important;
          }

          #certificado {
            display: block !important;
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
    </main>
  );
}

function Info({
  titulo,
  valor,
}: {
  titulo: string;
  valor: any;
}) {
  return (
    <div
      style={{
        borderBottom: "1px solid #e5dccb",
        paddingBottom: "10px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          letterSpacing: "1.5px",
          color: "#9a8150",
          marginBottom: "5px",
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          color: "#444",
          fontSize: "15px",
        }}
      >
        {valor || "—"}
      </div>
    </div>
  );
}