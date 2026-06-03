/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useLogistica } from './hooks/useLogistica';
import { initializeLocalStorage, isSupabaseConfigured, DatabaseService } from './lib/supabase';
import AdminPanel from './components/AdminPanel';
import LogisticoPanel from './components/LogisticoPanel';
import ClientePanel from './components/ClientePanel';
import ConductorPanel from './components/ConductorPanel';
import LoginScreen from './components/LoginScreen';
import { Shield, Truck, Users, Clock, AlertCircle, Bell, Database, Wifi, LogOut } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ email: string; role: 'admin' | 'logistico' | 'cliente' | 'conductor'; name: string } | null>(() => {
    const stored = localStorage.getItem('cargoflow_session');
    return stored ? JSON.parse(stored) : null;
  });

  const [activeProfile, setActiveProfile] = useState<'admin' | 'logistico' | 'cliente' | 'conductor'>(() => {
    const stored = localStorage.getItem('cargoflow_session');
    if (stored) {
      const u = JSON.parse(stored);
      return u.role;
    }
    return 'logistico';
  });

  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const handleSignOut = async () => {
    await DatabaseService.auth.signOut();
    setCurrentUser(null);
  };

  // Initialize the localStorage database values if not exist for demo support
  useEffect(() => {
    initializeLocalStorage();
  }, []);

  const {
    clientes,
    conductores,
    rutas,
    paradas,
    ubicaciones,
    notifications,
    loading,
    refresh,
    addNotification
  } = useLogistica();

  // Highlight live alerts immediately using auto-disappearing toast alerts
  const [activeToast, setActiveToast] = useState<{ id: string; title: string; message: string; type: string } | null>(null);

  useEffect(() => {
    if (notifications.length > 0) {
      const topNotif = notifications[0];
      // Check if it's new (created in the last 15 seconds) to trigger toast
      const isNew = (Date.now() - new Date(topNotif.timestamp).getTime()) < 15000;
      if (isNew) {
        setActiveToast({
          id: topNotif.id,
          title: `${topNotif.comercioName}: ${topNotif.title}`,
          message: topNotif.message,
          type: topNotif.type
        });
        const tid = setTimeout(() => {
          setActiveToast(null);
        }, 5000);
        return () => clearTimeout(tid);
      }
    }
  }, [notifications]);

  useEffect(() => {
    if (currentUser) {
      setActiveProfile(currentUser.role);
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          setActiveProfile(user.role);
          localStorage.setItem('cargoflow_session', JSON.stringify(user));
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800" id="logistic-app-root">
      
      {/* GLOBAL BANNER / TOPBAR */}
      <header className="sticky top-0 bg-slate-900 border-b border-slate-800 text-white z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Headline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <Truck className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-none tracking-tight">Cargoflow</h1>
              <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">Flota & Última Milla</p>
            </div>
          </div>

          {/* Database connection diagnostic badge */}
          <div className="hidden md:flex items-center space-x-2.5">
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isSupabaseConfigured 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span>{isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Demo (Local-First)'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
            </span>
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
              <Wifi className="w-3 h-3 text-emerald-400 inline" /> Realtime activo
            </span>
          </div>

          {/* Right action control (Notification system, session info, and log out button) */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex flex-col items-end mr-1 text-right text-white">
              <span className="text-xs font-bold leading-none">{currentUser.name}</span>
              <span className="text-[10px] text-blue-400 font-semibold leading-none mt-1 uppercase tracking-wider">
                {currentUser.role === 'admin' ? 'Administrador' :
                 currentUser.role === 'logistico' ? 'Coordinador' :
                 currentUser.role === 'conductor' ? 'Conductor' : 'Cliente'}
              </span>
            </div>

            <button
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Campana de Notificaciones"
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-500"></span>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-550/30 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4.5 h-4.5 animate-pulse" />
            </button>
          </div>

        </div>
      </header>

      {/* HORIZONTAL TAB SWITCHER FOR USER PERFILES (Pestañas independientes de roles, visible para administradores y coordinadores) */}
      {(currentUser.role === 'admin' || currentUser.role === 'logistico') && (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-1 overflow-x-auto py-1.5 scrollbar-none">
              <button
                onClick={() => setActiveProfile('admin')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeProfile === 'admin' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-semibold'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Perfil Administrador</span>
              </button>

              <button
                onClick={() => setActiveProfile('logistico')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeProfile === 'logistico' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-semibold'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Coordinador Logístico</span>
              </button>

              <button
                onClick={() => setActiveProfile('cliente')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeProfile === 'cliente' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-semibold'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Cliente (Rastreo Auto-consulta)</span>
              </button>

              <button
                onClick={() => setActiveProfile('conductor')}
                className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeProfile === 'conductor' 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 font-semibold'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Conductor Móvil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CORE DISPLAY MAIN AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-medium mt-4">Sincronizando cargamento y telemetrías...</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Conditional views router */}
            {activeProfile === 'admin' && (
              <AdminPanel
                clientes={clientes}
                conductores={conductores}
                rutas={rutas}
                paradas={paradas}
                ubicaciones={ubicaciones}
                refresh={refresh}
              />
            )}

            {activeProfile === 'logistico' && (
              <LogisticoPanel
                clientes={clientes}
                conductores={conductores}
                rutas={rutas}
                paradas={paradas}
                ubicaciones={ubicaciones}
                refresh={refresh}
                addNotification={addNotification}
              />
            )}

            {activeProfile === 'cliente' && (
              <ClientePanel
                clientes={clientes}
                conductores={conductores}
                rutas={rutas}
                paradas={paradas}
                ubicaciones={ubicaciones}
              />
            )}

            {activeProfile === 'conductor' && (
              <ConductorPanel
                clientes={clientes}
                conductores={conductores}
                rutas={rutas}
                paradas={paradas}
                ubicaciones={ubicaciones}
                refresh={refresh}
                addNotification={addNotification}
              />
            )}
            
          </div>
        )}
      </main>

      {/* FOOTER METADATA INDICATORS */}
      <footer className="bg-white border-t border-slate-205 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 space-y-2">
          <p className="font-medium text-slate-500">Cargoflow Logística Integral S.A.S — Bogotá D.C., Colombia</p>
          <p className="text-[10px]">Desarrollado bajo arquitectura de redundancia de red con sincronizadores Supabase Realtime.</p>
        </div>
      </footer>

      {/* FLOATING PUSH TOAST POPUP (Lógica de Alertas en Caliente) */}
      {activeToast && (
        <div className="fixed bottom-6 right-6 z-[9999] p-4.5 bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl max-w-sm flex items-start space-x-3 animate-slide-up" id="realtime-push-toast">
          <div className={`p-2 rounded-lg shrink-0 ${
            activeToast.type === 'success' ? 'bg-green-500' : 'bg-blue-600'
          }`}>
            <Bell className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div className="space-y-0.5">
            <h4 className="font-bold text-xs tracking-tight text-white mb-0.5">{activeToast.title}</h4>
            <p className="text-[11px] text-slate-400 leading-normal">{activeToast.message}</p>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS FEED DRAWER SIDEBAR */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-[99999] flex justify-end" onClick={() => setShowNotificationDrawer(false)}>
          <div className="bg-white w-full max-w-sm h-full shadow-2xl p-6 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
            <div className="space-y-5 flex-1 overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900">Bitácora de Eventos</h3>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">Reportes push emitidos por conductores y logística</p>
                </div>
                <button
                  onClick={() => setShowNotificationDrawer(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold bg-slate-50 p-1 rounded-lg"
                >
                  Cerrar
                </button>
              </div>

              {/* List */}
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <AlertCircle className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                  <p className="text-xs italic mt-2">No se registran eventos telemétricos hoy.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notif => (
                    <div key={notif.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] bg-slate-900 text-amber-400 font-mono font-bold px-1.5 py-0.2 rounded">
                          {notif.comercioName.substring(0, 16)}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono font-semibold">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-800">{notif.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-snug">{notif.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                DatabaseService.notifications.clearAll();
                refresh();
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-lg transition-all border border-slate-200"
            >
              Borrar Historial de Bitácora
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
