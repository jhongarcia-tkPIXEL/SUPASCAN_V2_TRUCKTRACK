/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Cliente, Conductor, RutaMaestra, Parada, UbicacionEnVivo, EntregaComprobante } from '../types';
import { DatabaseService } from '../lib/supabase';
import { Search, MapPin, Truck, Phone, CheckCircle, Clock, ChevronRight, FileCheck, ShieldAlert, Award, Thermometer } from 'lucide-react';
import MapaLogistico from './MapaLogistico';

interface ClientePanelProps {
  clientes: Cliente[];
  conductores: Conductor[];
  rutas: RutaMaestra[];
  paradas: Parada[];
  ubicaciones: UbicacionEnVivo[];
}

export default function ClientePanel({
  clientes,
  conductores,
  rutas,
  paradas,
  ubicaciones
}: ClientePanelProps) {
  const [searchIdPunto, setSearchIdPunto] = useState('');
  const [activeCliente, setActiveCliente] = useState<Cliente | null>(null);
  const [clientParada, setClientParada] = useState<Parada | null>(null);
  const [assignedRuta, setAssignedRuta] = useState<RutaMaestra | null>(null);
  const [assignedDriver, setAssignedDriver] = useState<Conductor | null>(null);
  const [driverUbicacion, setDriverUbicacion] = useState<UbicacionEnVivo | null>(null);
  const [receipt, setReceipt] = useState<EntregaComprobante | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleQuery = (idPunto: string) => {
    setFeedback(null);
    const id = idPunto.trim();
    if (!id) {
      setFeedback("⚠️ Por favor ingresa el código de tu punto.");
      return;
    }

    const matchedClient = clientes.find(c => c.id_punto.toLowerCase() === id.toLowerCase());
    if (!matchedClient) {
      setFeedback("❌ No se encontró ningún comercio con este ID. Comprueba tus datos.");
      setActiveCliente(null);
      return;
    }

    setActiveCliente(matchedClient);
  };

  // Reactively calculate route details, location, and proof of signature for logged client
  useEffect(() => {
    if (!activeCliente) {
      setClientParada(null);
      setAssignedRuta(null);
      setAssignedDriver(null);
      setDriverUbicacion(null);
      setReceipt(null);
      return;
    }

    // Locate active stop for this punto
    const stop = paradas.find(p => p.id_punto === activeCliente.id_punto);
    if (!stop) {
      setClientParada(null);
      setAssignedRuta(null);
      setAssignedDriver(null);
      setDriverUbicacion(null);
      setReceipt(null);
      return;
    }

    setClientParada(stop);

    // Resolve Route
    const route = rutas.find(r => r.id === stop.ruta_id);
    setAssignedRuta(route || null);

    if (route) {
      // Resolve Driver
      const driver = conductores.find(d => d.id === route.conductor_id);
      setAssignedDriver(driver || null);

      if (driver) {
        // Resolve Live GPS
        const live = ubicaciones.find(u => u.conductor_id === driver.id);
        setDriverUbicacion(live || null);
      }
    }

    // Retrieve receipt dockets if the stop is marked completed
    if (stop.estado === 'Completado') {
      DatabaseService.comprobantes.getByParadaId(stop.id).then(res => {
        setReceipt(res);
      });
    } else {
      setReceipt(null);
    }

  }, [activeCliente, paradas, rutas, conductores, ubicaciones]);

  return (
    <div className="space-y-6" id="client-panel-root">
      
      {/* Search authentication frame */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-blue-500" />
              <span>Portal de Auto-Consulta de Clientes</span>
            </h2>
            <p className="text-xs text-slate-500">Consulta el estado del flete, llama al conductor o revisa los comprobantes firmados.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <div className="relative flex-1 sm:w-64">
              <MapPin className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ingresa ID Comercio (ej. P001)"
                value={searchIdPunto}
                onChange={e => setSearchIdPunto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuery(searchIdPunto)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white font-mono"
              />
            </div>
            <button
              onClick={() => handleQuery(searchIdPunto)}
              className="bg-slate-900 text-white font-bold hover:bg-slate-800 text-xs px-4 py-2 rounded-lg tracking-wide transition-all flex items-center justify-center space-x-1"
            >
              <Search className="w-4 h-4" />
              <span>Buscar Comercio</span>
            </button>
          </div>
        </div>

        {/* Info Box helping testing */}
        {!activeCliente && (
          <div className="mt-5 p-4.5 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comercios de prueba (Usa estos IDs):</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {clientes.slice(0, 4).map(c => (
                <button
                  key={c.id_punto}
                  onClick={() => { setSearchIdPunto(c.id_punto); handleQuery(c.id_punto); }}
                  className="p-2 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-lg text-left transition-all"
                >
                  <p className="text-xs font-bold text-slate-900 truncate">{c.nombre_comercio}</p>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">ID: {c.id_punto}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {feedback && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-800 text-xs rounded-lg font-medium">
            {feedback}
          </div>
        )}
      </div>

      {/* Primary Customer Delivery View once authenticated */}
      {activeCliente && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Tracking Details column */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Customer coordinates banner */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <span className="text-[9px] uppercase tracking-wider font-bold text-blue-600 bg-blue-50 border border-blue-150 px-2 py-0.5 rounded">
                Portal de Auto-consulta
              </span>
              <h3 className="font-bold text-base text-slate-900 mt-3">{activeCliente.nombre_comercio}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{activeCliente.direccion}</p>
              
              <div className="border-t border-slate-100 pt-3 mt-4 text-xs flex justify-between text-slate-500">
                <span>Tu ID de Punto:</span>
                <span className="font-mono font-bold text-slate-800">{activeCliente.id_punto}</span>
              </div>
            </div>

            {/* Live Progress timeline tracker card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest mb-4">Estado del Pedido (Flete)</h3>
              
              {!clientParada ? (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start space-x-2">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">No se detecta despacho asignado a tu ID hoy. Contacte con logística.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Timeline node list */}
                  <div className="relative pl-5.5 space-y-5">
                    {/* Visual connecting pipe */}
                    <div className="absolute left-2.5 top-2.5 bottom-2 w-[1px] bg-slate-200"></div>

                    {/* Step 1: Programado */}
                    <div className="relative">
                      <span className="absolute -left-5.5 top-0.5 w-5 h-5 rounded-full bg-blue-600 border border-blue-700 flex items-center justify-center font-bold text-[9px] text-white">✓</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-none">Carga Consolidada & Programada</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">La ruta de despacho maestro fue aprobada por el centro logístico</p>
                      </div>
                    </div>

                    {/* Step 2: En ruta */}
                    <div className="relative">
                      <span className={`absolute -left-5.5 top-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                        clientParada.estado === 'En Ruta' || clientParada.estado === 'Completado'
                          ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {clientParada.estado === 'En Ruta' || clientParada.estado === 'Completado' ? '✓' : '2'}
                      </span>
                      <div>
                        <h4 className={`text-xs font-bold leading-none ${
                          clientParada.estado === 'En Ruta' || clientParada.estado === 'Completado' ? 'text-slate-900' : 'text-slate-400'
                        }`}>Camión en Tránsito</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">El camión zarpó del almacén central y está cubriendo la secuencia de entrega</p>
                      </div>
                    </div>

                    {/* Step 3: Entregado */}
                    <div className="relative">
                      <span className={`absolute -left-5.5 top-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] ${
                        clientParada.estado === 'Completado'
                          ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}>
                        {clientParada.estado === 'Completado' ? '✓' : '3'}
                      </span>
                      <div>
                        <h4 className={`text-xs font-bold leading-none ${
                          clientParada.estado === 'Completado' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>Entregado & Confirmado</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">El despachador cargó la firma electrónica y las fotos de soporte</p>
                      </div>
                    </div>
                  </div>

                  {/* Current Stop details and Contact driver */}
                  {assignedDriver && (
                    <div className="pt-3.5 border-t border-slate-100 space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transportadora asignada:</p>
                        <p className="text-xs font-bold text-slate-900 mt-0.5">{assignedDriver.nombre}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">Placa: {assignedDriver.vehiculo_placa}</p>
                      </div>

                      {/* Native HTML call anchor */}
                      <a
                        href={`tel:${assignedDriver.telefono}`}
                        className="w-full inline-flex items-center justify-center space-x-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all"
                      >
                        <Phone className="w-4 h-4 text-slate-600" />
                        <span>Llamar al Conductor ({assignedDriver.telefono})</span>
                      </a>
                    </div>
                  )}

                  {clientParada.es_adicional && (
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-800 text-[11px] leading-tight flex items-start space-x-1.5 border border-blue-100">
                      <Award className="w-4.5 h-4.5 text-blue-600 shrink-0 mt-0.5" />
                      <p>Este despacho fue programado en caliente bajo modalidad <strong>Servicio Express Adicional</strong>.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Map Column & Delivery Proof Section */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live geo location container */}
            {clientParada && clientParada.estado !== 'Completado' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800">
                  <h4 className="font-bold text-sm tracking-tight flex items-center space-x-2">
                    <Truck className="w-4.5 h-4.5 text-amber-400 animate-bounce" />
                    <span>Ubicación Satelital de tu Pedido</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">El transportista reporta su geolocalización satelital actual en tiempo real</p>
                </div>
                <div className="p-4 h-[350px]">
                  <MapaLogistico
                    clientes={clientes}
                    paradas={[clientParada]}
                    ubicaciones={driverUbicacion ? [driverUbicacion] : []}
                    conductores={assignedDriver ? [assignedDriver] : []}
                    activeRutaId={clientParada.ruta_id}
                    selectedDriverId={assignedDriver?.id}
                  />
                </div>
              </div>
            )}

            {/* Completed Proof of Delivery details */}
            {clientParada && clientParada.estado === 'Completado' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-800">¡Pedido Entregado con Éxito!</h4>
                    <p className="text-[10px] text-emerald-600">Comprobante consolidado en base de datos.</p>
                  </div>
                </div>

                {receipt ? (
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">REGISTRO DE RECIBIDO ELECTRÓNICO</p>
                    
                    {/* Timestamp & Temperature Grid Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Fecha y Hora de Recibo</p>
                        <p className="text-xs text-slate-800 font-mono font-semibold mt-0.5">{new Date(receipt.fecha_hora_entrega).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400 flex items-center space-x-1">
                          <Thermometer className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>Temperatura de Carga</span>
                        </p>
                        <p className="text-xs text-blue-600 font-mono font-bold mt-0.5">
                          {receipt.temperatura || "N/A (Entrega Previa)"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Images display */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fotos de Soporte de la Carga</p>
                      <div className="grid grid-cols-3 gap-3">
                        {receipt.url_foto_1 && (
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200" id="photo-frame-1">
                            <img src={receipt.url_foto_1} alt="Foto de carga 1" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {receipt.url_foto_2 && (
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200" id="photo-frame-2">
                            <img src={receipt.url_foto_2} alt="Foto de carga 2" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        {receipt.url_foto_3 && (
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200" id="photo-frame-3">
                            <img src={receipt.url_foto_3} alt="Foto de carga 3" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signature display */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Firma de Conformidad Cargada</p>
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-250 max-w-xs" id="sig-frame">
                        <img 
                          src={receipt.url_firma} 
                          alt="Firma del receptor" 
                          className="max-h-24 object-contain mx-auto mix-blend-multiply" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400">
                    <FileCheck className="w-8 h-8 mx-auto text-slate-300 stroke-1 mb-1.5" />
                    <p className="text-xs">Extrayendo comprobantes adjuntos en almacenamiento...</p>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}

    </div>
  );
}
