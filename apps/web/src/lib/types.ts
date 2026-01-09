// ================================================================
// TypeScript Type Definitions
// Generated from Supabase Schema
// ================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      displays: {
        Row: {
          id: string
          name: string
          location: string | null
          width: number
          height: number
          group_name: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          width: number
          height: number
          group_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          width?: number
          height?: number
          group_name?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      display_config: {
        Row: {
          id: string
          display_id: string
          weather_station_id: string | null
          air_station_id: string | null
          layout_settings: Json
          last_weather_update: string | null
          last_air_quality_update: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          display_id: string
          weather_station_id?: string | null
          air_station_id?: string | null
          layout_settings?: Json
          last_weather_update?: string | null
          last_air_quality_update?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_id?: string
          weather_station_id?: string | null
          air_station_id?: string | null
          layout_settings?: Json
          last_weather_update?: string | null
          last_air_quality_update?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weather_stations: {
        Row: {
          id: string
          name: string
          nx: number
          ny: number
          region: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          nx: number
          ny: number
          region?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          nx?: number
          ny?: number
          region?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      air_stations: {
        Row: {
          id: string
          station_name: string
          addr: string | null
          dm_x: number | null
          dm_y: number | null
          sido: string | null
          sigungu: string | null
          is_active: boolean
          last_collected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          station_name: string
          addr?: string | null
          dm_x?: number | null
          dm_y?: number | null
          sido?: string | null
          sigungu?: string | null
          is_active?: boolean
          last_collected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          station_name?: string
          addr?: string | null
          dm_x?: number | null
          dm_y?: number | null
          sido?: string | null
          sigungu?: string | null
          is_active?: boolean
          last_collected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          name: string
          title: string
          body: string
          highlight: string | null
          style_config: Json
          category: string | null
          version: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          title: string
          body: string
          highlight?: string | null
          style_config?: Json
          category?: string | null
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          title?: string
          body?: string
          highlight?: string | null
          style_config?: Json
          category?: string | null
          version?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schedules: {
        Row: {
          id: string
          template_id: string | null
          content_type: 'NOTICE' | 'EMERGENCY'
          display_ids: Json
          start_at: string
          end_at: string
          recurrence_rule: Json | null
          priority: number
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          template_id?: string | null
          content_type: 'NOTICE' | 'EMERGENCY'
          display_ids: Json
          start_at: string
          end_at: string
          recurrence_rule?: Json | null
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          template_id?: string | null
          content_type?: 'NOTICE' | 'EMERGENCY'
          display_ids?: Json
          start_at?: string
          end_at?: string
          recurrence_rule?: Json | null
          priority?: number
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      display_state: {
        Row: {
          id: string
          display_id: string
          template_id: string | null
          content_type: 'WEATHER' | 'NOTICE' | 'EMERGENCY'
          priority: number
          content_data: Json | null
          start_at: string | null
          end_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          display_id: string
          template_id?: string | null
          content_type: 'WEATHER' | 'NOTICE' | 'EMERGENCY'
          priority: number
          content_data?: Json | null
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_id?: string
          template_id?: string | null
          content_type?: 'WEATHER' | 'NOTICE' | 'EMERGENCY'
          priority?: number
          content_data?: Json | null
          start_at?: string | null
          end_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      weather_air_quality_readings: {
        Row: {
          id: string
          display_id: string
          data_type: 'WEATHER' | 'AIR_QUALITY'
          temperature: number | null
          precipitation_probability: number | null
          sky_condition: string | null
          humidity: number | null
          wind_speed: number | null
          pm10_value: number | null
          pm10_grade: number | null
          pm25_value: number | null
          pm25_grade: number | null
          khai_value: number | null
          khai_grade: number | null
          collected_at: string
          created_at: string
        }
        Insert: {
          id?: string
          display_id: string
          data_type: 'WEATHER' | 'AIR_QUALITY'
          temperature?: number | null
          precipitation_probability?: number | null
          sky_condition?: string | null
          humidity?: number | null
          wind_speed?: number | null
          pm10_value?: number | null
          pm10_grade?: number | null
          pm25_value?: number | null
          pm25_grade?: number | null
          khai_value?: number | null
          khai_grade?: number | null
          collected_at: string
          created_at?: string
        }
        Update: {
          id?: string
          display_id?: string
          data_type?: 'WEATHER' | 'AIR_QUALITY'
          temperature?: number | null
          precipitation_probability?: number | null
          sky_condition?: string | null
          humidity?: number | null
          wind_speed?: number | null
          pm10_value?: number | null
          pm10_grade?: number | null
          pm25_value?: number | null
          pm25_grade?: number | null
          khai_value?: number | null
          khai_grade?: number | null
          collected_at?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          user_email: string
          user_role: string
          action: string
          resource_type: string
          resource_id: string | null
          action_detail: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email: string
          user_role: string
          action: string
          resource_type: string
          resource_id?: string | null
          action_detail?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string
          user_role?: string
          action?: string
          resource_type?: string
          resource_id?: string | null
          action_detail?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      v_current_display_content: {
        Row: {
          display_id: string | null
          display_name: string | null
          location: string | null
          width: number | null
          height: number | null
          content_type: string | null
          priority: number | null
          title: string | null
          body: string | null
          highlight: string | null
          style_config: Json | null
          content_data: Json | null
          start_at: string | null
          end_at: string | null
          updated_at: string | null
        }
      }
      v_latest_weather_air_quality: {
        Row: {
          display_id: string | null
          data_type: string | null
          temperature: number | null
          precipitation_probability: number | null
          sky_condition: string | null
          pm10_value: number | null
          pm10_grade: number | null
          pm25_value: number | null
          pm25_grade: number | null
          khai_value: number | null
          khai_grade: number | null
          collected_at: string | null
          status: string | null
        }
      }
    }
    Functions: {
      get_current_content: {
        Args: {
          p_display_id: string
        }
        Returns: {
          content_type: string
          priority: number
          title: string
          body: string
          highlight: string
          style_config: Json
          content_data: Json
        }[]
      }
    }
  }
}

// ================================================================
// Helper Types
// ================================================================

export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';
export type ContentType = 'WEATHER' | 'NOTICE' | 'EMERGENCY';
export type DataType = 'WEATHER' | 'AIR_QUALITY';

export interface UserMetadata {
  role: UserRole;
  can_emergency: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  canEmergency: boolean;
}
