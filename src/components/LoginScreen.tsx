import React, { useState } from 'react';
import { Truck, Key, Mail, ArrowRight, User, Shield, Info } from 'lucide-react';
import { isSupabaseConfigured, DatabaseService } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (user: { email: string; role: 'admin' | 'logistico' | 'cliente' | 'conductor'; name: string }) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'logistico' | 'cliente' | 'conductor'>('logistico');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await DatabaseService.auth.signIn(email, password);
      if (response.success && response.user) {
        onLogin(response.user);
      } else {
        setError(response.message || 'Error al iniciar sesión.');
      }
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al intentar iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await DatabaseService.auth.signUp(regEmail, regPassword, regName, regRole);
      if (response.success) {
        setSuccess('¡Usuario registrado exitosamente! Ya puedes iniciar sesión con este correo.');
        setEmail(regEmail);
        setPassword(regPassword);
        setActiveTab('login');
        
        // Reset registration fields
        setRegName('');
        setRegEmail('');
        setRegPassword('');
      } else {
        setError(response.message || 'Error al registrar el usuario.');
      }
    } catch (err: any) {
      setError(err?.message || 'Ocurrió un error inesperado al intentar registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="login-layout-root">
      
      {/* Background aesthetic details */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(37,99,235,0.18),rgba(255,255,255,0))] pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Truck className="w-9 h-9 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-white">
          Cargoflow
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 uppercase tracking-widest font-bold">
          Plataforma de Control de Flota & Última Milla
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 w-full">
        <div className="bg-slate-800/85 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-700/60">
          
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-5 pb-2.5 border-b border-slate-700/50 flex items-center justify-between">
            <span>{activeTab === 'login' ? 'Iniciar Sesión' : 'Crear Usuario'}</span>
            <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full ${
              isSupabaseConfigured 
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
                : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
            }`}>
              {isSupabaseConfigured ? 'Supabase Activo' : 'Demo Local'}
            </span>
          </h3>

          {/* Tab Selector - only shown if Supabase is actually configured */}
          {isSupabaseConfigured && (
            <div className="flex bg-slate-900/60 p-1 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'login'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Crear Registro
              </button>
            </div>
          )}

          {error && (
            <div className="text-xs text-red-400 font-medium bg-red-950/40 p-3 mb-4 rounded-lg border border-red-900/40 leading-snug">
              {error}
            </div>
          )}

          {success && (
            <div className="text-xs text-emerald-400 font-medium bg-emerald-950/40 p-3 mb-4 rounded-lg border border-emerald-900/40 leading-snug">
              {success}
            </div>
          )}

          {/* LOGIN VIEW */}
          {activeTab === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@cargoflow.co"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {!isSupabaseConfigured && (
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-700/50 flex gap-2 text-[11px] text-slate-400 leading-normal mb-1">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Modo Demo Local:</strong> Puedes usar cualquiera de estas credenciales para probar:<br/>
                    • <b>admin@cargoflow.co</b> y clave <b>admin</b><br/>
                    • <b>logistica@cargoflow.co</b> y clave <b>logistico</b><br/>
                    • <b>conductor@cargoflow.co</b> y clave <b>conductor</b><br/>
                    • <b>cliente@cargoflow.co</b> y clave <b>cliente</b>
                  </span>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Acceder a la Plataforma Real</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* SIGNUP VIEW */}
          {activeTab === 'register' && isSupabaseConfigured && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ejemplo@cargoflow.co"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Contraseña (Mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Rol de la Cuenta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-slate-500" />
                  </div>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as any)}
                    className="block w-full pl-10 pr-3 py-2.5 text-xs border border-slate-700 bg-slate-900/50 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="admin" className="bg-slate-800 text-white">Administrador (Control Total)</option>
                    <option value="logistico" className="bg-slate-800 text-white">Coordinador Logístico (CEDIS)</option>
                    <option value="conductor" className="bg-slate-800 text-white">Conductor Móvil (Última Milla)</option>
                    <option value="cliente" className="bg-slate-800 text-white">Cliente (Auto-consulta)</option>
                  </select>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Registrar Cuenta en Supabase</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
        
        <p className="text-center text-[10px] text-slate-500 mt-6 leading-normal px-4">
          Cargoflow v2.2.0 &bull; Sistema Pro de Control de Flota, Cadena de Frío e Insumos Bogotá.
        </p>
      </div>

    </div>
  );
}
