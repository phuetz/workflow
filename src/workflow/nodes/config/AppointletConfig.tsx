import React, { useCallback } from 'react';

interface AppointletConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const AppointletConfig: React.FC<AppointletConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Appointlet Configuration
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
            placeholder="Your Appointlet API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from Appointlet Settings → Integrations → API
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://api.appointlet.com/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://api.appointlet.com/v1"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'listMeetingTypes'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Meeting Types">
            <option value="listMeetingTypes">List Meeting Types</option>
            <option value="getMeetingType">Get Meeting Type</option>
            <option value="createMeetingType">Create Meeting Type</option>
            <option value="updateMeetingType">Update Meeting Type</option>
            <option value="deleteMeetingType">Delete Meeting Type</option>
          </optgroup>
          <optgroup label="Meetings">
            <option value="listMeetings">List Meetings</option>
            <option value="getMeeting">Get Meeting</option>
            <option value="scheduleMeeting">Schedule Meeting</option>
            <option value="rescheduleMeeting">Reschedule Meeting</option>
            <option value="cancelMeeting">Cancel Meeting</option>
          </optgroup>
          <optgroup label="Availability">
            <option value="getAvailability">Get Availability</option>
            <option value="getAvailableSlots">Get Available Slots</option>
          </optgroup>
          <optgroup label="Attendees">
            <option value="listAttendees">List Attendees</option>
            <option value="getAttendee">Get Attendee</option>
          </optgroup>
          <optgroup label="Calendars">
            <option value="listCalendars">List Connected Calendars</option>
            <option value="syncCalendar">Sync Calendar</option>
          </optgroup>
        </select>
      </div>

      {/* Meeting Type Operations */}
      {(config.operation === 'getMeetingType' ||
        config.operation === 'updateMeetingType' ||
        config.operation === 'deleteMeetingType') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meeting Type ID
          </label>
          <input
            type="text"
            value={config.meetingTypeId || ''}
            onChange={(e) => handleChange({ meetingTypeId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Meeting Type ID"
          />
        </div>
      )}

      {/* Create/Update Meeting Type */}
      {(config.operation === 'createMeetingType' || config.operation === 'updateMeetingType') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Meeting Type Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={config.name || ''}
              onChange={(e) => handleChange({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30 Minute Consultation"
            />
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
              placeholder="Meeting description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              value={config.duration || 30}
              onChange={(e) => handleChange({ duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="5"
              step="5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <select
              value={config.locationType || 'zoom'}
              onChange={(e) => handleChange({ locationType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="zoom">Zoom</option>
              <option value="teams">Microsoft Teams</option>
              <option value="meet">Google Meet</option>
              <option value="phone">Phone Call</option>
              <option value="in_person">In Person</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {config.locationType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Location
              </label>
              <input
                type="text"
                value={config.customLocation || ''}
                onChange={(e) => handleChange({ customLocation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Meeting room, address, etc."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buffer Time Before (minutes)
            </label>
            <input
              type="number"
              value={config.bufferBefore || 0}
              onChange={(e) => handleChange({ bufferBefore: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              step="5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buffer Time After (minutes)
            </label>
            <input
              type="number"
              value={config.bufferAfter || 0}
              onChange={(e) => handleChange({ bufferAfter: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="0"
              step="5"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requireApproval"
              checked={config.requireApproval || false}
              onChange={(e) => handleChange({ requireApproval: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="requireApproval" className="text-sm text-gray-700">
              Require manual approval
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={config.isActive !== false}
              onChange={(e) => handleChange({ isActive: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Active (visible for booking)
            </label>
          </div>
        </div>
      )}

      {/* Meeting Operations */}
      {(config.operation === 'getMeeting' ||
        config.operation === 'rescheduleMeeting' ||
        config.operation === 'cancelMeeting') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meeting ID
          </label>
          <input
            type="text"
            value={config.meetingId || ''}
            onChange={(e) => handleChange({ meetingId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Meeting ID"
          />
        </div>
      )}

      {/* Schedule Meeting */}
      {config.operation === 'scheduleMeeting' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Meeting Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Type ID
            </label>
            <input
              type="text"
              value={config.meetingTypeIdForSchedule || ''}
              onChange={(e) => handleChange({ meetingTypeIdForSchedule: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Meeting Type ID"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendee Name
            </label>
            <input
              type="text"
              value={config.attendeeName || ''}
              onChange={(e) => handleChange({ attendeeName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendee Email
            </label>
            <input
              type="email"
              value={config.attendeeEmail || ''}
              onChange={(e) => handleChange({ attendeeEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendee Phone (optional)
            </label>
            <input
              type="tel"
              value={config.attendeePhone || ''}
              onChange={(e) => handleChange({ attendeePhone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="+1234567890"
            />
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

      {/* Reschedule Meeting */}
      {config.operation === 'rescheduleMeeting' && (
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

      {/* Cancel Meeting */}
      {config.operation === 'cancelMeeting' && (
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

      {/* List Meetings */}
      {config.operation === 'listMeetings' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Filter Options</div>

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
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending Approval</option>
            </select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <input
              type="number"
              value={config.limit || 20}
              onChange={(e) => handleChange({ limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="100"
            />
          </div>
        </div>
      )}

      {/* Get Availability / Available Slots */}
      {(config.operation === 'getAvailability' || config.operation === 'getAvailableSlots') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Availability Query</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Type ID
            </label>
            <input
              type="text"
              value={config.meetingTypeIdForAvailability || ''}
              onChange={(e) => handleChange({ meetingTypeIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Meeting Type ID"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={config.availabilityStartDate || ''}
                onChange={(e) => handleChange({ availabilityStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={config.availabilityEndDate || ''}
                onChange={(e) => handleChange({ availabilityEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              value={config.timezoneForAvailability || 'America/New_York'}
              onChange={(e) => handleChange({ timezoneForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>
        </div>
      )}

      {/* Attendee Operations */}
      {config.operation === 'getAttendee' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attendee ID
          </label>
          <input
            type="text"
            value={config.attendeeId || ''}
            onChange={(e) => handleChange({ attendeeId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Attendee ID"
          />
        </div>
      )}

      {/* Sync Calendar */}
      {config.operation === 'syncCalendar' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Calendar ID
          </label>
          <input
            type="text"
            value={config.calendarId || ''}
            onChange={(e) => handleChange({ calendarId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Calendar ID"
          />
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Appointlet Integration</strong>
          <p className="mt-1 text-xs">
            Appointlet is a simple and elegant scheduling platform for modern teams.
            Requires API Key from your Appointlet account.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Schedule meetings, manage availability, sync calendars, and automate appointment workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
