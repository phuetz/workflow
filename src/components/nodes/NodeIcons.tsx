import React from 'react';
import {
  AlertTriangle, Archive, ArrowUpDown, BarChart, BarChart3, BookOpen,
  Bot, Box, Brain, Bug, Calculator, Calendar,
  Camera, Check, CheckCircle, CheckSquare, Circle, Clock,
  Cloud, Coins, Columns, CreditCard, Database, DollarSign,
  Facebook, FileSpreadsheet, FileText, Filter, GitBranch, Github,
  Globe, HardDrive, Headphones, HelpCircle, Hexagon, LayoutGrid,
  Linkedin, List, Mail, Map, Merge, MessageCircle,
  MessageSquare, Package, Phone, Play, RotateCcw, Rss,
  Search, Send, Server, Share2, ShoppingBag, ShoppingCart,
  Shuffle, Smile, Sparkles, Table, Target, Timer,
  TrendingUp, Twitter, Users, Wallet, X, Youtube,
  Zap
} from 'lucide-react';

/**
 * Node icon configuration
 * Extracted from CustomNode to improve maintainability
 */

interface IconWrapperProps {
  color: string;
  children: React.ReactNode;
}

const IconWrapper: React.FC<IconWrapperProps> = ({ color, children }) => (
  <div className={`w-4 h-4 ${color} rounded-sm flex items-center justify-center`}>
    {children}
  </div>
);

/**
 * Get icon for a specific node type
 */
