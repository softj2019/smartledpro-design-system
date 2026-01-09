import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as scheduleHelpers from './schedule_db_helpers.ts';
import { checkAndExecuteSchedules } from './schedule_executor.ts';
import { crawlJoongsanToday } from './joongsan_crawler.ts';
import { 
  fetchWithRetry, 
  validateAirKoreaResponse, 
  parseDataTime, 
  getLatestItem 
} from './airkorea_helpers.ts';

const app = new Hono();
console.log('🚀 Server initializing... (v1.0.9 - fix delete from display_current_state)');

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ================================================================
// Auth Middleware
// ================================================================
async function verifyAuth(authHeader: string | null) {
  if (!authHeader) {
    return { error: 'Missing Authorization header', user: null };
  }
  
  const accessToken = authHeader.split(' ')[1];
  if (!accessToken) {
    return { error: 'Invalid Authorization header', user: null };
  }

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return { error: 'Unauthorized', user: null };
  }

  return { error: null, user };
}

// ================================================================
// Helper Functions
// ================================================================

// ✅ Category → Content Type 매핑
function mapCategoryToContentType(category: string | null | undefined): 'EMERGENCY' | 'NOTICE' | 'WEATHER' {
  if (!category) return 'NOTICE';
  
  const upperCategory = category.toUpperCase();
  
  if (upperCategory === 'EMERGENCY') return 'EMERGENCY';
  if (upperCategory === 'WEATHER') return 'WEATHER';
  
  // 'general', 'notice', 'event' 등은 모두 NOTICE로 매핑
  return 'NOTICE';
}

// DB 스케줄 → 프론트엔드 스케줄 변환
function convertScheduleForFrontend(schedule: scheduleHelpers.Schedule): any {
  return {
    id: schedule.id,
    name: schedule.name,
    template_id: schedule.template_id,
    start_datetime: schedule.start_at, // start_at → start_datetime
    end_datetime: schedule.end_at, // end_at → end_datetime
    display_duration_type: schedule.display_duration_type || '5min', // ✅ DB에서 가져온 값 사용
    display_duration_minutes: schedule.display_duration_minutes, // ✅ custom 시 분 단위
    repeat_type: (() => {
      // recurrence_rule → repeat_type 변환
      if (!schedule.recurrence_rule) return 'none';
      if (schedule.recurrence_rule.freq === 'DAILY') return 'daily';
      if (schedule.recurrence_rule.freq === 'WEEKLY') return 'weekly';
      return 'custom';
    })(),
    repeat_config: schedule.recurrence_rule?.byweekday 
      ? { days_of_week: schedule.recurrence_rule.byweekday }
      : undefined,
    is_active: schedule.is_active !== false,
    priority: schedule.priority,
    created_by: schedule.created_by,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at,
    last_executed_at: schedule.last_executed_at,
  };
}

// 프론트엔드 스케줄 → DB 스케줄 변환 (업데이트용)
function convertScheduleForDatabase(frontendData: any): Partial<scheduleHelpers.Schedule> {
  const dbData: Partial<scheduleHelpers.Schedule> = {};

  // 필드명 변환
  if (frontendData.name !== undefined) dbData.name = frontendData.name;
  if (frontendData.template_id !== undefined) dbData.template_id = frontendData.template_id;
  if (frontendData.start_datetime !== undefined) dbData.start_at = frontendData.start_datetime;
  if (frontendData.end_datetime !== undefined) dbData.end_at = frontendData.end_datetime;
  if (frontendData.is_active !== undefined) dbData.is_active = frontendData.is_active;
  if (frontendData.priority !== undefined) dbData.priority = frontendData.priority;

  // ✅ display_duration_type과 display_duration_minutes 저장
  if (frontendData.display_duration_type !== undefined) {
    dbData.display_duration_type = frontendData.display_duration_type;
  }
  if (frontendData.display_duration_minutes !== undefined) {
    dbData.display_duration_minutes = frontendData.display_duration_minutes;
  }

  // repeat_type → recurrence_rule 변환
  if (frontendData.repeat_type !== undefined) {
    if (frontendData.repeat_type === 'none') {
      dbData.recurrence_rule = null;
    } else if (frontendData.repeat_type === 'daily') {
      dbData.recurrence_rule = { freq: 'DAILY', interval: 1 };
    } else if (frontendData.repeat_type === 'weekly') {
      dbData.recurrence_rule = { 
        freq: 'WEEKLY', 
        interval: 1,
        byweekday: frontendData.repeat_config?.days_of_week || []
      };
    } else if (frontendData.repeat_type === 'custom') {
      dbData.recurrence_rule = frontendData.repeat_config || null;
    }
  }

  return dbData;
}

// Audit log helper
async function createAuditLog(
  user: any,
  action: string,
  resourceType: string,
  resourceId: string | null,
  actionDetail: any
) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: user.user_metadata?.role || 'VIEWER',
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      action_detail: actionDetail,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// ================================================================
// Health Check
// ================================================================
app.get("/make-server-5231839f/health", (c) => {
  return c.json({ status: "ok" });
});

// ================================================================
// Setup Test Users - 개발/테스트 전용
// ================================================================
app.post("/make-server-5231839f/setup-test-users", async (c) => {
  try {
    const testUsers = [
      {
        email: 'admin@goyang.go.kr',
        password: 'Admin1234!',
        user_metadata: {
          role: 'ADMIN',
          can_emergency: 'true',
          name: '관리자',
        },
      },
      {
        email: 'operator@goyang.go.kr',
        password: 'Operator1234!',
        user_metadata: {
          role: 'OPERATOR',
          can_emergency: 'false',
          name: '운영자',
        },
      },
      {
        email: 'viewer@goyang.go.kr',
        password: 'Viewer1234!',
        user_metadata: {
          role: 'VIEWER',
          can_emergency: 'false',
          name: '조회자',
        },
      },
    ];

    const results = [];

    for (const testUser of testUsers) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        user_metadata: testUser.user_metadata,
        email_confirm: true, // 이메일 확인 자동 처리
      });

      if (error) {
        // 이미 존재하는 사용자는 스킵
        if (error.message.includes('already registered')) {
          results.push({
            email: testUser.email,
            status: 'already_exists',
            message: '이미 존재하는 계정입니다.',
          });
        } else {
          results.push({
            email: testUser.email,
            status: 'error',
            message: error.message,
          });
        }
      } else {
        results.push({
          email: testUser.email,
          status: 'created',
          user_id: data.user?.id,
          role: testUser.user_metadata.role,
        });
      }
    }

    return c.json({
      success: true,
      message: '테스트 계정 생성이 완료되었습니다.',
      results,
    });
  } catch (error) {
    console.error('Unexpected error in POST /setup-test-users:', error);
    return c.json({ 
      success: false,
      error: 'Failed to create test users', 
      details: error.message 
    }, 500);
  }
});

// ================================================================
// Templates API
// ================================================================

// GET /templates - List all templates with optional filtering
app.get("/make-server-5231839f/templates", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ 
      error: 'Authentication failed', 
      details: authError,
      hint: 'Please login again or check your access token'
    }, 401);
  }

  try {
    const category = c.req.query('category');
    
    let query = supabase
      .from('message_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Templates API] Database error:', error);
      return c.json({ 
        error: 'Database query failed', 
        details: error.message,
        hint: 'Check database connection and table permissions'
      }, 500);
    }

    return c.json({ 
      success: true,
      templates: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('[Templates API] Unexpected error:', error);
    return c.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Check server logs for more details'
    }, 500);
  }
});

