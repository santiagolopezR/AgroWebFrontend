import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Sprout, ClipboardCheck, MapPin, Calendar, User, Repeat } from "lucide-react";

const API_URL = "https://agroweb-vv4b.onrender.com/api";
let uid = 0;
const nextId = () => `p-${++uid}`;

function nuevaFila() {
  return {
    id: nextId(),
    producto: "",
    producto_id: "",
    cantidad: "",
    costoUnitario: "",
    total: "",
    autoField: null,
  };
}

function recalcular(fila, campoEditado, valor) {
  const f = { ...fila, [campoEditado]: valor };
  const num = (v) => (v === "" || v === null || isNaN(v) ? null : parseFloat(v));

  const cantidad = num(f.cantidad);
  const costo = num(f.costoUnitario);
  const total = num(f.total);

  if (campoEditado === "cantidad") {
    if (costo !== null) {
      f.total = +(cantidad * costo).toFixed(2);
      f.autoField = "total";
    } else if (total !== null && cantidad) {
      f.costoUnitario = +(total / cantidad).toFixed(2);
      f.autoField = "costoUnitario";
    }
  } else if (campoEditado === "costoUnitario") {
    if (cantidad !== null) {
      f.total = +(cantidad * costo).toFixed(2);
      f.autoField = "total";
    } else if (total !== null && costo) {
      f.cantidad = +(total / costo).toFixed(2);
      f.autoField = "cantidad";
    }
  } else if (campoEditado === "total") {
    if (cantidad !== null && cantidad !== 0) {
      f.costoUnitario = +(total / cantidad).toFixed(2);
      f.autoField = "costoUnitario";
    } else if (costo !== null && costo !== 0) {
      f.cantidad = +(total / costo).toFixed(2);
      f.autoField = "cantidad";
    }
  }
  return f;
}

