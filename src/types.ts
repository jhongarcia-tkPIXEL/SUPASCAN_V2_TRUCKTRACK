/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  id_punto: string; // ID uniquely identifying the punto / comercio
  nombre_comercio: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

export interface Conductor {
  id: string; // Unique ID for conductor
  nombre: string;
  telefono: string;
  vehiculo_placa: string;
}

export interface RutaMaestra {
  id: string;
  conductor_id: string;
  dia_semana: string; // 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'
  nombre_ruta: string;
}

export interface Parada {
  id: string;
  ruta_id: string;
  id_punto: string;
  orden_visita: number;
  estado: 'Pendiente' | 'En Ruta' | 'Completado' | 'No Entregado';
  es_adicional: boolean;
}

export interface UbicacionEnVivo {
  conductor_id: string;
  latitud: number;
  longitud: number;
  actualizado_en?: string; // ISO string timestamps
}

export interface EntregaComprobante {
  id: string;
  parada_id: string;
  url_foto_1: string;
  url_foto_2: string;
  url_foto_3: string;
  url_firma: string; // stored as dataURL or storage bucket URL
  fecha_hora_entrega: string;
  temperatura?: string;
}

export interface AppNotification {
  id: string;
  comercioName: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'alert';
}

// Global seed mock data to use if Supabase credentials are not configured
export const MOCK_CLIENTS: Cliente[] = [
  { id_punto: "P001", nombre_comercio: "Café Devoción (Zona G)", direccion: "Calle 65 # 8-08", latitud: 4.6469, longitud: -74.0620 },
  { id_punto: "P002", nombre_comercio: "Masa Calle 70", direccion: "Calle 70 # 4-83", latitud: 4.6521, longitud: -74.0573 },
  { id_punto: "P003", nombre_comercio: "Crepes & Waffles (Usaquén)", direccion: "Carrera 6 # 119-24", latitud: 4.6975, longitud: -74.0305 },
  { id_punto: "P004", nombre_comercio: "El Bandido Bistro", direccion: "Calle 79a # 8-30", latitud: 4.6645, longitud: -74.0535 },
  { id_punto: "P005", nombre_comercio: "La Lucha Sanguchería", direccion: "Carrera 11 # 84-40", latitud: 4.6698, longitud: -74.0545 },
  { id_punto: "P006", nombre_comercio: "Restaurante Leo", direccion: "Carrera 4 # 26 B-46", latitud: 4.6163, longitud: -74.0682 },
  { id_punto: "P007", nombre_comercio: "Wok Parkway", direccion: "Carrera 24 # 39a-24", latitud: 4.6305, longitud: -74.0772 },
  { id_punto: "P008", nombre_comercio: "Café Cultor (Calle 69)", direccion: "Calle 69 # 6-20", latitud: 4.6510, longitud: -74.0592 }
];

export const MOCK_CONDUCTORES: Conductor[] = [
  { id: "C001", nombre: "Carlos Mendoza", telefono: "+573151234567", vehiculo_placa: "STX-789" },
  { id: "C002", nombre: "Juan Carlos Beltrán", telefono: "+573219876543", vehiculo_placa: "WXY-456" },
  { id: "C003", nombre: "Andrés Ortega", telefono: "+573103456789", vehiculo_placa: "KJH-102" }
];

export const MOCK_RUTAS: RutaMaestra[] = [
  { id: "R1", conductor_id: "C001", dia_semana: "Lunes", nombre_ruta: "Ruta Lunes - Canal Cafés Norte" },
  { id: "R2", conductor_id: "C002", dia_semana: "Lunes", nombre_ruta: "Ruta Lunes - Corredor Gourmet Chapinero" },
  { id: "R3", conductor_id: "C003", dia_semana: "Lunes", nombre_ruta: "Ruta Lunes - Gastronomía Centro e Histórico" },
  { id: "R4", conductor_id: "C001", dia_semana: "Martes", nombre_ruta: "Ruta Martes - Abastecimiento Usaquén y Zona Norte" },
  { id: "R5", conductor_id: "C002", dia_semana: "Martes", nombre_ruta: "Ruta Martes - Sabores Teusaquillo" },
  { id: "R6", conductor_id: "C003", dia_semana: "Martes", nombre_ruta: "Ruta Martes - Reparto Express" }
];

export const MOCK_PARADAS: Parada[] = [
  // Ruta 1 - Carlos Mendoza Monday (3 paradas)
  { id: "S1", ruta_id: "R1", id_punto: "P001", orden_visita: 1, estado: "Pendiente", es_adicional: false },
  { id: "S2", ruta_id: "R1", id_punto: "P002", orden_visita: 2, estado: "Pendiente", es_adicional: false },
  { id: "S3", ruta_id: "R1", id_punto: "P003", orden_visita: 3, estado: "Pendiente", es_adicional: false },
  
  // Ruta 2 - Juan Carlos Beltrán Monday (3 paradas)
  { id: "S4", ruta_id: "R2", id_punto: "P004", orden_visita: 1, estado: "Pendiente", es_adicional: false },
  { id: "S5", ruta_id: "R2", id_punto: "P005", orden_visita: 2, estado: "Pendiente", es_adicional: false },
  { id: "S6", ruta_id: "R2", id_punto: "P006", orden_visita: 3, estado: "Pendiente", es_adicional: false },

  // Ruta 3 - Andrés Ortega Monday (2 paradas)
  { id: "S7", ruta_id: "R3", id_punto: "P006", orden_visita: 1, estado: "Pendiente", es_adicional: false },
  { id: "S8", ruta_id: "R3", id_punto: "P007", orden_visita: 2, estado: "Pendiente", es_adicional: false },

  // Ruta 4 - Carlos Mendoza Tuesday (2 paradas)
  { id: "S9", ruta_id: "R4", id_punto: "P003", orden_visita: 1, estado: "Pendiente", es_adicional: false },
  { id: "S10", ruta_id: "R4", id_punto: "P008", orden_visita: 2, estado: "Pendiente", es_adicional: false }
];

export const MOCK_UBICACIONES: UbicacionEnVivo[] = [
  { conductor_id: "C001", latitud: 4.6430, longitud: -74.0640, actualizado_en: new Date().toISOString() },
  { conductor_id: "C002", latitud: 4.6600, longitud: -74.0550, actualizado_en: new Date().toISOString() },
  { conductor_id: "C003", latitud: 4.6200, longitud: -74.0720, actualizado_en: new Date().toISOString() }
];
