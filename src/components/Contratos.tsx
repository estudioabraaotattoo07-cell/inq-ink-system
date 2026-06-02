import { useState } from "react";
import { makeContractArtist, makeContractClient } from "../lib/helpers";
import type { Artista } from "../lib/types";

interface ContratosPageProps {
  artists: Artista[];
  studioName: string;
  onVerContrato: (opts: ContratoOpts) => void;
}

export interface ContratoOpts {
  type: "artist" | "client";
  a?: Artista;
  nome?: string;
  artista?: string;
  proj?: string;
  valor?: string;
}

// ── MODAL DO CONTRATO ────────────────────────────────────────────────────────
interface ContratoModalProps {
  opts: ContratoOpts;
  studioName: string;
  onClose: () => void;
}

export function ContratoModal({ opts, studioName, onClose }: ContratoModalProps) {
  const [editing, setEditing] = useState(false);
  const textoBase = opts.type === "artist"
    ? makeContractArtist(studioName)
    : makeContractClient(studioName, opts.nome || "", opts.artista || "", opts.proj || "", opts.valor || "");

  const [texto, setTexto] = useState(textoBase);

  const copiar = () => {
    navigator.clipboard.writeText(texto);
  };

  const enviarWhatsApp = () => {
    const tel = opts.type === "artist" ? opts.a?.tel?.replace(/\D/g, "") : "";
    const url = tel
      ? `https://wa.me/55${tel}?text=${encodeURIComponent(texto)}`
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fov" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fmod" style={{ maxWidth: 680, maxHeight: "88vh", display: "flex", flexDirection: "column" }}>
        <div className="fmh">
          <div>
            <div className="fmt">
              {opts.type === "artist" ? "📄 Contrato de Artista" : "✍️ Confirmação de Projeto"}
            </div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
              {opts.type === "artist" ? "Clique em Editar para personalizar antes de enviar" : "Enviada via WhatsApp após aprovação do projeto"}
            </div>
          </div>
          <button className="mc" onClick={onClose}>✕</button>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "14px 18px", position: "relative" }}>
          {/* Botão copiar discreto */}
          <button onClick={copiar}
            title="Copiar texto"
            style={{
              position: "absolute", top: 18, right: 22,
              background: "var(--dk4)", border: "1px solid var(--br)",
              borderRadius: 5, padding: "3px 8px", fontSize: 11,
              color: "var(--tx2)", cursor: "pointer"
            }}>
            📋
          </button>

          {editing ? (
            <textarea value={texto} onChange={e => setTexto(e.target.value)}
              style={{
                width: "100%", minHeight: 420,
                background: "var(--dk3)", border: "1px solid var(--gold)",
                borderRadius: 7, padding: 13, fontSize: 12,
                color: "var(--tx)", fontFamily: "'DM Sans',sans-serif",
                lineHeight: 1.8, outline: "none", resize: "vertical"
              }} />
          ) : (
            <div style={{
              background: "var(--dk3)", border: "1px solid var(--br)",
              borderRadius: 7, padding: 13, fontSize: 12,
              color: "var(--tx)", lineHeight: 1.8,
              whiteSpace: "pre-wrap", minHeight: 420
            }}>
              {texto}
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--tx3)", marginTop: 8, fontStyle: "italic" }}>
            {editing ? "✏️ Editando — as alterações ficam salvas enquanto o modal estiver aberto." : "💡 Clique em Editar para personalizar o contrato."}
          </div>
        </div>

        <div className="fmf" style={{ justifyContent: "space-between" }}>
          <button className="btn-c" onClick={onClose}>Fechar</button>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn-c"
              style={{ color: editing ? "var(--gold)" : "var(--tx2)" }}
              onClick={() => setEditing(!editing)}>
              {editing ? "💾 Salvar edição" : "✏️ Editar"}
            </button>
            <button className="btn-s" onClick={enviarWhatsApp}>
              Enviar via WhatsApp →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ABA CONTRATOS ────────────────────────────────────────────────────────────
export default function ContratosPage({ artists, studioName, onVerContrato }: ContratosPageProps) {
  return (
    <div className="contratos-w">
      {/* ── CONTRATO DE ARTISTA ── */}
      <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ padding: "13px 17px", background: "var(--dk3)", borderBottom: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: "var(--tx)" }}>
              📄 Contrato de Artista
            </div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
              Revisar com advogado antes de usar
            </div>
          </div>
          <div style={{ display: "flex", gap: 7 }}>
            {artists.map(a => (
              <button key={a.id} className="btn-sm gold"
                onClick={() => onVerContrato({ type: "artist", a })}>
                Ver — {a.nome.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.9 }}>
          ✓ Identificação das partes<br />
          ✓ Tipo de vínculo (Residente / Guest)<br />
          ✓ Comissão e forma de repasse<br />
          ✓ Horário e período de trabalho<br />
          ✓ Cláusula LGPD<br />
          ✓ Não captação de clientes (12 meses)<br />
          ✓ Direitos autorais das obras<br />
          ✓ Rescisão e penalidades
        </div>
      </div>

      {/* ── CONFIRMAÇÃO DE PROJETO ── */}
      <div style={{ background: "var(--dk2)", border: "1px solid var(--br)", borderRadius: 9, overflow: "hidden" }}>
        <div style={{ padding: "13px 17px", background: "var(--dk3)", borderBottom: "1px solid var(--br)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 600, color: "var(--tx)" }}>
              ✍️ Confirmação de Projeto — Cliente
            </div>
            <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
              Enviada por WhatsApp após aprovação do projeto
            </div>
          </div>
          <button className="btn-sm gold"
            onClick={() => onVerContrato({ type: "client", nome: "[CLIENTE]", artista: "[ARTISTA]", proj: "[PROJETO]", valor: "[VALOR]" })}>
            Ver Modelo
          </button>
        </div>
        <div style={{ padding: "14px 18px", fontSize: 12, color: "var(--tx2)", lineHeight: 1.9 }}>
          ✓ Cliente, artista e data<br />
          ✓ Descrição do projeto aprovado<br />
          ✓ Valor acordado<br />
          ✓ Autorização de uso de imagem<br />
          ✓ Garantia de retoque — 30 dias<br />
          ✓ Confirmação: cliente responde "CONFIRMO"
        </div>
      </div>
    </div>
  );
}
