import React, { useCallback } from 'react';

interface AcuityConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const AcuityConfig: React.FC<AcuityConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Acuity Scheduling Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">API Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={config.userId || ''}
            onChange={(e) => handleChange({ userId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your Acuity User ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleChange({ apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your Acuity API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from Acuity Settings → Integrations → API
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://acuityscheduling.com/api/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://acuityscheduling.com/api/v1"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'listAppointments'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Appointments">
            <option value="listAppointments">List Appointments</option>
            <option value="getAppointment">Get Appointment</option>
            <option value="createAppointment">Create Appointment</option>
            <option value="updateAppointment">Update Appointment</option>
            <option value="cancelAppointment">Cancel Appointment</option>
            <option value="rescheduleAppointment">Reschedule Appointment</option>
          </optgroup>
          <optgroup label="Availability">
            <option value="getAvailability">Get Availability</option>
            <option value="getAvailableDates">Get Available Dates</option>
            <option value="getAvailableTimes">Get Available Times</option>
          </optgroup>
          <optgroup label="Appointment Types">
            <option value="listAppointmentTypes">List Appointment Types</option>
            <option value="getAppointmentType">Get Appointment Type</option>
          </optgroup>
          <optgroup label="Calendars">
            <option value="listCalendars">List Calendars</option>
            <option value="getCalendar">Get Calendar</option>
          </optgroup>
          <optgroup label="Clients">
            <option value="listClients">List Clients</option>
            <option value="getClient">Get Client</option>
            <option value="createClient">Create Client</option>
          </optgroup>
        </select>
      </div>

      {/* Get/Update/Cancel/Reschedule Appointment */}
      {(config.operation === 'getAppointment' ||
        config.operation === 'updateAppointment' ||
        config.operation === 'cancelAppointment' ||
        config.operation === 'rescheduleAppointment') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment ID
          </label>
          <input
            type="text"
            value={config.appointmentId || ''}
            onChange={(e) => handleChange({ appointmentId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Appointment ID"
          />
        </div>
      )}

      {/* Create Appointment */}
      {config.operation === 'createAppointment' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Appointment Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type ID
            </label>
            <input
              type="text"
              value={config.appointmentTypeId || ''}
              onChange={(e) => handleChange({ appointmentTypeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Appointment Type ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={config.datetime || ''}
              onChange={(e) => handleChange({ datetime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={config.firstName || ''}
                onChange={(e) => handleChange({ firstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="John"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={config.lastName || ''}
                onChange={(e) => handleChange({ lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={config.email || ''}
              onChange={(e) => handleChange({ email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={config.phone || ''}
              onChange={(e) => handleChange({ phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="+1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={config.timezone || 'America/New_York'}
              onChange={(e) => handleChange({ timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Denver">America/Denver (MST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={config.notes || ''}
              onChange={(e) => handleChange({ notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      )}

      {/* Reschedule Appointment */}
      {config.operation === 'rescheduleAppointment' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Date & Time
          </label>
          <input
            type="datetime-local"
            value={config.newDatetime || ''}
            onChange={(e) => handleChange({ newDatetime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Cancel Appointment */}
      {config.operation === 'cancelAppointment' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancel Note (optional)
            </label>
            <textarea
              value={config.cancelNote || ''}
              onChange={(e) => handleChange({ cancelNote: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Reason for cancellation..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="noEmail"
              checked={config.noEmail || false}
              onChange={(e) => handleChange({ noEmail: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="noEmail" className="text-sm text-gray-700">
              Do not send cancellation email
            </label>
          </div>
        </div>
      )}

      {/* List Appointments */}
      {config.operation === 'listAppointments' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Filter Options</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Date
              </label>
              <input
                type="date"
                value={config.minDate || ''}
                onChange={(e) => handleChange({ minDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Date
              </label>
              <input
                type="date"
                value={config.maxDate || ''}
                onChange={(e) => handleChange({ maxDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calendar ID (optional)
            </label>
            <input
              type="text"
              value={config.calendarId || ''}
              onChange={(e) => handleChange({ calendarId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Filter by calendar"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeDeleted"
              checked={config.includeDeleted || false}
              onChange={(e) => handleChange({ includeDeleted: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="includeDeleted" className="text-sm text-gray-700">
              Include cancelled appointments
            </label>
          </div>
        </div>
      )}

      {/* Get Availability */}
      {(config.operation === 'getAvailability' ||
        config.operation === 'getAvailableDates' ||
        config.operation === 'getAvailableTimes') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Availability Query</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Appointment Type ID
            </label>
            <input
              type="text"
              value={config.appointmentTypeIdForAvailability || ''}
              onChange={(e) => handleChange({ appointmentTypeIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Appointment Type ID"
            />
          </div>

          {config.operation === 'getAvailableTimes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={config.date || ''}
                onChange={(e) => handleChange({ date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          {config.operation !== 'getAvailableTimes' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={config.startDate || ''}
                  onChange={(e) => handleChange({ startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={config.endDate || ''}
                  onChange={(e) => handleChange({ endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calendar ID (optional)
            </label>
            <input
              type="text"
              value={config.calendarIdForAvailability || ''}
              onChange={(e) => handleChange({ calendarIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Specific calendar"
            />
          </div>
        </div>
      )}

      {/* Get Appointment Type */}
      {config.operation === 'getAppointmentType' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Appointment Type ID
          </label>
          <input
            type="text"
            value={config.appointmentTypeIdToGet || ''}
            onChange={(e) => handleChange({ appointmentTypeIdToGet: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Appointment Type ID"
          />
        </div>
      )}

      {/* Get Calendar */}
      {config.operation === 'getCalendar' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calendar ID
          </label>
          <input
            type="text"
            value={config.calendarIdToGet || ''}
            onChange={(e) => handleChange({ calendarIdToGet: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Calendar ID"
          />
        </div>
      )}

      {/* Client Operations */}
      {config.operation === 'getClient' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={config.clientId || ''}
            onChange={(e) => handleChange({ clientId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Client ID"
          />
        </div>
      )}

      {config.operation === 'createClient' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Client Details</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={config.clientFirstName || ''}
                onChange={(e) => handleChange({ clientFirstName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="John"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={config.clientLastName || ''}
                onChange={(e) => handleChange({ clientLastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={config.clientEmail || ''}
              onChange={(e) => handleChange({ clientEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={config.clientPhone || ''}
              onChange={(e) => handleChange({ clientPhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="+1234567890"
            />
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Acuity Scheduling Integration</strong>
          <p className="mt-1 text-xs">
            Acuity Scheduling is a powerful appointment scheduling platform.
            Requires User ID and API Key from your Acuity account settings.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Manage appointments, check availability, sync calendars, and automate scheduling workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
