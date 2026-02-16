import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight, BarChart3, Camera, CheckCircle, Clock, Code,
  Download, Edit, FolderGit, GitBranch, GitCommit, GitPullRequest,
  MessageSquare, Minus, MoreHorizontal, Plus, Settings, Shield,
  Tag, Trash2, Users, X, XCircle
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import { 
  versionControlService, 
  WorkflowRepository, 
  WorkflowCommit, 
  WorkflowBranch,
  PullRequest,
  WorkflowSnapshot,
  RepositoryStatistics
} from '../../services/VersionControlService';

interface VersionControlHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionControlHub({ isOpen, onClose }: VersionControlHubProps) {
  const { darkMode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'repositories' | 'commits' | 'branches' | 'pull_requests' | 'snapshots' | 'analytics'>('repositories');
  const [repositories, setRepositories] = useState<WorkflowRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<WorkflowRepository | null>(null);
  const [commits, setCommits] = useState<WorkflowCommit[]>([]);
  const [branches, setBranches] = useState<WorkflowBranch[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [snapshots, setSnapshots] = useState<WorkflowSnapshot[]>([]);
  const [statistics, setStatistics] = useState<RepositoryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_showCreateRepo, setShowCreateRepo] = useState(false);  
  const [showCommitDiff, setShowCommitDiff] = useState<WorkflowCommit | null>(null);

  const loadRepositories = useCallback(async () => {
    setIsLoading(true);
    try {
      const repos = await versionControlService.getRepositories();
      setRepositories(repos);
      if (repos.length > 0 && !selectedRepo) {
        setSelectedRepo(repos[0]);
      }
    } catch (error) {
      logger.error('Failed to load repositories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepo]); // loadRepositories depends on selectedRepo

  const loadRepositoryData = useCallback(async () => {
    if (!selectedRepo) return;

    setIsLoading(true);
    try {
      const [commitsData, branchesData, pullRequestsData, statisticsData] = await Promise.all([
        versionControlService.getCommits(selectedRepo.id, undefined, 50),
        versionControlService.getBranches(selectedRepo.id),
        versionControlService.getPullRequests(selectedRepo.id),
        versionControlService.getRepositoryStatistics(selectedRepo.id)
      ]);

      setCommits(commitsData);
      setBranches(branchesData);
      setPullRequests(pullRequestsData);
      setStatistics(statisticsData || null);

      // Load snapshots for a sample workflow
      if (activeTab === 'snapshots') {
        const snapshotsData = await versionControlService.getSnapshots(selectedRepo.id);
        setSnapshots(snapshotsData);
      }
    } catch (error) {
      logger.error('Failed to load repository data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedRepo, activeTab]); // loadRepositoryData depends on selectedRepo and activeTab

  useEffect(() => {
    if (isOpen) {
      loadRepositories();
    }
  }, [isOpen, loadRepositories]);

  useEffect(() => {
    if (selectedRepo) {
      loadRepositoryData();
    }
  }, [selectedRepo, activeTab, loadRepositoryData]);

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 30) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getCommitTypeIcon = (message: string): string => {
    if (message.toLowerCase().includes('fix')) return '🐛';
    if (message.toLowerCase().includes('feat') || message.toLowerCase().includes('add')) return '✨';
    if (message.toLowerCase().includes('update') || message.toLowerCase().includes('improve')) return '⚡';
    if (message.toLowerCase().includes('docs')) return '📚';
    if (message.toLowerCase().includes('test')) return '🧪';
    if (message.toLowerCase().includes('refactor')) return '♻️';
    return '📝';
  };

  const getPullRequestStatusColor = (status: string): string => {
    switch (status) {
      case 'open': return 'text-green-500 bg-green-100';
      case 'merged': return 'text-purple-500 bg-purple-100';
      case 'closed': return 'text-red-500 bg-red-100';
      case 'draft': return 'text-gray-500 bg-gray-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const RepositoriesTab = () => (
    <div className="space-y-6">
      {/* Repository Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map(repo => (
          <div 
            key={repo.id}
            className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
              darkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'
            } ${selectedRepo?.id === repo.id ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setSelectedRepo(repo)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <GitBranch className="text-blue-500" size={24} />
                <div>
                  <h3 className="font-semibold">{repo.name}</h3>
                  <p className="text-sm text-gray-500">{repo.owner}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                repo.visibility === 'public' ? 'bg-green-100 text-green-800' :
                repo.visibility === 'private' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {repo.visibility}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{repo.description}</p>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Default Branch</span>
                <span className="font-medium">{repo.defaultBranch}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Branches</span>
                <span className="font-medium">{repo.branches.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Commits</span>
                <span className="font-medium">{repo.statistics.totalCommits}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last Updated</span>
                <span className="font-medium">{formatTimeAgo(repo.updatedAt)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                Open
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Settings size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Create Repository Card */}
        <div 
          className={`p-6 rounded-lg border-2 border-dashed cursor-pointer transition-all hover:border-blue-400 ${
            darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
          }`}
          onClick={() => setShowCreateRepo(true)}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <Plus className="text-gray-400 mb-3" size={32} />
            <h3 className="font-medium text-gray-600 dark:text-gray-400 mb-2">Create Repository</h3>
            <p className="text-sm text-gray-500 text-center">Start version controlling your workflows</p>
          </div>
        </div>
      </div>
    </div>
  );

  const CommitsTab = () => (
    <div className="space-y-4">
      {commits.map(commit => (
        <div 
          key={commit.hash}
          className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="text-2xl">{getCommitTypeIcon(commit.message)}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">{commit.message}</h4>
                  <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full font-mono">
                    {commit.hash.substring(0, 7)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{commit.author.name}</span>
                  <span>{formatTimeAgo(commit.timestamp)}</span>
                  <span>Branch: {commit.branch}</span>
                  {commit.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Tag size={12} />
                      <span>{commit.tags.join(', ')}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                  <span className="text-green-500">+{commit.diff.totalAdditions}</span>
                  <span className="text-red-500">-{commit.diff.totalDeletions}</span>
                  <span>{commit.diff.totalFiles} file(s) changed</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowCommitDiff(commit)}
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                <Code size={16} />
              </button>
              <button className="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const BranchesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Branches ({branches.length})</h3>
        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          New Branch
        </button>
      </div>

      {branches.map(branch => (
        <div 
          key={branch.name}
          className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GitBranch className="text-blue-500" size={20} />
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-medium">{branch.name}</h4>
                  {branch.name === selectedRepo?.defaultBranch && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                      default
                    </span>
                  )}
                  {branch.protected && (
                    <Shield className="text-green-500" size={14} />
                  )}
                </div>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span>Last commit: {formatTimeAgo(branch.lastCommit.timestamp)}</span>
                  <span>{branch.lastCommit.author.name}</span>
                  {branch.ahead > 0 && (
                    <span className="text-green-500">+{branch.ahead} ahead</span>
                  )}
                  {branch.behind > 0 && (
                    <span className="text-red-500">-{branch.behind} behind</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {branch.pullRequest && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPullRequestStatusColor(branch.pullRequest.status)}`}>
                  PR #{branch.pullRequest.number}
                </span>
              )}
              <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                Compare
              </button>
              {branch.name !== selectedRepo?.defaultBranch && (
                <button className="p-2 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const PullRequestsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Pull Requests</h3>
          <div className="flex items-center space-x-2 text-sm">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
              {pullRequests.filter(pr => pr.status === 'open').length} Open
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
              {pullRequests.filter(pr => pr.status === 'merged').length} Merged
            </span>
            <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
              {pullRequests.filter(pr => pr.status === 'closed').length} Closed
            </span>
          </div>
        </div>
        <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          New Pull Request
        </button>
      </div>

      {pullRequests.map(pr => (
        <div 
          key={pr.id}
          className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="font-semibold text-lg">{pr.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPullRequestStatusColor(pr.status)}`}>
                  {pr.status}
                </span>
                <span className="text-sm text-gray-500">#{pr.number}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-3">{pr.description}</p>
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  <span>{pr.author.name}</span>
                </div>
                <span>opened {formatTimeAgo(pr.createdAt)}</span>
                <div className="flex items-center space-x-1">
                  <GitCommit size={14} />
                  <span>{pr.commits.length} commits</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare size={14} />
                  <span>{pr.reviews.length} reviews</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {pr.status === 'open' && pr.conflicts.length === 0 && (
                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                  Merge
                </button>
              )}
              {pr.conflicts.length > 0 && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                  Conflicts
                </span>
              )}
              <button className="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <GitBranch size={16} />
                <span className="font-mono text-sm">{pr.sourceBranch}</span>
                <ArrowRight size={14} />
                <span className="font-mono text-sm">{pr.targetBranch}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              {pr.checks.length > 0 && (
                <div className="flex items-center space-x-1">
                  {pr.checks.every(check => check.status === 'success') ? (
                    <CheckCircle className="text-green-500" size={16} />
                  ) : (
                    <XCircle className="text-red-500" size={16} />
                  )}
                  <span>{pr.checks.filter(c => c.status === 'success').length}/{pr.checks.length} checks</span>
                </div>
              )}
              {pr.reviews.length > 0 && (
                <div className="flex items-center space-x-1">
                  {pr.reviews.some(r => r.state === 'approved') ? (
                    <CheckCircle className="text-green-500" size={16} />
                  ) : (
                    <Clock className="text-yellow-500" size={16} />
                  )}
                  <span>Reviews</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const SnapshotsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Workflow Snapshots</h3>
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Create Snapshot
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snapshots.map(snapshot => (
          <div 
            key={snapshot.id}
            className={`p-4 rounded-lg border ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Camera className="text-blue-500" size={20} />
                <h4 className="font-medium">{snapshot.name}</h4>
              </div>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                {snapshot.metadata.version}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{snapshot.description}</p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Branch:</span>
                <span className="font-mono">{snapshot.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Size:</span>
                <span>{(snapshot.size / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created:</span>
                <span>{formatTimeAgo(snapshot.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Author:</span>
                <span>{snapshot.author.name}</span>
              </div>
            </div>

            {snapshot.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {snapshot.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center space-x-2">
              <button className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                Restore
              </button>
              <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                <Download size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const AnalyticsTab = () => {
    if (!statistics) return <div>Loading statistics...</div>;

    return (
      <div className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Commits</p>
                <p className="text-2xl font-bold">{statistics.totalCommits}</p>
              </div>
              <GitCommit size={32} className="text-blue-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Contributors</p>
                <p className="text-2xl font-bold">{statistics.totalContributors}</p>
              </div>
              <Users size={32} className="text-green-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Pull Requests</p>
                <p className="text-2xl font-bold">{statistics.totalPullRequests}</p>
                <p className="text-sm text-green-500">{statistics.openPullRequests} open</p>
              </div>
              <GitPullRequest size={32} className="text-purple-500" />
            </div>
          </div>

          <div className={`p-6 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Branches</p>
                <p className="text-2xl font-bold">{statistics.totalBranches}</p>
              </div>
              <GitBranch size={32} className="text-orange-500" />
            </div>
          </div>
        </div>

        {/* Code Frequency Chart */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className="font-semibold mb-4">Code Frequency</h4>
          <div className="h-64 flex items-end justify-center space-x-2">
            {statistics.codeFrequency.slice(-12).map((freq, index) => {
              const maxAdditions = Math.max(...statistics.codeFrequency.map(f => f.additions));
              const heightPercentage = (freq.additions / maxAdditions) * 100;

              return (
                <div key={index} className="flex flex-col items-center">
                  <div className="flex flex-col items-center space-y-1">
                    <div 
                      className="bg-green-500 rounded-t w-6"
                      style={{ height: `${heightPercentage}%`, minHeight: '4px' }}
                      title={`+${freq.additions} additions`}
                    />
                    <div 
                      className="bg-red-500 rounded-b w-6"
                      style={{ height: `${freq.deletions > 0 ? (freq.deletions / maxAdditions) * 100 : 0}%`, minHeight: '2px' }}
                      title={`-${freq.deletions} deletions`}
                    />
                  </div>
                  <span className="text-xs text-gray-500 mt-2 transform -rotate-45">
                    {freq.week.toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Languages */}
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h4 className="font-semibold mb-4">Languages</h4>
          <div className="space-y-3">
            {statistics.languages.map(lang => (
              <div key={lang.language} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                  <span className="font-medium">{lang.language}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${lang.percentage}%`,
                        backgroundColor: lang.color
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {lang.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-7xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <GitBranch className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Version Control Hub</h2>
                <p className="text-sm text-gray-500">Manage workflow repositories, commits, and collaboration</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {selectedRepo && (
                <div className="text-right">
                  <p className="font-medium">{selectedRepo.name}</p>
                  <p className="text-sm text-gray-500">{selectedRepo.owner}</p>
                </div>
              )}
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'repositories', label: 'Repositories', icon: FolderGit },
            { id: 'commits', label: 'Commits', icon: GitCommit },
            { id: 'branches', label: 'Branches', icon: GitBranch },
            { id: 'pull_requests', label: 'Pull Requests', icon: GitPullRequest },
            { id: 'snapshots', label: 'Snapshots', icon: Camera },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'repositories' | 'commits' | 'branches' | 'pull_requests' | 'snapshots' | 'analytics')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400'
                    : 'bg-gray-50 text-purple-600 border-b-2 border-purple-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'repositories' && <RepositoriesTab />}
              {activeTab === 'commits' && selectedRepo && <CommitsTab />}
              {activeTab === 'branches' && selectedRepo && <BranchesTab />}
              {activeTab === 'pull_requests' && selectedRepo && <PullRequestsTab />}
              {activeTab === 'snapshots' && <SnapshotsTab />}
              {activeTab === 'analytics' && selectedRepo && <AnalyticsTab />}
            </>
          )}
        </div>
      </div>

      {/* Commit Diff Modal */}
      {showCommitDiff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-4xl max-h-[80vh] ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          } rounded-xl shadow-2xl overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${
              darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Commit Details</h3>
                  <p className="text-sm text-gray-500 font-mono">{showCommitDiff.hash}</p>
                </div>
                <button
                  onClick={() => setShowCommitDiff(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 120px)' }}>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Commit Message</h4>
                  <p className="text-gray-700 dark:text-gray-300">{showCommitDiff.message}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Author:</span>
                    <span className="ml-2 font-medium">{showCommitDiff.author.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <span className="ml-2 font-medium">{showCommitDiff.timestamp.toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">File Changes</h4>
                  <div className="space-y-2">
                    {showCommitDiff.changes.map((change, index) => (
                      <div key={index} className={`p-3 rounded-lg ${
                        darkMode ? 'bg-gray-800' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {change.type === 'added' && <Plus className="text-green-500" size={16} />}
                            {change.type === 'modified' && <Edit className="text-blue-500" size={16} />}
                            {change.type === 'deleted' && <Minus className="text-red-500" size={16} />}
                            <span className="font-mono text-sm">{change.path}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-green-500">+{change.additions}</span>
                            <span className="text-red-500">-{change.deletions}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}