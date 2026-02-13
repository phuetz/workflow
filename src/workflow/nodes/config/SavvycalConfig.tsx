import React, { useCallback } from 'react';

interface SavvycalConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const SavvycalConfig: React.FC<SavvycalConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        SavvyCal Configuration
      </div>

      {/* Authentication */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-md">
        <div className="text-sm font-medium text-gray-700">API Authentication</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            API Token
          </label>
          <input
            type="password"
            value={config.apiToken || ''}
            onChange={(e) => handleChange({ apiToken: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Your SavvyCal API Token"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from SavvyCal Settings → Developer → API Tokens
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://api.savvycal.com/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://api.savvycal.com/v1"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'listLinks'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Scheduling Links">
            <option value="listLinks">List Scheduling Links</option>
            <option value="getLink">Get Scheduling Link</option>
            <option value="createLink">Create Scheduling Link</option>
            <option value="updateLink">Update Scheduling Link</option>
            <option value="deleteLink">Delete Scheduling Link</option>
          </optgroup>
          <optgroup label="Events">
            <option value="listEvents">List Scheduled Events</option>
            <option value="getEvent">Get Event</option>
            <option value="cancelEvent">Cancel Event</option>
            <option value="rescheduleEvent">Reschedule Event</option>
          </optgroup>
          <optgroup label="Availability">
            <option value="getAvailability">Get Availability</option>
            <option value="getAvailableSlots">Get Available Slots</option>
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

      {/* Link Operations */}
      {(config.operation === 'getLink' ||
        config.operation === 'updateLink' ||
        config.operation === 'deleteLink') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Link ID
          </label>
          <input
            type="text"
            value={config.linkId || ''}
            onChange={(e) => handleChange({ linkId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Scheduling Link ID"
          />
        </div>
      )}

      {/* Create/Update Link */}
      {(config.operation === 'createLink' || config.operation === 'updateLink') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Scheduling Link Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Name
            </label>
            <input
              type="text"
              value={config.linkName || ''}
              onChange={(e) => handleChange({ linkName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30 Minute Call"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Slug
            </label>
            <input
              type="text"
              value={config.slug || ''}
              onChange={(e) => handleChange({ slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="30min-call"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly identifier (e.g., savvycal.com/yourname/30min-call)
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
              Meeting Location
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
              <option value="whereby">Whereby</option>
              <option value="custom">Custom Location</option>
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
                placeholder="Meeting link or address"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduling Style
            </label>
            <select
              value={config.schedulingStyle || 'overlay'}
              onChange={(e) => handleChange({ schedulingStyle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="overlay">Overlay (recipient chooses first)</option>
              <option value="priority">Priority (your availability shown first)</option>
              <option value="round_robin">Round Robin</option>
              <option value="collective">Collective (all must be available)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              SavvyCal's unique scheduling styles for better collaboration
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="allowMultipleSchedulers"
              checked={config.allowMultipleSchedulers || false}
              onChange={(e) => handleChange({ allowMultipleSchedulers: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="allowMultipleSchedulers" className="text-sm text-gray-700">
              Allow invitees to overlay their calendar
            </label>
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
              Link is active
            </label>
          </div>
        </div>
      )}

      {/* Event Operations */}
      {(config.operation === 'getEvent' ||
        config.operation === 'cancelEvent' ||
        config.operation === 'rescheduleEvent') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Event ID
          </label>
          <input
            type="text"
            value={config.eventId || ''}
            onChange={(e) => handleChange({ eventId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Event ID"
          />
        </div>
      )}

      {/* Reschedule Event */}
      {config.operation === 'rescheduleEvent' && (
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

      {/* Cancel Event */}
      {config.operation === 'cancelEvent' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cancellation Note (optional)
          </label>
          <textarea
            value={config.cancellationNote || ''}
            onChange={(e) => handleChange({ cancellationNote: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            placeholder="Reason for cancellation..."
          />
        </div>
      )}

      {/* List Events */}
      {config.operation === 'listEvents' && (
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
              Link ID (optional)
            </label>
            <input
              type="text"
              value={config.linkIdFilter || ''}
              onChange={(e) => handleChange({ linkIdFilter: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Filter by scheduling link"
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
              Link ID
            </label>
            <input
              type="text"
              value={config.linkIdForAvailability || ''}
              onChange={(e) => handleChange({ linkIdForAvailability: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Scheduling Link ID"
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
              Search Query (optional)
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
          <strong>SavvyCal Integration</strong>
          <p className="mt-1 text-xs">
            SavvyCal is a modern scheduling platform with unique overlay and priority scheduling.
            Requires API Token from your SavvyCal account.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Create scheduling links, manage events, check availability, and automate scheduling workflows with advanced collaboration features.
          </p>
        </div>
      </div>
    </div>
  );
};
