"use client";
import React from "react";
import { createUserAction } from "../../actions";

export default function UsersModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = React.useState(true);
  const handleClose = () => { setOpen(false); onClose(); };
  return open ? (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Crear usuario</h3>
          <button onClick={handleClose} className="text-gray-500">✕</button>
        </div>
        <form action={createUserAction} className="grid gap-3">
          <div>
            <label className="text-sm text-gray-900 font-medium">Usuario</label>
            <input name="username" className="w-full border rounded px-3 py-2 text-gray-900" required />
          </div>
          <div>
            <label className="text-sm text-gray-900 font-medium">Password</label>
            <input type="password" name="password" className="w-full border rounded px-3 py-2 text-gray-900" required minLength={6} />
          </div>
          <div>
            <label className="text-sm text-gray-900 font-medium">Rol</label>
            <select name="role" className="w-full border rounded px-3 py-2 text-gray-900" defaultValue="cliente">
              <option value="cliente">Cliente</option>
              <option value="vendedor">Vendedor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 mt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2 rounded border">Cancelar</button>
            <button className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2">Crear</button>
          </div>
        </form>
      </div>
    </div>
  ) : null;
}

