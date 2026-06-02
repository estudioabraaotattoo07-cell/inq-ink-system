import { useState } from "react";
import { dbInsert, dbDelete, dbUpsert } from "../lib/supabase";
import { STAGES, QC, PV_FLOW, maskTel } from "../lib/helpers";
import type { Cliente, Artista, Evento } from "../lib/types";
import type { ContratoOpts } from "./Contratos";

interface ClientesProps {
  clients: Cliente[];
  setClients: React.Dispatch<React.SetStateAction<Cliente[]>>;
  artists: Artista[];
  agEvents: Evento[];
  setAgEvents: React.Dispatch<React.SetStateAction<Evento[]>>;
  tab: string;
  srch: string;
  fa: string;
  sel: Cliente | null;
  setSel: (c: Cliente | null) => void;
  onContrato: (opts: ContratoOpts) => void;
  aName: (id: string) => string;
  aStyle: (id: string) => React.CSSProperties;
  aClass: (id: string) => string;
  studioName: string;
}

// ── ESTILOS DE ETAPA ────────────────────────────────────────────────────────
const EBS: Record<string, any> = {
  lead: { bg: "rgba(91,141,239,.15)", color: "#5B8DEF", b: "rgba(91,141,239,.3)" },
  qualificacao: { bg: "rgba(201,168,76,.15)", color: "#C9A84C", b: "rgba(201,168,76,.3)" },
  cons_agendada: { bg: "rgba(155,107,181,.15)", color: "#9B6BB5", b: "rgba(155,107,181,.3)" },
  sessao_agend: { bg: "rgba(74,158,191,.15)", color: "#4A9EBF", b: "rgba(74,158,191,.3)" },
  tatuado: { bg: "rgba(39,174,96,.15)", color: "#27AE60", b: "rgba(39,174,96,.3)" },
  pos_venda: { bg: "rgba(230,126,34,.15)", color: "#E67E22", b: "rgba(230,126,34,.3)" },
  lista_espera: { bg: "rgba(52,152,219,.15)", color: "#3498DB", b: "rgba(52,152,219,.3)" },
  hibernacao: { bg: "rgba(102,102,102,.15)", color: "#888", b: "rgba(102,102,102,.3)" },
  blacklist: { bg: "rgba(192,57,43,.15)", color: "#C0392B", b: "rgba(192,57,43,.3)" }
};

function miss(c: Cliente) {
  const m: string[] = [];
  if (!c.email) m.push("Email");
  if (!c.insta) m.push("Instagram");
  return m;
}

function churn(c: Cliente) {
  if (c.etapa !== "tatuado" && c.etapa !== "pos_venda") return null;
  if (c.dias >= 365) return "red";
  if (c.dias >= 180) return "orange";
  return null;
}

// ── FORM NOVO CLIENTE ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  nome: "", tel: "", email: "", insta: "", artista: "abraao",
  estilo: "", regiao: "", tam: "Medio", desc: "",
  orig: "Instagram Orgânico", qual: "Q2",
  primeira: false, cob: false, nascimento: ""
};

const EMPTY_AG = { agendar: false, data: "", hora: "09:00", horaFim: "11:00", tipo: "cons" };

