import { redirect } from "next/navigation";
import { getSessionUser } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ [k: string]: string | string[] | undefined }> }) {
  const sp = await searchParams;
  const next = typeof sp?.next === "string" ? sp.next : "/servmacso10/servicios";
  const hasError = Boolean(sp?.error);
  const err = typeof sp?.error === "string" ? sp.error : "";

  const me = await getSessionUser();
  if (me) redirect(next);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-md mx-auto bg-white border rounded-2xl p-6">
        <h1 className="text-2xl font-semibold mb-4 text-gray-900">Iniciar sesión</h1>
        {hasError && (
          <div className="mb-3 text-sm text-red-600">
            {err === "cred" ? "Usuario o contraseña inválidos" : err === "network" ? "No se puede conectar con el servidor" : "Error de inicio de sesión"}
          </div>
        )}
        <form action="/api/login" method="POST" className="space-y-3">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="text-sm text-gray-900 font-medium">Usuario</label>
            <input name="username" className="w-full border rounded px-3 py-2 text-gray-900" required />
          </div>
          <div>
            <label className="text-sm text-gray-900 font-medium">Contraseña</label>
            <input type="password" name="password" className="w-full border rounded px-3 py-2 text-gray-900" required />
          </div>
          <button className="bg-[#0071e3] hover:bg-[#0a84ff] text-white rounded px-4 py-2">Entrar</button>
        </form>
        <p className="text-xs text-gray-500 mt-3">Solicita las credenciales al administrador del sistema.</p>
      </div>
    </div>
  );
}