function CampoLedger({ label, unidad, value, onChange, isAuto, type = "number", placeholder }) {
  return (
    <div className="relative flex-1 min-w-0">
      <label className="block text-[10px] tracking-widest uppercase font-mono text-[#6B5D45] mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-md border-2 bg-[#FBF9F2] px-2.5 py-2 font-mono text-[15px] text-[#1F3D2B] outline-none transition-colors focus:border-[#1F3D2B] ${isAuto ? "border-[#C77B2C] border-dashed" : "border-[#D8D2BE]"}`}
        />
        {unidad && (
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#9A8C6E]">
            {unidad}
          </span>
        )}
      </div>
      {isAuto && (
        <span className="absolute -top-1.5 right-0 rotate-[-4deg] rounded-sm border border-[#C77B2C] bg-[#FBF3E4] px-1.5 py-[1px] text-[9px] font-bold tracking-wider text-[#C77B2C]">
          AUTO
        </span>
      )}
    </div>
  );
}

export default function RegistroActividad() {
  const [lotes, setLotes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tiposActividad, setTiposActividad] = useState([]);
  const [lotesSeleccionados, setLotesSeleccionados] = useState([]);
  const [tipoId, setTipoId] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [responsable, setResponsable] = useState("Usuario del campo");
  const [observaciones, setObservaciones] = useState("");
  const [filas, setFilas] = useState([nuevaFila()]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardadoOk] = useState(false);
  const lastRecipe = useRef(null);

  // Calcular hectáreas totales
  const hectareasTotales = lotesSeleccionados.reduce((sum, loteId) => {
    const lote = lotes.find(l => l.id === loteId);
    return sum + (lote?.superficie || 0);
  }, 0);

  // Calcular dosis por hectárea
  const calcularDosisPorHectarea = () => {
    if (hectareasTotales === 0) return;
    
    setFilas(prev => prev.map(f => {
      if (f.cantidad && !isNaN(f.cantidad)) {
        const dosisPorHa = parseFloat(f.cantidad) / hectareasTotales;
        return { ...f, cantidad: +dosisPorHa.toFixed(2), autoField: 'cantidad' };
      }
      return f;
    }));
  };

  useEffect(() => {
    const traerDatos = async () => {
      try {
        setCargando(true);

        const [lotesRes, productosRes, tiposRes] = await Promise.all([
          fetch(`${API_URL}/lotes/`),
          fetch(`${API_URL}/productos/`),
          fetch(`${API_URL}/tipos-actividad/`),
        ]);

        if (!lotesRes.ok || !productosRes.ok || !tiposRes.ok) {
          throw new Error("Error al conectar con la API");
        }

        const lotesData = await lotesRes.json();
        const productosData = await productosRes.json();
        const tiposData = await tiposRes.json();

        setLotes(lotesData.results || lotesData);
        setProductos(productosData.results || productosData);
        setTiposActividad(tiposData.results || tiposData);
        setCargando(false);
      } catch (err) {
        setCargando(false);
      }
    };

    traerDatos();
  }, []);

  const toggleLote = (loteId) => {
    setLotesSeleccionados(prev =>
      prev.includes(loteId)
        ? prev.filter(id => id !== loteId)
        : [...prev, loteId]
    );
    setGuardadoOk(false);
  };

  const actualizarFila = (id, campo, valor) => {
    setFilas((prev) => prev.map((f) => (f.id === id ? recalcular(f, campo, valor) : f)));
    setGuardadoOk(false);
  };

  const cambiarProducto = (id, productoId) => {
    const producto = productos.find((p) => p.id === productoId);
    setFilas((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              producto_id: productoId,
              producto: producto?.nombre || "",
              costoUnitario: producto?.precio_actual || "",
              autoField: null,
            }
          : f
      )
    );
    setGuardadoOk(false);
  };

  const agregarFila = () => setFilas((prev) => [...prev, nuevaFila()]);
  const quitarFila = (id) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== id) : prev));
  const totalGeneral = filas.reduce((acc, f) => acc + (parseFloat(f.total) || 0), 0);

  const guardar = async () => {
    try {
      setGuardando(true);

      if (lotesSeleccionados.length === 0 || !tipoId) {
        setGuardando(false);
        return;
      }

      const actividadPayload = {
        lotes: lotesSeleccionados,
        tipo: tipoId,
        fecha,
        responsable,
        observaciones,
      };

      const actividadRes = await fetch(`${API_URL}/actividades/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actividadPayload),
      });

      if (!actividadRes.ok) {
        throw new Error("Error al crear la actividad");
      }

      const actividad = await actividadRes.json();

      // Guardar relación actividad-lotes
      for (const loteId of lotesSeleccionados) {
        const lote = lotes.find(l => l.id === loteId);
        const actividadLotePayload = {
          actividad: actividad.id,
          lote: loteId,
          hectareas: lote?.superficie || 0,
        };

        await fetch(`${API_URL}/actividad-lotes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actividadLotePayload),
        });
      }

      // Guardar productos
      for (const fila of filas) {
        if (fila.producto_id) {
          const productoPayload = {
            actividad: actividad.id,
            producto: fila.producto_id,
            cantidad: parseFloat(fila.cantidad) || 0,
            costo_unitario: parseFloat(fila.costoUnitario) || 0,
            total: parseFloat(fila.total) || 0,
          };

          await fetch(`${API_URL}/actividad-productos/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productoPayload),
          });
        }
      }

      lastRecipe.current = filas;
      setGuardadoOk(true);
      setFilas([nuevaFila()]);
      setLotesSeleccionados([]);
      setObservaciones("");
      setResponsable("Usuario del campo");
      setFecha(new Date().toISOString().slice(0, 10));
      setGuardando(false);
    } catch (err) {
      setGuardando(false);
    }
  };

  const repetirUltima = () => {
    if (!lastRecipe.current) return;
    setFilas(lastRecipe.current.map((f) => ({ ...f, id: nextId() })));
  };

  if (cargando) {
    return (
      <div className="min-h-screen w-full bg-[#F5F2E6] flex items-center justify-center">
        <div className="text-center">
          <Sprout size={32} className="text-[#1F3D2B] mx-auto mb-3" />
          <p className="text-[#6B5D45]">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F5F2E6] flex items-start justify-center py-8 px-3 font-sans">
      <div className="w-full max-w-[520px]">
        <div className="mb-4 flex items-center gap-2 border-b-2 border-[#1F3D2B] pb-3">
          <Sprout size={22} className="text-[#1F3D2B]" strokeWidth={2.2} />
          <h1 className="font-display text-xl font-bold text-[#1F3D2B] tracking-tight">Registro de actividad</h1>
        </div>

        {/* Selección de lotes */}
        <div className="rounded-lg border-2 border-[#1F3D2B] bg-[#FBF9F2] p-4 shadow-[3px_3px_0_#1F3D2B] mb-4">
          <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-2">
            <MapPin size={11} /> Lotes (multiselect)
          </label>
          <div className="space-y-2">
            {lotes.map((lote) => (
              <div key={lote.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`lote-${lote.id}`}
                  checked={lotesSeleccionados.includes(lote.id)}
                  onChange={() => toggleLote(lote.id)}
                  className="w-4 h-4 rounded border-2 border-[#D8D2BE] accent-[#1F3D2B]"
                />
                <label htmlFor={`lote-${lote.id}`} className="text-sm text-[#1F3D2B] cursor-pointer flex-1">
                  {lote.nombre} ({lote.superficie}ha)
                </label>
              </div>
            ))}
          </div>
          {hectareasTotales > 0 && (
            <div className="mt-3 p-2 bg-[#EFEBDB] rounded text-sm font-mono text-[#1F3D2B]">
              Total: {hectareasTotales}ha
            </div>
          )}
        </div>

        <div className="rounded-lg border-2 border-[#1F3D2B] bg-[#FBF9F2] p-4 shadow-[3px_3px_0_#1F3D2B]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-1">Tipo de actividad</label>
              <select value={tipoId} onChange={(e) => setTipoId(e.target.value)} className="w-full rounded-md border-2 border-[#D8D2BE] bg-white px-2.5 py-2 text-sm font-medium text-[#1F3D2B] outline-none focus:border-[#1F3D2B]">
                <option value="">Seleccionar tipo…</option>
                {tiposActividad.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-1">
                <Calendar size={11} /> Fecha
              </label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full rounded-md border-2 border-[#D8D2BE] bg-white px-2.5 py-2 text-sm font-medium text-[#1F3D2B] outline-none focus:border-[#1F3D2B]" />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-1">
                <User size={11} /> Responsable
              </label>
              <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full rounded-md border-2 border-[#D8D2BE] bg-white px-2.5 py-2 text-sm text-[#6B5D45] outline-none focus:border-[#1F3D2B]" />
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border-2 border-[#1F3D2B] bg-[#FBF9F2] p-4 shadow-[3px_3px_0_#1F3D2B]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-[#1F3D2B]">Productos aplicados</h2>
            {lastRecipe.current && (
              <button onClick={repetirUltima} className="flex items-center gap-1 text-xs font-medium text-[#C77B2C] hover:underline">
                <Repeat size={13} /> Repetir última
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filas.map((f, i) => (
              <div key={f.id} className="rounded-md border border-[#D8D2BE] bg-white/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#9A8C6E]">Producto {i + 1}</span>
                  <button onClick={() => quitarFila(f.id)} className="text-[#9A6A4A] hover:text-[#C0402A] transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>

                <label className="block text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-1">Producto</label>
                <select value={f.producto_id} onChange={(e) => cambiarProducto(f.id, parseInt(e.target.value))} className="mb-2 w-full rounded-md border-2 border-[#D8D2BE] bg-white px-2.5 py-2 text-sm font-medium text-[#1F3D2B] outline-none focus:border-[#1F3D2B]">
                  <option value="">Seleccionar…</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} (${p.precio_actual})</option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <CampoLedger label="Cantidad" unidad={hectareasTotales > 0 ? "L/ha" : "L"} value={f.cantidad} isAuto={f.autoField === "cantidad"} onChange={(v) => actualizarFila(f.id, "cantidad", v)} />
                  <CampoLedger label="Costo unit." unidad="$" value={f.costoUnitario} isAuto={f.autoField === "costoUnitario"} onChange={(v) => actualizarFila(f.id, "costoUnitario", v)} />
                  <CampoLedger label="Total" unidad="$" value={f.total} isAuto={f.autoField === "total"} onChange={(v) => actualizarFila(f.id, "total", v)} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={agregarFila} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[#1F3D2B] py-2 text-sm font-semibold text-[#1F3D2B] hover:bg-[#EFEBDB] transition-colors">
            <Plus size={16} /> Agregar producto
          </button>

          <div className="mt-4 flex items-center justify-between border-t-4 border-double border-[#1F3D2B] pt-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#6B5D45]">Total actividad</span>
            <span className="font-mono text-lg font-bold text-[#1F3D2B]">${totalGeneral.toFixed(2)}</span>
          </div>
        </div>

        <div className="mt-4 rounded-lg border-2 border-[#1F3D2B] bg-[#FBF9F2] p-4 shadow-[3px_3px_0_#1F3D2B]">
          <label className="block text-[10px] uppercase tracking-widest font-mono text-[#6B5D45] mb-1">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Condiciones del lote, incidencias, viento, etc." className="w-full resize-none rounded-md border-2 border-[#D8D2BE] bg-white px-2.5 py-2 text-sm text-[#1F3D2B] outline-none focus:border-[#1F3D2B]" />
        </div>

        <button onClick={guardar} disabled={guardando} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F3D2B] py-3 text-sm font-bold uppercase tracking-wide text-[#F5F2E6] shadow-[3px_3px_0_#0F2116] transition-transform active:translate-y-[2px] active:shadow-none disabled:opacity-50">
          <ClipboardCheck size={16} />
          {guardando ? "Guardando..." : guardado ? "Actividad guardada ✓" : "Guardar actividad"}
        </button>
      </div>
    </div>
  );
}