// GET /templates/:id - Get single template
app.get("/make-server-5231839f/templates/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const id = c.req.param('id');
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching template ${id}:`, error);
      return c.json({ error: 'Template not found', details: error.message }, 404);
    }

    return c.json({ template: data });
  } catch (error) {
    console.error('Unexpected error in GET /templates/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST /templates - Create new template
app.post("/make-server-5231839f/templates", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { name, title, body: templateBody, highlight, style_config, category } = body;

    // Validate required fields
    if (!name || !title || !templateBody) {
      return c.json({ error: 'Missing required fields: name, title, body' }, 400);
    }

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        name,
        title,
        body: templateBody,
        highlight: highlight || null,
        style_config: style_config || {},
        category: category || 'general',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return c.json({ error: 'Failed to create template', details: error.message }, 500);
    }

    // Create audit log
    await createAuditLog(user, 'CREATE', 'TEMPLATE', data.id, {
      template_name: name,
      category,
    });

    return c.json({ template: data }, 201);
  } catch (error) {
    console.error('Unexpected error in POST /templates:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /templates/:id - Update template
app.put("/make-server-5231839f/templates/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, title, body: templateBody, highlight, style_config, category } = body;

    // Get current template for audit log
    const { data: currentTemplate } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', id)
      .single();

    const { data, error } = await supabase
      .from('message_templates')
      .update({
        name,
        title,
        body: templateBody,
        highlight: highlight || null,
        style_config: style_config || {},
        category: category || 'general',
        version: (currentTemplate?.version || 0) + 1,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating template ${id}:`, error);
      return c.json({ error: 'Failed to update template', details: error.message }, 500);
    }

    // Create audit log
    await createAuditLog(user, 'UPDATE', 'TEMPLATE', id, {
      template_name: name,
      previous_version: currentTemplate?.version || 0,
      new_version: data.version,
    });

    return c.json({ template: data });
  } catch (error) {
    console.error('Unexpected error in PUT /templates/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /templates/:id - Delete template
app.delete("/make-server-5231839f/templates/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');

    // Get template info for audit log
    const { data: template } = await supabase
      .from('message_templates')
      .select('name, category')
      .eq('id', id)
      .single();

    // Check if template is being used in any schedules
    const { data: schedules } = await supabase
      .from('schedules')
      .select('id, name')
      .eq('template_id', id);

    // ✅ 자동 생성된 경기 템플릿인 경우 관련 스케줄도 함께 삭제
    const isAutoGeneratedMatch = template?.category === 'joongsan_match' || template?.name?.startsWith('[자동]');
    
    if (schedules && schedules.length > 0) {
      if (isAutoGeneratedMatch) {
        // 자동 생성된 템플릿: 관련 스케줄도 삭제
        console.log(`🗑️ Deleting ${schedules.length} schedules for auto-generated template ${id}`);
        
        for (const schedule of schedules) {
          await supabase
            .from('schedules')
            .delete()
            .eq('id', schedule.id);
          
          // 스케줄 삭제 로그
          await createAuditLog(user, 'DELETE', 'SCHEDULE', schedule.id, {
            reason: 'Auto-deleted with template',
            template_id: id,
            template_name: template?.name || 'Unknown',
          });
        }
      } else {
        // 수동 생성된 템플릿: 삭제 불가
        return c.json({ 
          error: 'Cannot delete template. It is currently being used in schedules.',
          schedules: schedules.map(s => s.name),
        }, 400);
      }
    }

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting template ${id}:`, error);
      return c.json({ error: 'Failed to delete template', details: error.message }, 500);
    }

    // Create audit log
    await createAuditLog(user, 'DELETE', 'TEMPLATE', id, {
      template_name: template?.name || 'Unknown',
      auto_deleted_schedules: schedules?.length || 0,
    });

    return c.json({ 
      success: true, 
      message: 'Template deleted successfully',
      deleted_schedules: schedules?.length || 0,
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /templates/:id:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ================================================================
// Display API - 전광판 전송 및 현재 표시 템플릿 관리
// ================================================================

// POST /display/send - 템플릿을 전광판으로 전송
app.post("/make-server-5231839f/display/send", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // OPERATOR 또는 ADMIN 권한 필요
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { template_id } = body;

    if (!template_id) {
      return c.json({ error: 'template_id is required' }, 400);
    }

    // 템플릿 존재 확인
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return c.json({ error: 'Template not found', details: templateError?.message }, 404);
    }

    // ✅ 수동 전송 시 활성 rotation 중단
    console.log('[Display Send] Checking for active rotations to stop...');
    const { data: activeRotations, error: rotationFetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true);

    if (activeRotations && activeRotations.length > 0) {
      console.log(`[Display Send] Stopping ${activeRotations.length} active rotation(s)...`);
      const now = new Date().toISOString();
      
      for (const rotation of activeRotations) {
        const { error: stopError } = await supabase
          .from('rotation_broadcasts')
          .update({
            is_active: false,
            stopped_at: now,
            stopped_by: user.id,
            stopped_reason: 'manual_template_send',
            updated_at: now,
          })
          .eq('id', rotation.id);

        if (stopError) {
          console.error(`[Display Send] Error stopping rotation ${rotation.id}:`, stopError);
        } else {
          console.log(`[Display Send] ✅ Stopped rotation: ${rotation.name} (${rotation.id})`);
        }
      }
    }

    // ✅ PostgreSQL: display_current_state 테이블에 저장 (싱글톤)
    await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제
    
    const { error: insertError } = await supabase.from('display_current_state').insert({
      template_id: template_id,
      source: 'manual', // 수동 전송
      source_id: null,
      content_type: mapCategoryToContentType(template.category), // ✅ Category → Content Type 매핑
      priority: 200, // 기본 우선순위
      activated_at: new Date().toISOString(),
      expires_at: null,
    });

    if (insertError) {
      console.error('Failed to save display state:', insertError);
      return c.json({ error: 'Failed to save display state', details: insertError.message }, 500);
    }

    // Audit log 생성
    await createAuditLog(user, 'DISPLAY_SEND', 'display', template_id, {
      template_name: template.name,
      category: template.category,
      source: 'manual', // ✅ 수동 전송 명시
      send_type: 'manual', // ✅ 전송 유형 명시
    });

    return c.json({ 
      success: true, 
      message: '전광판으로 전송되었습니다.',
      template: {
        id: template.id,
        name: template.name,
      }
    });
  } catch (error) {
    console.error('Unexpected error in POST /display/send:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /display/current - 현재 전광판에 표시 중인 템플릿 조회
app.get("/make-server-5231839f/display/current", async (c) => {
  try {
    // ✅ 스케줄 자동 실행 체크 (로그인 불필요, 서버에서 자동 실행)
    await checkAndExecuteSchedules();
    
    // ✅ PostgreSQL: display_current_state 테이블에서 현재 송출 중인 템플릿 조회
    const { data: currentState, error: stateError } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    console.log('📡 [Display Current] Query result:', { currentState, stateError });

    let template = null;
    let source = 'none'; // 'schedule', 'manual', 'default', 'air_quality', 'none'
    let lastUpdated = new Date().toISOString();

    if (currentState && !stateError) {
      // 현재 송출 중인 템플릿이 있음
      const { data: templateData } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', currentState.template_id)
        .single();

      template = templateData;
      source = currentState.source;
      lastUpdated = currentState.activated_at;
    }
    // ✅ Fallback 제거: 송출 중인 템플릿이 없으면 null 반환
    // Rotation 스케줄에 템플릿을 등록하여 자동 송출하도록 함
    
    // ✅ PostgreSQL: display_settings 테이블에서 설정 조회
    const { data: settingsData } = await supabase
      .from('display_settings')
      .select('*')
      .limit(1)
      .single();

    const displaySettings = settingsData ? {
      position: { x: settingsData.position_x || 0, y: settingsData.position_y || 0 },
      scaleX: settingsData.scale_x || 1,
      scaleY: settingsData.scale_y || 1,
      showBorder: settingsData.show_border !== undefined ? settingsData.show_border : true,
    } : {
      position: { x: 0, y: 0 },
      scaleX: 1,
      scaleY: 1,
      showBorder: true,
    };

    // ✅ 순차 반복 송출 정보 조회 (source_id가 있고 rotation 데이터가 있으면 rotation으로 판단)
    let rotationInfo = null;
    if (currentState && currentState.source_id) {
      try {
        // ✅ PostgreSQL: rotation 조회
        const { data: rotationData, error: rotationError } = await supabase
          .from('rotation_broadcasts')
          .select('*')
          .eq('id', currentState.source_id)
          .single();

        if (!rotationError && rotationData) {
          const currentIndex = rotationData.current_index || 0;
          const currentTemplateId = rotationData.template_ids[currentIndex];
          
          // 현재 템플릿 정보 조회
          const { data: currentTemplateData } = await supabase
            .from('message_templates')
            .select('id, name, category')
            .eq('id', currentTemplateId)
            .single();

          rotationInfo = {
            id: currentState.source_id,
            name: rotationData.name || '순차 반복 송출',
            template_ids: rotationData.template_ids || [],
            current_index: currentIndex,
            duration_per_template: rotationData.duration_per_template || 5,
            created_at: rotationData.created_at || new Date().toISOString(),
            start_date: rotationData.start_date || new Date().toISOString(),
            end_date: rotationData.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: rotationData.priority || 150,
            current_template: currentTemplateData || null,
            next_switch_at: rotationData.next_switch_at || new Date().toISOString(),
            time_until_next_ms: new Date(rotationData.next_switch_at).getTime() - Date.now(),
          };
        }
      } catch (error) {
        console.error('Error fetching rotation info:', error);
      }
    }

    return c.json({ 
      success: true,
      template,
      source,
      source_id: currentState?.source_id || null,
      content_type: currentState?.content_type || (template?.category?.toUpperCase()) || null,
      priority: currentState?.priority || 0,
      activated_at: currentState?.activated_at || lastUpdated,
      expires_at: currentState?.expires_at || null,
      last_updated: lastUpdated,
      settings: displaySettings,
      rotation: rotationInfo, // ✅ 순차 반복 정보 추가
      is_fallback: !currentState || !!stateError, // ✅ fallback 여부 플래그
      has_active_broadcast: !!currentState && !stateError, // ✅ 실제 송출 여부
    });
  } catch (error) {
    console.error('Unexpected error in GET /display/current:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// 🔍 GET /debug/display-state - 디버그용: display_current_state와 rotation 상태 조회
app.get("/make-server-5231839f/debug/display-state", async (c) => {
  try {
    // display_current_state 조회
    const { data: displayState, error: displayError } = await supabase
      .from('display_current_state')
      .select('*')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();

    // 활성 rotation 조회
    const { data: rotations, error: rotationError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // 활성 schedules 조회
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(5);

    return c.json({
      display_current_state: displayState || null,
      display_error: displayError?.message || null,
      active_rotations: rotations || [],
      rotation_error: rotationError?.message || null,
      active_schedules: schedules || [],
      schedule_error: scheduleError?.message || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: 'Debug endpoint error', details: error.message }, 500);
  }
});

// 🔧 POST /debug/reset-display - 디버그용: display_current_state 강제 초기화
app.post("/make-server-5231839f/debug/reset-display", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    // display_current_state 전체 삭제
    const { error: deleteError } = await supabase
      .from('display_current_state')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 모든 레코드 삭제

    if (deleteError) {
      console.error('🔧 [Reset Display] Failed to delete:', deleteError);
      return c.json({ error: 'Failed to reset display', details: deleteError.message }, 500);
    }

    console.log('🔧 [Reset Display] Successfully reset display_current_state');

    // Audit log 생성
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: userRole,
      action: 'RESET_DISPLAY',
      resource_type: 'display_current_state',
      resource_id: null,
      action_detail: {
        reset_at: new Date().toISOString(),
        reason: 'debug_reset',
      },
    });

    return c.json({
      success: true,
      message: 'Display state reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error in POST /debug/reset-display:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PUT /display/settings - 전광판 위치 및 크기 설정 업데이트
app.put("/make-server-5231839f/display/settings", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // OPERATOR 또는 ADMIN 권한 필요
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { position, scaleX, scaleY, showBorder } = body;

    // ✅ PostgreSQL: 현재 설정 조회
    const { data: currentData } = await supabase
      .from('display_settings')
      .select('*')
      .limit(1)
      .single();

    const currentSettings = currentData ? {
      position: { x: currentData.position_x || 0, y: currentData.position_y || 0 },
      scaleX: currentData.scale_x || 1,
      scaleY: currentData.scale_y || 1,
      showBorder: currentData.show_border !== undefined ? currentData.show_border : true,
    } : {
      position: { x: 0, y: 0 },
      scaleX: 1,
      scaleY: 1,
      showBorder: true,
    };

    // 새로운 설정 병합
    const newSettings = {
      position: position !== undefined ? position : currentSettings.position,
      scaleX: scaleX !== undefined ? scaleX : currentSettings.scaleX,
      scaleY: scaleY !== undefined ? scaleY : currentSettings.scaleY,
      showBorder: showBorder !== undefined ? showBorder : currentSettings.showBorder,
    };

    // ✅ PostgreSQL: display_settings 테이블에 저장 (UPSERT)
    const updateData = {
      position_x: newSettings.position.x,
      position_y: newSettings.position.y,
      scale_x: newSettings.scaleX,
      scale_y: newSettings.scaleY,
      show_border: newSettings.showBorder,
      updated_at: new Date().toISOString(),
    };

    if (currentData) {
      // UPDATE
      await supabase
        .from('display_settings')
        .update(updateData)
        .eq('id', currentData.id);
    } else {
      // INSERT
      await supabase
        .from('display_settings')
        .insert(updateData);
    }

    // Audit log 생성
    await createAuditLog(user, 'UPDATE', 'DISPLAY_SETTINGS', null, {
      settings: newSettings,
    });

    return c.json({ 
      success: true, 
      settings: newSettings,
    });
  } catch (error) {
    console.error('Unexpected error in PUT /display/settings:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PUT /display/default-template - 기본 템플릿 설정
app.put("/make-server-5231839f/display/default-template", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // OPERATOR 또는 ADMIN 권한 필요
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { template_id } = body;

    if (!template_id) {
      return c.json({ error: 'template_id is required' }, 400);
    }

    // 템플릿 존재 확인
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return c.json({ error: 'Template not found', details: templateError?.message }, 404);
    }

    // display_settings 테이블에 저장 (싱글톤)
    // 기존 설정 확인
    const { data: existingSettings } = await supabase
      .from('display_settings')
      .select('*')
      .limit(1)
      .single();

    if (existingSettings) {
      // 업데이트
      const { error: updateError } = await supabase
        .from('display_settings')
        .update({
          default_template_id: template_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSettings.id);

      if (updateError) {
        throw new Error(`Failed to update settings: ${updateError.message}`);
      }
    } else {
      // 생성
      const { error: insertError } = await supabase
        .from('display_settings')
        .insert({
          default_template_id: template_id,
        });

      if (insertError) {
        throw new Error(`Failed to create settings: ${insertError.message}`);
      }
    }

    // Audit log 생성
    await createAuditLog(user, 'UPDATE', 'DISPLAY_SETTINGS', null, {
      default_template_id: template_id,
      template_name: template.name,
    });

    return c.json({ 
      success: true, 
      message: '기본 템플릿이 설정되었습니다.',
      template: {
        id: template.id,
        name: template.name,
      },
    });
  } catch (error) {
    console.error('Unexpected error in PUT /display/default-template:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /display/settings/history - 전광판 설정 변경 히스토리 조회
app.get("/make-server-5231839f/display/settings/history", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    // Audit Log에서 DISPLAY_SETTINGS 변경 이력 조회
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('resource_type', 'DISPLAY_SETTINGS')
      .eq('action', 'UPDATE')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(`Failed to fetch history: ${error.message}`);
    }

    // 히스토리 포맷팅
    const history = logs.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      user_email: log.user_email,
      user_role: log.user_role,
      settings: log.action_detail?.settings || null,
    }));

    return c.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Unexpected error in GET /display/settings/history:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// Schedules API (placeholder for Phase 3)
// ================================================================

// POST /schedules - Create schedule
app.post("/make-server-5231839f/schedules", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const { 
      name, 
      template_id, 
      start_datetime, 
      end_datetime, 
      display_duration_type,
      display_duration_minutes,
      repeat_type, 
      repeat_config, 
      is_active 
    } = body;

    // Validation
    if (!name || !template_id || !start_datetime) {
      return c.json({ error: 'Missing required fields: name, template_id, start_datetime' }, 400);
    }

    // Validate display_duration_type
    if (!display_duration_type) {
      return c.json({ error: 'Missing required field: display_duration_type' }, 400);
    }

    const validDurationTypes = ['1min', '5min', '10min', 'all-day', 'custom'];
    if (!validDurationTypes.includes(display_duration_type)) {
      return c.json({ error: 'Invalid display_duration_type' }, 400);
    }

    // Validate custom duration
    if (display_duration_type === 'custom') {
      if (!display_duration_minutes || display_duration_minutes < 1) {
        return c.json({ error: 'display_duration_minutes must be at least 1 when using custom duration' }, 400);
      }
    }

    // Check if template exists - Supabase 테이블에서 조회
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*') // ✅ 전체 필드 조회 (category 필요)
      .eq('id', template_id)
      .single();
      
    if (templateError || !template) {
      return c.json({ error: 'Template not found', details: `No template with id: ${template_id}` }, 404);
    }

    // Validate dates
    try {
      new Date(start_datetime);
      if (end_datetime) {
        const endDate = new Date(end_datetime);
        const startDate = new Date(start_datetime);
        if (endDate <= startDate) {
          return c.json({ error: 'end_datetime must be after start_datetime' }, 400);
        }
      }
    } catch (err) {
      return c.json({ error: 'Invalid date format', details: 'Use ISO 8601 format' }, 400);
    }

    // 시간 겹침 체크 (동일한 시간대에 다른 활성 스케줄이 있는지)
    if (is_active !== false) {
      const allSchedules = await scheduleHelpers.getAllSchedules();
      const activeSchedules = allSchedules.filter(s => s.is_active);
      
      const conflicts = activeSchedules.filter(existing => {
        // 같은 시작 시간인지 체크 (분 단위까지)
        const existingStart = new Date(existing.start_at); // ✅ start_at 사용
        const newStart = new Date(start_datetime);
        
        const sameHour = existingStart.getHours() === newStart.getHours();
        const sameMinute = existingStart.getMinutes() === newStart.getMinutes();
        
        // 반복 타입도 고려
        if (sameHour && sameMinute) {
          // 반복 없음끼리는 날짜까지 같아야 충돌
          if (repeat_type === 'none' && (existing.recurrence_rule === null || existing.recurrence_rule.freq === undefined)) {
            const sameDate = 
              existingStart.getFullYear() === newStart.getFullYear() &&
              existingStart.getMonth() === newStart.getMonth() &&
              existingStart.getDate() === newStart.getDate();
            return sameDate;
          }
          
          // 매일 반복은 시간만 같으면 충돌
          if (repeat_type === 'daily' || existing.recurrence_rule?.freq === 'DAILY') {
            return true;
          }
          
          // 매주 반복은 요일도 확인
          if (repeat_type === 'weekly' && existing.recurrence_rule?.freq === 'WEEKLY') {
            const newDays = repeat_config?.days_of_week || [];
            const existingDays = existing.recurrence_rule?.byweekday || [];
            // 요일이 겹치는지 확인
            const hasOverlap = newDays.some(day => existingDays.includes(day));
            return hasOverlap;
          }
        }
        
        return false;
      });

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map(s => s.name).join(', ');
        return c.json({ 
          error: 'Schedule time conflict', 
          details: `동일한 시간대에 이미 활성화된 스케줄이 있습니다: ${conflictNames}`,
          conflicts: conflicts.map(s => ({ id: s.id, name: s.name, start_datetime: s.start_datetime }))
        }, 409);
      }
    }

    // Create schedule
    const schedule: scheduleHelpers.Schedule = {
      id: crypto.randomUUID(),
      name,
      template_id,
      content_type: mapCategoryToContentType(template.category), // ✅ Category → Content Type 매핑
      display_ids: [], // 빈 배열 (전체 전광판 대상)
      start_at: start_datetime, // start_datetime → start_at
      end_at: end_datetime || null, // ✅ 스케줄 종료일 (사용자가 설정한 값만 저장, 없으면 null = 무기한)
      recurrence_rule: (() => {
        // repeat_type → recurrence_rule 변환
        if (repeat_type === 'none' || !repeat_type) {
          return null;
        } else if (repeat_type === 'daily') {
          return { freq: 'DAILY' as const, interval: 1 };
        } else if (repeat_type === 'weekly') {
          return { 
            freq: 'WEEKLY' as const, 
            interval: 1,
            byweekday: repeat_config?.days_of_week || []
          };
        } else if (repeat_type === 'custom') {
          return repeat_config as scheduleHelpers.RecurrenceRule;
        }
        return null;
      })(),
      priority: 200, // NOTICE 기본 우선순위
      is_active: is_active !== undefined ? is_active : true,
      display_duration_type: display_duration_type, // ✅ 템플릿 표시 시간 타입 저장
      display_duration_minutes: display_duration_type === 'custom' ? display_duration_minutes : null, // ✅ custom 시에만 저장
      last_executed_at: undefined,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await scheduleHelpers.createSchedule(schedule);

    // Create audit log
    await createAuditLog(user, 'CREATE', 'SCHEDULE', schedule.id, {
      schedule_name: name,
      template_id,
      start_datetime,
      display_duration_type,
    });

    // Convert schedule for frontend before returning
    const frontendSchedule = convertScheduleForFrontend(schedule);

    return c.json({ schedule: frontendSchedule }, 201);
  } catch (error) {
    console.error('Unexpected error in POST /schedules:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /schedules - Get all schedules
app.get("/make-server-5231839f/schedules", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const activeFilter = c.req.query('active');  // 'true', 'false', 'all'
    const templateId = c.req.query('template_id');

    let schedules: scheduleHelpers.Schedule[];

    if (activeFilter === 'true') {
      schedules = await scheduleHelpers.getActiveSchedules();
    } else if (activeFilter === 'false') {
      const allSchedules = await scheduleHelpers.getAllSchedules();
      schedules = allSchedules.filter(s => !s.is_active);
    } else {
      schedules = await scheduleHelpers.getAllSchedules();
    }

    // Filter by template_id if provided
    if (templateId) {
      schedules = schedules.filter(s => s.template_id === templateId);
    }

    // Convert schedules for frontend and fetch template info
    const frontendSchedules = await Promise.all(schedules.map(async (schedule) => {
      const converted = convertScheduleForFrontend(schedule);
      
      // Fetch template info
      if (schedule.template_id) {
        const { data: template } = await supabase
          .from('message_templates')
          .select('id, name, title, body, highlight, category, style_config')
          .eq('id', schedule.template_id)
          .single();
        
        if (template) {
          converted.template = template;
        }
      }
      
      return converted;
    }));

    return c.json({ success: true, schedules: frontendSchedules });
  } catch (error) {
    console.error('Unexpected error in GET /schedules:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /schedules/:id - Get schedule detail
app.get("/make-server-5231839f/schedules/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const id = c.req.param('id');
    const schedule = await scheduleHelpers.getSchedule(id);

    if (!schedule) {
      return c.json({ error: 'Schedule not found', details: `No schedule with id: ${id}` }, 404);
    }

    // Get related template - Supabase 테이블에서 조회
    const { data: template } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', schedule.template_id)
      .single();

    // Get execution history
    const executions = await scheduleHelpers.getScheduleExecutions(id, 100);

    // Convert schedule for frontend
    const frontendSchedule = convertScheduleForFrontend(schedule);

    return c.json({ schedule: frontendSchedule, template, executions });
  } catch (error) {
    console.error('Unexpected error in GET /schedules/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PUT /schedules/:id - Update schedule
app.put("/make-server-5231839f/schedules/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const schedule = await scheduleHelpers.getSchedule(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found', details: `No schedule with id: ${id}` }, 404);
    }

    // Validate template_id if provided - Supabase 테이블에서 조회
    if (body.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('id')
        .eq('id', body.template_id)
        .single();
        
      if (templateError || !template) {
        return c.json({ error: 'Template not found', details: `No template with id: ${body.template_id}` }, 404);
      }
    }

    // Validate dates if provided
    if (body.start_datetime || body.end_datetime) {
      const startDate = new Date(body.start_datetime || schedule.start_datetime);
      const endDate = body.end_datetime ? new Date(body.end_datetime) : schedule.end_datetime ? new Date(schedule.end_datetime) : null;
      
      if (endDate && endDate <= startDate) {
        return c.json({ error: 'end_datetime must be after start_datetime' }, 400);
      }
    }

    // 프론트엔드 데이터를 DB 데이터로 변환
    const dbData = convertScheduleForDatabase(body);

    const updated = await scheduleHelpers.updateSchedule(id, dbData);

    // Create audit log
    await createAuditLog(user, 'UPDATE', 'SCHEDULE', id, {
      schedule_name: updated.name,
      changes: Object.keys(body),
    });

    return c.json({ schedule: updated });
  } catch (error) {
    console.error('Unexpected error in PUT /schedules/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// DELETE /schedules/:id - Delete schedule
app.delete("/make-server-5231839f/schedules/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    const schedule = await scheduleHelpers.getSchedule(id);

    if (!schedule) {
      return c.json({ error: 'Schedule not found', details: `No schedule with id: ${id}` }, 404);
    }

    await scheduleHelpers.deleteSchedule(id);

    // Create audit log
    await createAuditLog(user, 'DELETE', 'SCHEDULE', id, {
      schedule_name: schedule.name,
      template_id: schedule.template_id,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /schedules/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// PUT /schedules/:id/toggle - Toggle schedule active state
app.put("/make-server-5231839f/schedules/:id/toggle", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    const schedule = await scheduleHelpers.getSchedule(id);

    if (!schedule) {
      return c.json({ error: 'Schedule not found', details: `No schedule with id: ${id}` }, 404);
    }

    const updated = await scheduleHelpers.updateSchedule(id, {
      is_active: !schedule.is_active,
    });

    // Create audit log - 활성화/비활성화 구분
    const action = updated.is_active ? 'SCHEDULE_ACTIVATE' : 'SCHEDULE_DEACTIVATE';
    await createAuditLog(user, action, 'SCHEDULE', id, {
      schedule_name: schedule.name,
      template_id: schedule.template_id,
      is_active: updated.is_active,
    });

    return c.json({ schedule: updated });
  } catch (error) {
    console.error('Unexpected error in PUT /schedules/:id/toggle:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /schedules/check-and-execute - Automatic schedule execution (internal/cron)
app.post("/make-server-5231839f/schedules/check-and-execute", async (c) => {
  // This endpoint can be called by external cron jobs or internal triggers
  // For security, you may want to add authorization check
  
  try {
    console.log('⏰ [Cron] Checking all schedules and auto-crawl tasks...');
    
    // 1. Check and execute display schedules (templates)
    const scheduleResult = await checkAndExecuteSchedules();
    console.log('📋 [Cron] Display schedule result:', scheduleResult);
    
    // 2. Check and execute auto-crawl schedules (air quality)
    let airQualityResult = null;
    try {
      // Get current hour (KST)
      const now = new Date();
      const kstHour = (now.getUTCHours() + 9) % 24;
      const kstMinute = now.getUTCMinutes();
      
      console.log(`🕐 [Cron] Current KST time: ${kstHour.toString().padStart(2, '0')}:${kstMinute.toString().padStart(2, '0')}`);
      
      // Execute air quality collection only at XX:00 (±2 minutes)
      if (kstMinute <= 2 || kstMinute >= 58) {
        console.log('🌤️  [Cron] Triggering air quality collection (hourly schedule)...');
        
        const airResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-5231839f/airkorea/collect-hourly`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scope: 'GOYANG' }),
          }
        );
        
        airQualityResult = await airResponse.json();
        console.log('✅ [Cron] Air quality collection result:', airQualityResult);
      } else {
        console.log('⏭️  [Cron] Skipping air quality collection (not on the hour)');
      }
    } catch (airError) {
      console.error('❌ [Cron] Air quality collection failed:', airError);
      airQualityResult = {
        ok: false,
        error: airError instanceof Error ? airError.message : 'Unknown error',
      };
    }
    
    return c.json({
      schedule: scheduleResult,
      airQuality: airQualityResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unexpected error in POST /schedules/check-and-execute:', error);
    return c.json({ 
      executed: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// GET /schedules/:id/executions - Get schedule execution history
app.get("/make-server-5231839f/schedules/:id/executions", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    
    const schedule = await scheduleHelpers.getSchedule(id);
    if (!schedule) {
      return c.json({ error: 'Schedule not found' }, 404);
    }

    const executions = await scheduleHelpers.getScheduleExecutions(id, limit);
    
    // 템플릿 정보 포함하여 반환
    const executionsWithTemplate = await Promise.all(
      executions.map(async (exec) => {
        const { data: template } = await supabase
          .from('message_templates')
          .select('id, name')
          .eq('id', exec.template_id)
          .single();
        
        return {
          ...exec,
          template_name: template?.name || 'Unknown',
        };
      })
    );

    return c.json({ 
      schedule_id: id,
      schedule_name: schedule.name,
      executions: executionsWithTemplate,
      total: executions.length,
    });
  } catch (error) {
    console.error('Unexpected error in GET /schedules/:id/executions:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /schedules/executions/recent - Get recent execution history for all schedules
app.get("/make-server-5231839f/schedules/executions/recent", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const limit = parseInt(c.req.query('limit') || '100');
    
    // 모든 스케줄의 실행 이력을 KV Store에서 조회
    const allExecutions: scheduleHelpers.ScheduleExecution[] = [];
    const allSchedules = await scheduleHelpers.getAllSchedules();
    
    for (const schedule of allSchedules) {
      const executions = await scheduleHelpers.getScheduleExecutions(schedule.id, 10);
      allExecutions.push(...executions);
    }
    
    // 시간 순으로 정렬 (최신순)
    allExecutions.sort((a, b) => 
      new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
    );
    
    // limit 적용
    const limitedExecutions = allExecutions.slice(0, limit);
    
    // 스케줄 및 템플릿 정보 포함
    const executionsWithDetails = await Promise.all(
      limitedExecutions.map(async (exec) => {
        const schedule = await scheduleHelpers.getSchedule(exec.schedule_id);
        const { data: template } = await supabase
          .from('message_templates')
          .select('id, name')
          .eq('id', exec.template_id)
          .single();
        
        return {
          ...exec,
          schedule_name: schedule?.name || 'Unknown',
          template_name: template?.name || 'Unknown',
        };
      })
    );

    return c.json({ 
      executions: executionsWithDetails,
      total: executionsWithDetails.length,
    });
  } catch (error) {
    console.error('Unexpected error in GET /schedules/executions/recent:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// Audit Logs API - 시스템 감사 로그 조회
// ================================================================

// GET /audit-logs - Get audit logs with filtering
app.get("/make-server-5231839f/audit-logs", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');
    const action = c.req.query('action'); // 'CREATE', 'UPDATE', 'DELETE', 'EXECUTE', 'DISPLAY_SEND'
    const resourceType = c.req.query('resource_type'); // 'TEMPLATE', 'SCHEDULE', 'DISPLAY'
    const userId = c.req.query('user_id');
    const startDate = c.req.query('start_date'); // ISO 8601
    const endDate = c.req.query('end_date'); // ISO 8601

    // Get total count with filters
    let countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Apply filters for count
    if (action) {
      countQuery = countQuery.eq('action', action);
    }
    if (resourceType) {
      countQuery = countQuery.eq('resource_type', resourceType);
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }
    if (startDate) {
      countQuery = countQuery.gte('created_at', startDate);
    }
    if (endDate) {
      countQuery = countQuery.lte('created_at', endDate);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Error counting audit logs:', countError);
      return c.json({ error: 'Failed to count audit logs', details: countError.message }, 500);
    }

    // Get paginated data
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return c.json({ error: 'Failed to fetch audit logs', details: error.message }, 500);
    }

    return c.json({ 
      logs: data || [],
      total_count: count || 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /audit-logs:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /audit-logs/stats - Get audit log statistics
app.get("/make-server-5231839f/audit-logs/stats", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    // 최근 24시간 통계
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentLogs, error } = await supabase
      .from('audit_logs')
      .select('action, resource_type')
      .gte('created_at', oneDayAgo);

    if (error) {
      console.error('Error fetching audit log stats:', error);
      return c.json({ error: 'Failed to fetch stats', details: error.message }, 500);
    }

    // 통계 계산
    const stats = {
      total_24h: recentLogs?.length || 0,
      by_action: {} as Record<string, number>,
      by_resource_type: {} as Record<string, number>,
    };

    recentLogs?.forEach(log => {
      // Action별 카운트
      stats.by_action[log.action] = (stats.by_action[log.action] || 0) + 1;
      
      // Resource Type별 카운트
      stats.by_resource_type[log.resource_type] = (stats.by_resource_type[log.resource_type] || 0) + 1;
    });

    return c.json({ stats });
  } catch (error) {
    console.error('Unexpected error in GET /audit-logs/stats:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /audit-logs/test-data - Create test audit log data (OPERATOR only)
app.post("/make-server-5231839f/audit-logs/test-data", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check OPERATOR permission
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Forbidden: OPERATOR role required' }, 403);
  }

  try {
    const testLogs = [
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'CREATE',
        resource_type: 'TEMPLATE',
        resource_id: crypto.randomUUID(),
        action_detail: { name: '테스트 템플릿 1', category: 'NOTICE' },
      },
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'UPDATE',
        resource_type: 'TEMPLATE',
        resource_id: crypto.randomUUID(),
        action_detail: { name: '테스트 템플릿 2', changes: ['title', 'body'] },
      },
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'DELETE',
        resource_type: 'TEMPLATE',
        resource_id: crypto.randomUUID(),
        action_detail: { name: '테스트 템플릿 3' },
      },
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'CREATE',
        resource_type: 'SCHEDULE',
        resource_id: crypto.randomUUID(),
        action_detail: { template_name: '테스트 스케줄', start_at: new Date().toISOString() },
      },
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'EXECUTE',
        resource_type: 'SCHEDULE',
        resource_id: crypto.randomUUID(),
        action_detail: { status: 'success', displays_count: 3 },
      },
      {
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'DISPLAY_SEND',
        resource_type: 'DISPLAY',
        resource_id: crypto.randomUUID(),
        action_detail: { display_name: '공원 정문 전광판', template_name: '긴급공지' },
      },
    ];

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(testLogs)
      .select();

    if (error) {
      console.error('Error creating test audit logs:', error);
      return c.json({ error: 'Failed to create test data', details: error.message }, 500);
    }

    return c.json({ 
      success: true, 
      message: `${testLogs.length}개의 테스트 로그가 생성되었습니다.`,
      logs: data 
    });
  } catch (error) {
    console.error('Unexpected error in POST /audit-logs/test-data:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /audit-log - Create audit log (public endpoint for system events)
app.post("/make-server-5231839f/audit-log", async (c) => {
  try {
    const body = await c.req.json();
    let {
      action,
      user_id,
      user_email,
      user_role,
      resource_type,
      resource_id,
      action_detail,
    } = body;

    // Authorization 헤더가 있으면 사용자 정보 자동 추출
    const authHeader = c.req.header('Authorization');
    if (authHeader && !user_id) {
      const { user } = await verifyAuth(authHeader);
      if (user) {
        user_id = user.id;
        user_email = user_email || user.email;
        user_role = user_role || user.user_metadata?.role || 'VIEWER';
      }
    }

    // user_id가 여전히 없으면 null으로 설정 (UUID 타입이므로)
    if (!user_id) {
      user_id = null;
      user_email = user_email || 'system@auto';
      user_role = user_role || 'SYSTEM';
    }

    // 필수 필드 검증
    if (!action || !resource_type) {
      return c.json({
        error: 'Missing required fields',
        required: ['action', 'resource_type'],
      }, 400);
    }

    // Audit log 생성
    console.log('📝 Creating audit log:', { action, user_id, resource_type });
    const { error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        id: crypto.randomUUID(),
        user_id,
        user_email: user_email || null,
        user_role: user_role || 'SYSTEM',
        action,
        resource_type,
        resource_id: resource_id || null,
        action_detail: action_detail || null,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('❌ Failed to insert audit log:', insertError);
      return c.json({
        error: 'Failed to create audit log',
        details: insertError.message,
      }, 500);
    }

    console.log('✅ Audit log created successfully');
    return c.json({
      success: true,
      message: 'Audit log created',
    });

  } catch (error) {
    console.error('❌ Unexpected error in POST /audit-log:', error);
    return c.json({
      error: 'Internal server error',
      details: error.message,
    }, 500);
  }
});

// ================================================================
// Dashboard API - 대시보드 통계
// ================================================================

// GET /dashboard/stats - Get dashboard statistics
app.get("/make-server-5231839f/dashboard/stats", async (c) => {
  try {
    // 템플릿 통계 - is_active 컬럼 없으므로 전체만 조회
    const { data: templates, error: templatesError } = await supabase
      .from('message_templates')
      .select('id');
    
    if (templatesError) {
      console.error('Error fetching templates:', templatesError);
    }

    const totalTemplates = templates?.length || 0;
    const activeTemplates = totalTemplates; // is_active 컬럼이 없으므로 전체 = 활성

    // 스케줄 통계
    const { data: schedules, error: schedulesError} = await supabase
      .from('schedules')
      .select('id, is_active');
    
    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
    }

    const totalSchedules = schedules?.length || 0;
    const activeSchedules = schedules?.filter(s => s.is_active === true).length || 0;

    // 오늘 실행된 스케줄 수 (audit_logs에서)
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { data: todayLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select('id')
      .eq('action', 'EXECUTE')
      .eq('resource_type', 'SCHEDULE')
      .gte('created_at', todayStart.toISOString());
    
    if (logsError) {
      console.error('Error fetching today logs:', logsError);
    }

    const todayExecutions = todayLogs?.length || 0;

    // 최근 24시간 audit log 수
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const { data: recentLogs, error: recentLogsError } = await supabase
      .from('audit_logs')
      .select('id')
      .gte('created_at', last24Hours.toISOString());
    
    if (recentLogsError) {
      console.error('Error fetching recent logs:', recentLogsError);
    }

    const recentAuditLogs = recentLogs?.length || 0;

    // 현재 송출 중인 템플릿
    const { data: currentState, error: displayError } = await supabase
      .from('display_current_state')
      .select('template_id, expires_at')
      .order('activated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (displayError && displayError.code !== 'PGRST116') {
      console.error('Error fetching current display:', displayError);
    }

    let currentDisplayData = null;
    
    if (currentState) {
      // 템플릿 정보 조회
      const { data: template } = await supabase
        .from('message_templates')
        .select('name, category')
        .eq('id', currentState.template_id)
        .single();
      
      if (template) {
        currentDisplayData = {
          template_name: template.name,
          content_type: mapCategoryToContentType(template.category),
          expires_at: currentState.expires_at,
        };
      }
    }

    return c.json({
      totalTemplates,
      activeTemplates,
      totalSchedules,
      activeSchedules,
      todayExecutions,
      recentAuditLogs,
      currentDisplay: currentDisplayData,
    });
  } catch (error) {
    console.error('Unexpected error in GET /dashboard/stats:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// Broadcast API - 긴급 송출만 지원 (즉시 송출 제거)
// ================================================================

// ✅ 제거: POST /broadcast/instant - 스케줄로 대체
// 즉시 송출이 필요한 경우 → 스케줄 등록 (우선순위 설정)

// POST /broadcast/emergency - 긴급 송출 (EMERGENCY priority=1000)
app.post("/make-server-5231839f/broadcast/emergency", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check emergency permission
  const userRole = user.user_metadata?.role || 'VIEWER';
  const canEmergency = user.user_metadata?.can_emergency === true;

  if (!canEmergency && userRole !== 'ADMIN') {
    return c.json({ error: 'Emergency broadcast permission required' }, 403);
  }

  try {
    const body = await c.req.json();
    const { template_id, duration_minutes = 30 } = body;

    if (!template_id) {
      return c.json({ error: 'template_id is required' }, 400);
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      return c.json({ error: 'Template not found' }, 404);
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();

    // Insert into manual_broadcasts
    const { data: broadcast, error: broadcastError } = await supabase
      .from('manual_broadcasts')
      .insert({
        template_id,
        content_type: 'EMERGENCY',
        priority: 1000,
        start_at: now,
        expires_at: expiresAt,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (broadcastError) {
      console.error('Error creating emergency broadcast:', broadcastError);
      return c.json({ error: 'Failed to create emergency broadcast', details: broadcastError.message }, 500);
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: userRole,
      action: 'EMERGENCY_BROADCAST',
      resource_type: 'manual_broadcast',
      resource_id: broadcast.id,
      action_detail: {
        template_id,
        template_name: template.name,
        priority: 1000,
        duration_minutes,
        expires_at: expiresAt,
      },
    });

    return c.json({
      success: true,
      broadcast,
      message: 'Emergency broadcast started successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /broadcast/emergency:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// DELETE /broadcast/:id - 수동 송출 중지
app.delete("/make-server-5231839f/broadcast/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const broadcastId = c.req.param('id');

    // Update is_active to false
    const { data: broadcast, error: updateError } = await supabase
      .from('manual_broadcasts')
      .update({ is_active: false, expires_at: new Date().toISOString() })
      .eq('id', broadcastId)
      .select()
      .single();

    if (updateError) {
      console.error('Error stopping broadcast:', updateError);
      return c.json({ error: 'Failed to stop broadcast', details: updateError.message }, 500);
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email,
      user_role: userRole,
      action: 'STOP_BROADCAST',
      resource_type: 'manual_broadcast',
      resource_id: broadcastId,
      action_detail: {
        stopped_at: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      message: 'Broadcast stopped successfully',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /broadcast/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /broadcast/stop - 현재 송출 중지 (모든 타입)
app.post("/make-server-5231839f/broadcast/stop", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions' }, 403);
  }

  try {
    const now = new Date().toISOString();
    
    // 1. Get current display state
    const { data: currentState, error: stateError } = await supabase
      .from('display_current_state')
      .select('*')
      .order('updated_at', { ascending: false })
      .maybeSingle();

    console.log('🛑 [Broadcast Stop] Display state query result:', { currentState, stateError });

    if (!currentState) {
      console.error('🛑 [Broadcast Stop] No display state found');
      return c.json({ error: 'No active broadcast found' }, 404);
    }

    console.log('🛑 [Broadcast Stop] Found display state:', currentState.id, 'source:', currentState.source);

    // 2. Stop based on source type
    if (currentState.source === 'schedule') {
      // Stop schedule broadcast
      await supabase
        .from('scheduled_broadcasts')
        .update({ status: 'STOPPED', stopped_at: now, stopped_by: user.id })
        .eq('id', currentState.source_id);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'STOP_SCHEDULE',
        resource_type: 'scheduled_broadcast',
        resource_id: currentState.source_id,
        action_detail: {
          stopped_at: now,
        },
      });
    } else if (currentState.source === 'rotation') {
      // Stop rotation broadcast
      await supabase
        .from('rotation_broadcasts')
        .update({ 
          is_active: false, 
          stopped_at: now, 
          stopped_by: user.id,
          stopped_reason: 'manual_stop'
        })
        .eq('id', currentState.source_id);

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'STOP_ROTATION',
        resource_type: 'rotation_broadcast',
        resource_id: currentState.source_id,
        action_detail: {
          stopped_at: now,
        },
      });
    } else {
      // For instant/emergency or other types, just log the stop without updating source table
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_email: user.email,
        user_role: userRole,
        action: 'STOP_BROADCAST',
        resource_type: currentState.source,
        resource_id: currentState.source_id || currentState.id,
        action_detail: {
          source: currentState.source,
          stopped_at: now,
        },
      });
    }

    // 3. Delete current display state
    const { error: deleteError } = await supabase
      .from('display_current_state')
      .delete()
      .eq('id', currentState.id);

    if (deleteError) {
      console.error('🛑 [Broadcast Stop] Failed to delete display state:', deleteError);
    } else {
      console.log('🛑 [Broadcast Stop] Successfully deleted display state:', currentState.id);
    }

    return c.json({
      success: true,
      message: 'Broadcast stopped successfully',
      stopped_source: currentState.source,
    });
  } catch (error) {
    console.error('Unexpected error in POST /broadcast/stop:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// Rotation Broadcasts API (순차 반복 송출)
// ================================================================

// POST /broadcast/rotation - Create rotation broadcast
app.post("/make-server-5231839f/broadcast/rotation", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const body = await c.req.json();
    const {
      name,
      template_ids,
      duration_per_template,
      start_date,
      end_date,
      priority = 50,
    } = body;

    // Validation
    if (!name || !template_ids || !Array.isArray(template_ids) || template_ids.length < 2) {
      return c.json({ 
        error: 'Missing or invalid required fields. template_ids must be an array with at least 2 items.' 
      }, 400);
    }

    // duration_per_template은 최소 5초 (0.0833분) 이상이어야 함
    if (!duration_per_template || duration_per_template < 0.0833) {
      return c.json({ error: 'duration_per_template must be at least 5 seconds (0.0833 minutes)' }, 400);
    }

    if (!start_date || !end_date) {
      return c.json({ error: 'Missing required fields: start_date, end_date' }, 400);
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (startDate >= endDate) {
      return c.json({ error: 'end_date must be after start_date' }, 400);
    }

    // ✅ 분 단위를 초 단위로 변환 (DB 컬럼이 integer 타입)
    const durationInSeconds = Math.round(duration_per_template * 60);
    console.log(`[Rotation] Duration: ${duration_per_template} min = ${durationInSeconds} seconds`);

    // Create rotation broadcast
    const rotationId = crypto.randomUUID();
    const now = new Date().toISOString();

    // ✅ PostgreSQL: 기존 활성 rotation 모두 비활성화 (자동 정리)
    console.log('[Rotation] Fetching active rotations...');
    const { data: activeRotations, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      console.log('[Rotation] ❌ Error fetching active rotations:', fetchError);
      return c.json({ error: 'Failed to fetch active rotations', details: fetchError.message, code: fetchError.code }, 500);
    }
    
    console.log(`[Rotation] Found ${activeRotations?.length || 0} active rotations`);
    
    if (activeRotations && activeRotations.length > 0) {
      console.log(`[Rotation] Auto-stopping ${activeRotations.length} existing active rotations`);
      
      for (const oldRotation of activeRotations) {
        const { error: updateError } = await supabase
          .from('rotation_broadcasts')
          .update({
            is_active: false,
            stopped_at: now,
            stopped_by: user.id,
            stopped_reason: 'auto_replaced',
          })
          .eq('id', oldRotation.id);
        
        if (updateError) {
          console.error(`[Rotation] Error stopping rotation ${oldRotation.id}:`, updateError);
        } else {
          console.log(`[Rotation] ✅ Auto-stopped: ${oldRotation.name} (${oldRotation.id})`);
        }
      }
    }

    // ✅ PostgreSQL: rotation 생성
    console.log('[Rotation] Creating rotation:', { rotationId, name, template_count: template_ids.length, priority });
    
    // ✅ 다음 전환 시간 계산 (durationInSeconds 초 후)
    const nextSwitchAt = new Date(Date.now() + durationInSeconds * 1000).toISOString();
    
    const { error: insertError } = await supabase
      .from('rotation_broadcasts')
      .insert({
        id: rotationId,
        name,
        template_ids,
        duration_per_template: durationInSeconds, // ✅ 초 단위로 저장
        start_date,
        end_date,
        priority,
        current_index: 0,
        last_switched_at: now,
        next_switch_at: nextSwitchAt, // ✅ 다음 전환 시간 설정
        is_active: true,
        created_at: now,
        created_by: user.id,
      });

    if (insertError) {
      console.log('[Rotation] ❌ Error creating rotation:', insertError);
      return c.json({ error: 'Failed to create rotation', details: insertError.message, code: insertError.code }, 500);
    }
    
    console.log('[Rotation] ✅ Rotation created successfully:', rotationId);

    // Create audit log
    console.log('[Rotation] Creating audit log...');
    const { error: auditError } = await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      event_type: 'ROTATION_CREATE',
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      action: 'CREATE',
      resource_type: 'ROTATION',
      resource_id: rotationId,
      action_detail: {
        name,
        template_count: template_ids.length,
        duration_per_template,
        start_date,
        end_date,
        priority,
      },
      created_at: now,
    });

    if (auditError) {
      console.log('[Rotation] ⚠️ Error creating audit log:', auditError);
    } else {
      console.log('[Rotation] ✅ Audit log created');
    }

    // Start the first broadcast
    const firstTemplateId = template_ids[0];
    const { data: templateData, error: templateError } = await supabase
      .from('message_templates')
      .select('*')
      .eq('id', firstTemplateId)
      .single();

    if (templateError || !templateData) {
      return c.json({ 
        error: 'Failed to fetch first template', 
        details: templateError?.message 
      }, 500);
    }

    // ✅ PostgreSQL: display_current_state 테이블에 저장
    await supabase.from('display_current_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const { error: displayError } = await supabase.from('display_current_state').insert({
      template_id: firstTemplateId,
      source: 'schedule', // CHECK 제약 조건 때문에 'schedule' 사용 (source_id로 rotation 구분)
      source_id: rotationId,
      content_type: mapCategoryToContentType(templateData.category),
      priority: priority,
      activated_at: now,
      expires_at: null, // 순차 반복은 만료 없음
    });

    if (displayError) {
      console.error('❌ [Supabase] Failed to save display state:', displayError);
      return c.json({ 
        error: 'Failed to save display state to database', 
        details: displayError.message,
        code: displayError.code 
      }, 500);
    }

    // Audit log for first broadcast
    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      event_type: 'ROTATION_SWITCH',
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      action: 'UPDATE',
      resource_type: 'ROTATION',
      resource_id: rotationId,
      action_detail: {
        rotation_name: name,
        template_id: firstTemplateId,
        template_name: templateData.name,
        index: 0,
        total: template_ids.length,
      },
      created_at: now,
    });

    // Get created rotation
    const { data: createdRotation } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('id', rotationId)
      .single();

    return c.json({
      success: true,
      rotation: createdRotation,
      message: 'Rotation broadcast created and started successfully',
    });
  } catch (error) {
    console.error('Error creating rotation broadcast:', error);
    return c.json({ error: 'Failed to create rotation broadcast', details: error.message }, 500);
  }
});

// GET /broadcast/rotations - Get all rotation broadcasts
app.get("/make-server-5231839f/broadcast/rotations", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    // ✅ PostgreSQL: rotation 목록 조회 (전체)
    const { data: rotations, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching rotations:', fetchError);
      return c.json({ error: 'Failed to fetch rotations', details: fetchError.message }, 500);
    }

    return c.json({
      success: true,
      rotations: rotations || [],
    });
  } catch (error) {
    console.error('Error fetching rotations:', error);
    return c.json({ error: 'Failed to fetch rotations', details: error.message }, 500);
  }
});

// DELETE /broadcast/rotation/:id - Delete rotation broadcast
app.delete("/make-server-5231839f/broadcast/rotation/:id", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    
    // ✅ PostgreSQL: rotation 조회
    const { data: rotation, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !rotation) {
      return c.json({ error: 'Rotation not found' }, 404);
    }

    // ✅ 완전 삭제 (하드 삭제)
    const now = new Date().toISOString();
    const { error: deleteError } = await supabase
      .from('rotation_broadcasts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting rotation:', deleteError);
      return c.json({ error: 'Failed to delete rotation', details: deleteError.message }, 500);
    }

    // ✅ display_current_state 정리 (해당 rotation이 현재 송출 중이면 제거)
    await supabase
      .from('display_current_state')
      .delete()
      .eq('source_id', id);

    // Create audit log
    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      event_type: 'ROTATION_DELETED',
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      action: 'DELETE',
      resource_type: 'ROTATION',
      resource_id: id,
      action_detail: {
        rotation_name: rotation.name,
        template_count: rotation.template_ids?.length || 0,
      },
      created_at: now,
    });

    return c.json({
      success: true,
      message: 'Rotation broadcast deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting rotation:', error);
    return c.json({ error: 'Failed to delete rotation', details: error.message }, 500);
  }
});

// POST /broadcast/rotation/:id/toggle - Toggle rotation active state
app.post("/make-server-5231839f/broadcast/rotation/:id/toggle", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    const id = c.req.param('id');
    
    // ✅ PostgreSQL: rotation 조회
    const { data: rotation, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !rotation) {
      return c.json({ error: 'Rotation not found' }, 404);
    }

    // Toggle active state
    const now = new Date().toISOString();
    const newActiveState = !rotation.is_active;
    const { data: updatedRotation, error: updateError } = await supabase
      .from('rotation_broadcasts')
      .update({
        is_active: newActiveState,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error toggling rotation:', updateError);
      return c.json({ error: 'Failed to toggle rotation', details: updateError.message }, 500);
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      id: crypto.randomUUID(),
      event_type: newActiveState ? 'ROTATION_START' : 'ROTATION_STOP',
      user_id: user.id,
      user_email: user.email || '',
      user_role: userRole,
      action: 'UPDATE',
      resource_type: 'ROTATION',
      resource_id: id,
      action_detail: {
        rotation_name: rotation.name,
        is_active: newActiveState,
      },
      created_at: now,
    });

    return c.json({
      success: true,
      rotation: updatedRotation,
      message: `Rotation ${newActiveState ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling rotation:', error);
    return c.json({ error: 'Failed to toggle rotation', details: error.message }, 500);
  }
});

// ✅ POST /broadcast/rotation/cleanup - 중복 rotation 정리 (최신 것만 유지)
app.post("/make-server-5231839f/broadcast/rotation/cleanup", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  // Check if user has OPERATOR or ADMIN role
  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'OPERATOR' && userRole !== 'ADMIN') {
    return c.json({ error: 'Insufficient permissions. OPERATOR or ADMIN role required.' }, 403);
  }

  try {
    // ✅ PostgreSQL: 모든 활성 rotation 조회
    const { data: rotations, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching rotations:', fetchError);
      return c.json({ error: 'Failed to fetch rotations', details: fetchError.message }, 500);
    }

    const activeRotations = rotations || [];
    
    console.log(`[Rotation Cleanup] Found ${activeRotations.length} active rotations`);
    
    if (activeRotations.length <= 1) {
      return c.json({
        success: true,
        message: 'No cleanup needed. Only one or zero active rotations found.',
        active_count: activeRotations.length,
      });
    }

    // Keep the newest, stop all others
    const newestRotation = activeRotations[0];
    const rotationsToStop = activeRotations.slice(1);

    console.log(`[Rotation Cleanup] Keeping newest rotation: ${newestRotation.name} (${newestRotation.id})`);
    console.log(`[Rotation Cleanup] Stopping ${rotationsToStop.length} old rotations`);

    // Stop old rotations
    const now = new Date().toISOString();
    const stoppedIds = [];
    
    for (const rotation of rotationsToStop) {
      const { error: updateError } = await supabase
        .from('rotation_broadcasts')
        .update({
          is_active: false,
          stopped_at: now,
          stopped_by: user.id,
          stopped_reason: 'auto_cleanup',
        })
        .eq('id', rotation.id);

      if (updateError) {
        console.error(`[Rotation Cleanup] Error stopping rotation ${rotation.id}:`, updateError);
      } else {
        stoppedIds.push(rotation.id);

        // Create audit log
        await supabase.from('audit_logs').insert({
          id: crypto.randomUUID(),
          event_type: 'ROTATION_AUTO_STOP',
          user_id: user.id,
          user_email: user.email || '',
          user_role: userRole,
          action: 'UPDATE',
          resource_type: 'ROTATION',
          resource_id: rotation.id,
          action_detail: {
            rotation_name: rotation.name,
            reason: 'auto_cleanup',
            kept_rotation_id: newestRotation.id,
          },
          created_at: now,
        });

        console.log(`[Rotation Cleanup] ✅ Stopped rotation: ${rotation.name} (${rotation.id})`);
      }
    }

    return c.json({
      success: true,
      message: 'Rotation cleanup completed successfully',
      kept_rotation: {
        id: newestRotation.id,
        name: newestRotation.name,
        created_at: newestRotation.created_at,
      },
      stopped_rotations: stoppedIds,
      stopped_count: stoppedIds.length,
    });
  } catch (error) {
    console.error('Error during rotation cleanup:', error);
    return c.json({ error: 'Failed to cleanup rotations', details: error.message }, 500);
  }
});

// GET /broadcast/rotation/active - Get active rotation broadcast
app.get("/make-server-5231839f/broadcast/rotation/active", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  try {
    // ✅ PostgreSQL: 활성 rotation 조회
    const { data: rotations, error: fetchError } = await supabase
      .from('rotation_broadcasts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching active rotation:', fetchError);
      return c.json({ error: 'Failed to fetch active rotation', details: fetchError.message }, 500);
    }
    
    const activeRotation = rotations && rotations.length > 0 ? rotations[0] : null;
    
    if (!activeRotation) {
      return c.json({ 
        active: false,
        rotation: null 
      });
    }

    // Get current template info
    const currentTemplateId = activeRotation.template_ids[activeRotation.current_index || 0];
    let currentTemplate = null;
    
    try {
      const { data: templateData } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', currentTemplateId)
        .single();
      
      currentTemplate = templateData;
    } catch (err) {
      console.error('Error fetching current template:', err);
    }

    // Calculate next switch time
    const createdAt = new Date(activeRotation.created_at).getTime();
    const now = Date.now();
    const elapsed = now - createdAt;
    const durationMs = activeRotation.duration_per_template * 60 * 1000; // minutes to ms
    const cyclesSinceStart = Math.floor(elapsed / durationMs);
    const nextSwitchTime = new Date(createdAt + (cyclesSinceStart + 1) * durationMs);
    const timeUntilNext = nextSwitchTime.getTime() - now;

    return c.json({
      active: true,
      rotation: {
        ...activeRotation,
        current_template: currentTemplate,
        next_switch_at: nextSwitchTime.toISOString(),
        time_until_next_ms: timeUntilNext,
      }
    });
  } catch (error) {
    console.error('Error fetching active rotation:', error);
    return c.json({ error: 'Failed to fetch active rotation', details: error.message }, 500);
  }
});

// ================================================================
// MIGRATION ENDPOINTS - KV Store → PostgreSQL
// ================================================================

import * as migrationHelper from './migration_helper.ts';

// POST /migration/rotation-to-postgres - Migrate rotation data
app.post("/make-server-5231839f/migration/rotation-to-postgres", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'ADMIN') {
    return c.json({ error: 'ADMIN role required' }, 403);
  }

  try {
    const result = await migrationHelper.migrateRotationsToPostgres();
    return c.json({
      success: result.success,
      message: `Migration: ${result.migrated} migrated, ${result.skipped} skipped`,
      migrated: result.migrated,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    return c.json({ error: 'Migration failed', details: error.message }, 500);
  }
});

// POST /migration/cleanup-kv-duplicates - Clean up KV Store
app.post("/make-server-5231839f/migration/cleanup-kv-duplicates", async (c) => {
  const { error: authError, user } = await verifyAuth(c.req.header('Authorization'));
  if (authError) {
    return c.json({ error: authError }, 401);
  }

  const userRole = user.user_metadata?.role || 'VIEWER';
  if (userRole !== 'ADMIN') {
    return c.json({ error: 'ADMIN role required' }, 403);
  }

  try {
    const result = await migrationHelper.cleanupKVDuplicates();
    return c.json({
      success: result.success,
      message: `Cleanup: ${result.deleted.length} deleted`,
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error) {
    return c.json({ error: 'Cleanup failed', details: error.message }, 500);
  }
});

// ================================================================
// 크롤러 엔드포인트
// ================================================================

// POST /crawl/joongsan-today - 고양시 인조잔디구장 '중산' 경기 크롤링
app.post("/make-server-5231839f/crawl/joongsan-today", async (c) => {
  try {
    console.log('🏟️  Starting Joongsan crawler...');
    
    // 사용자 인증 확인 (선택적)
    let userId: string | null = null; // ✅ UUID 타입이므로 null 초기화
    let userEmail = 'system@auto';
    let userRole = 'SYSTEM';
    
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const { user } = await verifyAuth(authHeader);
      if (user) {
        userId = user.id;
        userEmail = user.email || 'unknown@user';
        userRole = user.user_metadata?.role || 'VIEWER';
      }
    }
    
    const result = await crawlJoongsanToday();
    
    if (result.success) {
      // 성공 시 Audit Log 기록
      console.log('📝 Recording audit log for successful crawl...');
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          user_email: userEmail,
          user_role: userRole,
          action: 'CRAWL_SUCCESS',
          resource_type: 'CRAWL_DATA',
          resource_id: null,
          action_detail: {
            crawl_id: `crawl_${result.data?.date || new Date().toISOString().split('T')[0]}`,
            date: result.data?.date,
            total_parsed: result.data?.totalParsed || 0,
            upserted: result.data?.upserted || 0,
            failed: result.data?.failed || 0,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
      
      if (auditError) {
        console.error('❌ Failed to create audit log:', auditError);
      } else {
        console.log('✅ Audit log created successfully');
      }
      
      return c.json(result, 200);
    } else {
      // 실패 시 Audit Log 기록
      console.log('📝 Recording audit log for failed crawl...');
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .insert({
          id: crypto.randomUUID(),
          user_id: userId,
          user_email: userEmail,
          user_role: userRole,
          action: 'CRAWL_FAILED',
          resource_type: 'CRAWL_DATA',
          resource_id: null,
          action_detail: {
            crawl_id: `crawl_failed_${new Date().toISOString()}`,
            error: result.error || result.message,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
      
      if (auditError) {
        console.error('❌ Failed to create audit log:', auditError);
      } else {
        console.log('✅ Audit log created successfully');
      }
      
      return c.json(result, 500);
    }
  } catch (error) {
    console.error('❌ Crawler endpoint error:', error);
    
    // 예외 발생 시 Audit Log 기록
    try {
      await supabase
        .from('audit_logs')
        .insert({
          id: crypto.randomUUID(),
          user_id: null, // ✅ UUID 타입이므로 null 사용
          user_email: 'system@error',
          user_role: 'SYSTEM',
          action: 'CRAWL_ERROR',
          resource_type: 'CRAWL_DATA',
          resource_id: null,
          action_detail: {
            crawl_id: `crawl_error_${new Date().toISOString()}`,
            error: error.message || String(error),
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.error('Failed to log audit error:', logError);
    }
    
    return c.json({ 
      success: false,
      error: 'Crawler failed', 
      details: error.message 
    }, 500);
  }
});

// GET /matches/active-now - 현재 송출해야 할 경기 목록 조회 (경기 시작 10분 전 ~ 경기 종료)
app.get('/make-server-5231839f/matches/active-now', async (c) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // today_matches 테이블에서 오늘 경기 조회
    const { data: matches, error } = await supabase
      .from('today_matches')
      .select('*')
      .eq('match_date', todayStr);
    
    if (error) {
      console.error('Failed to fetch matches:', error);
      return c.json({ error: 'Failed to fetch matches', details: error.message }, 500);
    }
    
    // 현재 시간이 "시작 10분 전 ~ 종료" 범위인 경기 필터링
    const activeMatches = (matches || []).filter(match => {
      const timeRange = match.time_range; // "09:00~11:00"
      if (!timeRange || !timeRange.includes('~')) return false;
      
      const [startStr, endStr] = timeRange.split('~').map(t => t.trim());
      
      // 오늘 날짜 + 시간으로 Date 객체 생성
      const startTime = new Date(`${todayStr}T${startStr}:00`);
      const endTime = new Date(`${todayStr}T${endStr}:00`);
      
      // 시작 10분 전
      const displayStartTime = new Date(startTime.getTime() - 10 * 60 * 1000);
      
      // 현재 시간이 범위 내에 있는지 확인
      return now >= displayStartTime && now <= endTime;
    });
    
    return c.json({
      success: true,
      current_time: now.toISOString(),
      total_matches: matches?.length || 0,
      active_matches: activeMatches.length,
      matches: activeMatches.map(m => ({
        match_key: m.match_key,
        stadium: m.stadium,
        club_name: m.club_name,
        time_range: m.time_range,
        duration_text: m.duration_text,
        match_date: m.match_date,
      }))
    });
    
  } catch (error) {
    console.error('Unexpected error in GET /matches/active-now:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ✅ match_key를 기반으로 일관된 UUID 생성 (deterministic UUID v5 스타일)
function generateDeterministicUUID(key: string): string {
  // 간단한 해시 함수로 32개의 16진수 문자 생성
  let hash1 = 0, hash2 = 0, hash3 = 0, hash4 = 0;
  
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash1 = ((hash1 << 5) - hash1) + char;
    hash2 = ((hash2 << 3) - hash2) + char * 3;
    hash3 = ((hash3 << 7) - hash3) + char * 7;
    hash4 = ((hash4 << 4) - hash4) + char * 11;
  }
  
  // 32비트 정수로 변환
  hash1 = hash1 & 0xffffffff;
  hash2 = hash2 & 0xffffffff;
  hash3 = hash3 & 0xffffffff;
  hash4 = hash4 & 0xffffffff;
  
  // UUID 형식으로 변환: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const hex1 = Math.abs(hash1).toString(16).padStart(8, '0').substr(0, 8);
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0').substr(0, 4);
  const hex3 = Math.abs(hash3).toString(16).padStart(8, '0').substr(0, 4);
  const hex4 = Math.abs(hash4).toString(16).padStart(16, '0').substr(0, 12);
  
  return `${hex1}-${hex2}-4${hex3.substr(1)}-a${hex3.substr(1, 3)}-${hex4}`;
}

// POST /matches/sync-templates - 활성 경기를 템플릿 및 스케줄로 동기화
app.post('/make-server-5231839f/matches/sync-templates', async (c) => {
  // ✅ 자동화 시스템이므로 인증 선택적 (SYSTEM 권한으로 실행)
  const authHeader = c.req.header('Authorization');
  let userId = 'SYSTEM';
  let userEmail = 'system@auto';
  
  if (authHeader) {
    const { user } = await verifyAuth(authHeader);
    if (user) {
      userId = user.id;
      userEmail = user.email || 'system@auto';
    }
  }

  try {
    // ✅ 한국 시간대(UTC+9) 사용
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD (한국 날짜)
    
    // 현재 활성 경기 조회
    const { data: matches, error: matchError } = await supabase
      .from('today_matches')
      .select('*')
      .eq('match_date', todayStr);
    
    if (matchError) {
      console.error('Failed to fetch matches:', matchError);
      return c.json({ error: 'Failed to fetch matches', details: matchError.message }, 500);
    }
    
    // ✅ 변경: 오늘의 모든 경기를 템플릿/스케줄로 생성 (활성화는 스케줄 시간으로 자동 제어)
    const allMatches = matches || [];
    
    // 현재 시간 기준 활성 경기만 카운트 (로그용)
    const activeMatches = allMatches.filter(match => {
      if (!match.start_time || !match.end_time) return false;
      
      const startTime = new Date(match.start_time);
      const endTime = new Date(match.end_time);
      const displayStartTime = new Date(startTime.getTime() - 10 * 60 * 1000);
      
      return now >= displayStartTime && now <= endTime;
    });
    
    const results = {
      created: 0,
      deleted: 0,
      errors: [] as string[],
    };
    
    // ✅ 고정 템플릿 ID (deterministic UUID)
    const FIXED_TEMPLATE_ID = generateDeterministicUUID('template_daily_matches');
    
    // ✅ 모든 경기 데이터를 HTML로 구성 (48px 폰트, 줄간격 없음)
    let matchesHtml = '';
    if (allMatches.length === 0) {
      matchesHtml = (`
        <div style="font-size: 48px; line-height: 48px; color: white; text-align: center;">
          오늘 대관 정보
        </div>
        <div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin-top: 0;">
          대관정보가 없습니다.
        </div>
      `).replace('color: white; text-align: center;\">\n          오늘 대관 정보', 'color: gold; text-align: center;\">\n          오늘 대관 정보');
    } else {
      const titleHtml = '<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">오늘 대관 정보</div>'.replace('color: white', 'color: gold');
      
      const matchesListHtml = allMatches.map(match => {
        if (!match.start_time || !match.end_time) return '';
        
        const startTime = new Date(match.start_time);
        const endTime = new Date(match.end_time);
        const clubName = (match.club_name || '예약됨').replace(/\[.*?\]/g, '').trim();
        
        // ✅ UTC 시간을 한국 시간(KST, UTC+9)으로 변환
        const startHour = startTime.getUTCHours() + 9;
        const endHour = endTime.getUTCHours() + 9;
        
        return `<div style="font-size: 48px; line-height: 48px; color: white; text-align: center; margin: 0; padding: 0;">${clubName} ${startHour}~${endHour}시</div>`.replace('text-align: center', 'text-align: left');
      }).filter(html => html).join('');
      
      matchesHtml = titleHtml + matchesListHtml;
    }
    
    // ✅ 고정 템플릿 업데이트
    const { error: templateError } = await supabase
      .from('message_templates')
      .upsert({
        id: FIXED_TEMPLATE_ID,
        name: '[자동] 오늘의 경기 일정',
        title: '오늘 대관 정보',
        body: matchesHtml,
        highlight: null,
        category: 'joongsan_match',
        style_config: {
          backgroundColor: '#000000',
          textColor: '#ffffff',
          fontSize: '48px',
          fontWeight: 'normal',
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
        },
        created_by: null,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });
    
    if (templateError) {
      console.error('Failed to update match template:', templateError);
      return c.json({ success: false, error: templateError.message }, 500);
    }
    
    // ✅ 크롤러는 템플릿만 업데이트하고 스케줄은 생성하지 않음
    // ✅ 사용자가 수동으로 "[자동] 오늘의 경기 일정" 템플릿을 사용하여 스케줄 생성 가능
    console.log('✅ Template updated successfully. Users can manually create schedules using this template.');
    
    // ✅ Audit log - 중복 방지: 최근 1시간 이내에 동일한 내용의 로그가 없을 때만 생성
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('action_detail')
      .eq('action', 'MATCH_TEMPLATE_UPDATED')
      .eq('resource_id', FIXED_TEMPLATE_ID)
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    const currentDetail = {
      template_id: FIXED_TEMPLATE_ID,
      template_name: '[자동] 오늘의 경기 일정',
      total_matches: allMatches.length,
      matches: allMatches.map(m => ({
        stadium: m.stadium,
        club_name: m.club_name,
        time_range: m.time_range,
      })),
    };

    // 최근 로그와 비교: 내용이 다르면 실제 크롤링이 발생한 것이므로 로그 생성
    let shouldCreateLog = true;
    if (recentLogs && recentLogs.length > 0) {
      try {
        // action_detail이 문자열로 저장되어 있으므로 파싱
        const lastDetail = typeof recentLogs[0].action_detail === 'string' 
          ? JSON.parse(recentLogs[0].action_detail)
          : recentLogs[0].action_detail;
        
        // 정렬된 JSON 문자열로 비교 (matches 배열 순서가 달라도 내용이 같으면 동일하게 판단)
        const normalizeDetail = (detail: any) => {
          const normalized = { ...detail };
          if (normalized.matches) {
            normalized.matches = normalized.matches.sort((a: any, b: any) => 
              `${a.stadium}-${a.club_name}-${a.time_range}`.localeCompare(`${b.stadium}-${b.club_name}-${b.time_range}`)
            );
          }
          return JSON.stringify(normalized);
        };
        
        shouldCreateLog = normalizeDetail(lastDetail) !== normalizeDetail(currentDetail);
      } catch (e) {
        console.error('Failed to parse action_detail:', e);
        shouldCreateLog = true; // 파싱 실패 시 로그 생성
      }
    }

    if (shouldCreateLog) {
      await supabase.from('audit_logs').insert({
        id: crypto.randomUUID(),
        user_id: null,
        user_email: 'system@auto',
        user_role: 'SYSTEM',
        action: 'MATCH_TEMPLATE_UPDATED',
        resource_type: 'TEMPLATE',
        resource_id: FIXED_TEMPLATE_ID,
        action_detail: currentDetail,
        created_at: new Date().toISOString(),
      });
      console.log('✅ Audit log created: Match template updated');
    } else {
      console.log('⏭️ Audit log skipped: No changes detected (identical content)');
    }
    
    return c.json({
      success: true,
      korea_time: koreaTime.toISOString(),
      today_str: todayStr,
      total_matches: allMatches.length,
      active_matches_now: activeMatches.length,
      all_match_details: allMatches.map(m => ({
        club_name: m.club_name,
        time_range: m.time_range,
        stadium: m.stadium,
      })),
      active_match_details: activeMatches.map(m => ({
        club_name: m.club_name,
        time_range: m.time_range,
        stadium: m.stadium,
      })),
      template_updated: true,
      schedule_updated: false, // ✅ 더 이상 스케줄 자동 생성 안 함
      errors: results.errors,
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /matches/sync-templates:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /matches/today - 오늘 저장된 경기 목록 조회
app.get('/make-server-5231839f/matches/today', async (c) => {
  try {
    // ✅ 한국 시간대(UTC+9) 사용
    const now = new Date();
    const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD (한국 날짜)
    
    const { data: matches, error } = await supabase
      .from('today_matches')
      .select('*')
      .eq('match_date', todayStr)
      .order('time_range', { ascending: true });
    
    if (error) {
      console.error('Failed to fetch today matches:', error);
      return c.json({ error: 'Failed to fetch matches', details: error.message }, 500);
    }
    
    return c.json({
      success: true,
      date: todayStr,
      korea_time: koreaTime.toISOString(),
      count: matches?.length || 0,
      matches: matches || [],
    });
  } catch (error) {
    console.error('Unexpected error in GET /matches/today:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// Air Quality Settings API
// ================================================================

// GET /settings/air-quality - 공기질 표출 설정 조회
app.get('/make-server-5231839f/settings/air-quality', async (c) => {
  try {
    const { data, error } = await supabase
      .from('kv_store_5231839f')
      .select('value')
      .eq('key', 'air_quality_settings')
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Failed to fetch air quality settings:', error);
      return c.json({ error: 'Failed to fetch settings', details: error.message }, 500);
    }
    
    // 기본값
    const defaultSettings = {
      enabled: false,
      update_interval_minutes: 60,
      display_duration_seconds: 10,
      station_name: '고양시',
    };
    
    const settings = data?.value || defaultSettings;
    
    return c.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Unexpected error in GET /settings/air-quality:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /settings/air-quality - 공기질 표출 설정 저장
app.post('/make-server-5231839f/settings/air-quality', async (c) => {
  try {
    const body = await c.req.json();
    const { enabled, update_interval_minutes, display_duration_seconds, station_name } = body;
    
    // Validation
    if (typeof enabled !== 'boolean') {
      return c.json({ error: 'Invalid enabled value' }, 400);
    }
    
    if (typeof update_interval_minutes !== 'number' || update_interval_minutes < 10 || update_interval_minutes > 1440) {
      return c.json({ error: 'Invalid update_interval_minutes (must be 10-1440)' }, 400);
    }
    
    if (typeof display_duration_seconds !== 'number' || display_duration_seconds < 5 || display_duration_seconds > 60) {
      return c.json({ error: 'Invalid display_duration_seconds (must be 5-60)' }, 400);
    }
    
    if (!station_name || typeof station_name !== 'string') {
      return c.json({ error: 'Invalid station_name' }, 400);
    }
    
    const settings = {
      enabled,
      update_interval_minutes,
      display_duration_seconds,
      station_name,
    };
    
    // Upsert settings
    const { error } = await supabase
      .from('kv_store_5231839f')
      .upsert({
        key: 'air_quality_settings',
        value: settings,
      }, {
        onConflict: 'key',
      });
    
    if (error) {
      console.error('Failed to save air quality settings:', error);
      return c.json({ error: 'Failed to save settings', details: error.message }, 500);
    }
    
    console.log('✅ Air quality settings saved:', settings);
    
    return c.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Unexpected error in POST /settings/air-quality:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================================
// AirKorea API - Station Search & Data Collection
// ================================================================

// POST /airkorea/search-stations - 측정소 검색
app.post('/make-server-5231839f/airkorea/search-stations', async (c) => {
  try {
    const body = await c.req.json();
    const { q, mode = 'auto', numOfRows = 30, pageNo = 1 } = body;
    
    // Validation
    if (!q || q.length < 2) {
      return c.json({
        ok: true,
        items: [],
        meta: { q, mode, count: 0 },
      });
    }
    
    const serviceKey = Deno.env.get('AIRKOREA_SERVICE_KEY');
    if (!serviceKey) {
      return c.json({
        ok: false,
        reason: 'MISSING_SERVICE_KEY',
        detail: 'AIRKOREA_SERVICE_KEY not configured',
        meta: { q, mode },
      }, 500);
    }
    
    // Determine search parameter based on mode
    let searchParam = '';
    if (mode === 'auto') {
      // Check if q contains address tokens
      const addressTokens = ['시', '군', '구', '동', '면', '읍', '도', '특별시', '광역시'];
      const hasAddressToken = addressTokens.some(token => q.includes(token));
      searchParam = hasAddressToken ? `&addr=${encodeURIComponent(q)}` : `&stationName=${encodeURIComponent(q)}`;
    } else if (mode === 'addr') {
      searchParam = `&addr=${encodeURIComponent(q)}`;
    } else if (mode === 'stationName') {
      searchParam = `&stationName=${encodeURIComponent(q)}`;
    }
    
    // Call AirKorea API
    const url = `https://apis.data.go.kr/B552584/MsrstnInfoInqireSvc/getMsrstnList?serviceKey=${serviceKey}&returnType=json&numOfRows=${numOfRows}&pageNo=${pageNo}${searchParam}`;
    
    console.log(`🔍 Searching stations: q="${q}", mode="${mode}"`);
    
    const result = await fetchWithRetry({ url });
    
    if (!result.ok) {
      return c.json({
        ok: false,
        reason: result.reason,
        detail: `Failed to fetch stations: ${result.reason}`,
        meta: { q, mode, elapsedMs: result.elapsedMs },
      });
    }
    
    // Validate response
    const validation = validateAirKoreaResponse(result.data);
    if (!validation.ok) {
      return c.json({
        ok: false,
        reason: validation.reason,
        detail: `Invalid response: ${validation.reason}`,
        meta: { q, mode, elapsedMs: result.elapsedMs },
      });
    }
    
    // Sort results: prioritize matches in stationName and addr
    const items = validation.items || [];
    const sorted = items.sort((a, b) => {
      const aStationMatch = a.stationName?.includes(q) ? 1 : 0;
      const bStationMatch = b.stationName?.includes(q) ? 1 : 0;
      const aAddrMatch = a.addr?.includes(q) ? 1 : 0;
      const bAddrMatch = b.addr?.includes(q) ? 1 : 0;
      
      return (bStationMatch + bAddrMatch) - (aStationMatch + aAddrMatch);
    });
    
    console.log(`✅ Found ${sorted.length} stations`);
    
    return c.json({
      ok: true,
      items: sorted.slice(0, 30),
      meta: { q, mode, count: sorted.length, elapsedMs: result.elapsedMs },
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /airkorea/search-stations:', error);
    return c.json({ 
      ok: false, 
      reason: 'INTERNAL_ERROR',
      detail: error.message 
    }, 500);
  }
});

// POST /airkorea/collect-hourly - 시간별 데이터 수집 (Primary/Secondary 폴백)
app.post('/make-server-5231839f/airkorea/collect-hourly', async (c) => {
  try {
    const body = await c.req.json();
    const { scope = 'GOYANG' } = body;
    
    const serviceKey = Deno.env.get('AIRKOREA_SERVICE_KEY');
    if (!serviceKey) {
      return c.json({
        ok: false,
        scope,
        message: 'AIRKOREA_SERVICE_KEY not configured',
        tried: [],
      }, 500);
    }
    
    console.log(`🌤️  Starting air quality collection for scope: ${scope}`);
    
    // Check for duplicate run (within last 55 minutes)
    const { data: recentRuns } = await supabase
      .from('air_collect_logs')
      .select('run_at, success')
      .eq('scope', scope)
      .gte('run_at', new Date(Date.now() - 55 * 60 * 1000).toISOString())
      .order('run_at', { ascending: false })
      .limit(1);
    
    if (recentRuns && recentRuns.length > 0) {
      console.log('⚠️  Recent run detected within 55 minutes. Skipping...');
      return c.json({
        ok: false,
        scope,
        message: 'Duplicate run prevented (recent run within 55 minutes)',
        tried: [],
      });
    }
    
    // Get enabled stations (priority ASC)
    const { data: stations, error: stationsError } = await supabase
      .from('air_station_settings')
      .select('*')
      .eq('scope', scope)
      .eq('enabled', true)
      .order('priority', { ascending: true });
    
    if (stationsError) {
      console.error('Failed to fetch stations:', stationsError);
      return c.json({
        ok: false,
        scope,
        message: 'Failed to fetch station settings',
        tried: [],
      }, 500);
    }
    
    if (!stations || stations.length === 0) {
      console.log('⚠️  No enabled stations found');
      return c.json({
        ok: false,
        scope,
        message: 'No enabled stations configured',
        tried: [],
      });
    }
    
    const tried: any[] = [];
    let selectedData: any = null;
    let selectedStation: any = null;
    
    // Try each station in priority order
    for (const station of stations) {
      console.log(`🔄 Trying station: ${station.station_name} (priority ${station.priority})`);
      
      const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${serviceKey}&returnType=json&numOfRows=100&pageNo=1&stationName=${encodeURIComponent(station.station_name)}&dataTerm=DAILY&ver=1.5`;
      
      const result = await fetchWithRetry({ url });
      
      const attemptLog = {
        priority: station.priority,
        stationName: station.station_name,
        ok: result.ok,
        reason: result.ok ? 'OK' : result.reason,
        httpStatus: result.status || null,
        elapsedMs: result.elapsedMs,
      };
      
      if (!result.ok) {
        tried.push(attemptLog);
        console.log(`❌ Failed: ${result.reason}`);
        continue;
      }
      
      // Validate response
      const validation = validateAirKoreaResponse(result.data);
      if (!validation.ok) {
        attemptLog.ok = false;
        attemptLog.reason = validation.reason;
        tried.push(attemptLog);
        console.log(`❌ Invalid response: ${validation.reason}`);
        continue;
      }
      
      // Get latest item
      const latestItem = getLatestItem(validation.items || []);
      if (!latestItem || !latestItem.dataTime) {
        attemptLog.ok = false;
        attemptLog.reason = 'NO_VALID_DATATIME';
        tried.push(attemptLog);
        console.log(`❌ No valid dataTime found`);
        continue;
      }
      
      // Parse dataTime
      const dataTimeIso = parseDataTime(latestItem.dataTime);
      if (!dataTimeIso) {
        attemptLog.ok = false;
        attemptLog.reason = 'BAD_DATETIME';
        tried.push(attemptLog);
        console.log(`❌ Bad dataTime format: ${latestItem.dataTime}`);
        continue;
      }
      
      // Success!
      tried.push(attemptLog);
      selectedData = latestItem;
      selectedStation = station;
      console.log(`✅ Success! dataTime: ${latestItem.dataTime}`);
      break;
    }
    
    // Save to air_collect_logs
    const logData = {
      scope,
      run_at: new Date().toISOString(),
      tried: JSON.stringify(tried),
      success: !!selectedData,
      selected_priority: selectedStation?.priority || null,
      selected_station_name: selectedStation?.station_name || null,
      selected_data_time: selectedData ? parseDataTime(selectedData.dataTime) : null,
      message: selectedData 
        ? `Success (priority ${selectedStation.priority})` 
        : '모든 측정소 수집 실패',
    };
    
    await supabase.from('air_collect_logs').insert(logData);
    
    // If failed, return error
    if (!selectedData) {
      console.log('❌ All stations failed');
      return c.json({
        ok: false,
        scope,
        message: '모든 측정소 수집 실패',
        tried,
      });
    }
    
    // Save to air_quality_hourly
    const dataTimeIso = parseDataTime(selectedData.dataTime);
    const hourlyData = {
      scope,
      station_name: selectedStation.station_name,
      station_code: selectedData.stationCode,
      data_time: dataTimeIso,
      fetched_at: new Date().toISOString(),
      source_priority: selectedStation.priority,
      khai_value: selectedData.khaiValue,
      khai_grade: selectedData.khaiGrade,
      pm10_value: selectedData.pm10Value,
      pm10_grade: selectedData.pm10Grade,
      pm25_value: selectedData.pm25Value,
      pm25_grade: selectedData.pm25Grade,
      so2_value: selectedData.so2Value,
      so2_grade: selectedData.so2Grade,
      co_value: selectedData.coValue,
      co_grade: selectedData.coGrade,
      o3_value: selectedData.o3Value,
      o3_grade: selectedData.o3Grade,
      no2_value: selectedData.no2Value,
      no2_grade: selectedData.no2Grade,
      raw: selectedData,
    };
    
    const { error: insertError } = await supabase
      .from('air_quality_hourly')
      .upsert(hourlyData, {
        onConflict: 'scope,station_name,data_time',
      });
    
    if (insertError) {
      console.error('Failed to save hourly data:', insertError);
      return c.json({
        ok: false,
        scope,
        message: 'Failed to save data',
        tried,
      }, 500);
    }
    
    console.log('✅ Data saved successfully');
    
    return c.json({
      ok: true,
      scope,
      selected: {
        priority: selectedStation.priority,
        stationName: selectedStation.station_name,
        dataTimeIso,
      },
      tried,
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /airkorea/collect-hourly:', error);
    return c.json({
      ok: false,
      message: 'Internal server error',
      detail: error.message,
      tried: [],
    }, 500);
  }
});

// POST /airkorea/test-collect - 테스트 수집 (DB 저장 없이 파싱 결과만 반환)
app.post('/make-server-5231839f/airkorea/test-collect', async (c) => {
  try {
    const body = await c.req.json();
    const { scope = 'GOYANG' } = body;
    
    const serviceKey = Deno.env.get('AIRKOREA_SERVICE_KEY');
    if (!serviceKey) {
      return c.json({
        ok: false,
        scope,
        message: 'AIRKOREA_SERVICE_KEY not configured',
        tested: [],
      }, 500);
    }
    
    console.log(`🧪 Test collection for scope: ${scope}`);
    
    // Get enabled stations (priority ASC)
    const { data: stations, error: stationsError } = await supabase
      .from('air_station_settings')
      .select('*')
      .eq('scope', scope)
      .eq('enabled', true)
      .order('priority', { ascending: true });
    
    if (stationsError) {
      console.error('Failed to fetch stations:', stationsError);
      return c.json({
        ok: false,
        scope,
        message: 'Failed to fetch station settings',
        tested: [],
      }, 500);
    }
    
    if (!stations || stations.length === 0) {
      console.log('⚠️  No enabled stations found');
      return c.json({
        ok: false,
        scope,
        message: 'No enabled stations configured',
        tested: [],
      });
    }
    
    const tested: any[] = [];
    
    // Test each station
    for (const station of stations) {
      console.log(`🧪 Testing station: ${station.station_name} (priority ${station.priority})`);
      
      const url = `https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?serviceKey=${serviceKey}&returnType=json&numOfRows=10&pageNo=1&stationName=${encodeURIComponent(station.station_name)}&dataTerm=DAILY&ver=1.5`;
      
      const result = await fetchWithRetry({ url });
      
      const testResult: any = {
        priority: station.priority,
        stationName: station.station_name,
        addr: station.addr,
        ok: result.ok,
        reason: result.ok ? 'OK' : result.reason,
        httpStatus: result.status || null,
        elapsedMs: result.elapsedMs,
        parsedData: null,
      };
      
      if (!result.ok) {
        tested.push(testResult);
        console.log(`❌ Failed: ${result.reason}`);
        continue;
      }
      
      // Validate response
      const validation = validateAirKoreaResponse(result.data);
      if (!validation.ok) {
        testResult.ok = false;
        testResult.reason = validation.reason;
        testResult.rawResponse = result.data;
        tested.push(testResult);
        console.log(`❌ Invalid response: ${validation.reason}`);
        continue;
      }
      
      // Get latest item
      const latestItem = getLatestItem(validation.items || []);
      if (!latestItem || !latestItem.dataTime) {
        testResult.ok = false;
        testResult.reason = 'NO_VALID_DATATIME';
        testResult.items = validation.items;
        tested.push(testResult);
        console.log(`❌ No valid dataTime found`);
        continue;
      }
      
      // Parse dataTime
      const dataTimeIso = parseDataTime(latestItem.dataTime);
      if (!dataTimeIso) {
        testResult.ok = false;
        testResult.reason = 'BAD_DATETIME';
        testResult.latestItem = latestItem;
        tested.push(testResult);
        console.log(`❌ Bad dataTime format: ${latestItem.dataTime}`);
        continue;
      }
      
      // Success - include parsed data
      testResult.parsedData = {
        stationName: station.station_name,
        stationCode: latestItem.stationCode,
        dataTime: latestItem.dataTime,
        dataTimeIso,
        khaiValue: latestItem.khaiValue,
        khaiGrade: latestItem.khaiGrade,
        pm10Value: latestItem.pm10Value,
        pm10Grade: latestItem.pm10Grade,
        pm25Value: latestItem.pm25Value,
        pm25Grade: latestItem.pm25Grade,
        so2Value: latestItem.so2Value,
        so2Grade: latestItem.so2Grade,
        coValue: latestItem.coValue,
        coGrade: latestItem.coGrade,
        o3Value: latestItem.o3Value,
        o3Grade: latestItem.o3Grade,
        no2Value: latestItem.no2Value,
        no2Grade: latestItem.no2Grade,
      };
      testResult.rawItem = latestItem;
      tested.push(testResult);
      console.log(`✅ Test success! dataTime: ${latestItem.dataTime}`);
    }
    
    return c.json({
      ok: true,
      scope,
      message: '테스트 완료 (DB 저장 안 함)',
      tested,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Unexpected error in POST /airkorea/test-collect:', error);
    return c.json({
      ok: false,
      message: 'Internal server error',
      detail: error.message,
      tested: [],
    }, 500);
  }
});

// GET /airkorea/stations - 설정된 측정소 조회
app.get('/make-server-5231839f/airkorea/stations', async (c) => {
  try {
    const scope = c.req.query('scope') || 'GOYANG';
    
    const { data, error } = await supabase
      .from('air_station_settings')
      .select('*')
      .eq('scope', scope)
      .order('priority', { ascending: true });
    
    if (error) {
      return c.json({ error: 'Failed to fetch stations', details: error.message }, 500);
    }
    
    return c.json({
      ok: true,
      scope,
      stations: data || [],
    });
  } catch (error) {
    console.error('Unexpected error in GET /airkorea/stations:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// POST /airkorea/stations - 측정소 설정 저장
app.post('/make-server-5231839f/airkorea/stations', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      scope = 'GOYANG', 
      priority, 
      station_name, 
      addr, 
      mang_name, 
      dm_x, 
      dm_y,
      enabled = true 
    } = body;
    
    // Validation
    if (!priority || ![1, 2].includes(priority)) {
      return c.json({ error: 'Invalid priority (must be 1 or 2)' }, 400);
    }
    
    if (!station_name) {
      return c.json({ error: 'Missing station_name' }, 400);
    }
    
    const stationData = {
      scope,
      priority,
      station_name,
      addr,
      mang_name,
      dm_x,
      dm_y,
      enabled,
      updated_at: new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('air_station_settings')
      .upsert(stationData, {
        onConflict: 'scope,priority',
      });
    
    if (error) {
      console.error('Failed to save station:', error);
      return c.json({ error: 'Failed to save station', details: error.message }, 500);
    }
    
    console.log(`✅ Station saved: ${station_name} (priority ${priority})`);
    
    return c.json({
      ok: true,
      station: stationData,
    });
  } catch (error) {
    console.error('Unexpected error in POST /airkorea/stations:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /airkorea/logs - 수집 로그 조회
app.get('/make-server-5231839f/airkorea/logs', async (c) => {
  try {
    const scope = c.req.query('scope') || 'GOYANG';
    const limit = parseInt(c.req.query('limit') || '10');
    
    const { data, error } = await supabase
      .from('air_collect_logs')
      .select('*')
      .eq('scope', scope)
      .order('run_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      return c.json({ error: 'Failed to fetch logs', details: error.message }, 500);
    }
    
    return c.json({
      ok: true,
      scope,
      logs: data || [],
    });
  } catch (error) {
    console.error('Unexpected error in GET /airkorea/logs:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /airkorea/latest - 최신 공기질 데이터 조회
app.get('/make-server-5231839f/airkorea/latest', async (c) => {
  try {
    const scope = c.req.query('scope') || 'GOYANG';
    
    const { data, error } = await supabase
      .from('air_quality_hourly')
      .select('*')
      .eq('scope', scope)
      .order('data_time', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      return c.json({ error: 'Failed to fetch data', details: error.message }, 500);
    }
    
    return c.json({
      ok: true,
      scope,
      data: data || null,
    });
  } catch (error) {
    console.error('Unexpected error in GET /airkorea/latest:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

console.log('✅ All routes registered. Server ready to accept requests.');
Deno.serve(app.fetch);