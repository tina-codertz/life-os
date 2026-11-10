import type {
  CalendarRange,
  CreateEventInput,
  PublicEvent,
  UpdateEventInput,
} from '@life-os/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/features/auth/auth-instance';
import { CALENDAR_KEY } from '@/services/query-client';

export const calendarKeys = {
  all: CALENDAR_KEY,
  range: (from: string, to: string) => [...CALENDAR_KEY, 'range', from, to] as const,
  event: (id: string) => [...CALENDAR_KEY, 'event', id] as const,
};

// Events, tasks and habits for the days from…to (GET /calendar). Every save in the app (a task,
// a check-in, an event) refreshes it (query-client.ts), since it shows all three.
export function useCalendar(from: string, to: string) {
  return useQuery({
    queryKey: calendarKeys.range(from, to),
    queryFn: ({ signal }) =>
      api().get<CalendarRange>(`/calendar?from=${from}&to=${to}`, { signal }),
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: calendarKeys.event(id ?? ''),
    queryFn: ({ signal }) => api().get<PublicEvent>(`/events/${id}`, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateEvent() {
  return useMutation({
    mutationFn: (input: CreateEventInput) => api().post<PublicEvent>('/events', input),
  });
}

export function useUpdateEvent(id: string) {
  return useMutation({
    mutationFn: (input: UpdateEventInput) => api().patch<PublicEvent>(`/events/${id}`, input),
  });
}

export function useDeleteEvent() {
  return useMutation({
    mutationFn: (id: string) => api().delete<void>(`/events/${id}`),
  });
}