export const getNodeIcon = (nodeType: string): JSX.Element => {
  switch (nodeType) {
    // ===== TRIGGERS =====
    case 'trigger':
    case 'manualTrigger':
      return (
        <IconWrapper color="bg-green-500">
          <Play size={10} className="text-white ml-0.5" />
        </IconWrapper>
      );

    case 'schedule':
      return (
        <IconWrapper color="bg-green-500">
          <Clock size={10} className="text-white" />
        </IconWrapper>
      );

    case 'webhook':
      return (
        <IconWrapper color="bg-green-500">
          <Zap size={10} className="text-white" />
        </IconWrapper>
      );

    case 'rssFeed':
      return (
        <IconWrapper color="bg-orange-500">
          <Rss size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== COMMUNICATION =====
    case 'email':
    case 'gmail':
      return (
        <div className="w-4 h-4 bg-red-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">
          @
        </div>
      );

    case 'slack':
      return (
        <IconWrapper color="bg-purple-500">
          <MessageSquare size={10} className="text-white" />
        </IconWrapper>
      );

    case 'discord':
      return (
        <IconWrapper color="bg-indigo-500">
          <MessageCircle size={10} className="text-white" />
        </IconWrapper>
      );

    case 'telegram':
      return (
        <IconWrapper color="bg-blue-400">
          <Send size={10} className="text-white" />
        </IconWrapper>
      );

    case 'teams':
      return (
        <IconWrapper color="bg-blue-700">
          <Users size={10} className="text-white" />
        </IconWrapper>
      );

    case 'twilio':
      return (
        <IconWrapper color="bg-red-700">
          <Phone size={10} className="text-white" />
        </IconWrapper>
      );

    case 'whatsapp':
      return (
        <IconWrapper color="bg-green-600">
          <MessageCircle size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== DATABASES =====
    case 'mysql':
      return (
        <IconWrapper color="bg-blue-600">
          <Database size={10} className="text-white" />
        </IconWrapper>
      );

    case 'postgres':
      return (
        <IconWrapper color="bg-blue-800">
          <Database size={10} className="text-white" />
        </IconWrapper>
      );

    case 'mongodb':
      return (
        <IconWrapper color="bg-green-600">
          <Database size={10} className="text-white" />
        </IconWrapper>
      );

    case 'redis':
      return (
        <IconWrapper color="bg-red-800">
          <Database size={10} className="text-white" />
        </IconWrapper>
      );

    case 'elasticsearch':
      return (
        <IconWrapper color="bg-yellow-600">
          <Search size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== CORE =====
    case 'httpRequest':
      return (
        <IconWrapper color="bg-purple-500">
          <Globe size={10} className="text-white" />
        </IconWrapper>
      );

    case 'code':
      return (
        <div className="w-4 h-4 bg-orange-500 rounded-sm flex items-center justify-center text-white font-bold text-xs">
          {'</>'}
        </div>
      );

    case 'python':
      return (
        <IconWrapper color="bg-yellow-500">
          <FileText size={10} className="text-white" />
        </IconWrapper>
      );

    case 'transform':
      return (
        <IconWrapper color="bg-orange-500">
          <Shuffle size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== FLOW CONTROL =====
    case 'condition':
      return (
        <IconWrapper color="bg-green-500">
          <GitBranch size={10} className="text-white" />
        </IconWrapper>
      );

    case 'merge':
      return (
        <IconWrapper color="bg-cyan-500">
          <Merge size={10} className="text-white" />
        </IconWrapper>
      );

    case 'split':
      return (
        <IconWrapper color="bg-cyan-500">
          <GitBranch size={10} className="text-white rotate-180" />
        </IconWrapper>
      );

    case 'delay':
      return (
        <IconWrapper color="bg-gray-500">
          <Timer size={10} className="text-white" />
        </IconWrapper>
      );

    case 'loop':
      return (
        <IconWrapper color="bg-orange-500">
          <RotateCcw size={10} className="text-white" />
        </IconWrapper>
      );

    case 'forEach':
      return (
        <IconWrapper color="bg-orange-500">
          <List size={10} className="text-white" />
        </IconWrapper>
      );

    case 'filter':
      return (
        <IconWrapper color="bg-purple-500">
          <Filter size={10} className="text-white" />
        </IconWrapper>
      );

    case 'sort':
      return (
        <IconWrapper color="bg-indigo-500">
          <ArrowUpDown size={10} className="text-white" />
        </IconWrapper>
      );

    case 'etl':
      return (
        <IconWrapper color="bg-orange-700">
          <Database size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== AI =====
    case 'openai':
      return (
        <IconWrapper color="bg-gray-700">
          <Bot size={10} className="text-white" />
        </IconWrapper>
      );

    case 'anthropic':
      return (
        <IconWrapper color="bg-amber-600">
          <Brain size={10} className="text-white" />
        </IconWrapper>
      );

    case 'cohere':
      return (
        <IconWrapper color="bg-purple-600">
          <Sparkles size={10} className="text-white" />
        </IconWrapper>
      );

    case 'huggingface':
      return (
        <IconWrapper color="bg-yellow-500">
          <Smile size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== CLOUD =====
    case 'aws':
      return (
        <IconWrapper color="bg-orange-600">
          <Cloud size={10} className="text-white" />
        </IconWrapper>
      );

    case 's3':
      return (
        <IconWrapper color="bg-orange-700">
          <Archive size={10} className="text-white" />
        </IconWrapper>
      );

    case 'lambda':
      return (
        <IconWrapper color="bg-orange-500">
          <Zap size={10} className="text-white" />
        </IconWrapper>
      );

    case 'azure':
      return (
        <IconWrapper color="bg-blue-600">
          <Cloud size={10} className="text-white" />
        </IconWrapper>
      );

    case 'gcp':
      return (
        <IconWrapper color="bg-blue-500">
          <Cloud size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== GOOGLE SERVICES =====
    case 'googleSheets':
      return (
        <IconWrapper color="bg-green-500">
          <FileSpreadsheet size={10} className="text-white" />
        </IconWrapper>
      );

    case 'googleDrive':
      return (
        <IconWrapper color="bg-blue-500">
          <HardDrive size={10} className="text-white" />
        </IconWrapper>
      );

    case 'googleCalendar':
      return (
        <IconWrapper color="bg-blue-600">
          <Calendar size={10} className="text-white" />
        </IconWrapper>
      );

    case 'googleMaps':
      return (
        <IconWrapper color="bg-green-600">
          <Map size={10} className="text-white" />
        </IconWrapper>
      );

    case 'youtube':
      return (
        <IconWrapper color="bg-red-600">
          <Youtube size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== PRODUCTIVITY =====
    case 'notion':
      return (
        <IconWrapper color="bg-gray-600">
          <BookOpen size={10} className="text-white" />
        </IconWrapper>
      );

    case 'airtable':
      return (
        <IconWrapper color="bg-yellow-500">
          <Table size={10} className="text-white" />
        </IconWrapper>
      );

    case 'trello':
      return (
        <IconWrapper color="bg-blue-700">
          <Columns size={10} className="text-white" />
        </IconWrapper>
      );

    case 'asana':
      return (
        <IconWrapper color="bg-pink-500">
          <CheckCircle size={10} className="text-white" />
        </IconWrapper>
      );

    case 'jira':
      return (
        <IconWrapper color="bg-blue-600">
          <CheckSquare size={10} className="text-white" />
        </IconWrapper>
      );

    case 'monday':
      return (
        <IconWrapper color="bg-red-500">
          <Target size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== CRM =====
    case 'salesforce':
      return (
        <IconWrapper color="bg-blue-500">
          <Users size={10} className="text-white" />
        </IconWrapper>
      );

    case 'hubspot':
      return (
        <IconWrapper color="bg-orange-500">
          <Users size={10} className="text-white" />
        </IconWrapper>
      );

    case 'pipedrive':
      return (
        <IconWrapper color="bg-green-600">
          <TrendingUp size={10} className="text-white" />
        </IconWrapper>
      );

    case 'zendesk':
      return (
        <IconWrapper color="bg-green-700">
          <Headphones size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== ECOMMERCE =====
    case 'shopify':
      return (
        <IconWrapper color="bg-green-600">
          <ShoppingBag size={10} className="text-white" />
        </IconWrapper>
      );

    case 'woocommerce':
      return (
        <IconWrapper color="bg-purple-600">
          <ShoppingCart size={10} className="text-white" />
        </IconWrapper>
      );

    case 'stripe':
      return (
        <IconWrapper color="bg-indigo-600">
          <CreditCard size={10} className="text-white" />
        </IconWrapper>
      );

    case 'paypal':
      return (
        <IconWrapper color="bg-blue-600">
          <DollarSign size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== SOCIAL MEDIA =====
    case 'twitter':
      return (
        <IconWrapper color="bg-blue-400">
          <Twitter size={10} className="text-white" />
        </IconWrapper>
      );

    case 'facebook':
      return (
        <IconWrapper color="bg-blue-600">
          <Facebook size={10} className="text-white" />
        </IconWrapper>
      );

    case 'linkedin':
      return (
        <IconWrapper color="bg-blue-700">
          <Linkedin size={10} className="text-white" />
        </IconWrapper>
      );

    case 'instagram':
      return (
        <IconWrapper color="bg-pink-500">
          <Camera size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== ANALYTICS =====
    case 'googleAnalytics':
      return (
        <IconWrapper color="bg-orange-500">
          <BarChart size={10} className="text-white" />
        </IconWrapper>
      );

    case 'mixpanel':
      return (
        <IconWrapper color="bg-purple-600">
          <BarChart3 size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== STORAGE =====
    case 'dropbox':
      return (
        <IconWrapper color="bg-blue-600">
          <Box size={10} className="text-white" />
        </IconWrapper>
      );

    case 'onedrive':
      return (
        <IconWrapper color="bg-blue-500">
          <Cloud size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== DEV TOOLS =====
    case 'github':
      return (
        <IconWrapper color="bg-gray-800">
          <Github size={10} className="text-white" />
        </IconWrapper>
      );

    case 'gitlab':
      return (
        <IconWrapper color="bg-orange-600">
          <GitBranch size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== FINANCIAL =====
    case 'quickbooks':
      return (
        <IconWrapper color="bg-green-600">
          <Coins size={10} className="text-white" />
        </IconWrapper>
      );

    case 'xero':
      return (
        <IconWrapper color="bg-blue-500">
          <Wallet size={10} className="text-white" />
        </IconWrapper>
      );

    // ===== DEFAULT =====
    default:
      return (
        <IconWrapper color="bg-gray-500">
          <HelpCircle size={10} className="text-white" />
        </IconWrapper>
      );
  }
};
