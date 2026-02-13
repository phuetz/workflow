/**
 * Protocol Monitor Component
 *
 * Real-time monitoring of protocol traffic and performance
 */

import React, { useState, useEffect, useRef } from 'react';
import { UniversalMessenger, MessagePriority, DeliveryGuarantee } from '../../protocols/UniversalMessenger';
import { ProtocolType } from '../../protocols/ProtocolHub';

interface MessageLog {
  id: string;
  timestamp: number;
  protocol: ProtocolType;
  from: string;
  to: string;
  type: string;
  priority: MessagePriority;
  guarantee: DeliveryGuarantee;
  status: 'sent' | 'delivered' | 'failed' | 'queued';
  deliveryTime?: number;
  error?: string;
}

interface QueueStats {
  total: number;
  byPriority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  byGuarantee: {
    atMostOnce: number;
    atLeastOnce: number;
    exactlyOnce: number;
  };
  pendingAcks: number;
  deliveryHistory: number;
}

interface ProtocolMonitorProps {
  messenger: UniversalMessenger;
}

const ProtocolMonitor: React.FC<ProtocolMonitorProps> = ({ messenger }) => {
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterProtocol, setFilterProtocol] = useState<ProtocolType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for messenger events
    const handleMessageSent = (event: any) => {
      addMessage({
        id: event.messageId,
        timestamp: Date.now(),
        protocol: event.protocol,
        from: 'system',
        to: event.targetAgent,
        type: 'message',
        priority: MessagePriority.NORMAL,
        guarantee: DeliveryGuarantee.AT_MOST_ONCE,
        status: 'sent',
        deliveryTime: event.deliveryTime
      });
    };

    const handleMessageQueued = (event: any) => {
      addMessage({
        id: event.messageId,
        timestamp: Date.now(),
        protocol: ProtocolType.AUTO,
        from: 'system',
        to: 'unknown',
        type: 'message',
        priority: event.priority,
        guarantee: event.guarantee,
        status: 'queued'
      });
    };

    const handleMessageDelivered = (event: any) => {
      updateMessageStatus(event.id, 'delivered');
    };

    const handleMessageFailed = (event: any) => {
      updateMessageStatus(event.id, 'failed', event.error?.message);
    };

    messenger.on('message-sent', handleMessageSent);
    messenger.on('message-queued', handleMessageQueued);
    messenger.on('message-delivered', handleMessageDelivered);
    messenger.on('message-failed', handleMessageFailed);

    // Update queue stats
    const statsInterval = setInterval(() => {
      setQueueStats(messenger.getQueueStats());
    }, 1000);

    return () => {
      messenger.off('message-sent', handleMessageSent);
      messenger.off('message-queued', handleMessageQueued);
      messenger.off('message-delivered', handleMessageDelivered);
      messenger.off('message-failed', handleMessageFailed);
      clearInterval(statsInterval);
    };
  }, [messenger]);

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  const addMessage = (message: MessageLog) => {
    setMessages(prev => [...prev, message].slice(-100)); // Keep last 100
  };

  const updateMessageStatus = (id: string, status: MessageLog['status'], error?: string) => {
    setMessages(prev => prev.map(msg =>
      msg.id === id ? { ...msg, status, error } : msg
    ));
  };

  const getStatusColor = (status: MessageLog['status']) => {
    switch (status) {
      case 'sent':
        return 'text-blue-600';
      case 'delivered':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'queued':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: MessageLog['status']) => {
    const colors = {
      sent: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      queued: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${colors[status]}`}>
        {status}
      </span>
    );
  };

  const getPriorityBadge = (priority: MessagePriority) => {
    const colors = {
      [MessagePriority.LOW]: 'bg-gray-100 text-gray-700',
      [MessagePriority.NORMAL]: 'bg-blue-100 text-blue-700',
      [MessagePriority.HIGH]: 'bg-orange-100 text-orange-700',
      [MessagePriority.URGENT]: 'bg-red-100 text-red-700'
    };

    const labels = {
      [MessagePriority.LOW]: 'Low',
      [MessagePriority.NORMAL]: 'Normal',
      [MessagePriority.HIGH]: 'High',
      [MessagePriority.URGENT]: 'Urgent'
    };

    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const filteredMessages = messages.filter(msg => {
    if (filterProtocol !== 'all' && msg.protocol !== filterProtocol) {
      return false;
    }
    if (filterStatus !== 'all' && msg.status !== filterStatus) {
      return false;
    }
    return true;
  });

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Protocol Monitor</h2>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="mb-6 grid grid-cols-5 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm text-gray-600">Total Queued</div>
            <div className="text-2xl font-bold">{queueStats.total}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600">Urgent</div>
            <div className="text-2xl font-bold text-red-600">
              {queueStats.byPriority.urgent}
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-sm text-gray-600">High</div>
            <div className="text-2xl font-bold text-orange-600">
              {queueStats.byPriority.high}
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600">Normal</div>
            <div className="text-2xl font-bold text-blue-600">
              {queueStats.byPriority.normal}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Low</div>
            <div className="text-2xl font-bold text-gray-600">
              {queueStats.byPriority.low}
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex space-x-3">
          <select
            value={filterProtocol}
            onChange={(e) => setFilterProtocol(e.target.value as any)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Protocols</option>
            {Object.values(ProtocolType).map(protocol => (
              <option key={protocol} value={protocol}>{protocol.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="queued">Queued</option>
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Auto-scroll</span>
          </label>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={clearMessages}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 font-semibold text-sm grid grid-cols-8 gap-2">
          <div>Time</div>
          <div>Protocol</div>
          <div>From</div>
          <div>To</div>
          <div>Type</div>
          <div>Priority</div>
          <div>Status</div>
          <div className="text-right">Delivery Time</div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No messages to display
            </div>
          ) : (
            filteredMessages.map(msg => (
              <div
                key={msg.id}
                onClick={() => setSelectedMessage(msg)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer grid grid-cols-8 gap-2 items-center border-b text-sm"
              >
                <div className="text-gray-600">{formatTimestamp(msg.timestamp)}</div>
                <div>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                    {msg.protocol.toUpperCase()}
                  </span>
                </div>
                <div className="truncate">{msg.from}</div>
                <div className="truncate">{msg.to}</div>
                <div className="truncate">{msg.type}</div>
                <div>{getPriorityBadge(msg.priority)}</div>
                <div>{getStatusBadge(msg.status)}</div>
                <div className="text-right text-gray-600">
                  {msg.deliveryTime ? `${msg.deliveryTime}ms` : '-'}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Details Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Message ID</div>
                  <div className="font-mono text-sm">{selectedMessage.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Timestamp</div>
                  <div>{new Date(selectedMessage.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Protocol</div>
                  <div>{selectedMessage.protocol.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Status</div>
                  <div>{getStatusBadge(selectedMessage.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">From</div>
                  <div>{selectedMessage.from}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">To</div>
                  <div>{selectedMessage.to}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Type</div>
                  <div>{selectedMessage.type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Priority</div>
                  <div>{getPriorityBadge(selectedMessage.priority)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Delivery Guarantee</div>
                  <div>{selectedMessage.guarantee}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Delivery Time</div>
                  <div>
                    {selectedMessage.deliveryTime
                      ? `${selectedMessage.deliveryTime}ms`
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              {selectedMessage.error && (
                <div>
                  <div className="text-sm text-gray-600">Error</div>
                  <div className="p-3 bg-red-50 rounded text-red-800 text-sm">
                    {selectedMessage.error}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolMonitor;
