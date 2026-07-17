"use client";

import React from "react";
import { createUserAction, deleteUserAction, listUsers, updateUserAction } from "../../actions";

type UserRow = { id: number; username: string; role: string };

function cleanError(value: string) {
  return value.replace(/^API \/auth\/(?:register|users\/\d+) \d+:?\s*/, "");
}

export default function UsersModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<UserRow | null>(null);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [editForm, setEditForm] = React.useState({ username: "", role: "cliente", password: "" });

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const rows = await listUsers();
    setUsers(Array.isArray(rows) ? rows : []);
    setLoading(false);
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const showMessage = (message: string, isError = false) => {
    setError(isError ? cleanError(message) : "");
    setSuccess(isError ? "" : message);
  };

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const form = event.currentTarget;
    const result = await createUserAction(new FormData(form));
    if (result.ok) {
      form.reset();
      showMessage(`Usuario ${result.user.username} creado correctamente`);
      await refresh();
    } else showMessage(result.error, true);
    setSaving(false);
  };

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setEditForm({ username: user.username, role: user.role, password: "" });
    setError("");
    setSuccess("");
  };

  const saveEdit = async () => {
    if (!editing || saving) return;
    setSaving(true);
    const result = await updateUserAction(editing.id, editForm);
    if (result.ok) {
      setUsers((rows) => rows.map((user) => user.id === editing.id ? result.user : user));
      setEditing(null);
      showMessage(`Usuario ${result.user.username} actualizado`);
    } else showMessage(result.error, true);
    setSaving(false);
  };

  const removeUser = async (user: UserRow) => {
    if (saving || !confirm(`¿Eliminar al usuario ${user.username}?`)) return;
    setSaving(true);
    const result = await deleteUserAction(user.id);
    if (result.ok) {
      setUsers((rows) => rows.filter((row) => row.id !== user.id));
      showMessage(`Usuario ${user.username} eliminado`);
    } else showMessage(result.error, true);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 text-gray-900 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Usuarios</h3>
          <button onClick={onClose} className="text-xl text-gray-500" aria-label="Cerrar">×</button>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {success && <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left text-gray-700"><tr><th className="p-3">Usuario</th><th className="p-3">Rol</th><th className="p-3">Acciones</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="p-3 font-medium">{user.username}</td>
                  <td className="p-3 capitalize">{user.role}</td>
                  <td className="p-3"><div className="flex gap-2"><button onClick={() => openEdit(user)} className="rounded bg-indigo-600 px-3 py-1 text-white">Editar</button><button onClick={() => removeUser(user)} className="rounded bg-red-600 px-3 py-1 text-white">Eliminar</button></div></td>
                </tr>
              ))}
              {!users.length && <tr><td colSpan={3} className="p-4 text-center text-gray-500">{loading ? "Cargando usuarios..." : "No hay usuarios"}</td></tr>}
            </tbody>
          </table>
        </div>

        <form onSubmit={createUser} className="mt-6 grid gap-3 rounded-xl border bg-gray-50 p-4 sm:grid-cols-3">
          <div><label className="text-sm font-medium">Usuario nuevo</label><input name="username" className="mt-1 w-full rounded border bg-white px-3 py-2" required minLength={3} /></div>
          <div><label className="text-sm font-medium">Contraseña</label><input type="password" name="password" className="mt-1 w-full rounded border bg-white px-3 py-2" required minLength={6} /></div>
          <div><label className="text-sm font-medium">Rol</label><select name="role" className="mt-1 w-full rounded border bg-white px-3 py-2" defaultValue="cliente"><option value="cliente">Cliente</option><option value="vendedor">Vendedor</option><option value="admin">Admin</option></select></div>
          <div className="sm:col-span-3 flex justify-end"><button disabled={saving} className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-60">{saving ? "Guardando..." : "Crear usuario"}</button></div>
        </form>

        {editing && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between"><h4 className="text-lg font-semibold">Editar usuario</h4><button onClick={() => setEditing(null)}>×</button></div>
              <div className="grid gap-3">
                <div><label className="text-sm font-medium">Usuario</label><input value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" /></div>
                <div><label className="text-sm font-medium">Rol</label><select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="mt-1 w-full rounded border bg-white px-3 py-2"><option value="cliente">Cliente</option><option value="vendedor">Vendedor</option><option value="admin">Admin</option></select></div>
                <div><label className="text-sm font-medium">Nueva contraseña</label><input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" minLength={6} placeholder="Déjala vacía para conservarla" /></div>
              </div>
              <div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="rounded border px-4 py-2">Cancelar</button><button onClick={saveEdit} disabled={saving} className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
