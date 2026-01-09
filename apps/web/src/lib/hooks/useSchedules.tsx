import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import type { Schedule, ScheduleFormData, ScheduleExecution } from '../types/schedule';
import { addLog } from '../debug-logger';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-5231839f`;

interface UseSchedulesResult {
  schedules: Schedule[];
  loading: boolean;
  error: string | null;
  createSchedule: (data: ScheduleFormData) => Promise<Schedule | null>;
  updateSchedule: (id: string, data: Partial<ScheduleFormData>) => Promise<Schedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  toggleSchedule: (id: string) => Promise<Schedule | null>;
  getScheduleDetail: (id: string) => Promise<{
    schedule: Schedule;
    template: any;
    executions: ScheduleExecution[];
  } | null>;
  refreshSchedules: () => Promise<void>;
}

export function useSchedules(activeFilter: 'all' | 'true' | 'false' = 'all'): UseSchedulesResult {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAccessToken = () => {
    return localStorage.getItem('access_token');
  };

  const fetchSchedules = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      const url = `${API_URL}/schedules${activeFilter !== 'all' ? `?active=${activeFilter}` : ''}`;
      
      addLog('info', 'Schedules', `Fetching schedules (filter: ${activeFilter})`, { url });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch schedules');
      }

      const data = await response.json();
      
      addLog('success', 'Schedules', `Fetched ${data.schedules.length} schedules`, data);
      
      setSchedules(data.schedules || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to fetch schedules', { error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [activeFilter]);

  const createSchedule = async (data: ScheduleFormData): Promise<Schedule | null> => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      addLog('info', 'Schedules', 'Creating schedule', data);

      const response = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create schedule');
      }

      const result = await response.json();
      
      addLog('success', 'Schedules', 'Schedule created successfully', result.schedule);
      
      // Refresh schedules list
      await fetchSchedules();
      
      return result.schedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to create schedule', { error: errorMessage });
      return null;
    }
  };

  const updateSchedule = async (id: string, data: Partial<ScheduleFormData>): Promise<Schedule | null> => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      addLog('info', 'Schedules', `Updating schedule: ${id}`, data);

      const response = await fetch(`${API_URL}/schedules/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update schedule');
      }

      const result = await response.json();
      
      addLog('success', 'Schedules', 'Schedule updated successfully', result.schedule);
      
      // Refresh schedules list
      await fetchSchedules();
      
      return result.schedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to update schedule', { error: errorMessage });
      return null;
    }
  };

  const deleteSchedule = async (id: string): Promise<boolean> => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      addLog('info', 'Schedules', `Deleting schedule: ${id}`);

      const response = await fetch(`${API_URL}/schedules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete schedule');
      }

      addLog('success', 'Schedules', 'Schedule deleted successfully', { id });
      
      // Refresh schedules list
      await fetchSchedules();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to delete schedule', { error: errorMessage });
      return false;
    }
  };

  const toggleSchedule = async (id: string): Promise<Schedule | null> => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      addLog('info', 'Schedules', `Toggling schedule: ${id}`);

      const response = await fetch(`${API_URL}/schedules/${id}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle schedule');
      }

      const result = await response.json();
      
      addLog('success', 'Schedules', 'Schedule toggled successfully', result.schedule);
      
      // Refresh schedules list
      await fetchSchedules();
      
      return result.schedule;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to toggle schedule', { error: errorMessage });
      return null;
    }
  };

  const getScheduleDetail = async (id: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No access token found');
      }

      addLog('info', 'Schedules', `Fetching schedule detail: ${id}`);

      const response = await fetch(`${API_URL}/schedules/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch schedule detail');
      }

      const data = await response.json();
      
      addLog('success', 'Schedules', 'Schedule detail fetched', data);
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      addLog('error', 'Schedules', 'Failed to fetch schedule detail', { error: errorMessage });
      return null;
    }
  };

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    toggleSchedule,
    getScheduleDetail,
    refreshSchedules: fetchSchedules,
  };
}
