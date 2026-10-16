import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/responseStore';
import { PetState } from '../types';
import { Trash2, Plus, Edit2, Check, RefreshCw, X, Cat, Utensils, Frown, Droplets, BatteryLow, Music, Settings2, Clock, PlayCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCat } from '../store/catStore';

const PET_STATES: PetState[] = ['Normal', 'Hungry', 'Unhappy', 'Dirty', 'Low Energy', 'Audio'];

export default function MeowDialogueManager() {
  const { meowConfig, updateMeowConfig, meowReady, meowSaveStatus, meowSaveError, retryMeowSave, reloadMeowConfig } = useStore();
  const [activeState, setActiveState] = useState<PetState>('Normal');
  
  // Edit & Add State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState('');
  
  // Preview State
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const { setBubble, setOnCatClick } = useCat();


  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      alert("Audio file is too large! Please select a file under 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const audioObj = { name: file.name, url: dataUrl };
      updateMeowConfig({ [activeState]: [JSON.stringify(audioObj)] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const currentDialogues = meowConfig[activeState] || [];

  const handleSaveEdit = () => {
    if (editingIndex !== null && editText.trim()) {
      const newLine = editText.trim();
      const updated = [...currentDialogues];
      updated[editingIndex] = newLine;
      updateMeowConfig({ [activeState]: updated });
    }
    setEditingIndex(null);
  };

  // Prevents a single Enter press from double-firing handleAddNew: pressing
  // Enter closes the input (setAddingNew(false)), which unmounts it while it
  // still has focus, causing the browser to also fire onBlur → handleAddNew again.
  const addSubmittedRef = useRef(false);

  const handleAddNew = () => {
    if (addSubmittedRef.current) return;
    addSubmittedRef.current = true;

    if (newText.trim()) {
      const updated = [...currentDialogues, newText.trim()];
      updateMeowConfig({ [activeState]: updated });
    }
    setNewText('');
    setAddingNew(false);
  };

  const handleOpenAddNew = () => {
    addSubmittedRef.current = false;
    setAddingNew(true);
  };

  const handleDelete = (index: number) => {
    const updated = currentDialogues.filter((_, i) => i !== index);
    updateMeowConfig({ [activeState]: updated });
  };

  const triggerPreview = () => {
    if (currentDialogues.length === 0 || meowConfig.timingConfigs?.[activeState]?.disabled) return;
    // We now just restart the auto-loop by incrementing a key
    setAutoTriggerKey(k => k + 1);
  };

  const [autoTriggerKey, setAutoTriggerKey] = useState(0);
  const [bgAudioKey, setBgAudioKey] = useState(0);

  // Reset UI when switching states
  useEffect(() => {
    setAddingNew(false);
    setEditingIndex(null);
  }, [activeState]);

  // Auto-preview loop
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Clear preview when starting a new cycle
    setPreviewMsg(null);

    const runCycle = () => {
      const config = meowConfig.timingConfigs?.[activeState];
      if (config?.disabled) {
        return;
      }
      
      const dialogues = meowConfig[activeState] || [];
      if (dialogues.length > 0) {
        const randomIndex = Math.floor(Math.random() * dialogues.length);
        setPreviewMsg(dialogues[randomIndex]);
        setPreviewKey(k => k + 1);
        
        const durationMins = config?.messageDurationMinutes || (5 / 60);
        const intervalMins = config?.messageIntervalMinutes || (15 / 60);
        
        // Schedule hide
        timeout = setTimeout(() => {
          setPreviewMsg(null);
          // Wait gap
          timeout = setTimeout(runCycle, intervalMins * 60 * 1000);
        }, durationMins * 60 * 1000);
      }
    };

    // Give a tiny delay before starting the first message so the component mounts/clears properly
    timeout = setTimeout(runCycle, 100);

    return () => clearTimeout(timeout);
  }, [activeState, autoTriggerKey, meowConfig[activeState], meowConfig.timingConfigs?.[activeState]]);

  // Background Audio loop (runs even in other states)
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const runAudioCycle = () => {
      const config = meowConfig.timingConfigs?.['Audio'];
      // Only run background audio if the 'Audio' state is enabled
      if (config?.disabled) {
        return;
      }

      const audioMsgs = meowConfig['Audio'] || [];
      if (audioMsgs.length > 0) {
        // Trigger a background audio play
        setBgAudioKey(k => k + 1);
        
        const intervalMins = config?.messageIntervalMinutes || (10 / 60);
        timeout = setTimeout(runAudioCycle, intervalMins * 60 * 1000);
      }
    };

    // Initial start with a random offset to prevent syncing with bubble
    timeout = setTimeout(runAudioCycle, 5000);

    return () => clearTimeout(timeout);
  }, [meowConfig['Audio'], meowConfig.timingConfigs?.['Audio'], activeState]);

  // Push bubble into global cat context
  useEffect(() => {
    const bubbleNode = (!meowConfig.timingConfigs?.[activeState]?.disabled && previewMsg) ? (
      (() => {
        // Find the meow sound URL
        const audioUrl = (() => { 
          const audioMsgs = meowConfig['Audio'];
          if (audioMsgs && audioMsgs.length > 0) {
            try { return JSON.parse(audioMsgs[0]).url; } catch { return ''; }
          }
          return '';
        })();

        return (
          <>
            {activeState !== 'Audio' && (
              <motion.div
                key={`meow-bubble-${previewKey}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="max-w-[280px] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col overflow-visible mb-4 relative pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-2 text-sm leading-relaxed text-slate-700 flex flex-col relative z-10 bg-white rounded-lg">
                  <div className="flex-1 flex items-center justify-center text-center">
                    <p className="whitespace-pre-wrap font-semibold">{previewMsg}</p>
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 w-4 h-4 bg-white transform rotate-45 -translate-x-1/2 shadow-md border-r border-b border-slate-100 z-0"></div>
              </motion.div>
            )}
          </>
        );
      })()
    ) : null;

    // Background audio node (no bubble) - handles ALL audio playback
    const bgAudioNode = (() => {
       const audioMsgs = meowConfig['Audio'];
       const config = meowConfig.timingConfigs?.['Audio'];
       if (audioMsgs && audioMsgs.length > 0 && !config?.disabled) {
         try { 
           const url = JSON.parse(audioMsgs[0]).url;
           return <audio key={`bg-audio-${bgAudioKey}`} src={url} autoPlay className="hidden" />;
         } catch { return null; }
       }
       return null;
    })();

    setBubble(
      <>
        {bubbleNode}
        {bgAudioNode}
      </>
    );

    return () => {
      setBubble(null);
    };
  }, [previewMsg, previewKey, activeState, meowConfig, bgAudioKey]);


  const getTabIcon = (state: PetState) => {
    switch(state) {
      case 'Normal': return <Cat className="w-4 h-4" />;
      case 'Hungry': return <Utensils className="w-4 h-4" />;
      case 'Unhappy': return <Frown className="w-4 h-4" />;
      case 'Dirty': return <Droplets className="w-4 h-4" />;
      case 'Low Energy': return <BatteryLow className="w-4 h-4" />;
      case 'Audio': return <Music className="w-4 h-4" />;
      default: return <Cat className="w-4 h-4" />;
    }
  };


  return (
    <div className="h-full overflow-hidden p-6 bg-slate-50/30 flex flex-col min-h-0">
      
      <div className="max-w-4xl mx-auto w-full mb-3 text-sm" role="status" aria-live="polite">
        {meowSaveStatus === 'saving' ? 'Saving…' : meowSaveStatus === 'loading' ? 'Loading saved dialogue…' : meowSaveStatus === 'saved' ? 'All changes saved' : meowSaveError}
        {meowSaveStatus === 'error' && <>
          {meowReady && <button className="ml-3 underline" onClick={() => void retryMeowSave()}>Retry save</button>}
          <button className="ml-3 underline" onClick={() => {
            if (window.confirm('Discard unsaved changes and reload saved dialogue?')) void reloadMeowConfig();
          }}>Discard and reload</button>
        </>}
      </div>
      {/* Editor Panel */}
      <div inert={!meowReady} className="max-w-4xl mx-auto w-full flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Header & Tabs */}
        <div className="bg-white border-b border-slate-100 shrink-0 z-20 shadow-sm relative">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <PlayCircle className="w-5 h-5" />
                </div>
                Dialogue & Actions
              </h2>
            </div>
          </div>
          
          <div className="flex px-6 gap-3 overflow-x-auto pb-5 custom-scrollbar">
            {PET_STATES.map((state) => (
              <button
                key={state}
                onClick={() => setActiveState(state)}
                className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-full transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeState === state 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 hover:text-slate-800'
                }`}
              >
                {getTabIcon(state)}
                {state}
              </button>
            ))}
          </div>
        </div>

        {/* Lines List & Config */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col custom-scrollbar">
          
          <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10 shrink-0">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Timing Configuration
            </h3>
            
            <div className="flex flex-wrap items-end gap-6">
              {activeState !== 'Audio' && (
                <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                  <label className="text-xs font-bold text-slate-600">Message Duration (minutes)</label>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-700"
                      value={meowConfig.timingConfigs?.[activeState]?.messageDurationMinutes ?? (5 / 60)}
                      onChange={(e) => {
                        const newDur = parseFloat(e.target.value) || 0;
                        updateMeowConfig({
                          timingConfigs: {
                            ...meowConfig.timingConfigs,
                            [activeState]: {
                              messageIntervalMinutes: meowConfig.timingConfigs?.[activeState]?.messageIntervalMinutes ?? (15 / 60),
                              messageDurationMinutes: newDur
                            }
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
                <label className="text-xs font-bold text-slate-600">Time Between Messages (minutes)</label>
                <div className="relative group">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-slate-700"
                    value={meowConfig.timingConfigs?.[activeState]?.messageIntervalMinutes ?? (15 / 60)}
                    onChange={(e) => {
                      const newInt = parseFloat(e.target.value) || 0;
                      updateMeowConfig({
                        timingConfigs: {
                          ...meowConfig.timingConfigs,
                          [activeState]: {
                            messageDurationMinutes: meowConfig.timingConfigs?.[activeState]?.messageDurationMinutes ?? (5 / 60),
                            messageIntervalMinutes: newInt
                          }
                        }
                      });
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Enable State</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const currentConfig = meowConfig.timingConfigs?.[activeState];
                      const isDisabled = currentConfig?.disabled ?? false;
                      updateMeowConfig({
                        timingConfigs: {
                          ...meowConfig.timingConfigs,
                          [activeState]: {
                            ...(currentConfig || {
                              messageDurationMinutes: 5/60,
                              messageIntervalMinutes: 15/60
                            }),
                            disabled: !isDisabled
                          }
                        }
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${
                      !(meowConfig.timingConfigs?.[activeState]?.disabled) ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                         !(meowConfig.timingConfigs?.[activeState]?.disabled) ? 'translate-x-[10px]' : 'translate-x-[-10px]'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-bold ${!(meowConfig.timingConfigs?.[activeState]?.disabled) ? 'text-primary' : 'text-slate-400'}`}>
                    {!(meowConfig.timingConfigs?.[activeState]?.disabled) ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-0">
          {activeState === 'Audio' ? (
            <div className="group flex flex-col gap-4">
              {currentDialogues.length > 0 ? (
                (() => {
                  try {
                    const parsed = JSON.parse(currentDialogues[0]);
                    return (
                      <div className="flex items-center justify-between gap-3 bg-white p-2.5 border border-slate-200 rounded-xl shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100">
                            <Music className="w-5 h-5" />
                          </div>
                          <div className="truncate flex flex-col justify-center">
                            <span className="text-[15px] font-bold text-slate-800 truncate leading-tight">{parsed.name}</span>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5 leading-tight">Current Audio Track</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="cursor-pointer text-[13px] font-bold text-slate-700 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-2 shadow-sm hover:shadow">
                            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                            Change File
                            <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                          </label>
                          <button
                            onClick={() => handleDelete(0)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 bg-white transition-colors border border-slate-200 hover:border-red-200 rounded-lg shadow-sm hover:shadow cursor-pointer"
                            title="Delete Audio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  } catch {
                    return <div className="text-red-500 text-sm font-medium p-4 bg-red-50 rounded-xl">Invalid Audio Data Structure</div>;
                  }
                })()
              ) : (
                <label className="w-full py-12 flex flex-col items-center justify-center gap-4 text-sm font-medium text-slate-500 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-primary/40 transition-all cursor-pointer group bg-white">
                  <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center transition-colors shadow-sm">
                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex flex-col items-center gap-2 text-center px-4">
                    <span className="text-lg font-bold text-slate-700 group-hover:text-primary transition-colors">Upload Audio File</span>
                    <span className="text-sm text-slate-500 font-normal">MP3 or WAV standard format, up to 2MB allowed</span>
                  </div>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                </label>
              )}
            </div>
          ) : (
            currentDialogues.map((line, idx) => (
              <div
                key={`${activeState}-${idx}`}
                className="group flex flex-col relative"
              >
                {editingIndex === idx ? (
                  <div className="flex items-center gap-3 bg-white p-2 rounded-xl border-2 border-primary shadow-md z-10">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                      {idx + 1}
                    </div>
                    <input
                      type="text"
                      className="flex-1 bg-transparent px-3 py-1.5 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-300"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingIndex(null);
                      }}
                      onBlur={handleSaveEdit}
                      autoFocus
                      placeholder="Type your message..."
                    />
                    <div className="flex items-center gap-1.5 pr-1">
                      <button 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSaveEdit();
                        }}
                        className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEditingIndex(null);
                        }}
                        className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm transition-all group-hover:shadow-md group-hover:border-slate-300">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-sm font-bold text-slate-400 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors">
                      {idx + 1}
                    </div>
                    <div 
                      className="flex-1 text-[15px] font-medium text-slate-700 cursor-pointer px-3 py-1.5 -ml-1 rounded-lg border border-transparent hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      onClick={() => { setEditingIndex(idx); setEditText(line); }}
                      title="Click to edit message"
                    >
                      {line}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 bg-white cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          {activeState !== 'Audio' && (
            addingNew ? (
              <motion.div
                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 bg-white p-2 rounded-xl border-2 border-primary border-dashed shadow-md mt-4"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                <input
                  type="text"
                  placeholder="Enter new dialogue..."
                  className="flex-1 bg-transparent px-3 py-1.5 text-[15px] font-medium text-slate-900 outline-none placeholder:text-slate-300"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNew();
                    if (e.key === 'Escape') {
                      setAddingNew(false);
                      setNewText('');
                    }
                  }}
                  onBlur={handleAddNew}
                  autoFocus
                />
                <div className="flex items-center gap-1.5 pr-1">
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddNew();
                    }}
                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setAddingNew(false);
                      setNewText('');
                    }}
                    className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={handleOpenAddNew}
                className="w-full py-2 mt-4 flex items-center justify-center gap-3 text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl hover:bg-white hover:text-primary hover:border-primary/40 transition-all hover:shadow-sm cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                Add new "{activeState}" message
              </button>
            )
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
