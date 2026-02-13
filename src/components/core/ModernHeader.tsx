/** @deprecated Use UnifiedHeader instead. Kept for backward compatibility with non-editor views. */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  Bug, Check, ChevronDown, Circle, Code, Download, Edit2, FileJson,
  HelpCircle, Keyboard, Layout, Lock, Maximize, Maximize2, Minimize2,
  Moon, Play, Save, Server, Settings, Sparkles,
  Square, Sun, TestTube, Unlock, Upload, Workflow, X,
  ZoomIn, ZoomOut
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

interface ModernHeaderProps {
  onExecute: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onN8nImport?: () => void;
  onDebug?: () => void;
  isExecuting: boolean;
  currentEnvironment: string;
  viewMode: 'normal' | 'compact' | 'detailed';
  onViewModeChange: (mode: 'normal' | 'compact' | 'detailed') => void;
  snapToGrid: boolean;
  onSnapToGridChange: (enabled: boolean) => void;
  showMiniMap: boolean;
  onShowMiniMapChange: (enabled: boolean) => void;
  showGrid: boolean;
  onShowGridChange: (enabled: boolean) => void;
  connectionStyle: 'bezier' | 'straight' | 'smoothstep';
  onConnectionStyleChange: (style: 'bezier' | 'straight' | 'smoothstep') => void;
  autoLayout: boolean;
  onAutoLayoutChange: (enabled: boolean) => void;
  onApplyAutoLayout: () => void;
  onOpenAIBuilder: () => void;
  onOpenVisualDesigner: () => void;
}

