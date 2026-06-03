/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Cliente, Conductor, RutaMaestra, Parada, UbicacionEnVivo, AppNotification } from '../types';
import { DatabaseService, isSupabaseConfigured, getSupabase } from '../lib/supabase';

export function useLogistica() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [rutas, setRutas] = useState<RutaMaestra[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionEnVivo[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    try {
      const [c, d, r, p, u] = await Promise.all([
        DatabaseService.clientes.getAll(),
        DatabaseService.conductores.getAll(),
        DatabaseService.rutas.getAll(),
        DatabaseService.paradas.getAll(),
        DatabaseService.ubicaciones.getAll()
      ]);
      setClientes(c);
      setConductores(d);
      setRutas(r);
      setParadas(p);
      setUbicaciones(u);
      setNotifications(DatabaseService.notifications.getAll());
    } catch (e) {
      console.error("Error loading logistics data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();

    // Event listener for cross-view reactive updates in Demo state mode
    const handleStateChange = () => {
      fetchAllData();
    };

    window.addEventListener('logistica_state_changed', handleStateChange);

    // Active real-time subscription if Supabase client is connected
    let channel: any = null;
    const client = getSupabase();
    if (isSupabaseConfigured && client) {
      channel = client
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', scheme: 'public' },
          () => {
            fetchAllData();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('logistica_state_changed', handleStateChange);
      if (channel && client) {
        client.removeChannel(channel);
      }
    };
  }, [fetchAllData]);

  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp'>) => {
    const item = DatabaseService.notifications.add(notif);
    setNotifications(prev => [item, ...prev]);
  };

  return {
    clientes,
    conductores,
    rutas,
    paradas,
    ubicaciones,
    notifications,
    loading,
    refresh: fetchAllData,
    addNotification
  };
}
