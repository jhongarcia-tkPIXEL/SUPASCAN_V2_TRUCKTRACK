/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Conductor, RutaMaestra, Parada, UbicacionEnVivo } from '../types';
import { DatabaseService } from '../lib/supabase';
import { Truck, Plus, Route, CheckCircle, MapPin, AlertCircle, Sparkles } from 'lucide-react';
import MapaLogistico from './MapaLogistico';

interface LogisticoPanelProps {
  clientes: Cliente[];
  conductores: Conductor[];
  rutas: RutaMaestra[];
  paradas: Parada[];
  ubicaciones: UbicacionEnVivo[];
  refresh: () => void;
  addNotification: (notif: {
    comercioName: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'alert';
  }) => void;
}

export default function LogisticoPanel({
  clientes,
  conductores,
  rutas,
  paradas,
  ubicaciones,
  refresh,
  addNotification
}: LogisticoPanelProps) {
  const [selectedRutaId, setSelectedRutaId] = useState<string>('');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter map states linked to map container references
  const [mapRutaFilter, setMapRutaFilter] = useState<string | null>(null);
  const [mapDriverFilter, setMapDriverFilter] = useState<string | null>(null);

  const handleAddStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRutaId || !selectedClienteId) {
      setStatusMessage("⚠️ Favor selecciona tanto una ruta como un comercio.");
      return;
    }

    try {
      const ruta = rutas.find(r => r.id === selectedRutaId);
      const cliente = clientes.find(c => c.id_punto === selectedClienteId);

      if (!ruta || !cliente) {
        setStatusMessage("⚠️ Error interno: datos inválidos.");
        return;
      }

      await DatabaseService.paradas.addParadaAdicional(selectedRutaId, selectedClienteId);
      
      // Emit live notifications so client can see push alert immediately!
      addNotification({
        comercioName: cliente.nombre_comercio,
        title: "¡Inyección De Ruta!",
        message: `Se ha asignado una parada adicional express a la ruta '${ruta.nombre_ruta}'.`,
        type: 'info'
      });

      setStatusMessage(`✅ Parada adicional asignada a ${cliente.nombre_comercio} exitosamente.`);
      setSelectedClienteId(''); // reset client dropdown
      refresh();

      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setStatusMessage("⚠️ Falló inserción de parada adicional.");
    }
  };

  // Get only the paradas loaded that are marked as additional
  const additionalStops = paradas.filter(p => p.es_adicional);

  return (
    <div className="space-y-6" id="logistico-panel-root">
      {/* 2-Column layout: Left Map dashboard, Right Hot Stop Ingestor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAP CONTAINER (Spans 2 columns on desktop) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between">
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 space-y-3.5 md:space-y-0">
            <div>
              <h3 className="font-bold text-base leading-tight">Mapa Global Satelital de Flota</h3>
              <p className="text-xs text-slate-400">Verifique el avance y la localización celular de transportistas en tiempo real</p>
            </div>
            {/* Realtime filters overlay */}
            <div className="flex flex-wrap gap-2">
              <div>
                <select
                  value={mapRutaFilter || ''}
                  onChange={e => setMapRutaFilter(e.target.value || null)}
                  className="bg-slate-800 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded border border-slate-700 outline-none"
                >
                  <option value="">🗺️ Filtrar por Ruta</option>
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre_ruta}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={mapDriverFilter || ''}
                  onChange={e => setMapDriverFilter(e.target.value || null)}
                  className="bg-slate-800 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded border border-slate-700 outline-none"
                >
                  <option value="">👤 Filtrar Conductor</option>
                  {conductores.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              {(mapRutaFilter || mapDriverFilter) && (
                <button
                  onClick={() => { setMapRutaFilter(null); setMapDriverFilter(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] uppercase font-bold px-2 py-1 rounded"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="p-4 flex-1 min-h-[400px]">
            <MapaLogistico
              clientes={clientes}
              paradas={paradas}
              ubicaciones={ubicaciones}
              conductores={conductores}
              activeRutaId={mapRutaFilter}
              selectedDriverId={mapDriverFilter}
            />
          </div>
        </div>

        {/* CONTROLLER MODULE */}
        <div className="space-y-6">
          {/* Asignación en caliente */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span>Despacho Adicional Express</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Inserta una parada comercial "en caliente" a una de las rutas activas hoy.</p>

            <form onSubmit={handleAddStop} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">1. Seleccionar Ruta Asignada</label>
                <select
                  value={selectedRutaId}
                  onChange={e => setSelectedRutaId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Elige una ruta --</option>
                  {rutas.map(ruta => {
                    const cond = conductores.find(d => d.id === ruta.conductor_id);
                    return (
                      <option key={ruta.id} value={ruta.id}>
                        {ruta.nombre_ruta} ({cond?.nombre || 'S/D'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">2. Seleccionar Comercio / Punto</label>
                <select
                  value={selectedClienteId}
                  onChange={e => setSelectedClienteId(e.target.value)}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Elige qué comercio visita --</option>
                  {clientes.map(cl => (
                    <option key={cl.id_punto} value={cl.id_punto}>
                      {cl.nombre_comercio} ({cl.direccion})
                    </option>
                  ))}
                </select>
              </div>

              {statusMessage && (
                <div className={`p-2.5 rounded text-xs font-semibold ${
                  statusMessage.startsWith('✅') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {statusMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs tracking-wide transition-all shadow-sm flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Inyectar Parada en Caliente</span>
              </button>
            </form>
          </div>

          {/* List of active express interventions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">Paradas express (es_adicional: true)</h3>
            
            {additionalStops.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <AlertCircle className="w-7 h-7 mx-auto stroke-1 mb-2 text-slate-300" />
                <p className="text-xs italic">No hay intervenciones express programadas.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {additionalStops.map(p => {
                  const client = clientes.find(c => c.id_punto === p.id_punto);
                  const ruta = rutas.find(r => r.id === p.ruta_id);
                  const isCompleted = p.estado === 'Completado';

                  return (
                    <div key={p.id} className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start justify-between">
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">{client?.nombre_comercio}</p>
                        <p className="text-[10px] text-slate-500 leading-none mt-1">Ref: {ruta?.nombre_ruta}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-[9px] bg-slate-900 text-amber-400 px-1 py-0.2 rounded font-mono">Orden: {p.orden_visita}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800 animate-pulse'
                          }`}>{p.estado}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
