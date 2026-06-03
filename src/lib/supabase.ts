/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { 
  Cliente, Conductor, RutaMaestra, Parada, UbicacionEnVivo, EntregaComprobante, AppNotification,
  MOCK_CLIENTS, MOCK_CONDUCTORES, MOCK_RUTAS, MOCK_PARADAS, MOCK_UBICACIONES 
} from '../types';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY && 
  !SUPABASE_URL.includes("MY_") && 
  !SUPABASE_ANON_KEY.includes("MY_")
);

let supabaseInstance: any = null;

export function getSupabase() {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return supabaseInstance;
}

// Subscriptions & Local State Storage Helper for high-fidelity offline/demo mode
const LOCAL_STORAGE_KEYS = {
  CLIENTES: 'logistica_clientes',
  CONDUCTORES: 'logistica_conductores',
  RUTAS: 'logistica_rutas',
  PARADAS: 'logistica_paradas',
  UBICACIONES: 'logistica_ubicaciones',
  COMPROBANTES: 'logistica_comprobantes',
  NOTIFICATIONS: 'logistica_notifications'
};

function getLocalData<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultVal));
    return defaultVal;
  }
  try {
    return JSON.parse(stored) as T;
  } catch (e) {
    return defaultVal;
  }
}

function setLocalData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
  // Emit custom event for cross-view synchronization in active frame
  window.dispatchEvent(new CustomEvent('logistica_state_changed', { detail: { key } }));
}

// Initialize local storages with seed data if they do not exist
export function initializeLocalStorage() {
  getLocalData<Cliente[]>(LOCAL_STORAGE_KEYS.CLIENTES, MOCK_CLIENTS);
  getLocalData<Conductor[]>(LOCAL_STORAGE_KEYS.CONDUCTORES, MOCK_CONDUCTORES);
  getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
  getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
  getLocalData<UbicacionEnVivo[]>(LOCAL_STORAGE_KEYS.UBICACIONES, MOCK_UBICACIONES);
  getLocalData<EntregaComprobante[]>(LOCAL_STORAGE_KEYS.COMPROBANTES, []);
  getLocalData<AppNotification[]>(LOCAL_STORAGE_KEYS.NOTIFICATIONS, [
    {
      id: "n-init-1",
      comercioName: "Café Devoción (Zona G)",
      title: "Ruta Programada",
      message: "Carga consolidada asignada para despacho hoy.",
      timestamp: new Date().toISOString(),
      type: 'info'
    }
  ]);
}

