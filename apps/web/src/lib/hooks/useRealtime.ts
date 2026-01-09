// ================================================================
// Realtime Subscription Hook
// ================================================================

import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';

type PostgresChangesEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: PostgresChangesEvent;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export function useRealtime(options: UseRealtimeOptions) {
  const {
    table,
    schema = 'public',
    filter,
    event = '*',
    onInsert,
    onUpdate,
    onDelete,
    onChange,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 채널 생성
    const channelName = `${table}_${filter || 'all'}_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Postgres Changes 구독
    channel.on(
      'postgres_changes' as any,
      {
        event,
        schema,
        table,
        filter,
      },
      (payload: any) => {
        console.log(`Realtime event (${table}):`, payload);

        // 이벤트별 콜백 호출
        if (payload.eventType === 'INSERT' && onInsert) {
          onInsert(payload);
        } else if (payload.eventType === 'UPDATE' && onUpdate) {
          onUpdate(payload);
        } else if (payload.eventType === 'DELETE' && onDelete) {
          onDelete(payload);
        }

        // 공통 콜백 호출
        if (onChange) {
          onChange(payload);
        }
      }
    );

    // 구독 시작
    channel.subscribe((status) => {
      console.log(`Realtime subscription status (${table}):`, status);
    });

    channelRef.current = channel;

    // 클린업
    return () => {
      console.log(`Unsubscribing from ${table}`);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, schema, filter, event, onInsert, onUpdate, onDelete, onChange]);

  return {
    channel: channelRef.current,
  };
}
