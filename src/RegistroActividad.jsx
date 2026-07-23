<div className="bg-white rounded-lg border-2 border-[#1F3D2B] p-6 mb-6">
  <h3 className="font-bold text-[#1F3D2B] mb-3">Productos</h3>
  
  {/* Header */}
  <div className="grid grid-cols-12 gap-2 mb-3 font-bold text-xs text-[#1F3D2B]">
    <div className="col-span-6">Producto</div>
    <div className="col-span-2">Cantidad</div>
    <div className="col-span-2">Precio/U</div>
    <div className="col-span-2">Total</div>
  </div>

  {/* Filas */}
  <div className="space-y-2">
    {filas.map((f, i) => (
      <div key={f.id} className="grid grid-cols-12 gap-2 items-center border-b-2 border-[#D8D2BE] pb-2">
        <select 
          value={f.producto_id} 
          onChange={(e) => cambiarProducto(f.id, parseInt(e.target.value))}
          className="col-span-6 px-2 py-2 border-2 border-[#D8D2BE] rounded text-sm"
        >
          <option value="">Seleccionar...</option>
          {productos.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>

        <input 
          type="number" 
          value={f.cantidad} 
          onChange={(e) => actualizarFila(f.id, 'cantidad', e.target.value)}
          placeholder="0"
          className="col-span-2 px-2 py-2 border-2 border-[#D8D2BE] rounded text-sm"
        />

        <input 
          type="number" 
          value={f.costoUnitario} 
          readOnly
          className="col-span-2 px-2 py-2 border-2 border-[#D8D2BE] rounded text-sm bg-[#F5F2E6]"
        />

        <div className="col-span-2 flex justify-between items-center">
          <span className="font-bold text-sm">${f.total}</span>
          <button 
            onClick={() => quitarFila(f.id)} 
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    ))}
  </div>

  <button 
    onClick={agregarFila} 
    className="w-full mt-4 border-2 border-dashed border-[#1F3D2B] py-2 text-[#1F3D2B] font-bold rounded hover:bg-[#F5F2E6]"
  >
    <Plus size={16} className="inline mr-1" /> Agregar producto
  </button>

  <div className="mt-4 text-right font-bold text-[#1F3D2B] text-lg">
    Total General: ${totalGeneral.toFixed(2)}
  </div>
</div>