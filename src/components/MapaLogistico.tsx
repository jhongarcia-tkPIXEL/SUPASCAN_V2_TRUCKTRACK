/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { Cliente, Parada, UbicacionEnVivo, Conductor } from '../types';

interface MapaLogisticoProps {
  clientes: Cliente[];
  paradas?: Parada[];
  ubicaciones?: UbicacionEnVivo[];
  conductores?: Conductor[];
  activeRutaId?: string | null;
  selectedDriverId?: string | null;
}

// Leaflet type safety reference helper
declare const L: any;

export default function MapaLogistico({
  clientes,
  paradas = [],
  ubicaciones = [],
  conductores = [],
  activeRutaId = null,
  selectedDriverId = null
}: MapaLogisticoProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const makersGroupRef = useRef<any>(null);
  const routePolylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Check if Leaflet L global is loaded from index.html
    if (typeof L === 'undefined') {
      console.warn("Leaflet global 'L' is not loaded yet.");
      return;
    }

    // Initialize map if not already instantiated
    if (!mapInstanceRef.current) {
      // Centered on Bogotá coordinates as our gorgeous default location
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [4.6500, -74.0600],
        zoom: 12.5,
        zoomControl: true,
        scrollWheelZoom: true
      });

      // Load clean, crisp vector map tile layers (CartoDB Positron is beautifully premium and modern)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);

      makersGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;
    const markersGroup = makersGroupRef.current;

    // Clean up current markers and route polylines
    markersGroup.clearLayers();
    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    // Filter down paradas depending on focus
    const filteredParadas = activeRutaId 
      ? paradas.filter(p => p.ruta_id === activeRutaId)
      : paradas;

    const bounds: any[] = [];

    // Match clients associated with the selected paradas
    const stopsToMap = filteredParadas.map(parada => {
      const cliente = clientes.find(c => c.id_punto === parada.id_punto);
      return { parada, cliente };
    }).filter(item => item.cliente !== undefined) as { parada: Parada; cliente: Cliente }[];

    // Render client/stop markers
    stopsToMap.forEach(({ parada, cliente }) => {
      const isCompleted = parada.estado === 'Completado';
      const isInRoute = parada.estado === 'En Ruta';
      const isAdicional = parada.es_adicional;

      // Color scheme based on delivery node state
      const fillColor = isCompleted ? '#10B981' : (isInRoute ? '#F59E0B' : '#64748B');
      const badgeText = isAdicional ? `📍 Adic` : `#${parada.orden_visita}`;

      const iconHtml = `
        <div class="flex flex-col items-center justify-center">
          <div class="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-semibold" 
               style="background-color: ${fillColor};">
            ${parada.es_adicional ? '⭐' : parada.orden_visita}
          </div>
          <span class="mt-0.5 px-1.5 py-0.2 rounded bg-slate-900/90 text-[10px] text-white font-mono leading-none border border-slate-700 whitespace-nowrap shadow-sm">
            ${cliente.nombre_comercio.substring(0, 15)}...
          </span>
        </div>
      `;

      const divIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [40, 50],
        iconAnchor: [20, 30]
      });

      const marker = L.marker([cliente.latitud, cliente.longitud], { icon: divIcon });
      
      const popupContent = `
        <div class="p-3 text-slate-800">
          <div class="flex items-center space-x-1">
            <span class="text-xs px-1.5 py-0.5 rounded font-mono font-bold ${
              isCompleted ? 'bg-emerald-100 text-emerald-800' : 
              isInRoute ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
            }">${parada.estado.toUpperCase()}</span>
            ${isAdicional ? '<span class="text-[10px] bg-blue-100 text-blue-800 px-1 py-0.2 rounded font-semibold">Adicional</span>' : ''}
          </div>
          <h4 class="font-bold text-sm mt-1.5 text-slate-900">${cliente.nombre_comercio}</h4>
          <p class="text-xs text-slate-600 mt-1">${cliente.direccion}</p>
          <div class="mt-2 text-xs border-t border-slate-100 pt-1 flex justify-between">
            <span class="text-slate-500">Orden de visita:</span>
            <span class="font-bold">${parada.orden_visita}</span>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersGroup.addLayer(marker);
      bounds.push([cliente.latitud, cliente.longitud]);
    });

    // Draw active truck trackers
    const activeDriversToDisplay = selectedDriverId 
      ? ubicaciones.filter(u => u.conductor_id === selectedDriverId)
      : ubicaciones;

    activeDriversToDisplay.forEach(live => {
      const driver = conductores.find(d => d.id === live.conductor_id);
      const driverName = driver ? driver.nombre : "Camión en Ruta";
      const plate = driver ? driver.vehiculo_placa : "Ubicación";

      const timeDiffSeconds = Math.floor((Date.now() - new Date(live.actualizado_en || Date.now()).getTime()) / 1000);
      const isOnline = timeDiffSeconds < 60; // Green pulse if updated in the last minute

      const truckHtml = `
        <div class="relative flex flex-col items-center">
          <div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-rose-500'} border border-white"></div>
          <div class="w-9 h-9 rounded-full bg-slate-900 hover:bg-slate-800 flex items-center justify-center text-white border-2 border-amber-400 shadow-lg cursor-pointer transition-transform duration-200 hover:scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><rect width="16" height="13" x="2" y="6" rx="2"/><path d="M16 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H2"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div class="mt-0.5 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold border border-amber-500 text-[10px] whitespace-nowrap leading-none tracking-tight shadow-md">
            🚚 ${plate}
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        html: truckHtml,
        className: 'custom-truck-icon',
        iconSize: [36, 45],
        iconAnchor: [18, 25]
      });

      const marker = L.marker([live.latitud, live.longitud], { icon: divIcon });
      
      const popupContent = `
        <div class="p-3 text-slate-800">
          <div class="flex items-center space-x-1.5">
            <span class="w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500 animate-ping' : 'bg-amber-500'}"></span>
            <span class="text-[10px] font-bold tracking-wider text-slate-500">${isOnline ? 'TRANSMITIENDO EN VIVO' : 'ÚLTIMA CONEXIÓN RECIENTE'}</span>
          </div>
          <h4 class="font-bold text-sm mt-1 text-slate-950">${driverName}</h4>
          <p class="text-xs text-slate-500">Vehículo: <span class="font-mono text-slate-800 font-semibold">${plate}</span></p>
          <div class="mt-2 text-xs border-t border-slate-100 pt-1">
            <p class="text-slate-500">Lat: <span class="font-mono">${live.latitud.toFixed(5)}</span> | Lng: <span class="font-mono">${live.longitud.toFixed(5)}</span></p>
            <p class="text-[10px] text-slate-400 mt-1">Act: ${new Date(live.actualizado_en || '').toLocaleTimeString()}</p>
          </div>
        </div>
      `;
      marker.bindPopup(popupContent);
      markersGroup.addLayer(marker);
      bounds.push([live.latitud, live.longitud]);
    });

    // Draw routing lines connecting chronological client stops on active route focusing
    if (activeRutaId && stopsToMap.length > 0) {
      const sortedPoints = [...stopsToMap].sort((a, b) => a.parada.orden_visita - b.parada.orden_visita);
      const latlngs = sortedPoints.map(item => [item.cliente!.latitud, item.cliente!.longitud]);

      if (latlngs.length >= 2) {
        routePolylineRef.current = L.polyline(latlngs, {
          color: '#3B82F6', // Blue highway tracker line
          weight: 4,
          opacity: 0.7,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(map);
      }
    }

    // Auto-fit bounds if we have points mapped
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        // Fallback catch for bounds calculation safety
      }
    }

  }, [clientes, paradas, ubicaciones, conductores, activeRutaId, selectedDriverId]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Container Resize cleanly with standard ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    observer.observe(mapContainerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[350px] md:min-h-[450px]">
      <div 
        ref={mapContainerRef} 
        id="leaflet-logistica-map"
        className="w-full h-full min-h-[100%] rounded-xl shadow-lg border border-slate-200" 
      />
      {/* Dynamic Overlay legend indicator */}
      <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white p-2.5 rounded-lg border border-slate-700 text-[10px] z-[500] font-sans flex flex-col space-y-1 shadow-xl">
        <span className="font-bold border-b border-slate-700 pb-1 mb-1 tracking-wider">ESTADO DE PARADAS</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block"></span>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse"></span>
          <span>En Ruta (Asignada)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span>Completada</span>
        </div>
        <div className="flex items-center space-x-1.5 border-t border-slate-700 pt-1 mt-1">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500 inline-block"></span>
          <span>🚚 Camión (Transmisor)</span>
        </div>
      </div>
    </div>
  );
}