export default function Clientes({
  clients, setClients, artists, agEvents, setAgEvents,
  tab, srch, fa, sel, setSel, onContrato,
  aName, aStyle, aClass, studioName
}: ClientesProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formAg, setFormAg] = useState(EMPTY_AG);

  // ── CLIENTE SELECIONADO ──────────────────────────────────────────────────
  const sc = sel ? clients.find(c => c.id === sel.id) || null : null;

  // ── FILTRO ───────────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const mA = fa === "todos" || c.artista === fa;
    const mS = !srch ||
      c.nome.toLowerCase().includes(srch.toLowerCase()) ||
      (c.tel || "").includes(srch) ||
      (c.email || "").toLowerCase().includes(srch.toLowerCase()) ||
      (c.estilo || "").toLowerCase().includes(srch.toLowerCase()) ||
      (c.regiao || "").toLowerCase().includes(srch.toLowerCase()) ||
      (c.insta || "").toLowerCase().includes(srch.toLowerCase()) ||
      (c.orig || "").toLowerCase().includes(srch.toLowerCase());
    return mA && mS;
  });

  // ── SALVAR CLIENTE NO SUPABASE ────────────────────────────────────────────
  const saveClientDb = async (c: Cliente) => {
    const isLocalId = typeof c.id === "number";
    const row: any = {
      nome: c.nome, insta: c.insta || "", tel: c.tel || "",
      qual: c.qual, artista: c.artista, etapa: c.etapa,
      estilo: c.estilo || "", regiao: c.regiao || "",
      primeira: c.primeira || false, cob: c.cob || false,
      descricao: c.desc || "", stars: c.stars || 0,
      star_reason: c.starReason || "", consent: c.consent,
      nps: c.nps, obs: c.obs || "",
      val_a: c.val_a || 0, val_c: c.val_c || 0, pgto: c.pgto || "",
      orcamento: c.orcamento || false, contrato: c.contrato || false,
      faltas: c.faltas || 0, indicacoes: c.indicacoes || 0,
      credito: c.credito || 0, cri: c.cri || "",
      hist: c.hist || [], followups: c.pv || [],
      updated_at: new Date().toISOString()
    };
    if (!isLocalId) row.id = c.id;
    await dbUpsert("clientes", row);
  };

  // ── ATUALIZAR CAMPO ───────────────────────────────────────────────────────
  const upC = (cid: any, f: string, v: any) => {
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : { ...c, [f]: v });
      const c = updated.find(c => c.id === cid);
      if (c) setTimeout(() => saveClientDb(c), 100);
      return updated;
    });
  };

  // ── MOVER PIPELINE ────────────────────────────────────────────────────────
  const move = (cid: any, ns: string) => {
    const lbl = STAGES.find(s => s.id === ns)?.label || ns;
    const orq = ns === "sessao_agend";
    const tatuado = ns === "tatuado";
    const pvFlow = tatuado ? PV_FLOW.map(p => ({ l: p.label, s: "pending" as const })) : undefined;
    setClients(p => {
      const updated = p.map(c => c.id !== cid ? c : {
        ...c, etapa: ns, orcamento: orq,
        pv: tatuado ? (pvFlow || []) : c.pv,
        hist: [
          ...c.hist,
          { t: "Movido para: " + lbl, d: new Date().toLocaleString("pt-BR") },
          ...(orq ? [{ t: "Orçamento pendente de registro", d: new Date().toLocaleString("pt-BR") }] : []),
          ...(tatuado ? [{ t: "Fluxo de pós-venda iniciado automaticamente", d: new Date().toLocaleString("pt-BR") }] : []),
        ]
      });
      const c = updated.find(c => c.id === cid);
      if (c) setTimeout(() => saveClientDb(c), 100);
      return updated;
    });
  };

  // ── FALTAS ────────────────────────────────────────────────────────────────
  const registrarFalta = (cid: any, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novasFaltas = (c.faltas || 0) + 1;
      const novoEtapa = novasFaltas >= 3 ? "blacklist" : c.etapa;
      const msg = novasFaltas === 1 ? "Falta registrada — taxa de R$100 notificada"
        : novasFaltas === 2 ? "2ª falta — cobrança de 30% notificada"
          : "3ª falta — cliente movido para Blacklist";
      const audit = msg + " — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      const updated = { ...c, faltas: novasFaltas, etapa: novoEtapa, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
      setTimeout(() => saveClientDb(updated), 100);
      return updated;
    }));
  };

  const removerFalta = (cid: any, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novasFaltas = Math.max((c.faltas || 0) - 1, 0);
      const novoEtapa = c.etapa === "blacklist" && (c.faltas || 0) <= 3 ? "qualificacao" : c.etapa;
      const audit = "Falta removida (correção) — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      const updated = { ...c, faltas: novasFaltas, etapa: novoEtapa, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
      setTimeout(() => saveClientDb(updated), 100);
      return updated;
    }));
  };

  const removerBlacklist = (cid: any, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const audit = "Removido da Blacklist — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      const updated = { ...c, etapa: "qualificacao", hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
      setTimeout(() => saveClientDb(updated), 100);
      return updated;
    }));
  };

  // ── INDICAÇÕES ────────────────────────────────────────────────────────────
  const registrarIndicacao = (cid: any, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = (c.indicacoes || 0) + 1;
      const cred = novas >= 8 ? (c.credito || 0) + 500 : c.credito || 0;
      const audit = "Indicação registrada " + novas + "/8 — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      const updated = { ...c, indicacoes: novas, credito: cred, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
      setTimeout(() => saveClientDb(updated), 100);
      return updated;
    }));
  };

  const removerIndicacao = (cid: any, artista: string) => {
    setClients(p => p.map(c => {
      if (c.id !== cid) return c;
      const novas = Math.max((c.indicacoes || 0) - 1, 0);
      const audit = "Indicação removida — " + new Date().toLocaleDateString("pt-BR") + " — por " + artista;
      const updated = { ...c, indicacoes: novas, hist: [...c.hist, { t: audit, d: new Date().toLocaleString("pt-BR") }] };
      setTimeout(() => saveClientDb(updated), 100);
      return updated;
    }));
  };

  // ── STARS ─────────────────────────────────────────────────────────────────
  const STAR_REASONS = ["", "Muito difícil", "Comunicação difícil", "Normal", "Boa experiência", "Excelente"];
  const setStars = (cid: any, n: number) => {
    upC(cid, "stars", n);
    upC(cid, "starReason", STAR_REASONS[n] || "");
  };

  // ── EXCLUIR CLIENTE ───────────────────────────────────────────────────────
  const deleteClient = async (cid: any) => {
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.")) return;
    setClients(p => p.filter(c => c.id !== cid));
    setSel(null);
    await dbDelete("clientes", cid);
  };

  // ── SALVAR NOVO CLIENTE ───────────────────────────────────────────────────
  const saveClient = async () => {
    if (!form.nome || !form.tel) return;
    const nc: any = {
      nome: form.nome, tel: form.tel, email: form.email,
      insta: form.insta, artista: form.artista, estilo: form.estilo,
      regiao: form.regiao, tam: form.tam, desc: form.desc,
      orig: form.orig, qual: form.qual,
      primeira: form.primeira, cob: form.cob,
      etapa: "lead", data: new Date().toLocaleDateString("pt-BR"),
      dias: 0, stars: 0, starReason: "", consent: null, nps: null,
      obs: "", val_a: 0, val_c: 0, pgto: "", orcamento: false, contrato: false,
      faltas: 0, indicacoes: 0, credito: 0, cri: "",
      hist: [{ t: "Cadastro manual criado", d: new Date().toLocaleString("pt-BR") }],
      pv: [], nascimento: form.nascimento
    };

    const row = {
      nome: nc.nome, insta: nc.insta, tel: nc.tel, qual: nc.qual,
      artista: nc.artista, etapa: nc.etapa, estilo: nc.estilo,
      regiao: nc.regiao, primeira: nc.primeira, cob: nc.cob,
      descricao: nc.desc, orig: nc.orig,
      hist: nc.hist, followups: nc.pv,
      updated_at: new Date().toISOString()
    };

    const saved = await dbInsert("clientes", row);
    const newClient = { ...nc, id: saved?.id || Date.now() };
    setClients(p => [...p, newClient]);

    // Agendar se marcado
    if (formAg.agendar && formAg.data) {
      const startH = parseInt(formAg.hora.split(":")[0]);
      const endH = formAg.horaFim ? parseInt(formAg.horaFim.split(":")[0]) : startH + 2;
      const agRow = {
        titulo: nc.nome, cliente_id: saved?.id,
        cliente_nome: nc.nome, artista: nc.artista,
        data: formAg.data, hora: formAg.hora,
        tipo: formAg.tipo === "cons" ? "cons_" + nc.artista : "sess_" + nc.artista
      };
      const savedAg = await dbInsert("agenda", agRow);
      setAgEvents(p => [...p, {
        id: savedAg?.id || Date.now(),
        title: nc.nome,
        tipo: agRow.tipo,
        date: formAg.data,
        start: startH, end: endH
      }]);
    }

    setShowForm(false);
    setForm(EMPTY_FORM);
    setFormAg(EMPTY_AG);
  };

  // ── TABELA DE CLIENTES ────────────────────────────────────────────────────
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const sorted = [...filtered].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const usedLetters = new Set(sorted.map(c => c.nome[0]?.toUpperCase()));

  return (
    <>
      {/* ── BOTÃO NOVO CLIENTE ── */}
      {tab !== "clientes" ? null : (
        <div style={{ display: "none" }} /> // Botão fica na topbar do CRM principal
      )}

      {/* ── TABELA ── */}
      {tab === "clientes" && (
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <div className="cw" style={{ flex: 1 }}>
            {sorted.length === 0
              ? <div className="empty">Nenhum cliente encontrado.</div>
              : (
                <table className="ctbl">
                  <thead>
                    <tr>
                      <th>Cliente</th><th>Contato</th><th>Projeto</th>
                      <th>Artista</th><th>Q</th><th>Etapa</th>
                      <th>Alertas</th><th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(c => {
                      const es = EBS[c.etapa] || EBS.lead;
                      const m = miss(c);
                      const ch = churn(c);
                      return (
                        <tr key={c.id} data-letter={c.nome[0]?.toUpperCase()} onClick={() => setSel(c)}>
                          <td>
                            <div className="tdn">{c.nome}</div>
                            <div className="tdd">{c.insta || <span style={{ color: "var(--q2)" }}>⚠ Instagram</span>}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12 }}>{maskTel(c.tel || "")}</div>
                            <div className="tdd">{c.email || <span style={{ color: "var(--q2)" }}>⚠ Email</span>}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: 12 }}>{c.estilo || "—"}</div>
                            <div className="tdd">{c.regiao ? c.regiao + (c.tam ? " · " + c.tam : "") : ""}</div>
                          </td>
                          <td><span className={("at " + aClass(c.artista)) || ""} style={aStyle(c.artista)}>{aName(c.artista).split(" ")[0]}</span></td>
                          <td><span className={"qb " + QC[c.qual]}>{c.qual}</span></td>
                          <td>
                            <span className="eb" style={{ background: es.bg, color: es.color, border: "1px solid " + es.b }}>
                              {STAGES.find(s => s.id === c.etapa)?.emoji} {STAGES.find(s => s.id === c.etapa)?.label}
                            </span>
                          </td>
                          <td>
                            {m.length === 0 && !ch && !c.orcamento
                              ? <span style={{ color: "var(--q3)", fontSize: 11 }}>OK</span>
                              : <div style={{ display: "flex", gap: 3 }}>
                                {m.map(x => <span key={x} className="atag">⚠</span>)}
                                {ch === "orange" && <span className="co co-o">🟠</span>}
                                {ch === "red" && <span className="co co-r">🔴</span>}
                                {c.orcamento && <span className="atag">💰</span>}
                              </div>
                            }
                          </td>
                          <td><div className="tdd">{c.orig}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
          {/* Índice alfabético */}
          <div style={{ width: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 0", background: "var(--dk2)", borderLeft: "1px solid var(--br)", gap: 1 }}>
            {letters.map(l => (
              <button key={l} onClick={() => {
                const rows = document.querySelectorAll("[data-letter]");
                rows.forEach((r: any) => { if (r.dataset.letter === l) r.scrollIntoView({ behavior: "smooth", block: "start" }); });
              }} style={{ fontSize: 9, fontWeight: 600, color: usedLetters.has(l) ? "var(--gold)" : "var(--tx3)", background: "none", border: "none", cursor: usedLetters.has(l) ? "pointer" : "default", padding: "1px 0", fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL FICHA DO CLIENTE ── */}
      {sc && (
        <div className="ov" onClick={e => { if (e.target === e.currentTarget) setSel(null); }}>
          <div className="modal">
            <div className="mh">
              <div>
                <div className="mn">{sc.nome}</div>
                <div className="ms">
                  <span className={"qb " + QC[sc.qual]}>{sc.qual}{sc.qual === "Q0" ? " — Acompanhante" : ""}</span>
                  <span className={("at " + aClass(sc.artista)) || ""} style={aStyle(sc.artista)}>{aName(sc.artista).split(" ")[0]}</span>
                  {sc.etapa === "blacklist" && <span className="tag-bl">🚫</span>}
                  {sc.etapa === "lista_espera" && <span className="tag-wl">⏳</span>}
                  <span style={{ color: "var(--tx3)", fontSize: 11 }}>Entrou em {sc.data}</span>
                  {miss(sc).map((m: string) => <span key={m} className="atag">⚠ Sem {m}</span>)}
                </div>
              </div>
              <button onClick={() => deleteClient(sc.id)} style={{ background: "rgba(192,57,43,.15)", border: "1px solid rgba(192,57,43,.3)", borderRadius: 6, padding: "4px 10px", fontSize: 11, color: "var(--q1)", cursor: "pointer", marginRight: 4 }}>🗑 Excluir</button>
              <button className="mc" onClick={() => setSel(null)}>✕</button>
            </div>
            <div className="mb">
              {/* Alerta orçamento */}
              {sc.orcamento && (
                <div className="ba">
                  <span style={{ fontSize: 18 }}>💰</span>
                  <div style={{ flex: 1, fontSize: 12, color: "var(--q2)", fontWeight: 600 }}>Orçamento pendente — registre o valor combinado nesta consultoria.</div>
                  <button className="btn-sm gold" onClick={() => {
                    const v = prompt("Valor combinado (ex: 1200):");
                    if (v) {
                      upC(sc.id, "val_a", Number(v));
                      upC(sc.id, "orcamento", false);
                      setClients(p => p.map(c => c.id !== sc.id ? c : {
                        ...c, hist: [...c.hist, { t: "Orçamento: R$ " + Number(v).toLocaleString("pt-BR"), d: new Date().toLocaleString("pt-BR") }]
                      }));
                    }
                  }}>Registrar</button>
                </div>
              )}

              {/* Dados Básicos */}
              <div>
                <div className="stit">Dados Básicos</div>
                <div className="fg2">
                  {[
                    { l: "Nome", f: "nome" }, { l: "Telefone", f: "tel" },
                    { l: "Email", f: "email", w: !sc.email }, { l: "Instagram", f: "insta", w: !sc.insta }
                  ].map((fd, i) => (
                    <div className="fi2" key={i}>
                      <div className="fil">{fd.l}{(fd as any).w ? " ⚠" : ""}</div>
                      <input className="ef"
                        value={fd.f === "tel" ? maskTel((sc as any)[fd.f] || "") : (sc as any)[fd.f] || ""}
                        placeholder={(fd as any).w ? "Clique para adicionar" : ""}
                        onChange={e => {
                          if (fd.f === "tel") upC(sc.id, fd.f, maskTel(e.target.value));
                          else if (fd.f === "insta") { const v = e.target.value; upC(sc.id, fd.f, v && !v.startsWith("@") ? "@" + v : v); }
                          else upC(sc.id, fd.f, e.target.value);
                        }}
                        style={{ borderColor: (fd as any).w && !(sc as any)[fd.f] ? "var(--q2)" : "var(--br)" }} />
                    </div>
                  ))}
                  {[
                    { l: "Origem", v: sc.orig },
                    { l: "Criativo", v: sc.cri },
                    { l: "Data de Nascimento", v: (sc as any).nascimento || "" }
                  ].map((fd, i) => (
                    <div className="fi2" key={i}>
                      <div className="fil">{fd.l}</div>
                      <div className="fiv">{fd.v || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projeto Artístico */}
              <div>
                <div className="stit">Projeto Artístico</div>
                <div className="fg3">
                  {[
                    { l: "Estilo", v: sc.estilo }, { l: "Região", v: sc.regiao }, { l: "Tamanho", v: sc.tam },
                    { l: "Cobertura", v: sc.cob ? "Sim" : "Não" }, { l: "1ª Tattoo", v: sc.primeira ? "Sim" : "Não" },
                  ].map((fd, i) => (
                    <div className="fi2" key={i}>
                      <div className="fil">{fd.l}</div>
                      <div className={"fiv" + (!fd.v ? " em" : "")}>{fd.v || "—"}</div>
                    </div>
                  ))}
                </div>
                <div className="fi2" style={{ marginTop: 7 }}>
                  <div className="fil">Descrição do Projeto</div>
                  <div className="fiv">{sc.desc}</div>
                </div>
              </div>

              {/* Avaliações */}
              <div>
                <div className="stit">Avaliações Internas</div>
                <div className="fg2">
                  <div className="fi2">
                    <div className="fil">Avaliação do Cliente pelo Artista</div>
                    <div className="stars" style={{ marginTop: 4 }}>
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} className="star" style={{ opacity: n <= (sc.stars || 0) ? 1 : .25 }} onClick={() => setStars(sc.id, n)}>⭐</span>
                      ))}
                    </div>
                    {sc.starReason && <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 3, fontStyle: "italic" }}>{sc.starReason}</div>}
                  </div>
                  <div className="fi2">
                    <div className="fil">NPS do Cliente (0 — 10)</div>
                    {sc.nps != null
                      ? <div style={{ fontSize: 20, fontWeight: 700, color: "var(--gold)", fontFamily: "'Cormorant Garamond',serif", marginTop: 3 }}>{sc.nps}/10</div>
                      : <div className="nps-bar">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <button key={n} className={"nps-btn" + (sc.nps === n ? " sel" : "")} onClick={() => upC(sc.id, "nps", n)}>{n}</button>
                        ))}
                      </div>
                    }
                  </div>
                </div>
                <div className="fi2" style={{ marginTop: 7 }}>
                  <div className="fil">Consentimento de Uso de Imagem</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                    <button className={"cb" + (sc.consent === true ? " yes" : "")} onClick={() => upC(sc.id, "consent", true)}>✓ Autorizado</button>
                    <button className={"cb" + (sc.consent === false ? " no" : "")} onClick={() => upC(sc.id, "consent", false)}>✕ Não autorizado</button>
                    {sc.consent === null && <span style={{ fontSize: 11, color: "var(--tx3)", alignSelf: "center" }}>Não informado</span>}
                  </div>
                </div>
                <div className="fi2" style={{ marginTop: 7 }}>
                  <div className="fil">Observações Internas</div>
                  <textarea value={sc.obs} onChange={e => upC(sc.id, "obs", e.target.value)}
                    style={{ width: "100%", minHeight: 50, background: "var(--dk4)", border: "1px solid var(--br)", borderRadius: 5, padding: "6px 8px", fontSize: 11, color: "var(--tx)", fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "vertical", marginTop: 3 }}
                    placeholder="Anotações privadas..." />
                </div>
              </div>

              {/* Fotos de Referência */}
              <div>
                <div className="stit">Fotos de Referência</div>
                <div style={{ background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7, padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: "var(--tx2)", marginBottom: 6 }}>Fotos enviadas pelo cliente via Aura.</div>
                  <div style={{ background: "var(--dk4)", border: "1px dashed var(--br)", borderRadius: 6, padding: 18, textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>Integração com armazenamento em breve.</div>
                    <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 4, fontStyle: "italic" }}>A Aura aceita somente fotos. Vídeos não são aceitos.</div>
                  </div>
                </div>
              </div>

              {/* Financeiro */}
              {sc.val_a > 0 && (
                <div>
                  <div className="stit">Financeiro da Sessão</div>
                  <div className="fg3">
                    <div className="fi2">
                      <div className="fil">Valor via Aura (não editável)</div>
                      <div className="fiv">{sc.val_c > 0 ? "R$ " + sc.val_c.toLocaleString("pt-BR") + " · " + (sc.pgto || "—") : "Não coletado"}</div>
                    </div>
                    <div className="fi2">
                      <div className="fil">Valor Registrado</div>
                      <input className="ef" type="number" defaultValue={sc.val_a} onBlur={e => upC(sc.id, "val_a", Number(e.target.value))} style={{ marginTop: 2 }} />
                    </div>
                    <div className="fi2">
                      <div className="fil">Forma de Pagamento</div>
                      <select className="ef" value={sc.pgto || ""} onChange={e => upC(sc.id, "pgto", e.target.value)} style={{ marginTop: 2 }}>
                        <option value="">Selecionar</option>
                        <option>Pix</option><option>Cartão</option><option>Dinheiro</option><option>Transferência</option>
                      </select>
                    </div>
                    {sc.pgto === "Cartão" && (
                      <div className="fi2">
                        <div className="fil">Parcelamento</div>
                        <select className="ef" value={(sc as any).parcelas || "1x"} onChange={e => upC(sc.id, "parcelas", e.target.value)} style={{ marginTop: 2 }}>
                          {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                            <option key={n} value={n + "x"}>
                              {n}x {n > 1 ? "de R$ " + (sc.val_a / n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                            </option>
                          ))}
                        </select>
                        {(sc as any).parcelas && (sc as any).parcelas !== "1x" && (
                          <div style={{ fontSize: 11, color: "var(--gold)", marginTop: 4, fontWeight: 600 }}>
                            {(sc as any).parcelas} de R$ {(sc.val_a / parseInt((sc as any).parcelas)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {sc.val_a !== sc.val_c && sc.val_c > 0 && (
                    <div style={{ background: "rgba(192,57,43,.1)", border: "1px solid rgba(192,57,43,.25)", borderRadius: 5, padding: "7px 10px", marginTop: 7, fontSize: 12, color: "var(--q1)", fontWeight: 600 }}>
                      ⚠ Divergência — verificar com o artista
                    </div>
                  )}
                </div>
              )}

              {/* Contrato */}
              <div>
                <div className="stit">Confirmação de Projeto</div>
                <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 7 }}>
                  <div style={{ fontSize: 12, color: "var(--tx)", flex: 1 }}>
                    Contrato: <strong style={{ color: sc.contrato ? "var(--q3)" : "var(--q2)" }}>{sc.contrato ? "✓ Enviado" : "Não enviado"}</strong>
                  </div>
                  <button className="btn-sm gold" onClick={() => onContrato({ type: "client", nome: sc.nome, artista: aName(sc.artista), proj: sc.desc, valor: sc.val_a > 0 ? "R$ " + sc.val_a.toLocaleString("pt-BR") : "A definir" })}>
                    Ver / Enviar
                  </button>
                </div>
              </div>

              {/* Faltas */}
              <div>
                <div className="stit">Faltas e Ocorrências</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>Faltas registradas: {sc.faltas || 0}/3</div>
                    <div style={{ fontSize: 11, color: "var(--tx2)", marginTop: 2 }}>
                      {(sc.faltas || 0) === 0 ? "Nenhuma falta registrada" : (sc.faltas || 0) === 1 ? "1ª falta — R$100 cobrado" : "2ª falta — 30% cobrado"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(sc.faltas || 0) > 0 && <button className="btn-sm" onClick={() => removerFalta(sc.id, aName(sc.artista))}>− Remover</button>}
                    {(sc.faltas || 0) < 3 && <button className="btn-sm red" onClick={() => registrarFalta(sc.id, aName(sc.artista))}>+ Falta</button>}
                  </div>
                </div>
                {sc.etapa === "blacklist" && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "rgba(192,57,43,.08)", border: "1px solid rgba(192,57,43,.2)", borderRadius: 6 }}>
                    <span className="tag-bl">🚫 BLACKLIST</span>
                    <button className="btn-sm" onClick={() => removerBlacklist(sc.id, aName(sc.artista))}>Remover da Blacklist</button>
                  </div>
                )}
              </div>

              {/* Fidelidade */}
              <div>
                <div className="stit">Programa de Fidelidade</div>
                <div style={{ padding: "12px 14px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, color: "var(--tx)", fontWeight: 600 }}>Indicações: {sc.indicacoes || 0}/8</div>
                    {(sc.credito || 0) > 0 && <div style={{ fontSize: 13, color: "var(--gold)", fontWeight: 700 }}>Crédito: R$ {(sc.credito || 0).toLocaleString("pt-BR")}</div>}
                  </div>
                  <div style={{ width: "100%", background: "var(--dk4)", borderRadius: 4, height: 8, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", borderRadius: 4, background: "var(--gold)", width: Math.min((sc.indicacoes || 0) / 8 * 100, 100) + "%", transition: "width .4s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--tx2)" }}>
                      {(sc.indicacoes || 0) >= 8 ? "Meta atingida! Crédito disponível." : "Faltam " + (8 - (sc.indicacoes || 0)) + " indicações para o crédito"}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {(sc.indicacoes || 0) > 0 && <button className="btn-sm" onClick={() => removerIndicacao(sc.id, aName(sc.artista))}>− Remover</button>}
                      {(sc.indicacoes || 0) < 8 && <button className="btn-sm gold" onClick={() => registrarIndicacao(sc.id, aName(sc.artista))}>+ Indicação</button>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pipeline */}
              <div>
                <div className="stit">Mover no Pipeline</div>
                <div className="pm">
                  {STAGES.map(s => (
                    <button key={s.id} className={"sb" + (sc.etapa === s.id ? " cur" : "")}
                      style={sc.etapa === s.id ? { borderColor: s.color, color: s.color, background: s.color + "18" } : {}}
                      onClick={() => move(sc.id, s.id)}>
                      {s.emoji} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pós-venda */}
              {sc.pv && sc.pv.length > 0 && (
                <div>
                  <div className="stit">Pós-venda</div>
                  {sc.pv.map((p: any, i: number) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", background: "var(--dk3)", border: "1px solid var(--br)", borderRadius: 5, marginBottom: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: p.s === "done" ? "var(--q3)" : p.s === "pending" ? "var(--q2)" : "var(--tx3)", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, color: "var(--tx)" }}>{p.l}</div>
                      <button className="btn-sm" style={{ fontSize: 10 }}
                        onClick={() => {
                          const ns = p.s === "pending" ? "done" : p.s === "done" ? "future" : "pending";
                          setClients(prev => prev.map(c => c.id !== sc.id ? c : {
                            ...c, pv: c.pv.map((x: any, j: number) => j === i ? { ...x, s: ns } : x)
                          }));
                        }}>
                        {p.s === "done" ? "✓ Enviado" : p.s === "pending" ? "⏳ Pendente" : "🔮 Aguardando"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Histórico */}
              <div>
                <div className="stit">Histórico</div>
                {[...sc.hist].reverse().map((h: any, i: number) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--br)" }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--gold)", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, color: "var(--tx)" }}>{h.t}</div>
                      <div style={{ fontSize: 10, color: "var(--tx3)", marginTop: 2 }}>{h.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL NOVO CLIENTE ── */}
      {showForm && (
        <div className="fov" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="fmod">
            <div className="fmh">
              <div className="fmt">Novo Cliente</div>
              <button className="mc" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="fmb">
              <div className="fr">
                <div className="ff"><label className="fl">Nome *</label><input className="fi" placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="ff"><label className="fl">Telefone *</label><input className="fi" placeholder="(99) 9 9999-9999" value={form.tel} onChange={e => setForm({ ...form, tel: maskTel(e.target.value) })} /></div>
              </div>
              <div className="fr">
                <div className="ff"><label className="fl">Email</label><input className="fi" placeholder="email@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="ff"><label className="fl">Instagram</label><input className="fi" placeholder="@perfil" value={form.insta} onChange={e => { const v = e.target.value; setForm({ ...form, insta: v && !v.startsWith("@") ? "@" + v : v }); }} /></div>
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Artista</label>
                  <select className="fs" value={form.artista} onChange={e => setForm({ ...form, artista: e.target.value })}>
                    {artists.filter(a => a.ativo).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Qualificação</label>
                  <select className="fs" value={form.qual} onChange={e => setForm({ ...form, qual: e.target.value })}>
                    <option value="Q0">Q0 — Acompanhante</option>
                    <option value="Q1">Q1 — Frio</option>
                    <option value="Q2">Q2 — Quente</option>
                    <option value="Q3">Q3 — Pronto</option>
                  </select>
                </div>
              </div>
              <div className="fr">
                <div className="ff"><label className="fl">Estilo</label><input className="fi" placeholder="Fine Line, Realismo..." value={form.estilo} onChange={e => setForm({ ...form, estilo: e.target.value })} /></div>
                <div className="ff"><label className="fl">Região</label><input className="fi" placeholder="Antebraço, Costas..." value={form.regiao} onChange={e => setForm({ ...form, regiao: e.target.value })} /></div>
              </div>
              <div className="fr">
                <div className="ff">
                  <label className="fl">Tamanho</label>
                  <select className="fs" value={form.tam} onChange={e => setForm({ ...form, tam: e.target.value })}>
                    <option>Discreto</option><option>Medio</option><option>Grande</option><option>Fechamento</option>
                  </select>
                </div>
                <div className="ff">
                  <label className="fl">Origem</label>
                  <select className="fs" value={form.orig} onChange={e => setForm({ ...form, orig: e.target.value })}>
                    <option>Instagram Orgânico</option><option>Tráfego Pago</option><option>Indicação</option>
                    <option>Google</option><option>Presencial</option><option>Site</option>
                  </select>
                </div>
              </div>
              <div className="ff"><label className="fl">Descrição do Projeto</label><textarea className="fta" placeholder="Descreva a ideia..." value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} /></div>
              <div className="ff"><label className="fl">Data de Nascimento</label><input className="fi" type="date" value={form.nascimento} onChange={e => setForm({ ...form, nascimento: e.target.value })} /></div>

              {/* Agendar */}
              <div style={{ borderTop: "1px solid var(--br)", marginTop: 12, paddingTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" id="chkAg" checked={formAg.agendar} onChange={e => setFormAg(f => ({ ...f, agendar: e.target.checked }))} />
                  <label htmlFor="chkAg" style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", cursor: "pointer" }}>📅 Agendar sessão agora</label>
                </div>
                {formAg.agendar && (
                  <div className="fr">
                    <div className="ff"><label className="fl">Data</label><input className="fi" type="date" value={formAg.data} onChange={e => setFormAg(f => ({ ...f, data: e.target.value }))} /></div>
                    <div className="ff"><label className="fl">Início</label><input className="fi" type="time" value={formAg.hora} onChange={e => setFormAg(f => ({ ...f, hora: e.target.value }))} /></div>
                    <div className="ff"><label className="fl">Término</label><input className="fi" type="time" value={formAg.horaFim} onChange={e => setFormAg(f => ({ ...f, horaFim: e.target.value }))} /></div>
                    <div className="ff">
                      <label className="fl">Tipo</label>
                      <select className="fs" value={formAg.tipo} onChange={e => setFormAg(f => ({ ...f, tipo: e.target.value }))}>
                        <option value="cons">Consultoria</option>
                        <option value="sess">Sessão</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="fmf">
              <button className="btn-c" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-s" onClick={saveClient} disabled={!form.nome || !form.tel}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Expõe o trigger para o botão "Novo Cliente" da topbar */}
      <span id="__openNovoCliente" style={{ display: "none" }} onClick={() => setShowForm(true)} />
    </>
  );
}
