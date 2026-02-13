/**
 * Deezer Node Configuration
 * Music streaming service integration
 */

import React, { useState } from 'react';
import type { NodeConfig } from '../../../types/workflow';

interface DeezerConfigProps {
  config: NodeConfig;
  onChange: (config: NodeConfig) => void;
}

type DeezerOperation =
  | 'searchTracks'
  | 'searchAlbums'
  | 'searchArtists'
  | 'searchPlaylists'
  | 'getTrack'
  | 'getAlbum'
  | 'getArtist'
  | 'getPlaylist'
  | 'getUserPlaylists'
  | 'getUserFavorites'
  | 'getUserAlbums'
  | 'createPlaylist'
  | 'addTracksToPlaylist'
  | 'removeTracksFromPlaylist'
  | 'getRadio'
  | 'getChart'
  | 'getGenres';

export const DeezerConfig: React.FC<DeezerConfigProps> = ({ config, onChange }) => {
  const [operation, setOperation] = useState<DeezerOperation>(
    (config.operation as DeezerOperation) || 'searchTracks'
  );
  const [query, setQuery] = useState((config.query as string) || '');
  const [trackId, setTrackId] = useState((config.trackId as string) || '');
  const [albumId, setAlbumId] = useState((config.albumId as string) || '');
  const [artistId, setArtistId] = useState((config.artistId as string) || '');
  const [playlistId, setPlaylistId] = useState((config.playlistId as string) || '');
  const [playlistTitle, setPlaylistTitle] = useState((config.playlistTitle as string) || '');
  const [trackIds, setTrackIds] = useState((config.trackIds as string) || '');
  const [limit, setLimit] = useState((config.limit as number) || 25);
  const [isPublic, setIsPublic] = useState((config.isPublic as boolean) ?? true);
  const [chartType, setChartType] = useState((config.chartType as string) || 'tracks');

  const handleOperationChange = (newOperation: DeezerOperation) => {
    setOperation(newOperation);
    onChange({ ...config, operation: newOperation });
  };

  const handleFieldChange = (field: string, value: string | number | boolean) => {
    onChange({ ...config, [field]: value });
  };

  const operationDescriptions: Record<DeezerOperation, string> = {
    searchTracks: 'Search for tracks on Deezer',
    searchAlbums: 'Search for albums',
    searchArtists: 'Search for artists',
    searchPlaylists: 'Search for playlists',
    getTrack: 'Get detailed information about a track',
    getAlbum: 'Get album details and track list',
    getArtist: 'Get artist information and top tracks',
    getPlaylist: 'Get playlist details',
    getUserPlaylists: 'Get user\'s created playlists',
    getUserFavorites: 'Get user\'s favorite tracks',
    getUserAlbums: 'Get user\'s favorite albums',
    createPlaylist: 'Create a new playlist',
    addTracksToPlaylist: 'Add tracks to an existing playlist',
    removeTracksFromPlaylist: 'Remove tracks from playlist',
    getRadio: 'Get radio stations',
    getChart: 'Get top charts (tracks, albums, artists)',
    getGenres: 'Get available music genres',
  };

  const loadExample = (type: 'search' | 'playlist' | 'chart') => {
    switch (type) {
      case 'search':
        setOperation('searchTracks');
        setQuery('Daft Punk');
        setLimit(10);
        onChange({
          ...config,
          operation: 'searchTracks',
          query: 'Daft Punk',
          limit: 10,
        });
        break;
      case 'playlist':
        setOperation('createPlaylist');
        setPlaylistTitle('My Deezer Playlist');
        setIsPublic(true);
        onChange({
          ...config,
          operation: 'createPlaylist',
          playlistTitle: 'My Deezer Playlist',
          isPublic: true,
        });
        break;
      case 'chart':
        setOperation('getChart');
        setChartType('tracks');
        setLimit(50);
        onChange({
          ...config,
          operation: 'getChart',
          chartType: 'tracks',
          limit: 50,
        });
        break;
    }
  };

  return (
    <div className="deezer-config space-y-4">
      <div className="font-semibold text-lg mb-4">Deezer Configuration</div>

      <div>
        <label className="block text-sm font-medium mb-2">Operation</label>
        <select
          value={operation}
          onChange={(e) => handleOperationChange(e.target.value as DeezerOperation)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <optgroup label="Search">
            <option value="searchTracks">Search Tracks</option>
            <option value="searchAlbums">Search Albums</option>
            <option value="searchArtists">Search Artists</option>
            <option value="searchPlaylists">Search Playlists</option>
          </optgroup>
          <optgroup label="Get Information">
            <option value="getTrack">Get Track</option>
            <option value="getAlbum">Get Album</option>
            <option value="getArtist">Get Artist</option>
            <option value="getPlaylist">Get Playlist</option>
          </optgroup>
          <optgroup label="User Library">
            <option value="getUserPlaylists">Get User Playlists</option>
            <option value="getUserFavorites">Get Favorite Tracks</option>
            <option value="getUserAlbums">Get Favorite Albums</option>
          </optgroup>
          <optgroup label="Playlist Management">
            <option value="createPlaylist">Create Playlist</option>
            <option value="addTracksToPlaylist">Add Tracks to Playlist</option>
            <option value="removeTracksFromPlaylist">Remove Tracks from Playlist</option>
          </optgroup>
          <optgroup label="Discovery">
            <option value="getRadio">Get Radio Stations</option>
            <option value="getChart">Get Charts</option>
            <option value="getGenres">Get Genres</option>
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
            <label className="block text-sm font-medium mb-1">Limit (max 100)</label>
            <input
              type="number"
              min="1"
              max="100"
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
            placeholder="3135556"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
          <p className="text-xs text-gray-600 mt-1">
            Deezer track ID (numeric)
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
            placeholder="302127"
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
            placeholder="27"
            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
        </div>
      )}

      {/* Get Playlist / Playlist Operations */}
      {(operation === 'getPlaylist' || operation === 'addTracksToPlaylist' ||
        operation === 'removeTracksFromPlaylist') && (
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
              placeholder="1362521735"
              className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
            />
          </div>
          {(operation === 'addTracksToPlaylist' || operation === 'removeTracksFromPlaylist') && (
            <div>
              <label className="block text-sm font-medium mb-1">Track IDs (comma-separated)</label>
              <textarea
                value={trackIds}
                onChange={(e) => {
                  setTrackIds(e.target.value);
                  handleFieldChange('trackIds', e.target.value);
                }}
                placeholder="3135556,3135557,3135558"
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
              <p className="text-xs text-gray-600 mt-1">
                Numeric track IDs separated by commas
              </p>
            </div>
          )}
        </div>
      )}

      {/* Create Playlist */}
      {operation === 'createPlaylist' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Playlist Title</label>
            <input
              type="text"
              value={playlistTitle}
              onChange={(e) => {
                setPlaylistTitle(e.target.value);
                handleFieldChange('playlistTitle', e.target.value);
              }}
              placeholder="My Playlist"
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
              Make playlist public
            </label>
          </div>
        </div>
      )}

      {/* Get Chart */}
      {operation === 'getChart' && (
        <div className="space-y-3 p-3 bg-gray-50 rounded">
          <div>
            <label className="block text-sm font-medium mb-1">Chart Type</label>
            <select
              value={chartType}
              onChange={(e) => {
                setChartType(e.target.value);
                handleFieldChange('chartType', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="tracks">Tracks</option>
              <option value="albums">Albums</option>
              <option value="artists">Artists</option>
              <option value="playlists">Playlists</option>
              <option value="podcasts">Podcasts</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limit (max 100)</label>
            <input
              type="number"
              min="1"
              max="100"
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
            onClick={() => loadExample('chart')}
            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            📊 Charts
          </button>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded text-sm space-y-2">
        <div><strong>💡 Deezer Tips:</strong></div>
        <div>• All IDs are numeric values</div>
        <div>• API supports pagination with limit and index parameters</div>
        <div>• Radio stations available by genre, artist, or track</div>
        <div>• Charts updated daily with top content</div>
      </div>

      <div className="mt-2 p-3 bg-yellow-50 rounded text-sm">
        <strong>🔐 Authentication:</strong> OAuth 2.0 required for user-specific operations.
        API key required for public data. Configure in Credentials Manager.
      </div>
    </div>
  );
};

export default DeezerConfig;
