import React, { useCallback } from 'react';

interface CalComConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const CalComConfig: React.FC<CalComConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Cal.com Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">API Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Key
          </label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleChange({ apiKey: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your Cal.com API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from Cal.com Settings → Security → API Keys
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://api.cal.com/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://api.cal.com/v1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use default or custom Cal.com instance URL
          </p>
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'getAvailability'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Event Types">
            <option value="listEventTypes">List Event Types</option>
            <option value="getEventType">Get Event Type</option>
            <option value="createEventType">Create Event Type</option>
            <option value="updateEventType">Update Event Type</option>
            <option value="deleteEventType">Delete Event Type</option>
          </optgroup>
          <optgroup label="Bookings">
            <option value="listBookings">List Bookings</option>
            <option value="getBooking">Get Booking</option>
            <option value="createBooking">Create Booking</option>
            <option value="cancelBooking">Cancel Booking</option>
            <option value="rescheduleBooking">Reschedule Booking</option>
          </optgroup>
          <optgroup label="Availability">
            <option value="getAvailability">Get Availability</option>
            <option value="listSchedules">List Schedules</option>
            <option value="getSchedule">Get Schedule</option>
            <option value="createSchedule">Create Schedule</option>
          </optgroup>
          <optgroup label="Users">
            <option value="getMe">Get Current User</option>
            <option value="listUsers">List Users</option>
          </optgroup>
        </select>
      </div>

      {/* Event Type Operations */}
      {(config.operation === 'getEventType' ||
        config.operation === 'updateEventType' ||
        config.operation === 'deleteEventType') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event Type ID
          </label>
          <input
            type="text"
            value={config.eventTypeId || ''}
            onChange={(e) => handleChange({ eventTypeId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Event Type ID"
          />
        </div>
      )}

      {/* Create/Update Event Type */}
      {(config.operation === 'createEventType' || config.operation === 'updateEventType') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Event Type Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => handleChange({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30 Minute Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => handleChange({ slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30min"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly identifier (e.g., yourname.cal.com/30min)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => handleChange({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="A brief 30 minute meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Length (minutes)
            </label>
            <input
              type="number"
              value={config.length || 30}
              onChange={(e) => handleChange({ length: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="5"
              step="5"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hidden"
              checked={config.hidden || false}
              onChange={(e) => handleChange({ hidden: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="hidden" className="text-sm text-gray-700">
              Hide from public booking page
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresConfirmation"
              checked={config.requiresConfirmation || false}
              onChange={(e) => handleChange({ requiresConfirmation: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="requiresConfirmation" className="text-sm text-gray-700">
              Require manual confirmation
            </label>
          </div>
        </div>
      )}

      {/* Booking Operations */}
      {config.operation === 'getBooking' || config.operation === 'cancelBooking' || config.operation === 'rescheduleBooking' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking ID
          </label>
          <input
            type="text"
            value={config.bookingId || ''}
            onChange={(e) => handleChange({ bookingId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Booking ID"
          />
        </div>
      ) : null}

      {/* Create Booking */}
      {config.operation === 'createBooking' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Booking Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type ID
            </label>
            <input
              type="text"
              value={config.eventTypeIdForBooking || ''}
              onChange={(e) => handleChange({ eventTypeIdForBooking: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Event Type ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={config.startTime || ''}
              onChange={(e) => handleChange({ startTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => handleChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="John Doe"
              />
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
              placeholder="Additional information..."
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
        </div>
      )}

      {/* Reschedule Booking */}
      {config.operation === 'rescheduleBooking' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Start Time
          </label>
          <input
            type="datetime-local"
            value={config.newStartTime || ''}
            onChange={(e) => handleChange({ newStartTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Cancel Booking */}
      {config.operation === 'cancelBooking' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cancellation Reason (optional)
          </label>
          <textarea
            value={config.cancellationReason || ''}
            onChange={(e) => handleChange({ cancellationReason: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Reason for cancellation..."
          />
        </div>
      )}

      {/* List Bookings */}
      {config.operation === 'listBookings' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Filter Options</div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={config.status || 'all'}
                onChange={(e) => handleChange({ status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit
              </label>
              <input
                type="number"
                value={config.limit || 10}
                onChange={(e) => handleChange({ limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
                max="100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                After Date
              </label>
              <input
                type="date"
                value={config.afterDate || ''}
                onChange={(e) => handleChange({ afterDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Before Date
              </label>
              <input
                type="date"
                value={config.beforeDate || ''}
                onChange={(e) => handleChange({ beforeDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Get Availability */}
      {config.operation === 'getAvailability' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Availability Query</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Type ID
            </label>
            <input
              type="text"
              value={config.eventTypeIdForAvailability || ''}
              onChange={(e) => handleChange({ eventTypeIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Event Type ID"
            />
          </div>

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
        </div>
      )}

      {/* Schedule Operations */}
      {(config.operation === 'getSchedule' || config.operation === 'createSchedule') && (
        <div className="space-y-3">
          {config.operation === 'getSchedule' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schedule ID
              </label>
              <input
                type="text"
                value={config.scheduleId || ''}
                onChange={(e) => handleChange({ scheduleId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Schedule ID"
              />
            </div>
          )}

          {config.operation === 'createSchedule' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name
                </label>
                <input
                  type="text"
                  value={config.scheduleName || ''}
                  onChange={(e) => handleChange({ scheduleName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Working Hours"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  value={config.timezoneForSchedule || 'America/New_York'}
                  onChange={(e) => handleChange({ timezoneForSchedule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Cal.com Integration</strong>
          <p className="mt-1 text-xs">
            Cal.com is an open-source scheduling platform. Self-host or use Cal.com cloud.
            Requires API key from Security settings.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Create bookings, manage availability, sync calendars, and automate scheduling workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
