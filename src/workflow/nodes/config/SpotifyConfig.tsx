/**
 * Spotify Node Configuration
 * Music streaming integration with OAuth 2.0
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface SpotifyConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type SpotifyOperation =
  | 'searchTracks'
  | 'searchArtists'
  | 'searchAlbums'
  | 'searchPlaylists'
  | 'getTrack'
  | 'getAlbum'
  | 'getArtist'
  | 'getPlaylist'
  | 'createPlaylist'
  | 'addTracksToPlaylist'
  | 'removeTracksFromPlaylist'
  | 'getUserPlaylists'
  | 'getUserTopTracks'
  | 'getUserTopArtists'
  | 'getRecentlyPlayed'
  | 'playTrack'
  | 'pausePlayback'
  | 'nextTrack'
  | 'previousTrack'
  | 'setVolume';

export const SpotifyConfig: React.FC<SpotifyConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<SpotifyOperation>(
    (config.operation as SpotifyOperation) || 'searchTracks'
  );
  const [query, setQuery] = useState((config.query as string) || '');
  const [trackId, setTrackId] = useState((config.trackId as string) || '');
  const [albumId, setAlbumId] = useState((config.albumId as string) || '');
  const [artistId, setArtistId] = useState((config.artistId as string) || '');
  const [playlistId, setPlaylistId] = useState((config.playlistId as string) || '');
  const [playlistName, setPlaylistName] = useState((config.playlistName as string) || '');
  const [playlistDescription, setPlaylistDescription] = useState((config.playlistDescription as string) || '');
  const [isPublic, setIsPublic] = useState((config.isPublic as boolean) ?? true);
  const [trackUris, setTrackUris] = useState((config.trackUris as string) || '');
  const [limit, setLimit] = useState((config.limit as number) || 20);
  const [timeRange, setTimeRange] = useState((config.timeRange as string) || 'medium_term');
  const [volume, setVolume] = useState((config.volume as number) || 50);

  const handleOperationChange = (newOperation: SpotifyOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<SpotifyOperation, string> = {
    searchTracks: 'Search for tracks by name, artist, or album',
    searchArtists: 'Search for artists by name',
    searchAlbums: 'Search for albums by name or artist',
    searchPlaylists: 'Search for playlists by name',
    getTrack: 'Get detailed information about a track',
    getAlbum: 'Get detailed information about an album',
    getArtist: 'Get detailed information about an artist',
    getPlaylist: 'Get detailed information about a playlist',
    createPlaylist: 'Create a new playlist for the authenticated user',
    addTracksToPlaylist: 'Add tracks to an existing playlist',
    removeTracksFromPlaylist: 'Remove tracks from an existing playlist',
    getUserPlaylists: 'Get all playlists for the authenticated user',
    getUserTopTracks: 'Get user\'s top tracks based on listening history',
    getUserTopArtists: 'Get user\'s top artists based on listening history',
    getRecentlyPlayed: 'Get recently played tracks for the user',
    playTrack: 'Start or resume playback',
    pausePlayback: 'Pause current playback',
    nextTrack: 'Skip to next track',
    previousTrack: 'Skip to previous track',
    setVolume: 'Set playback volume (0-100)',
  };

  const loadExample = (type: 'search' | 'playlist' | 'playback') => {
    switch (type) {
      case 'search':
        setOperation('searchTracks');
        setQuery('The Beatles');
        setLimit(10);
        onChange({
          ...config,
          operation: 'searchTracks',
          query: 'The Beatles',
          limit: 10,
        });
        break;
      case 'playlist':
        setOperation('createPlaylist');
        setPlaylistName('My Workflow Playlist');
        setPlaylistDescription('Created automatically from workflow');
        setIsPublic(false);
        onChange({
          ...config,
          operation: 'createPlaylist',
          playlistName: 'My Workflow Playlist',
          playlistDescription: 'Created automatically from workflow',
          isPublic: false,
        });
        break;
      case 'playback':
        setOperation('playTrack');
        setTrackUris('spotify:track:{{ $json.trackId }}');
        onChange({
          ...config,
          operation: 'playTrack',
          trackUris: 'spotify:track:{{ $json.trackId }}',
        });
        break;
    }
  };

  return (
    <div className="spotify-config space-y-4">
      <div className="font-semibold text-lg mb-4">Spotify Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as SpotifyOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Search">
            <option value="searchTracks">Search Tracks</option>
            <option value="searchArtists">Search Artists</option>
            <option value="searchAlbums">Search Albums</option>
            <option value="searchPlaylists">Search Playlists</option>
          </optgroup>
          <optgroup label="Get Information">
            <option value="getTrack">Get Track</option>
            <option value="getAlbum">Get Album</option>
            <option value="getArtist">Get Artist</option>
            <option value="getPlaylist">Get Playlist</option>
          </optgroup>
          <optgroup label="Playlist Management">
            <option value="createPlaylist">Create Playlist</option>
            <option value="addTracksToPlaylist">Add Tracks to Playlist</option>
            <option value="removeTracksFromPlaylist">Remove Tracks from Playlist</option>
            <option value="getUserPlaylists">Get User Playlists</option>
          </optgroup>
          <optgroup label="User Library">
            <option value="getUserTopTracks">Get Top Tracks</option>
            <option value="getUserTopArtists">Get Top Artists</option>
            <option value="getRecentlyPlayed">Get Recently Played</option>
          </optgroup>
          <optgroup label="Playback Control">
            <option value="playTrack">Play Track</option>
            <option value="pausePlayback">Pause Playback</option>
            <option value="nextTrack">Next Track</option>
            <option value="previousTrack">Previous Track</option>
            <option value="setVolume">Set Volume</option>
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
            <p className="text-xs text-gray-600 mt-1">
              Can use expressions: {'{{ $json.searchTerm }}'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limit (max 50)</label>
            <input
              type="number"
              min="1"
              max="50"
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
      {operation === 'getTrack' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Track ID</label>
          <input
            type="text"
            value={trackId}
            onChange={(e) => {
              setTrackId(e.target.value);
              handleFieldChange('trackId', e.target.value);
            }}
            placeholder="3n3Ppam7vgaVa1iaRUc9Lp"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Spotify track ID or URI (spotify:track:...)
          </p>
        </div>
      )}

      {/* Get Album */}
      {operation === 'getAlbum' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Album ID</label>
          <input
            type="text"
            value={albumId}
            onChange={(e) => {
              setAlbumId(e.target.value);
              handleFieldChange('albumId', e.target.value);
            }}
            placeholder="4aawyAB9vmqN3uQ7FjRGTy"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Artist */}
      {operation === 'getArtist' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Artist ID</label>
          <input
            type="text"
            value={artistId}
            onChange={(e) => {
              setArtistId(e.target.value);
              handleFieldChange('artistId', e.target.value);
            }}
            placeholder="3WrFJ7ztbogyGnTHbHJFl2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Playlist */}
      {(operation === 'getPlaylist' || operation === 'addTracksToPlaylist' || operation === 'removeTracksFromPlaylist') && (
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
              placeholder="37i9dQZF1DXcBWIGoYBM5M"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {(operation === 'addTracksToPlaylist' || operation === 'removeTracksFromPlaylist') && (
            <div>
              <label className="block text-sm font-medium mb-1">Track URIs (comma-separated)</label>
              <textarea
                value={trackUris}
                onChange={(e) => {
                  setTrackUris(e.target.value);
                  handleFieldChange('trackUris', e.target.value);
                }}
                placeholder="spotify:track:4iV5W9uYEdYUVa79Axb7Rh,spotify:track:1301WleyT98MSxVHPZCA6M"
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Create Playlist */}
      {operation === 'createPlaylist' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Playlist Name</label>
            <input
              type="text"
              value={playlistName}
              onChange={(e) => {
                setPlaylistName(e.target.value);
                handleFieldChange('playlistName', e.target.value);
              }}
              placeholder="My Awesome Playlist"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea
              value={playlistDescription}
              onChange={(e) => {
                setPlaylistDescription(e.target.value);
                handleFieldChange('playlistDescription', e.target.value);
              }}
              placeholder="Playlist description..."
              className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md"
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
              Make playlist public
            </label>
          </div>
        </div>
      )}

      {/* User Top Items */}
      {(operation === 'getUserTopTracks' || operation === 'getUserTopArtists') && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                handleFieldChange('timeRange', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="short_term">Last 4 weeks</option>
              <option value="medium_term">Last 6 months</option>
              <option value="long_term">All time</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limit (max 50)</label>
            <input
              type="number"
              min="1"
              max="50"
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

      {/* Play Track */}
      {operation === 'playTrack' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Track URI(s)</label>
          <textarea
            value={trackUris}
            onChange={(e) => {
              setTrackUris(e.target.value);
              handleFieldChange('trackUris', e.target.value);
            }}
            placeholder="spotify:track:4iV5W9uYEdYUVa79Axb7Rh"
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            One or more Spotify URIs (comma-separated)
          </p>
        </div>
      )}

      {/* Set Volume */}
      {operation === 'setVolume' && (
        <div className="p-3 bg-gray-50 rounded">
          <label className="block text-sm font-medium mb-1">Volume (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              handleFieldChange('volume', Number(e.target.value));
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              handleFieldChange('volume', Number(e.target.value));
            }}
            className="w-full mt-2"
          />
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
            onClick={() => loadExample('playlist')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📝 Playlist
          </button>
          <button
            onClick={() => loadExample('playback')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            ▶️ Playback
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Spotify Tips:</strong></div>
        <div>• Get IDs from Spotify URIs: <code className="bg-white px-1 rounded">spotify:track:ID</code></div>
        <div>• Use Spotify Developer Dashboard to get credentials</div>
        <div>• Playback control requires Spotify Premium</div>
        <div>• Rate limit: 180 requests per minute</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> OAuth 2.0 with scopes: user-read-private, user-read-email,
        playlist-modify-public, playlist-modify-private, user-modify-playback-state, user-read-playback-state,
        user-read-recently-played, user-top-read. Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default SpotifyConfig;
