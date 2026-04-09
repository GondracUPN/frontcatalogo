"use client";
import React from "react";

export default function ServicioForm() {
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    alert(`Servicio creado (demo)\nCliente: ${data.cliente}\nEquipo: ${data.equipo}\nProblema: ${data.problema}\nPrioridad: ${data.prioridad}`);
    e.currentTarget.reset();
  };
  return (
    <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-3">
      <div>
        <label className="text-sm text-gray-900 font-medium">Cliente</label>
        <input name="cliente" className="w-full border rounded px-3 py-2 text-gray-900" required />
      </div>
      <div>
        <label className="text-sm text-gray-900 font-medium">Contacto</label>
        <input name="contacto" placeholder="telefono o email" className="w-full border rounded px-3 py-2 text-gray-900" />
      </div>
      <div>
        <label className="text-sm text-gray-900 font-medium">Equipo</label>
        <input name="equipo" placeholder="Macbook, iPhone, iPad..." className="w-full border rounded px-3 py-2 text-gray-900" required />
      </div>
      <div>
        <label className="text-sm text-gray-900 font-medium">Serie / ID</label>
        <input name="serie" className="w-full border rounded px-3 py-2 text-gray-900" />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm text-gray-900 font-medium">Problema</label>
        <textarea name="problema" className="w-full border rounded px-3 py-2 min-h-[80px] text-gray-900" required />
      </div>
      <div>
        <label className="text-sm text-gray-900 font-medium">Prioridad</label>
        <select name="prioridad" className="w-full border rounded px-3 py-2 text-gray-900" defaultValue="normal">
          <option value="baja">Baja</option>
          <option value="normal">Normal</option>
          <option value="alta">Alta</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-900 font-medium">Estado</label>
        <select name="estado" className="w-full border rounded px-3 py-2 text-gray-900" defaultValue="nuevo">
          <option value="nuevo">Nuevo</option>
          <option value="diagnostico">Diagnostico</option>
          <option value="en_proceso">En proceso</option>
          <option value="listo">Listo</option>
        </select>
      </div>
      <div className="md:col-span-2 flex gap-3">
        <button className="bg-[#0071e3] hover:bg-[#0a84ff] text-white rounded px-4 py-2">Crear servicio</button>
        <span className="text-xs text-gray-500 self-center">(Demo UI: requiere endpoints en backend)</span>
      </div>
    </form>
  );
}
