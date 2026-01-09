// ================================================================
// Migration Helper - KV Store to PostgreSQL
// ================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from './kv_store.tsx';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

/**
 * KV Store의 rotation 데이터를 PostgreSQL로 마이그레이션
 */
export async function migrateRotationsToPostgres(): Promise<{
  success: boolean;
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;
  let skipped = 0;

  try {
    console.log('[Migration] Starting rotation migration from KV to PostgreSQL...');
    
    // 1. KV Store에서 모든 rotation 조회
    const rotations = await kv.getByPrefix('rotation_broadcast:');
    console.log(`[Migration] Found ${rotations.length} rotations in KV Store`);

    for (const rotation of rotations) {
      try {
        // 2. PostgreSQL에 이미 존재하는지 확인
        const { data: existing } = await supabase
          .from('rotation_broadcasts')
          .select('id')
          .eq('id', rotation.id)
          .single();

        if (existing) {
          console.log(`[Migration] Rotation ${rotation.id} already exists, skipping`);
          skipped++;
          continue;
        }

        // 3. PostgreSQL에 삽입
        const { error } = await supabase
          .from('rotation_broadcasts')
          .insert({
            id: rotation.id,
            name: rotation.name,
            template_ids: rotation.template_ids,
            duration_per_template: rotation.duration_per_template,
            start_date: rotation.start_date,
            end_date: rotation.end_date,
            priority: rotation.priority || 150,
            current_index: rotation.current_index || 0,
            last_switched_at: rotation.last_switched_at,
            next_switch_at: rotation.next_switch_at || null,
            is_active: rotation.is_active ?? true,
            created_at: rotation.created_at,
            created_by: rotation.created_by,
            stopped_at: rotation.stopped_at || null,
            stopped_by: rotation.stopped_by || null,
            stopped_reason: rotation.stopped_reason || null,
          });

        if (error) {
          console.error(`[Migration] Error inserting rotation ${rotation.id}:`, error);
          errors.push(`Rotation ${rotation.id}: ${error.message}`);
        } else {
          console.log(`[Migration] ✅ Migrated rotation: ${rotation.name} (${rotation.id})`);
          migrated++;
        }
      } catch (error) {
        console.error(`[Migration] Unexpected error for rotation ${rotation.id}:`, error);
        errors.push(`Rotation ${rotation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`[Migration] Completed: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      migrated,
      skipped,
      errors,
    };
  } catch (error) {
    console.error('[Migration] Fatal error during migration:', error);
    return {
      success: false,
      migrated,
      skipped,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * KV Store의 중복 데이터 정리
 */
export async function cleanupKVDuplicates(): Promise<{
  success: boolean;
  deleted: string[];
  errors: string[];
}> {
  const deleted: string[] = [];
  const errors: string[] = [];

  try {
    console.log('[Cleanup] Starting KV Store cleanup...');

    // 1. 중복된 audit_log 제거 (PostgreSQL에 이미 있음)
    const auditLogs = await kv.getByPrefix('audit_log:');
    console.log(`[Cleanup] Found ${auditLogs.length} audit logs in KV Store`);
    
    for (const log of auditLogs) {
      try {
        const key = `audit_log:${log.id}`;
        await kv.del(key);
        deleted.push(key);
        console.log(`[Cleanup] ✅ Deleted: ${key}`);
      } catch (error) {
        console.error(`[Cleanup] Error deleting audit_log ${log.id}:`, error);
        errors.push(`audit_log ${log.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // 2. 중복된 rotation:* 제거 (rotation_broadcast:*와 중복)
    const rotationDups = await kv.getByPrefix('rotation:');
    console.log(`[Cleanup] Found ${rotationDups.length} duplicate rotation entries`);
    
    for (const dup of rotationDups) {
      try {
        const key = `rotation:${dup.id}`;
        await kv.del(key);
        deleted.push(key);
        console.log(`[Cleanup] ✅ Deleted: ${key}`);
      } catch (error) {
        console.error(`[Cleanup] Error deleting rotation ${dup.id}:`, error);
        errors.push(`rotation ${dup.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // 3. 마이그레이션된 rotation_broadcast:* 제거 (PostgreSQL로 이동 완료)
    const rotationBroadcasts = await kv.getByPrefix('rotation_broadcast:');
    console.log(`[Cleanup] Found ${rotationBroadcasts.length} rotation_broadcast entries in KV Store`);
    
    for (const rotation of rotationBroadcasts) {
      try {
        // PostgreSQL에 존재하는지 확인
        const { data: existing } = await supabase
          .from('rotation_broadcasts')
          .select('id')
          .eq('id', rotation.id)
          .single();

        if (existing) {
          // PostgreSQL에 있으면 KV Store에서 삭제
          const key = `rotation_broadcast:${rotation.id}`;
          await kv.del(key);
          deleted.push(key);
          console.log(`[Cleanup] ✅ Deleted migrated rotation_broadcast: ${key}`);
        } else {
          console.log(`[Cleanup] ⏭️ Skipping rotation_broadcast ${rotation.id} (not in PostgreSQL)`);
        }
      } catch (error) {
        console.error(`[Cleanup] Error deleting rotation_broadcast ${rotation.id}:`, error);
        errors.push(`rotation_broadcast ${rotation.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // 4. 오래된 broadcast:* 제거 (expires_at이 과거)
    const broadcasts = await kv.getByPrefix('broadcast:');
    console.log(`[Cleanup] Found ${broadcasts.length} broadcasts in KV Store`);
    
    const now = new Date();
    for (const broadcast of broadcasts) {
      if (broadcast.expires_at && new Date(broadcast.expires_at) < now) {
        try {
          const key = `broadcast:${broadcast.id}`;
          await kv.del(key);
          deleted.push(key);
          console.log(`[Cleanup] ✅ Deleted expired broadcast: ${key}`);
        } catch (error) {
          console.error(`[Cleanup] Error deleting broadcast ${broadcast.id}:`, error);
          errors.push(`broadcast ${broadcast.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      }
    }

    // 5. 불필요한 schedule:* 제거 (PostgreSQL에 이미 있음)
    const schedules = await kv.getByPrefix('schedule:');
    console.log(`[Cleanup] Found ${schedules.length} schedules in KV Store`);
    
    for (const schedule of schedules) {
      try {
        const key = `schedule:${schedule.id}`;
        await kv.del(key);
        deleted.push(key);
        console.log(`[Cleanup] ✅ Deleted: ${key}`);
      } catch (error) {
        console.error(`[Cleanup] Error deleting schedule ${schedule.id}:`, error);
        errors.push(`schedule ${schedule.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // 6. schedules:active, schedules:all 제거
    try {
      const existsActive = await kv.get('schedules:active');
      if (existsActive) {
        await kv.del('schedules:active');
        deleted.push('schedules:active');
        console.log('[Cleanup] ✅ Deleted: schedules:active');
      }
    } catch (error) {
      // Key might not exist, ignore
    }

    try {
      const existsAll = await kv.get('schedules:all');
      if (existsAll) {
        await kv.del('schedules:all');
        deleted.push('schedules:all');
        console.log('[Cleanup] ✅ Deleted: schedules:all');
      }
    } catch (error) {
      // Key might not exist, ignore
    }

    // 7. current_broadcast_id 제거 (더 이상 사용 안 함)
    try {
      const existsBroadcastId = await kv.get('current_broadcast_id');
      if (existsBroadcastId) {
        await kv.del('current_broadcast_id');
        deleted.push('current_broadcast_id');
        console.log('[Cleanup] ✅ Deleted: current_broadcast_id');
      }
    } catch (error) {
      // Key might not exist, ignore
    }

    console.log(`[Cleanup] Completed: ${deleted.length} deleted, ${errors.length} errors`);
    
    return {
      success: errors.length === 0,
      deleted,
      errors,
    };
  } catch (error) {
    console.error('[Cleanup] Fatal error during cleanup:', error);
    return {
      success: false,
      deleted,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