const ModernHeader: React.FC<ModernHeaderProps> = React.memo(({
  onExecute,
  onSave,
  onExport,
  onImport,
  onN8nImport,
  onDebug,
  isExecuting,
  currentEnvironment,
  viewMode,
  onViewModeChange,
  snapToGrid,
  onSnapToGridChange,
  showMiniMap,
  onShowMiniMapChange,
  showGrid,
  onShowGridChange,
  connectionStyle,
  onConnectionStyleChange,
  autoLayout,
  onAutoLayoutChange,
  onApplyAutoLayout,
  onOpenAIBuilder,
  onOpenVisualDesigner,
}) => {
  const {
    darkMode,
    toggleDarkMode,
    nodes,
    edges,
    setCurrentEnvironment,
    workflowName,
    setWorkflowName,
    isSaved,
    lastSaved,
    isCurrentWorkflowLocked,
    setWorkflowLocked,
    currentWorkflowId,
  } = useWorkflowStore();

  const [showSettings, setShowSettings] = useState(false);
  const [showEnvironmentDropdown, setShowEnvironmentDropdown] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(workflowName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zoomInBtn = useRef<HTMLButtonElement | null>(null);
  const zoomOutBtn = useRef<HTMLButtonElement | null>(null);
  const fitViewBtn = useRef<HTMLButtonElement | null>(null);

  // Memoize environments configuration
  const environments = useMemo(() => [
    { id: 'dev', name: 'Development', color: 'bg-green-500', icon: Code },
    { id: 'staging', name: 'Staging', color: 'bg-yellow-500', icon: TestTube },
    { id: 'prod', name: 'Production', color: 'bg-red-500', icon: Server },
  ], []);

  // Memoize current environment
  const currentEnv = useMemo(
    () => environments.find((e) => e.id === currentEnvironment),
    [environments, currentEnvironment]
  );

  // Memoize node and edge counts
  const nodeCount = useMemo(() => nodes.length, [nodes.length]);
  const edgeCount = useMemo(() => edges.length, [edges.length]);

  // useCallback for event handlers
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
    }
  }, [onImport]);

  const handleNameSubmit = useCallback(() => {
    setWorkflowName(tempName);
    setIsEditing(false);
  }, [tempName, setWorkflowName]);

  const handleNameCancel = useCallback(() => {
    setTempName(workflowName);
    setIsEditing(false);
  }, [workflowName]);

  const handleToggleDarkMode = useCallback(() => {
    toggleDarkMode();
    setShowSettings(false);
  }, [toggleDarkMode]);

  const handleEnvironmentChange = useCallback((envId: string) => {
    setCurrentEnvironment(envId);
    setShowEnvironmentDropdown(false);
  }, [setCurrentEnvironment]);

  const handleApplyAutoLayout = useCallback(() => {
    onApplyAutoLayout();
    setShowViewOptions(false);
  }, [onApplyAutoLayout]);

  const handleCloseDropdowns = useCallback(() => {
    setShowSettings(false);
    setShowEnvironmentDropdown(false);
    setShowViewOptions(false);
  }, []);

  const handleToggleLock = useCallback(() => {
    setWorkflowLocked(currentWorkflowId, !isCurrentWorkflowLocked);
  }, [setWorkflowLocked, currentWorkflowId, isCurrentWorkflowLocked]);


  return (
    <header className={`fixed top-0 left-0 right-0 h-16 ${
      darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
    } border-b shadow-sm z-50 transition-colors duration-300`}>
      <div className="flex items-center justify-between h-full px-4">
        
        {/* Logo et nom du workflow */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-lg">
              <Workflow size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSubmit();
                        if (e.key === 'Escape') handleNameCancel();
                      }}
                      className={`px-2 py-1 text-lg font-semibold bg-transparent border-b-2 border-primary-500 focus:outline-none ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}
                      autoFocus
                      aria-label="Modifier le nom du workflow"
                      aria-describedby="workflow-name-help"
                    />
                    <div id="workflow-name-help" className="sr-only">
                      Appuyez sur Entrée pour valider ou Échap pour annuler
                    </div>
                    <button
                      onClick={handleNameSubmit}
                      className="text-green-500 hover:text-green-600 p-1"
                      aria-label="Valider le nom du workflow"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleNameCancel}
                      className="text-red-500 hover:text-red-600 p-1"
                      aria-label="Annuler la modification du nom"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <h1 className={`text-lg font-semibold ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {workflowName}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <span>{nodeCount} nœuds</span>
                <span>•</span>
                <span>{edgeCount} connexions</span>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  {isSaved ? (
                    <>
                      <Check size={12} className="text-green-500" />
                      <span>Sauvegardé</span>
                    </>
                  ) : (
                    <>
                      <Circle size={12} className="text-orange-500 fill-current" />
                      <span>Non sauvegardé</span>
                    </>
                  )}
                </div>
                {isCurrentWorkflowLocked && (
                  <>
                    <span>•</span>
                    <div className="flex items-center space-x-1 text-amber-500">
                      <Lock size={12} />
                      <span>Verrouillé</span>
                    </div>
                  </>
                )}
                {lastSaved && (
                  <>
                    <span>•</span>
                    <span title={lastSaved.toLocaleString()}>
                      {lastSaved.toLocaleTimeString()}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions principales */}
        <div className="flex items-center space-x-3">
          
          {/* Bouton Visual Designer */}
          <button
            onClick={onOpenVisualDesigner}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Workflow size={16} />
            <span className="hidden sm:inline">Visual Designer</span>
          </button>

          {/* Bouton AI Builder */}
          <button
            onClick={onOpenAIBuilder}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">AI Builder</span>
          </button>

          {/* Bouton d'exécution */}
          <button
            onClick={onExecute}
            disabled={isExecuting || nodeCount === 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              isExecuting || nodeCount === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600 hover:scale-105 shadow-md hover:shadow-lg'
            }`}
            aria-label={isExecuting ? "Exécution en cours du workflow" : "Exécuter le workflow"}
            aria-describedby={nodeCount === 0 ? "execute-help" : undefined}
          >
            {nodeCount === 0 && (
              <div id="execute-help" className="sr-only">
                Ajoutez au moins un nœud au workflow pour pouvoir l'exécuter
              </div>
            )}
            {isExecuting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exécution...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Exécuter</span>
              </>
            )}
          </button>

          {/* Debug Button */}
          {onDebug && (
            <button
              onClick={onDebug}
              disabled={nodeCount === 0}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                nodeCount === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-md hover:shadow-lg'
              }`}
              title="Open step debugger"
            >
              <Bug size={16} />
              <span className="hidden sm:inline">Debug</span>
            </button>
          )}

          {/* Séparateur */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Boutons d'action */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onSave}
              disabled={isExecuting}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isExecuting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
              }`}
            >
              <Save size={16} />
              <span className="hidden sm:inline">Sauvegarder</span>
            </button>

            <button
              onClick={onExport}
              disabled={isExecuting}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isExecuting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600 hover:scale-105'
              }`}
            >
              <Download size={16} />
              <span className="hidden sm:inline">Exporter</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExecuting}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isExecuting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:scale-105'
              }`}
            >
              <Upload size={16} />
              <span className="hidden sm:inline">Importer</span>
            </button>

            {onN8nImport && (
              <button
                onClick={onN8nImport}
                disabled={isExecuting}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isExecuting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-500 text-white hover:bg-orange-600 hover:scale-105'
                }`}
                title="Import n8n workflow"
              >
                <FileJson size={16} />
                <span className="hidden sm:inline">n8n</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Lock/Unlock Toggle Button */}
            <button
              onClick={handleToggleLock}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                isCurrentWorkflowLocked
                  ? 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-105'
                  : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:scale-105'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:scale-105'
              }`}
              title={isCurrentWorkflowLocked ? 'Unlock workflow (allow modifications)' : 'Lock workflow (prevent modifications)'}
            >
              {isCurrentWorkflowLocked ? <Lock size={16} /> : <Unlock size={16} />}
              <span className="hidden sm:inline">{isCurrentWorkflowLocked ? 'Verrouillé' : 'Verrouiller'}</span>
            </button>
          </div>

          {/* Séparateur */}
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

          {/* Sélecteur d'environnement */}
          <div className="relative">
            <button
              onClick={() => setShowEnvironmentDropdown(!showEnvironmentDropdown)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentEnv?.color
              } text-white hover:opacity-90`}
            >
              {currentEnv && <currentEnv.icon size={16} />}
              <span className="hidden sm:inline">{currentEnv?.name}</span>
              <ChevronDown size={14} className={`transition-transform ${
                showEnvironmentDropdown ? 'rotate-180' : ''
              }`} />
            </button>

            {showEnvironmentDropdown && (
              <div className={`absolute right-0 mt-2 w-48 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg shadow-xl z-50`}>
                {environments.map((env) => (
                  <button
                    key={env.id}
                    onClick={() => handleEnvironmentChange(env.id)}
                    className={`w-full flex items-center space-x-2 px-4 py-2 text-left transition-colors ${
                      env.id === currentEnvironment
                        ? darkMode
                          ? 'bg-gray-700 text-white'
                          : 'bg-gray-100 text-gray-900'
                        : darkMode
                          ? 'text-gray-300 hover:bg-gray-700'
                          : 'text-gray-700 hover:bg-gray-50'
                    } first:rounded-t-lg last:rounded-b-lg`}
                  >
                    <div className={`w-3 h-3 rounded-full ${env.color}`}></div>
                    <env.icon size={16} />
                    <span>{env.name}</span>
                    {env.id === currentEnvironment && (
                      <Check size={14} className="ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Options de vue */}
          <div className="relative">
            <button
              onClick={() => setShowViewOptions(!showViewOptions)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Layout size={20} />
            </button>

            {showViewOptions && (
              <div className={`absolute right-0 mt-2 w-64 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg shadow-xl z-50 p-4`}>
                <h3 className="text-sm font-semibold mb-3">Options de vue</h3>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Mode de vue</label>
                    <div className="flex space-x-2">
                      {[
                        { id: 'compact', label: 'Compact', icon: Minimize2 },
                        { id: 'normal', label: 'Normal', icon: Square },
                        { id: 'detailed', label: 'Détaillé', icon: Maximize2 },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => onViewModeChange(mode.id as 'normal' | 'compact' | 'detailed')}
                          className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                            viewMode === mode.id
                              ? 'bg-primary-500 text-white'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <mode.icon size={12} />
                          <span>{mode.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Style de connexion</label>
                    <div className="flex space-x-2">
                      {[
                        { id: 'bezier', label: 'Courbe' },
                        { id: 'straight', label: 'Droite' },
                        { id: 'smoothstep', label: 'Étapes' },
                      ].map((style) => (
                        <button
                          key={style.id}
                          onClick={() => onConnectionStyleChange(style.id as 'bezier' | 'straight' | 'smoothstep')}
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            connectionStyle === style.id
                              ? 'bg-primary-500 text-white'
                              : darkMode
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(e) => onSnapToGridChange(e.target.checked)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm">Aligner sur la grille</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showGrid}
                        onChange={(e) => onShowGridChange(e.target.checked)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm">Afficher la grille</span>
                    </label>

                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showMiniMap}
                        onChange={(e) => onShowMiniMapChange(e.target.checked)}
                        className="rounded text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-sm">Afficher la mini-carte</span>
                    </label>
                  </div>

                  <div className="border-t pt-2">
                    <button
                      onClick={handleApplyAutoLayout}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Layout size={16} />
                      <span>Disposition automatique</span>
                    </button>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="text-sm font-medium mb-2">Contrôles de zoom</div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Accès au zoom via une méthode plus directe
                          if (zoomOutBtn.current) {
                            zoomOutBtn.current.click();
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                      >
                        <ZoomOut size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (zoomInBtn.current) {
                            zoomInBtn.current.click();
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                      >
                        <ZoomIn size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (fitViewBtn.current) {
                            fitViewBtn.current.click();
                          }
                        }}
                        className="flex-1 px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
                      >
                        <Maximize size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paramètres */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Settings size={20} />
            </button>

            {showSettings && (
              <div className={`absolute right-0 mt-2 w-48 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border rounded-lg shadow-xl z-50`}>
                <button
                  onClick={handleToggleDarkMode}
                  className={`w-full flex items-center space-x-2 px-4 py-2 text-left transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } first:rounded-t-lg`}
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                  <span>{darkMode ? 'Mode clair' : 'Mode sombre'}</span>
                </button>

                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                <button
                  className={`w-full flex items-center space-x-2 px-4 py-2 text-left transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Keyboard size={16} />
                  <span>Raccourcis clavier</span>
                </button>

                <button
                  className={`w-full flex items-center space-x-2 px-4 py-2 text-left transition-colors ${
                    darkMode
                      ? 'text-gray-300 hover:bg-gray-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  } last:rounded-b-lg`}
                >
                  <HelpCircle size={16} />
                  <span>Aide</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay pour fermer les dropdowns */}
      {(showSettings || showEnvironmentDropdown || showViewOptions) && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleCloseDropdowns}
        />
      )}
    </header>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for React.memo to prevent unnecessary re-renders
  return (
    prevProps.isExecuting === nextProps.isExecuting &&
    prevProps.currentEnvironment === nextProps.currentEnvironment &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.snapToGrid === nextProps.snapToGrid &&
    prevProps.showMiniMap === nextProps.showMiniMap &&
    prevProps.showGrid === nextProps.showGrid &&
    prevProps.connectionStyle === nextProps.connectionStyle &&
    prevProps.autoLayout === nextProps.autoLayout
  );
});

ModernHeader.displayName = 'ModernHeader';

export default ModernHeader;