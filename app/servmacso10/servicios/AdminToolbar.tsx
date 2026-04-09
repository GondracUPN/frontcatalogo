"use client";
import React from "react";
import UsersModal from "./UsersModal";

export default function AdminToolbar() {
  const [showUsers, setShowUsers] = React.useState(false);
  return (
    <>
      <button onClick={() => setShowUsers(true)} className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2">Usuarios</button>
      {showUsers && <UsersModal onClose={() => setShowUsers(false)} />}
    </>
  );
}

