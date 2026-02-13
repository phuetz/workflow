import React, { useCallback } from 'react';

interface TidycalConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const TidycalConfig: React.FC<TidycalConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        TidyCal Configuration
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
            placeholder="Your TidyCal API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from TidyCal Settings → Integrations → API Access
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://api.tidycal.com/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://api.tidycal.com/v1"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'listBookingPages'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Booking Pages">
            <option value="listBookingPages">List Booking Pages</option>
            <option value="getBookingPage">Get Booking Page</option>
            <option value="createBookingPage">Create Booking Page</option>
            <option value="updateBookingPage">Update Booking Page</option>
            <option value="deleteBookingPage">Delete Booking Page</option>
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
            <option value="getAvailableSlots">Get Available Time Slots</option>
          </optgroup>
          <optgroup label="Calendars">
            <option value="listCalendars">List Connected Calendars</option>
            <option value="syncCalendar">Sync Calendar</option>
          </optgroup>
          <optgroup label="Contacts">
            <option value="listContacts">List Contacts</option>
            <option value="getContact">Get Contact</option>
          </optgroup>
        </select>
      </div>

      {/* Booking Page Operations */}
      {(config.operation === 'getBookingPage' ||
        config.operation === 'updateBookingPage' ||
        config.operation === 'deleteBookingPage') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Booking Page ID
          </label>
          <input
            type="text"
            value={config.bookingPageId || ''}
            onChange={(e) => handleChange({ bookingPageId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Booking Page ID"
          />
        </div>
      )}

      {/* Create/Update Booking Page */}
      {(config.operation === 'createBookingPage' || config.operation === 'updateBookingPage') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Booking Page Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Page Name
            </label>
            <input
              type="text"
              value={config.pageName || ''}
              onChange={(e) => handleChange({ pageName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30 Minute Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL Slug
            </label>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => handleChange({ slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30min-meeting"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly identifier (e.g., tidycal.com/yourname/30min-meeting)
            </p>
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
              Location Type
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
              <option value="custom">Custom Link</option>
            </select>
          </div>

          {config.locationType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Location/Link
              </label>
              <input
                type="text"
                value={config.customLocation || ''}
                onChange={(e) => handleChange({ customLocation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://meeting.example.com or address"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color Theme
            </label>
            <input
              type="color"
              value={config.colorTheme || '#3b82f6'}
              onChange={(e) => handleChange({ colorTheme: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md h-12"
            />
          </div>

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
              id="requireConfirmation"
              checked={config.requireConfirmation || false}
              onChange={(e) => handleChange({ requireConfirmation: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="requireConfirmation" className="text-sm text-gray-700">
              Require manual confirmation
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="sendReminders"
              checked={config.sendReminders !== false}
              onChange={(e) => handleChange({ sendReminders: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="sendReminders" className="text-sm text-gray-700">
              Send email reminders
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
              Page is active
            </label>
          </div>
        </div>
      )}

      {/* Booking Operations */}
      {(config.operation === 'getBooking' ||
        config.operation === 'cancelBooking' ||
        config.operation === 'rescheduleBooking') && (
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
      )}

      {/* Create Booking */}
      {config.operation === 'createBooking' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Booking Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking Page ID
            </label>
            <input
              type="text"
              value={config.bookingPageIdForBooking || ''}
              onChange={(e) => handleChange({ bookingPageIdForBooking: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Booking Page ID"
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
              Guest Name
            </label>
            <input
              type="text"
              value={config.guestName || ''}
              onChange={(e) => handleChange({ guestName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Email
            </label>
            <input
              type="email"
              value={config.guestEmail || ''}
              onChange={(e) => handleChange({ guestEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Guest Phone (optional)
            </label>
            <input
              type="tel"
              value={config.guestPhone || ''}
              onChange={(e) => handleChange({ guestPhone: e.target.value })}
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
              Booking Page ID (optional)
            </label>
            <input
              type="text"
              value={config.bookingPageIdFilter || ''}
              onChange={(e) => handleChange({ bookingPageIdFilter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Filter by booking page"
            />
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
              Booking Page ID
            </label>
            <input
              type="text"
              value={config.bookingPageIdForAvailability || ''}
              onChange={(e) => handleChange({ bookingPageIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Booking Page ID"
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

      {/* Calendar Sync */}
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

      {/* Contact Operations */}
      {config.operation === 'getContact' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact ID
          </label>
          <input
            type="text"
            value={config.contactId || ''}
            onChange={(e) => handleChange({ contactId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Contact ID"
          />
        </div>
      )}

      {/* List Contacts */}
      {config.operation === 'listContacts' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Filter Options</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search (optional)
            </label>
            <input
              type="text"
              value={config.searchQuery || ''}
              onChange={(e) => handleChange({ searchQuery: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Search by name or email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Limit
            </label>
            <input
              type="number"
              value={config.limitContacts || 20}
              onChange={(e) => handleChange({ limitContacts: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              min="1"
              max="100"
            />
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>TidyCal Integration</strong>
          <p className="mt-1 text-xs">
            TidyCal is a simple and affordable scheduling platform with lifetime deal pricing.
            Requires API Key from your TidyCal account.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Create booking pages, manage bookings, check availability, sync calendars, and automate scheduling workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
