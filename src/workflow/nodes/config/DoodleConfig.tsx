import React, { useCallback } from 'react';

interface DoodleConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const DoodleConfig: React.FC<DoodleConfigProps> = ({ config, onChange }) => {
  const handleChange = useCallback((updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  }, [config, onChange]);

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700 mb-2">
        Doodle Configuration
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
            placeholder="Your Doodle API Key"
          />
          <p className="mt-1 text-xs text-gray-500">
            Generate from Doodle Account Settings → API Access
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base URL (optional)
          </label>
          <input
            type="url"
            value={config.baseUrl || 'https://api.doodle.com/v1'}
            onChange={(e) => handleChange({ baseUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="https://api.doodle.com/v1"
          />
        </div>
      </div>

      {/* Operation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operation
        </label>
        <select
          value={config.operation || 'listPolls'}
          onChange={(e) => handleChange({ operation: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Polls">
            <option value="listPolls">List Polls</option>
            <option value="getPoll">Get Poll</option>
            <option value="createPoll">Create Poll</option>
            <option value="updatePoll">Update Poll</option>
            <option value="deletePoll">Delete Poll</option>
            <option value="closePoll">Close Poll</option>
          </optgroup>
          <optgroup label="Participants">
            <option value="listParticipants">List Participants</option>
            <option value="addParticipant">Add Participant</option>
            <option value="updateParticipant">Update Participant</option>
            <option value="removeParticipant">Remove Participant</option>
          </optgroup>
          <optgroup label="Options">
            <option value="listOptions">List Poll Options</option>
            <option value="addOption">Add Option</option>
            <option value="removeOption">Remove Option</option>
          </optgroup>
          <optgroup label="Booking">
            <option value="getBookingCalendar">Get Booking Calendar</option>
            <option value="createBooking">Create Booking</option>
            <option value="cancelBooking">Cancel Booking</option>
          </optgroup>
        </select>
      </div>

      {/* Get/Update/Delete/Close Poll */}
      {(config.operation === 'getPoll' ||
        config.operation === 'updatePoll' ||
        config.operation === 'deletePoll' ||
        config.operation === 'closePoll') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Poll ID
          </label>
          <input
            type="text"
            value={config.pollId || ''}
            onChange={(e) => handleChange({ pollId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Poll ID"
          />
        </div>
      )}

      {/* Create Poll */}
      {config.operation === 'createPoll' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Poll Details</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poll Title
            </label>
            <input
              type="text"
              value={config.title || ''}
              onChange={(e) => handleChange({ title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Team Meeting"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poll Type
            </label>
            <select
              value={config.pollType || 'date'}
              onChange={(e) => handleChange({ pollType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="date">Date Poll</option>
              <option value="text">Text Poll</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={config.description || ''}
              onChange={(e) => handleChange({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
              placeholder="Poll description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={config.location || ''}
              onChange={(e) => handleChange({ location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Meeting room, Zoom link, etc."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="hiddenPoll"
              checked={config.hidden || false}
              onChange={(e) => handleChange({ hidden: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="hiddenPoll" className="text-sm text-gray-700">
              Hidden poll (only accessible via link)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="ifNeedBe"
              checked={config.ifNeedBe || false}
              onChange={(e) => handleChange({ ifNeedBe: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="ifNeedBe" className="text-sm text-gray-700">
              Enable "If need be" option
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="multiDay"
              checked={config.multiDay || false}
              onChange={(e) => handleChange({ multiDay: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="multiDay" className="text-sm text-gray-700">
              Multi-day event
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Options (one per line)
            </label>
            <textarea
              value={config.options || ''}
              onChange={(e) => handleChange({ options: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              rows={4}
              placeholder={config.pollType === 'date'
                ? "2024-03-15 10:00\n2024-03-15 14:00\n2024-03-16 10:00"
                : "Option 1\nOption 2\nOption 3"}
            />
            <p className="mt-1 text-xs text-gray-500">
              {config.pollType === 'date'
                ? "Format: YYYY-MM-DD HH:MM (one per line)"
                : "Enter each option on a new line"}
            </p>
          </div>
        </div>
      )}

      {/* Update Poll */}
      {config.operation === 'updatePoll' && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Update Fields</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Title (optional)
            </label>
            <input
              type="text"
              value={config.newTitle || ''}
              onChange={(e) => handleChange({ newTitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Updated title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Description (optional)
            </label>
            <textarea
              value={config.newDescription || ''}
              onChange={(e) => handleChange({ newDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="Updated description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Location (optional)
            </label>
            <input
              type="text"
              value={config.newLocation || ''}
              onChange={(e) => handleChange({ newLocation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Updated location"
            />
          </div>
        </div>
      )}

      {/* Participant Operations */}
      {(config.operation === 'listParticipants' ||
        config.operation === 'addParticipant' ||
        config.operation === 'updateParticipant' ||
        config.operation === 'removeParticipant') && (
        <div className="space-y-3">
          {config.operation !== 'addParticipant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poll ID
              </label>
              <input
                type="text"
                value={config.pollIdForParticipants || ''}
                onChange={(e) => handleChange({ pollIdForParticipants: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Poll ID"
              />
            </div>
          )}

          {(config.operation === 'updateParticipant' || config.operation === 'removeParticipant') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Participant ID
              </label>
              <input
                type="text"
                value={config.participantId || ''}
                onChange={(e) => handleChange({ participantId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Participant ID"
              />
            </div>
          )}

          {config.operation === 'addParticipant' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poll ID
                </label>
                <input
                  type="text"
                  value={config.pollIdForNewParticipant || ''}
                  onChange={(e) => handleChange({ pollIdForNewParticipant: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Poll ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Participant Name
                </label>
                <input
                  type="text"
                  value={config.participantName || ''}
                  onChange={(e) => handleChange({ participantName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={config.participantEmail || ''}
                  onChange={(e) => handleChange({ participantEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferences (JSON)
                </label>
                <textarea
                  value={config.preferences || ''}
                  onChange={(e) => handleChange({ preferences: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                  rows={3}
                  placeholder='{"optionId1": "yes", "optionId2": "no"}'
                />
                <p className="mt-1 text-xs text-gray-500">
                  JSON object mapping option IDs to responses (yes/no/ifNeedBe)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Option Operations */}
      {(config.operation === 'listOptions' ||
        config.operation === 'addOption' ||
        config.operation === 'removeOption') && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poll ID
            </label>
            <input
              type="text"
              value={config.pollIdForOptions || ''}
              onChange={(e) => handleChange({ pollIdForOptions: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Poll ID"
            />
          </div>

          {config.operation === 'addOption' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option Value
              </label>
              <input
                type="text"
                value={config.optionValue || ''}
                onChange={(e) => handleChange({ optionValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="2024-03-15 10:00 or Option text"
              />
            </div>
          )}

          {config.operation === 'removeOption' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Option ID
              </label>
              <input
                type="text"
                value={config.optionId || ''}
                onChange={(e) => handleChange({ optionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Option ID"
              />
            </div>
          )}
        </div>
      )}

      {/* Booking Operations */}
      {(config.operation === 'getBookingCalendar' ||
        config.operation === 'createBooking' ||
        config.operation === 'cancelBooking') && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-gray-700">Booking Calendar</div>

          {config.operation === 'getBookingCalendar' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calendar ID
              </label>
              <input
                type="text"
                value={config.calendarId || ''}
                onChange={(e) => handleChange({ calendarId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Booking Calendar ID"
              />
            </div>
          )}

          {config.operation === 'createBooking' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calendar ID
                </label>
                <input
                  type="text"
                  value={config.calendarIdForBooking || ''}
                  onChange={(e) => handleChange({ calendarIdForBooking: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Calendar ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Slot
                </label>
                <input
                  type="datetime-local"
                  value={config.timeSlot || ''}
                  onChange={(e) => handleChange({ timeSlot: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={config.bookingName || ''}
                  onChange={(e) => handleChange({ bookingName: e.target.value })}
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
                  value={config.bookingEmail || ''}
                  onChange={(e) => handleChange({ bookingEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="john@example.com"
                />
              </div>
            </>
          )}

          {config.operation === 'cancelBooking' && (
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
        </div>
      )}

      {/* List Polls */}
      {config.operation === 'listPolls' && (
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
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
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

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          <strong>Doodle Integration</strong>
          <p className="mt-1 text-xs">
            Doodle is a scheduling and polling platform for finding the best time for meetings.
            Requires API Key from your Doodle account.
          </p>
          <p className="mt-2 text-xs">
            <strong>Common uses:</strong> Create polls, manage participants, schedule meetings, and automate group scheduling workflows.
          </p>
        </div>
      </div>
    </div>
  );
};
