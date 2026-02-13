/**
 * SoundCloud Node Configuration
 * Music streaming and audio sharing platform
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SoundcloudConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type SoundcloudOperation =
  | 'searchTracks'
  | 'searchUsers'
  | 'searchPlaylists'
  | 'getTrack'
  | 'getUser'
  | 'getPlaylist'
  | 'getUserTracks'
  | 'getUserPlaylists'
  | 'getUserFollowers'
  | 'getUserFollowing'
  | 'uploadTrack'
  | 'updateTrack'
  | 'deleteTrack'
  | 'likeTrack'
  | 'unlikeTrack'
  | 'addTrackToPlaylist'
  | 'createPlaylist'
  | 'getComments'
  | 'addComment';

export const SoundcloudConfig: React.FC<SoundcloudConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SoundcloudOperation>(
    (config.operation as SoundcloudOperation) || 'searchTracks'
  );
  const [query, setQuery] = useState((config.query as string) || '');
  const [trackId, setTrackId] = useState((config.trackId as string) || '');
  const [userId, setUserId] = useState((config.userId as string) || '');
  const [playlistId, setPlaylistId] = useState((config.playlistId as string) || '');
  const [title, setTitle] = useState((config.title as string) || '');
  const [description, setDescription] = useState((config.description as string) || '');
  const [genre, setGenre] = useState((config.genre as string) || '');
  const [tags, setTags] = useState((config.tags as string) || '');
  const [isPublic, setIsPublic] = useState((config.isPublic as boolean) ?? true);
  const [limit, setLimit] = useState((config.limit as number) || 20);
  const [audioFile, setAudioFile] = useState((config.audioFile as string) || '');
  const [artwork, setArtwork] = useState((config.artwork as string) || '');
  const [comment, setComment] = useState((config.comment as string) || '');
  const [timestamp, setTimestamp] = useState((config.timestamp as number) || 0);

  const handleOperationChange = (newOperation: SoundcloudOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<SoundcloudOperation, string> = {
    searchTracks: 'Search for tracks on SoundCloud',
    searchUsers: 'Search for users by name',
    searchPlaylists: 'Search for playlists',
    getTrack: 'Get detailed information about a track',
    getUser: 'Get user profile information',
    getPlaylist: 'Get playlist details',
    getUserTracks: 'Get all tracks uploaded by a user',
    getUserPlaylists: 'Get all playlists created by a user',
    getUserFollowers: 'Get list of user followers',
    getUserFollowing: 'Get list of users being followed',
    uploadTrack: 'Upload a new track to SoundCloud',
    updateTrack: 'Update track metadata',
    deleteTrack: 'Delete a track',
    likeTrack: 'Like a track',
    unlikeTrack: 'Unlike a track',
    addTrackToPlaylist: 'Add track to playlist',
    createPlaylist: 'Create a new playlist',
    getComments: 'Get comments on a track',
    addComment: 'Add a comment to a track',
  };

  const loadExample = (type: 'search' | 'upload' | 'playlist') => {
    switch (type) {
      case 'search':
        setOperation('searchTracks');
        setQuery('electronic music');
        setLimit(10);
        onChange({
          ...config,
          operation: 'searchTracks',
          query: 'electronic music',
          limit: 10,
        });
        break;
      case 'upload':
        setOperation('uploadTrack');
        setTitle('My Track');
        setDescription('Uploaded from workflow');
        setGenre('Electronic');
        setTags('electronic, music, original');
        onChange({
          ...config,
          operation: 'uploadTrack',
          title: 'My Track',
          description: 'Uploaded from workflow',
          genre: 'Electronic',
          tags: 'electronic, music, original',
        });
        break;
      case 'playlist':
        setOperation('createPlaylist');
        setTitle('My Playlist');
        setDescription('Created automatically');
        onChange({
          ...config,
          operation: 'createPlaylist',
          title: 'My Playlist',
          description: 'Created automatically',
        });
        break;
    }
  };

  return (
    <div className="soundcloud-config space-y-4">
      <div className="font-semibold text-lg mb-4">SoundCloud Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SoundcloudOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Search">
            <option value="searchTracks">Search Tracks</option>
            <option value="searchUsers">Search Users</option>
            <option value="searchPlaylists">Search Playlists</option>
          </optgroup>
          <optgroup label="Get Information">
            <option value="getTrack">Get Track</option>
            <option value="getUser">Get User</option>
            <option value="getPlaylist">Get Playlist</option>
            <option value="getUserTracks">Get User Tracks</option>
            <option value="getUserPlaylists">Get User Playlists</option>
            <option value="getUserFollowers">Get Followers</option>
            <option value="getUserFollowing">Get Following</option>
          </optgroup>
          <optgroup label="Track Management">
            <option value="uploadTrack">Upload Track</option>
            <option value="updateTrack">Update Track</option>
            <option value="deleteTrack">Delete Track</option>
            <option value="likeTrack">Like Track</option>
            <option value="unlikeTrack">Unlike Track</option>
          </optgroup>
          <optgroup label="Playlist Management">
            <option value="createPlaylist">Create Playlist</option>
            <option value="addTrackToPlaylist">Add Track to Playlist</option>
          </optgroup>
          <optgroup label="Social">
            <option value="getComments">Get Comments</option>
            <option value="addComment">Add Comment</option>
          </optgroup>
        </select>
        <p className="text-xs text-gray-600 mt-1">
          {operationDescriptions[operation]}
        </p>
      </div>

      {/* Search Operations */}
      {operation.startsWith('search') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Search Query</label>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleFieldChange('query', e.target.value);
              }}
              placeholder="Enter search terms..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limit (max 200)</label>
            <input
              type="number"
              min="1"
              max="200"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                handleFieldChange('limit', Number(e.target.value));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Get Track */}
      {(operation === 'getTrack' || operation === 'updateTrack' || operation === 'deleteTrack' ||
        operation === 'likeTrack' || operation === 'unlikeTrack' || operation === 'getComments' ||
        operation === 'addComment') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Track ID</label>
            <input
              type="text"
              value={trackId}
              onChange={(e) => {
                setTrackId(e.target.value);
                handleFieldChange('trackId', e.target.value);
              }}
              placeholder="123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'addComment' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    handleFieldChange('comment', e.target.value);
                  }}
                  placeholder="Your comment..."
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timestamp (ms, optional)</label>
                <input
                  type="number"
                  min="0"
                  value={timestamp}
                  onChange={(e) => {
                    setTimestamp(Number(e.target.value));
                    handleFieldChange('timestamp', Number(e.target.value));
                  }}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Position in track where comment appears (milliseconds)
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Get User / User Operations */}
      {(operation === 'getUser' || operation === 'getUserTracks' || operation === 'getUserPlaylists' ||
        operation === 'getUserFollowers' || operation === 'getUserFollowing') && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              handleFieldChange('userId', e.target.value);
            }}
            placeholder="123456789"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Playlist / Add Track to Playlist */}
      {(operation === 'getPlaylist' || operation === 'addTrackToPlaylist') && (
        <div className="p-3 bg-gray-50 rounded space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Playlist ID</label>
            <input
              type="text"
              value={playlistId}
              onChange={(e) => {
                setPlaylistId(e.target.value);
                handleFieldChange('playlistId', e.target.value);
              }}
              placeholder="123456789"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {operation === 'addTrackToPlaylist' && (
            <div>
              <label className="block text-sm font-medium mb-1">Track ID</label>
              <input
                type="text"
                value={trackId}
                onChange={(e) => {
                  setTrackId(e.target.value);
                  handleFieldChange('trackId', e.target.value);
                }}
                placeholder="123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Upload Track */}
      {operation === 'uploadTrack' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Audio File (Expression)</label>
            <input
              type="text"
              value={audioFile}
              onChange={(e) => {
                setAudioFile(e.target.value);
                handleFieldChange('audioFile', e.target.value);
              }}
              placeholder="{{ $json.audioData }}"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
            <p className="text-xs text-gray-600 mt-1">
              Binary audio data or file path
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange('title', e.target.value);
              }}
              placeholder="Track title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleFieldChange('description', e.target.value);
              }}
              placeholder="Track description..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Genre</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => {
                  setGenre(e.target.value);
                  handleFieldChange('genre', e.target.value);
                }}
                placeholder="Electronic"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => {
                  setTags(e.target.value);
                  handleFieldChange('tags', e.target.value);
                }}
                placeholder="electronic, music"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Artwork URL (Optional)</label>
            <input
              type="text"
              value={artwork}
              onChange={(e) => {
                setArtwork(e.target.value);
                handleFieldChange('artwork', e.target.value);
              }}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => {
                setIsPublic(e.target.checked);
                handleFieldChange('isPublic', e.target.checked);
              }}
              className="mr-2"
            />
            <label htmlFor="isPublic" className="text-sm">
              Make track public
            </label>
          </div>
        </div>
      )}

      {/* Create Playlist */}
      {operation === 'createPlaylist' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleFieldChange('title', e.target.value);
              }}
              placeholder="Playlist title"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                handleFieldChange('description', e.target.value);
              }}
              placeholder="Playlist description..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      )}

      {/* Example Templates */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Quick Examples</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => loadExample('search')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            🔍 Search
          </button>
          <button
            onClick={() => loadExample('upload')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📤 Upload
          </button>
          <button
            onClick={() => loadExample('playlist')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📝 Playlist
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 SoundCloud Tips:</strong></div>
        <div>• Track IDs are numeric (e.g., 123456789)</div>
        <div>• Audio files must be in supported formats (MP3, FLAC, WAV, etc.)</div>
        <div>• Maximum upload size: 5GB</div>
        <div>• Comments can have timestamps for position in track</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> OAuth 2.0 required. Get credentials from SoundCloud
        Developers portal. Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default SoundcloudConfig;