// Unified Database Service supporting pure Supabase OR high-fidelity offline sync fallback
export const DatabaseService = {
  // Clientes operations
  clientes: {
    async getAll(): Promise<Cliente[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('clientes').select('*');
        if (!error && data) return data;
        console.warn("Supabase clients query error, falling back to local: ", error);
      }
      return getLocalData<Cliente[]>(LOCAL_STORAGE_KEYS.CLIENTES, MOCK_CLIENTS);
    },
    async create(cliente: Cliente): Promise<Cliente> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('clientes').insert(cliente).select().single();
        if (!error && data) return data;
        console.warn("Supabase clients insert error, falling back to local: ", error);
      }
      const list = getLocalData<Cliente[]>(LOCAL_STORAGE_KEYS.CLIENTES, MOCK_CLIENTS);
      list.push(cliente);
      setLocalData(LOCAL_STORAGE_KEYS.CLIENTES, list);
      return cliente;
    }
  },

  // Conductores operations
  conductores: {
    async getAll(): Promise<Conductor[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('conductores').select('*');
        if (!error && data) return data;
        console.warn("Supabase drivers query error, falling back to local: ", error);
      }
      return getLocalData<Conductor[]>(LOCAL_STORAGE_KEYS.CONDUCTORES, MOCK_CONDUCTORES);
    }
  },

  // Rutas maestras operations
  rutas: {
    async getAll(): Promise<RutaMaestra[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('rutas_maestras').select('*');
        if (!error && data) return data;
        console.warn("Supabase routes query error, falling back to local: ", error);
      }
      return getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
    },
    async getByConductorAndDay(conductorId: string, dia: string): Promise<RutaMaestra | null> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('rutas_maestras')
          .select('*')
          .eq('conductor_id', conductorId)
          .eq('dia_semana', dia)
          .maybeSingle();
        if (!error && data) return data;
        console.warn(`Supabase route by driver day query error, falling back to local: `, error);
      }
      const list = getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
      return list.find(r => r.conductor_id === conductorId && r.dia_semana.toLowerCase() === dia.toLowerCase()) || null;
    },
    async create(ruta: RutaMaestra): Promise<RutaMaestra> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('rutas_maestras').insert({
          id: ruta.id,
          conductor_id: ruta.conductor_id,
          dia_semana: ruta.dia_semana,
          nombre_ruta: ruta.nombre_ruta
        }).select().single();
        if (!error && data) return data;
        console.warn("Supabase routes insert error, falling back to local: ", error);
      }
      const list = getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
      list.push(ruta);
      setLocalData(LOCAL_STORAGE_KEYS.RUTAS, list);
      return ruta;
    },
    async update(ruta: RutaMaestra): Promise<RutaMaestra | null> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('rutas_maestras')
          .update({
            conductor_id: ruta.conductor_id,
            dia_semana: ruta.dia_semana,
            nombre_ruta: ruta.nombre_ruta
          })
          .eq('id', ruta.id)
          .select()
          .maybeSingle();
        if (!error && data) return data;
        console.warn("Supabase routes update error, falling back to local: ", error);
      }
      const list = getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
      const index = list.findIndex(r => r.id === ruta.id);
      if (index === -1) return null;
      list[index] = { ...list[index], ...ruta };
      setLocalData(LOCAL_STORAGE_KEYS.RUTAS, list);
      return list[index];
    },
    async delete(id: string): Promise<boolean> {
      const client = getSupabase();
      if (client) {
        const { error } = await client.from('rutas_maestras').delete().eq('id', id);
        if (!error) return true;
        console.warn("Supabase routes delete error, falling back to local: ", error);
      }
      const list = getLocalData<RutaMaestra[]>(LOCAL_STORAGE_KEYS.RUTAS, MOCK_RUTAS);
      const index = list.findIndex(r => r.id === id);
      if (index === -1) return false;
      list.splice(index, 1);
      setLocalData(LOCAL_STORAGE_KEYS.RUTAS, list);
      return true;
    }
  },

  // Paradas operations
  paradas: {
    async getAll(): Promise<Parada[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('paradas').select('*');
        if (!error && data) return data;
      }
      return getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
    },
    async getByRutaId(rutaId: string): Promise<Parada[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('paradas')
          .select('*')
          .eq('ruta_id', rutaId)
          .order('orden_visita', { ascending: true });
        if (!error && data) return data;
        console.warn(`Supabase route paradas query error, falling back to local: `, error);
      }
      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      return list
        .filter(p => p.ruta_id === rutaId)
        .sort((a, b) => a.orden_visita - b.orden_visita);
    },
    async updateEstado(paradaId: string, estado: Parada['estado']): Promise<Parada | null> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('paradas')
          .update({ estado })
          .eq('id', paradaId)
          .select()
          .maybeSingle();
        if (!error && data) return data;
        console.warn(`Supabase parada update error, falling back to local: `, error);
      }
      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      const index = list.findIndex(p => p.id === paradaId);
      if (index === -1) return null;
      list[index].estado = estado;
      setLocalData(LOCAL_STORAGE_KEYS.PARADAS, list);
      return list[index];
    },
    async addParada(rutaId: string, id_punto: string, orden: number): Promise<Parada> {
      const client = getSupabase();
      const newParada: Parada = {
        id: `S-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ruta_id: rutaId,
        id_punto,
        orden_visita: orden,
        estado: 'Pendiente',
        es_adicional: false
      };
      if (client) {
        const { data, error } = await client.from('paradas')
          .insert({
            ruta_id: rutaId,
            id_punto,
            orden_visita: orden,
            estado: 'Pendiente',
            es_adicional: false
          })
          .select()
          .single();
        if (!error && data) return data;
        console.warn(`Supabase add parada error, falling back to local: `, error);
      }
      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      list.push(newParada);
      setLocalData(LOCAL_STORAGE_KEYS.PARADAS, list);
      return newParada;
    },
    async updateOrden(paradaId: string, orden: number): Promise<Parada | null> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('paradas')
          .update({ orden_visita: orden })
          .eq('id', paradaId)
          .select()
          .maybeSingle();
        if (!error && data) return data;
        console.warn(`Supabase update orden error, falling back to local: `, error);
      }
      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      const index = list.findIndex(p => p.id === paradaId);
      if (index === -1) return null;
      list[index].orden_visita = orden;
      setLocalData(LOCAL_STORAGE_KEYS.PARADAS, list);
      return list[index];
    },
    async deleteParada(paradaId: string): Promise<boolean> {
      const client = getSupabase();
      if (client) {
        const { error } = await client.from('paradas').delete().eq('id', paradaId);
        if (!error) return true;
        console.warn(`Supabase delete parada error, falling back to local: `, error);
      }
      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      const index = list.findIndex(p => p.id === paradaId);
      if (index === -1) return false;
      list.splice(index, 1);
      setLocalData(LOCAL_STORAGE_KEYS.PARADAS, list);
      return true;
    },
    async addParadaAdicional(rutaId: string, id_punto: string): Promise<Parada> {
      const client = getSupabase();
      // Calculate next orden_visita
      const currentParadas = await this.getByRutaId(rutaId);
      const nextOrden = currentParadas.length > 0 
        ? Math.max(...currentParadas.map(p => p.orden_visita)) + 1 
        : 1;

      const newParada: Parada = {
        id: `S-ADD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ruta_id: rutaId,
        id_punto,
        orden_visita: nextOrden,
        estado: 'Pendiente',
        es_adicional: true
      };

      if (client) {
        const { data, error } = await client.from('paradas')
          .insert({
            ruta_id: rutaId,
            id_punto,
            orden_visita: nextOrden,
            estado: 'Pendiente',
            es_adicional: true
          })
          .select()
          .single();
        if (!error && data) return data;
        console.warn(`Supabase add additional parada error, falling back to local: `, error);
      }

      const list = getLocalData<Parada[]>(LOCAL_STORAGE_KEYS.PARADAS, MOCK_PARADAS);
      list.push(newParada);
      setLocalData(LOCAL_STORAGE_KEYS.PARADAS, list);
      return newParada;
    }
  },

  // Ubicaciones en vivo operations
  ubicaciones: {
    async getAll(): Promise<UbicacionEnVivo[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('ubicaciones_en_vivo').select('*');
        if (!error && data) return data;
      }
      return getLocalData<UbicacionEnVivo[]>(LOCAL_STORAGE_KEYS.UBICACIONES, MOCK_UBICACIONES);
    },
    async upsert(conductorId: string, latitud: number, longitud: number): Promise<UbicacionEnVivo> {
      const client = getSupabase();
      const updatedItem: UbicacionEnVivo = {
        conductor_id: conductorId,
        latitud,
        longitud,
        actualizado_en: new Date().toISOString()
      };

      if (client) {
        const { data, error } = await client.from('ubicaciones_en_vivo')
          .upsert({
            conductor_id: conductorId,
            latitud,
            longitud,
            actualizado_en: new Date().toISOString()
          })
          .select()
          .single();
        if (!error && data) return data;
        console.warn(`Supabase live coordinates upsert error, falling back to local: `, error);
      }

      const list = getLocalData<UbicacionEnVivo[]>(LOCAL_STORAGE_KEYS.UBICACIONES, MOCK_UBICACIONES);
      const index = list.findIndex(u => u.conductor_id === conductorId);
      if (index > -1) {
        list[index] = updatedItem;
      } else {
        list.push(updatedItem);
      }
      setLocalData(LOCAL_STORAGE_KEYS.UBICACIONES, list);
      return updatedItem;
    }
  },

  // Comprobantes (Storage bucket 'comprobantes' + entregas_comprobantes insert)
  comprobantes: {
    async insert(comprobante: EntregaComprobante): Promise<EntregaComprobante> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('entregas_comprobantes')
          .insert({
            parada_id: comprobante.parada_id,
            url_foto_1: comprobante.url_foto_1,
            url_foto_2: comprobante.url_foto_2,
            url_foto_3: comprobante.url_foto_3,
            url_firma: comprobante.url_firma,
            fecha_hora_entrega: comprobante.fecha_hora_entrega,
            temperatura: comprobante.temperatura
          })
          .select()
          .single();
        if (!error && data) return data;
        console.warn(`Supabase entregas comprobantes insert failed, using local: `, error);
      }
      const list = getLocalData<EntregaComprobante[]>(LOCAL_STORAGE_KEYS.COMPROBANTES, []);
      list.push(comprobante);
      setLocalData(LOCAL_STORAGE_KEYS.COMPROBANTES, list);
      return comprobante;
    },

    async getByParadaId(paradaId: string): Promise<EntregaComprobante | null> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('entregas_comprobantes')
          .select('*')
          .eq('parada_id', paradaId)
          .maybeSingle();
        if (!error && data) return data;
      }
      const list = getLocalData<EntregaComprobante[]>(LOCAL_STORAGE_KEYS.COMPROBANTES, []);
      return list.find(c => c.parada_id === paradaId) || null;
    },

    async getAll(): Promise<EntregaComprobante[]> {
      const client = getSupabase();
      if (client) {
        const { data, error } = await client.from('entregas_comprobantes').select('*');
        if (!error && data) return data;
      }
      return getLocalData<EntregaComprobante[]>(LOCAL_STORAGE_KEYS.COMPROBANTES, []);
    },

    // Method to handle uploading photos and signatures to Supabase Storage Bucket, or fall back to high-fidelity storage simulators
    async uploadFile(pathName: string, base64data: string): Promise<string> {
      const client = getSupabase();
      if (client) {
        try {
          // Convert base64 into a Blob to feed to Supabase Storage
          const arr = base64data.split(',');
          const mimeStr = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mimeStr });
          const file = new File([blob], `${pathName.split('/').pop()}`, { type: mimeStr });

          const { error } = await client.storage
            .from('comprobantes')
            .upload(pathName, file, {
              cacheControl: '3600',
              upsert: true
            });

          if (!error) {
            const { data } = client.storage.from('comprobantes').getPublicUrl(pathName);
            return data.publicUrl;
          }
          console.warn("Supabase Storage upload error, falling back to local state links: ", error);
        } catch (e) {
          console.error("Failed to parsed base64 for real Supabase store", e);
        }
      }
      // Demo mode returns the base64 URI directly (which renders perfectly in HTML img tags!)
      return base64data;
    }
  },

  // Custom Notifications for live push alerts
  notifications: {
    getAll(): AppNotification[] {
      return getLocalData<AppNotification[]>(LOCAL_STORAGE_KEYS.NOTIFICATIONS, []);
    },
    add(notification: Omit<AppNotification, 'id' | 'timestamp'>): AppNotification {
      const list = getLocalData<AppNotification[]>(LOCAL_STORAGE_KEYS.NOTIFICATIONS, []);
      const item: AppNotification = {
        ...notification,
        id: `N-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      list.unshift(item); // insert at start
      setLocalData(LOCAL_STORAGE_KEYS.NOTIFICATIONS, list);
      return item;
    },
    clearAll() {
      setLocalData(LOCAL_STORAGE_KEYS.NOTIFICATIONS, []);
    }
  },

  // Extra tool to sync local mock data to Supabase
  supabaseSync: {
    async syncAllMockData(): Promise<{ success: boolean; message: string }> {
      const client = getSupabase();
      if (!client) {
        return { success: false, message: "Supabase no está configurado" };
      }
      try {
        // 1. Clientes
        const { error: clErr } = await client.from('clientes').upsert(MOCK_CLIENTS);
        if (clErr) console.warn("Error syncing clientes:", clErr);

        // 2. Conductores
        const { error: condErr } = await client.from('conductores').upsert(MOCK_CONDUCTORES);
        if (condErr) console.warn("Error syncing conductores:", condErr);

        // 3. Rutas Maestras
        const { error: rutErr } = await client.from('rutas_maestras').upsert(
          MOCK_RUTAS.map(r => ({
            id: r.id,
            conductor_id: r.conductor_id,
            dia_semana: r.dia_semana,
            nombre_ruta: r.nombre_ruta
          }))
        );
        if (rutErr) console.warn("Error syncing rutas_maestras:", rutErr);

        // 4. Paradas
        const { error: parErr } = await client.from('paradas').upsert(
          MOCK_PARADAS.map(p => ({
            id: p.id,
            ruta_id: p.ruta_id,
            id_punto: p.id_punto,
            orden_visita: p.orden_visita,
            estado: p.estado,
            es_adicional: p.es_adicional
          }))
        );
        if (parErr) console.warn("Error syncing paradas:", parErr);

        return { success: true, message: "¡Tablas base de simulación sincronizadas con éxito en Supabase!" };
      } catch (err: any) {
        console.error("Error at syncAllMockData:", err);
        return { success: false, message: `Fallo de sincronización: ${err?.message || err}` };
      }
    }
  },

  // Supabase Auth and Local Session Manager
  auth: {
    async signIn(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: 'admin' | 'logistico' | 'cliente' | 'conductor'; name: string }; message?: string }> {
      const client = getSupabase();
      if (client) {
        try {
          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) {
            return { success: false, message: `Error de autenticación: ${error.message}` };
          }
          if (data?.user) {
            let role: 'admin' | 'logistico' | 'cliente' | 'conductor' = 'logistico';
            let name = data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuario';
            
            const metadataRole = data.user.user_metadata?.role;
            if (metadataRole === 'admin' || metadataRole === 'logistico' || metadataRole === 'cliente' || metadataRole === 'conductor') {
              role = metadataRole;
            } else {
              // Fallback guess based on email matches
              const emailLower = (data.user.email || '').toLowerCase();
              if (emailLower.includes('admin')) role = 'admin';
              else if (emailLower.includes('conductor')) role = 'conductor';
              else if (emailLower.includes('cliente')) role = 'cliente';
              else if (emailLower.includes('logistica') || emailLower.includes('logistico')) role = 'logistico';
            }

            const sessionUser = {
              email: data.user.email || '',
              role,
              name
            };

            // Save in localStorage for persistence and session management across boots
            localStorage.setItem('cargoflow_session', JSON.stringify(sessionUser));

            return {
              success: true,
              user: sessionUser
            };
          }
          return { success: false, message: "No se pudieron obtener los datos del usuario." };
        } catch (err: any) {
          return { success: false, message: err?.message || String(err) };
        }
      } else {
        // Offline / Simulation fallback
        const creds = [
          { role: 'admin' as const, email: 'admin@cargoflow.co', pass: 'admin', name: 'Administrador Principal' },
          { role: 'logistico' as const, email: 'logistica@cargoflow.co', pass: 'logistico', name: 'Coordinador del CEDIS' },
          { role: 'conductor' as const, email: 'conductor@cargoflow.co', pass: 'conductor', name: 'Carlos Mendoza (STX-789)' },
          { role: 'cliente' as const, email: 'cliente@cargoflow.co', pass: 'cliente', name: 'Café Devoción (Zona G)' },
        ];
        const match = creds.find(c => c.email.toLowerCase() === email.trim().toLowerCase() && c.pass === password);
        if (match) {
          const sessionUser = {
            email: match.email,
            role: match.role,
            name: match.name
          };
          localStorage.setItem('cargoflow_session', JSON.stringify(sessionUser));
          return {
            success: true,
            user: sessionUser
          };
        }
        return { success: false, message: "⚠️ Credenciales de simulación incorrectas. Revisa los datos de acceso o el modo de conexión." };
      }
    },

    async signUp(email: string, password: string, name: string, role: 'admin' | 'logistico' | 'cliente' | 'conductor'): Promise<{ success: boolean; message: string }> {
      const client = getSupabase();
      if (!client) {
        return { success: false, message: "Supabase no está configurado. No se pueden registrar nuevos usuarios reales en modo offline." };
      }
      try {
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              role
            }
          }
        });
        if (error) {
          return { success: false, message: `Error de registro: ${error.message}` };
        }
        return { success: true, message: "¡Registro de usuario exitoso! Por favor inicia sesión con tus nuevas credenciales." };
      } catch (err: any) {
        return { success: false, message: err?.message || String(err) };
      }
    },

    async signOut(): Promise<void> {
      const client = getSupabase();
      if (client) {
        try {
          await client.auth.signOut();
        } catch (e) {
          console.error("Supabase auth signOut error: ", e);
        }
      }
      localStorage.removeItem('cargoflow_session');
    }
  }
};
