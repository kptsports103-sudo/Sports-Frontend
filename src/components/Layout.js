import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-white border-r p-4">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">KPT Sports</h1>
        </div>
        <nav className="space-y-2">
          <Link to="/" className="block p-2 rounded hover:bg-gray-100">Dashboard</Link>
          <Link to="/pages" className="block p-2 rounded hover:bg-gray-100">Pages</Link>
          <Link to="/sports-celebration?tab=events" className="block p-2 rounded hover:bg-gray-100">Events</Link>
        </nav>
      </aside>
      <div className="flex-1 p-6">
        <header className="flex items-center justify-between mb-6">
          <div />
          <div className="flex items-center space-x-4">
            <div>{user?.name}</div>
            <button onClick={logout} className="px-3 py-1 bg-red-500 text-white rounded">Logout</button>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
