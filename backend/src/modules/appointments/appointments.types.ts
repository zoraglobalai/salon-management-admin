export type AppointmentStatus = 'booked' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface AppointmentInput {
  customerId?: string;
  branchId: string;
  staffId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AppointmentRow {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id?: string;
  staff_id: string;
  service_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  staff_name?: string;
  service_name?: string;
  branch_name?: string;
}

export interface CalendarAppointmentEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  extendedProps: AppointmentRow;
}

export interface HolidayInput {
  branchId?: string;
  holidayName: string;
  holidayDate: string;
  isRecurring?: boolean;
}

export interface HolidayRow {
  id: string;
  tenant_id: string;
  branch_id?: string;
  holiday_name: string;
  holiday_date: string;
  is_recurring: boolean;
  created_at: string;
}
