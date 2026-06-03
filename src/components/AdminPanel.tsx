/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Conductor, RutaMaestra, Parada, UbicacionEnVivo } from '../types';
import { DatabaseService, isSupabaseConfigured } from '../lib/supabase';
import { PlusCircle, Shield, Truck, Users, MapPin, ClipboardList, CheckCircle2, Trash2, Edit2, ArrowUp, ArrowDown, Plus, X, Database, UploadCloud } from 'lucide-react';

interface AdminPanelProps {
  clientes: Cliente[];
  conductores: Conductor[];
  rutas: RutaMaestra[];
  paradas: Parada[];
  ubicaciones: UbicacionEnVivo[];
  refresh: () => void;
}

export default function AdminPanel({
  clientes,
  conductores,
  rutas,
  paradas,
  ubicaciones,
  refresh
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'kpis' | 'clientes' | 'conductores' | 'rutas'>('kpis');
  
  // States for adding a new Client / Punto
  const [newClientName, setNewClientName] = useState('');
  const [newClientDir, setNewClientDir] = useState('');
  const [newClientLat, setNewClientLat] = useState('4.6469');
  const [newClientLng, setNewClientLng] = useState('-74.0620');
  const [clientFeedback, setClientFeedback] = useState<string | null>(null);

  // States for Master Route creation / editing
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState('');
  const [routeDriverId, setRouteDriverId] = useState('');
  const [routeDay, setRouteDay] = useState('Lunes');
  const [routeFeedback, setRouteFeedback] = useState<string | null>(null);
  const [confirmDeleteRouteId, setConfirmDeleteRouteId] = useState<string | null>(null);

  // Stop addition temporary state - maps route ID to selected point ID
  const [selectedPuntoToAdd, setSelectedPuntoToAdd] = useState<Record<string, string>>({});
  const [paradaFeedback, setParadaFeedback] = useState<Record<string, string>>({});

  // Statistics calculation helpers
  const totalParadasCount = paradas.length;
  const completedParadasCount = paradas.filter(p => p.estado === 'Completado').length;
  const completionPercentage = totalParadasCount > 0 
    ? Math.round((completedParadasCount / totalParadasCount) * 100) 
    : 0;

  const totalRutasCount = rutas.length;
  const activeUbicacionesCount = ubicaciones.length;

  // Supabase synchronization states
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSyncToSupabase = async () => {
    setSyncLoading(true);
    setSyncStatus(null);
    try {
      const result = await DatabaseService.supabaseSync.syncAllMockData();
      setSyncStatus(result);
      if (result.success) {
        refresh();
      }
    } catch (err: any) {
      setSyncStatus({ success: false, message: err?.message || String(err) });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newClientDir || !newClientLat || !newClientLng) {
      setClientFeedback("⚠️ Todos los campos son obligatorios.");
      return;
    }

    try {
      const parsedLat = parseFloat(newClientLat);
      const parsedLng = parseFloat(newClientLng);

      if (isNaN(parsedLat) || isNaN(parsedLng)) {
        setClientFeedback("⚠️ La latitud y longitud deben ser valores numéricos válidos.");
        return;
      }

      const clientPayload: Cliente = {
        id_punto: `P-${Date.now()}`,
        nombre_comercio: newClientName,
        direccion: newClientDir,
        latitud: parsedLat,
        longitud: parsedLng
      };

      await DatabaseService.clientes.create(clientPayload);
      
      // Reset form & trigger refetches
      setNewClientName('');
      setNewClientDir('');
      setClientFeedback("✅ Comercio/Punto registrado exitosamente.");
      refresh();
      
      setTimeout(() => setClientFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setClientFeedback("⚠️ Hubo un error al registrar el comercio.");
    }
  };

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !routeDriverId) {
      setRouteFeedback("⚠️ El nombre de ruta y conductor son obligatorios.");
      return;
    }

    try {
      if (editingRouteId) {
        // Edit existing route
        const updatedRoute: RutaMaestra = {
          id: editingRouteId,
          nombre_ruta: routeName.trim(),
          conductor_id: routeDriverId,
          dia_semana: routeDay
        };
        await DatabaseService.rutas.update(updatedRoute);
        setRouteFeedback("✅ Ruta maestra actualizada exitosamente.");
        setEditingRouteId(null);
      } else {
        // Create new route
        const newRouteId = `R-${Date.now()}`;
        const newRoute: RutaMaestra = {
          id: newRouteId,
          nombre_ruta: routeName.trim(),
          conductor_id: routeDriverId,
          dia_semana: routeDay
        };
        await DatabaseService.rutas.create(newRoute);
        setRouteFeedback("✅ Nueva ruta maestra creada exitosamente.");
      }

      // Reset route form states
      setRouteName('');
      setRouteDriverId('');
      setRouteDay('Lunes');
      refresh();

      setTimeout(() => setRouteFeedback(null), 4000);
    } catch (err) {
      console.error(err);
      setRouteFeedback("⚠️ Error al guardar la ruta maestra.");
    }
  };

  const handleEditRouteClick = (ruta: RutaMaestra) => {
    setEditingRouteId(ruta.id);
    setRouteName(ruta.nombre_ruta);
    setRouteDriverId(ruta.conductor_id);
    setRouteDay(ruta.dia_semana);
    setRouteFeedback(null);
  };

  const handleCancelRouteEdit = () => {
    setEditingRouteId(null);
    setRouteName('');
    setRouteDriverId('');
    setRouteDay('Lunes');
    setRouteFeedback(null);
  };

  const handleDeleteRoute = async (rutaId: string) => {
    try {
      await DatabaseService.rutas.delete(rutaId);
      setConfirmDeleteRouteId(null);
      refresh();
    } catch (err) {
      console.error("Error al eliminar ruta: ", err);
    }
  };

  const handleAddStopToRoute = async (rutaId: string) => {
    const puntoId = selectedPuntoToAdd[rutaId];
    if (!puntoId) return;

    // Check if point already exists in this route
    const existing = paradas.filter(p => p.ruta_id === rutaId);
    if (existing.some(p => p.id_punto === puntoId)) {
      setParadaFeedback(prev => ({ ...prev, [rutaId]: "⚠️ Este punto ya está programado en esta ruta." }));
      setTimeout(() => {
        setParadaFeedback(prev => ({ ...prev, [rutaId]: "" }));
      }, 3000);
      return;
    }

    const nextOrder = existing.length > 0 
      ? Math.max(...existing.map(p => p.orden_visita)) + 1 
      : 1;

    try {
      await DatabaseService.paradas.addParada(rutaId, puntoId, nextOrder);
      // Clean up local selector for this route
      setSelectedPuntoToAdd(prev => ({ ...prev, [rutaId]: '' }));
      setParadaFeedback(prev => ({ ...prev, [rutaId]: "✅ ¡Parada agregada!" }));
      setTimeout(() => {
        setParadaFeedback(prev => ({ ...prev, [rutaId]: "" }));
      }, 3000);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStop = async (paradaId: string) => {
    try {
      await DatabaseService.paradas.deleteParada(paradaId);
      refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMoveStop = async (rutaId: string, paradaId: string, direction: 'up' | 'down') => {
    const rParadas = paradas
      .filter(p => p.ruta_id === rutaId)
      .sort((a, b) => a.orden_visita - b.orden_visita);
    
    const index = rParadas.findIndex(p => p.id === paradaId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const current = rParadas[index];
      const prev = rParadas[index - 1];
      
      const currentOrder = current.orden_visita;
      const prevOrder = prev.orden_visita;
      
      const targetCurrentOrder = prevOrder === currentOrder ? prevOrder - 1 : prevOrder;
      const targetPrevOrder = currentOrder;

      await DatabaseService.paradas.updateOrden(current.id, targetCurrentOrder);
      await DatabaseService.paradas.updateOrden(prev.id, targetPrevOrder);
      refresh();
    } else if (direction === 'down' && index < rParadas.length - 1) {
      const current = rParadas[index];
      const next = rParadas[index + 1];
      
      const currentOrder = current.orden_visita;
      const nextOrder = next.orden_visita;

      const targetCurrentOrder = nextOrder === currentOrder ? nextOrder + 1 : nextOrder;
      const targetNextOrder = currentOrder;

      await DatabaseService.paradas.updateOrden(current.id, targetCurrentOrder);
      await DatabaseService.paradas.updateOrden(next.id, targetNextOrder);
      refresh();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden" id="admin-panel-root">
      {/* Module Header */}
      <div className="bg-slate-900 px-6 py-5 flex items-center justify-between text-white">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Panel Administrativo Global</h2>
            <p className="text-xs text-slate-400">Control maestro de despachos, conductores y geolocalizaciones</p>
          </div>
        </div>
        <span className="hidden sm:inline-block text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
          Rol: Administrador
        </span>
      </div>

      {/* Navigation tabs inside module */}
      <div className="border-b border-slate-200 px-6 bg-slate-50 flex items-center justify-between overflow-x-auto scrollbar-none">
        <div className="flex space-x-1 py-1">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'kpis' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Métricas de Flota
          </button>
          <button
            onClick={() => setActiveTab('clientes')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'clientes' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Puntos & Clientes
          </button>
          <button
            onClick={() => setActiveTab('conductores')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'conductores' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Conductores Activos
          </button>
          <button
            onClick={() => setActiveTab('rutas')}
            className={`px-4 py-3.5 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'rutas' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Rutas Maestras
          </button>
        </div>
        <button 
          onClick={refresh}
          className="text-[11px] text-blue-600 bg-blue-50 font-semibold hover:bg-blue-100 hover:text-blue-700 px-2.5 py-1.5 rounded"
        >
          Sincronizar DB
        </button>
      </div>

      <div className="p-6">
        {/* TAB 1: KPIS & SUMMARY */}
        {activeTab === 'kpis' && (
          <div className="space-y-6">
            
            {/* Supabase Base Sync Control Center */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <Database className="w-4.5 h-4.5 text-blue-400 animate-pulse" />
                  <span className="font-bold text-sm tracking-tight text-white">Sincronizador Central de Datos Supabase</span>
                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${isSupabaseConfigured ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                    {isSupabaseConfigured ? 'Supabase Conectado' : 'Modo Local'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-xl">
                  {isSupabaseConfigured 
                    ? "Tu instancia de Supabase está en línea. Sincroniza las tablas de simulación (Clientes, Conductores, Rutas y Paradas) directamente en tu base de datos cloud para que la aplicación las lea en tiempo real."
                    : "Estás operando de forma simulada localmente (Local-First). Para conectar con Supabase, configura las variables de entorno en el menú de configuración de AI Studio."
                  }
                </p>
              </div>
              <div className="shrink-0 w-full md:w-auto">
                {isSupabaseConfigured ? (
                  <button
                    onClick={handleSyncToSupabase}
                    disabled={syncLoading}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50 cursor-pointer w-full md:w-auto justify-center"
                  >
                    {syncLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Subiendo datos...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Subir Datos a Supabase</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-xs bg-slate-850 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 font-medium text-center">
                    Conexión Cloud No Configurada
                  </div>
                )}
              </div>
            </div>

            {syncStatus && (
              <div className={`p-4 rounded-xl text-xs font-semibold ${
                syncStatus.success 
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-500'
              }`}>
                {syncStatus.message}
              </div>
            )}
            {/* KPI grid counts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Efectividad de Entrega</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">{completionPercentage}%</span>
                  <span className="text-[10px] text-emerald-600 font-semibold">{completedParadasCount}/{totalParadasCount} paradas</span>
                </div>
                <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Ubicaciones Activas</span>
                  <Truck className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">{activeUbicacionesCount}</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Camiones reportando</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Geolocalización activa cada 30s</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Rutas Programadas</span>
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">{totalRutasCount}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Rutas maestras</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Distribución semanal consolidada</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                  <span>Puntos de Entrega</span>
                  <MapPin className="w-4 h-4 text-slate-500" />
                </div>
                <div className="mt-2 flex items-baseline space-x-1.5">
                  <span className="text-2xl font-bold tracking-tight text-slate-900">{clientes.length}</span>
                  <span className="text-[10px] text-slate-500 font-semibold">Locales comerciales</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Registrados en coordenadas Bogotá</p>
              </div>
            </div>

            {/* Quick Live Dispatch State Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Estado Logístico en Ejecución</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  ⚡ En Vivo
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                      <th className="px-4 py-3">Conductor</th>
                      <th className="px-4 py-3">Ruta Asignada</th>
                      <th className="px-4 py-3">Vehículo Placa</th>
                      <th className="px-4 py-3">Último Reporte GPS</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {conductores.map(driver => {
                      const gps = ubicaciones.find(u => u.conductor_id === driver.id);
                      const activeRoute = rutas.find(r => r.conductor_id === driver.id);
                      return (
                        <tr key={driver.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-slate-900">{driver.nombre}</td>
                          <td className="px-4 py-3.5 text-slate-600">{activeRoute ? activeRoute.nombre_ruta : 'Sin despacho hoy'}</td>
                          <td className="px-4 py-3.5"><span className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-[10px] rounded font-bold">{driver.vehiculo_placa}</span></td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                            {gps ? `📍 (${gps.latitud.toFixed(4)}, ${gps.longitud.toFixed(4)})` : '⚠️ Sin señal GPS'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${gps ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} title={gps ? "GPS online" : "GPS offline"}></span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CLIENTS & FORM */}
        {activeTab === 'clientes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Client Form Panel */}
            <div className="lg:col-span-1 p-5 rounded-xl border border-slate-200 bg-slate-50 h-fit">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-blue-500" />
                <span>Registrar Nuevo Comercio</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">Abre coordenadas geolocalizables para recibir fletes</p>
              
              <form onSubmit={handleAddClient} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre Comercial</label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                    placeholder="Masa Chapinero, Starbucks, etc."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dirección Física</label>
                  <input
                    type="text"
                    required
                    value={newClientDir}
                    onChange={e => setNewClientDir(e.target.value)}
                    placeholder="Calle 66 # 4-22, Bogotá"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Latitud</label>
                    <input
                      type="text"
                      required
                      value={newClientLat}
                      onChange={e => setNewClientLat(e.target.value)}
                      placeholder="4.6469"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Longitud</label>
                    <input
                      type="text"
                      required
                      value={newClientLng}
                      onChange={e => setNewClientLng(e.target.value)}
                      placeholder="-74.0620"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono bg-white"
                    />
                  </div>
                </div>
                
                {clientFeedback && (
                  <p className="text-xs p-2.5 rounded bg-slate-100 font-medium text-slate-700 leading-tight">
                    {clientFeedback}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-wide transition-all shadow-sm"
                >
                  Confirmar Registro
                </button>
              </form>
            </div>

            {/* Existing Clients List */}
            <div className="lg:col-span-2 border border-slate-200 rounded-xl overflow-hidden h-fit">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Locales Comerciales Registrados ({clientes.length})</h3>
              </div>
              <div className="max-h-[350px] overflow-y-auto divide-y divide-slate-100">
                {clientes.map(client => (
                  <div key={client.id_punto} className="p-3.5 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-0.5">
                      <h4 className="font-bold text-sm text-slate-900">{client.nombre_comercio}</h4>
                      <p className="text-xs text-slate-500">{client.direccion}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">ID: {client.id_punto}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-305 bg-slate-300"></span>
                        <span className="text-[10px] font-mono text-slate-500">({client.latitud.toFixed(4)}, {client.longitud.toFixed(4)})</span>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">Pto Fijo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CONDUCTORES */}
        {activeTab === 'conductores' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {conductores.map(driver => {
              const liveUbicacion = ubicaciones.find(u => u.conductor_id === driver.id);
              return (
                <div key={driver.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-amber-400 font-mono font-bold px-2.5 py-1.5 rounded-md">
                        {driver.vehiculo_placa}
                      </span>
                      <span className={`w-2.5 h-2.5 rounded-full ${liveUbicacion ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></span>
                    </div>
                    <h3 className="font-bold text-base text-slate-900 mt-3">{driver.nombre}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Teléfono: {driver.telefono}</p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">UBICACIÓN GPS EN VIVO</p>
                    {liveUbicacion ? (
                      <div className="mt-1.5 text-xs font-mono text-slate-700">
                        <p className="font-semibold text-slate-800">Lat: {liveUbicacion.latitud.toFixed(5)}</p>
                        <p className="font-semibold text-slate-800">Lng: {liveUbicacion.longitud.toFixed(5)}</p>
                        <p className="text-[9px] text-slate-400 mt-1">Sincronizado: {new Date(liveUbicacion.actualizado_en || '').toLocaleTimeString()}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic mt-1.5">Sin reporte de telemetría activo hoy</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: RUTAS */}
        {activeTab === 'rutas' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulario de Administración de Ruta */}
            <div className="lg:col-span-1 p-5 rounded-xl border border-slate-200 bg-slate-50 h-fit space-y-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-blue-500" />
                  <span>{editingRouteId ? 'Editar Ruta Maestra' : 'Crear Nueva Ruta Maestra'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">Define rutas de distribución semanales y conductores asignados.</p>
              </div>

              <form onSubmit={handleSaveRoute} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombre de la Ruta</label>
                  <input
                    type="text"
                    required
                    value={routeName}
                    onChange={e => setRouteName(e.target.value)}
                    placeholder="Ej: Ruta Lunes - Zona G / Chapinero"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Conductor Responsable</label>
                  <select
                    required
                    value={routeDriverId}
                    onChange={e => setRouteDriverId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">-- Selecciona un Conductor --</option>
                    {conductores.map(d => (
                      <option key={d.id} value={d.id}>{d.nombre} ({d.vehiculo_placa})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Frecuencia / Día de Semana</label>
                  <select
                    required
                    value={routeDay}
                    onChange={e => setRouteDay(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="Lunes">Lunes</option>
                    <option value="Martes">Martes</option>
                    <option value="Miercoles">Miércoles</option>
                    <option value="Jueves">Jueves</option>
                    <option value="Viernes">Viernes</option>
                    <option value="Sabado">Sábado</option>
                    <option value="Domingo">Domingo</option>
                  </select>
                </div>

                {routeFeedback && (
                  <p className="text-xs p-2.5 rounded bg-blue-50 border border-blue-100 font-medium text-blue-700 leading-tight">
                    {routeFeedback}
                  </p>
                )}

                <div className="flex space-x-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-wide transition-all shadow-sm"
                  >
                    {editingRouteId ? 'Actualizar Ruta' : 'Crear Ruta'}
                  </button>
                  {editingRouteId && (
                    <button
                      type="button"
                      onClick={handleCancelRouteEdit}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Listado de Rutas con Edición de Paradas */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-50 px-4 py-3.5 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Distribuciones Configuradas</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Asigna y rota puntos comerciales de entrega por cada recorrido.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {rutas.map(ruta => {
                  const driver = conductores.find(d => d.id === ruta.conductor_id);
                  const rParadas = paradas.filter(p => p.ruta_id === ruta.id).sort((a, b) => a.orden_visita - b.orden_visita);
                  const isConfirmingDelete = confirmDeleteRouteId === ruta.id;

                  return (
                    <div key={ruta.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                      {/* Cabecera de la Ruta */}
                      <div className="bg-slate-900 text-white p-4 flex justify-between items-start">
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] bg-blue-600 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-white">
                              {ruta.dia_semana}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {ruta.id}</span>
                          </div>
                          <h4 className="font-bold text-sm text-white">{ruta.nombre_ruta}</h4>
                          <p className="text-xs text-slate-300 font-medium">
                            Vehículo: <span className="text-amber-400 font-mono font-bold">{driver?.vehiculo_placa || 'STX-789'}</span> &bull; {driver?.nombre || 'Desconocido'}
                          </p>
                        </div>

                        {/* Botonera de control de Ruta */}
                        <div className="flex items-center space-x-1.5 shrink-0">
                          <button
                            title="Editar ruta"
                            onClick={() => handleEditRouteClick(ruta)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          {isConfirmingDelete ? (
                            <div className="bg-slate-800 border border-red-500/50 p-1 rounded flex items-center space-x-1">
                              <span className="text-[9px] text-red-400 font-bold px-1 uppercase tracking-wider">¿Borrar?</span>
                              <button
                                onClick={() => handleDeleteRoute(ruta.id)}
                                className="px-1.5 py-0.5 bg-red-600 rounded text-white font-bold text-[9px] hover:bg-red-700"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmDeleteRouteId(null)}
                                className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300 font-semibold text-[9px] hover:bg-slate-600"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              title="Eliminar ruta de BD"
                              onClick={() => setConfirmDeleteRouteId(ruta.id)}
                              className="p-1.5 bg-slate-800 hover:bg-red-950/80 rounded text-slate-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Secuencia de paradas */}
                      <div className="p-4 space-y-3.5">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Secuencia de Entrega ({rParadas.length} paradas)</p>
                          {paradaFeedback[ruta.id] && (
                            <span className="text-[10px] font-medium text-blue-600 animate-pulse">{paradaFeedback[ruta.id]}</span>
                          )}
                        </div>

                        {rParadas.length === 0 ? (
                          <div className="py-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <MapPin className="w-6 h-6 mx-auto stroke-1 text-slate-300 mb-1" />
                            <p className="text-xs italic">Aún no se han programado paradas para esta ruta.</p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {rParadas.map((p, pIndex) => {
                              const cl = clientes.find(c => c.id_punto === p.id_punto);
                              return (
                                <div key={p.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/50 border border-slate-200/60 transition-colors">
                                  <div className="flex items-center space-x-3 min-w-0">
                                    {/* Orden de parada con controles Up/Down */}
                                    <div className="flex flex-col items-center justify-center shrink-0">
                                      <button
                                        disabled={pIndex === 0}
                                        onClick={() => handleMoveStop(ruta.id, p.id, 'up')}
                                        className={`p-0.5 rounded ${pIndex === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200'}`}
                                        title="Subir prioridad"
                                      >
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      </button>
                                      
                                      <span className="font-mono font-bold text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1.5 py-0.2">
                                        {pIndex + 1}
                                      </span>

                                      <button
                                        disabled={pIndex === rParadas.length - 1}
                                        onClick={() => handleMoveStop(ruta.id, p.id, 'down')}
                                        className={`p-0.5 rounded ${pIndex === rParadas.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-500 hover:bg-slate-200'}`}
                                        title="Bajar prioridad"
                                      >
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <div className="min-w-0 pr-2">
                                      <p className="font-bold text-slate-900 truncate leading-snug">{cl?.nombre_comercio || 'Cliente Desconocido'}</p>
                                      <p className="text-[10px] text-slate-500 truncate leading-none mt-0.5">{cl?.direccion}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2 shrink-0">
                                    {p.es_adicional && (
                                      <span className="text-[8.5px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">Adicional</span>
                                    )}
                                    <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider ${
                                      p.estado === 'Completado' ? 'bg-green-100 text-green-800' :
                                      p.estado === 'En Ruta' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                                    }`}>{p.estado}</span>

                                    <button
                                      title="Desasociar parada"
                                      onClick={() => handleDeleteStop(p.id)}
                                      className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Selector para agregar paradas */}
                        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                          <div className="relative flex-1">
                            <select
                              value={selectedPuntoToAdd[ruta.id] || ''}
                              onChange={(e) => setSelectedPuntoToAdd(prev => ({ ...prev, [ruta.id]: e.target.value }))}
                              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
                            >
                              <option value="">-- Agregar Local Comercial a la Ruta --</option>
                              {clientes.map(cl => (
                                <option key={cl.id_punto} value={cl.id_punto}>
                                  {cl.nombre_comercio} ({cl.direccion})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddStopToRoute(ruta.id)}
                            className="bg-blue-600 text-white p-1.5 px-3.5 rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center space-x-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
