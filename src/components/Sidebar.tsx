import React, { useState } from 'react';
import { MessageSquareText, BotMessageSquare, Settings, Database, Cat, CircleDollarSign, Shield, LogOut, ChevronDown, User } from 'lucide-react';
import { useAuth } from '../store/authStore';

interface SidebarProps {
  activeTab: 'responses' | 'simulator' | 'dialog' | 'meow' | 'pricing';
  setActiveTab: (tab: 'responses' | 'simulator' | 'dialog' | 'meow' | 'pricing') => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const { user, logout } = useAuth();
  
  const tabs = [
    { id: 'responses', label: 'Response Library', icon: Database },
    { id: 'simulator', label: 'Test Simulator', icon: BotMessageSquare },
    { id: 'dialog', label: 'Dialog Steps', icon: MessageSquareText },
    { id: 'meow', label: 'Meow Dialogue', icon: Cat },
    { id: 'pricing', label: 'Price Settings', icon: CircleDollarSign },
  ] as const;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full text-slate-900">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: 'var(--primary)' }}>
            <div className="w-4 h-4 rounded-[4px] border-[2.5px] border-white"></div>
          </div>
          <span className="font-bold text-lg tracking-tight">AIBOARD</span>
        </div>
      </div>
      
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1.5">
        
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center text-left px-3 py-3 rounded-xl transition-all duration-200 group cursor-pointer ${
                isActive 
                  ? 'bg-primary shadow-sm text-white font-medium' 
                  : 'text-slate-500 font-medium hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon 
                className={`w-[18px] h-[18px] mr-3 transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 font-medium group-hover:text-slate-600'
                }`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className="text-[15px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="bg-white border-t border-slate-200 p-3 mt-auto relative">
        <button 
          onClick={() => setShowAdminMenu(!showAdminMenu)}
          className="w-full flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors text-left cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-sm font-bold text-slate-900 truncate">{user?.user_metadata?.name || 'Admin Panel'}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email || 'admin@example.com'}</div>
            </div>
            <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${showAdminMenu ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {showAdminMenu && (
          <div className="absolute bottom-full left-0 w-full p-2">
            <button 
              onClick={() => {
                setShowAdminMenu(false);
                logout();
              }}
              className="w-full flex items-center gap-2 bg-white border border-slate-200 shadow-lg text-red-600 hover:bg-red-50 p-3 rounded-xl transition-colors text-sm font-bold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
