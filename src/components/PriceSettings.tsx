import React, { useState, useMemo, useEffect } from 'react';
import { Globe, DollarSign, RefreshCw, CheckCircle2, ChevronDown, Plus, X, Search, Unlock, Trash2, RotateCcw, Utensils, Smile } from 'lucide-react';
import { CURRENCIES, CATEGORIES, INITIAL_ITEMS, CurrencyCode, Item, CategoryId, Currency, ALL_AVAILABLE_CURRENCIES } from '../store/pricingData';
import { useStore } from '../store/responseStore';

export interface RateRowProps {
  key?: React.Key;
  currency: Currency;
  onRateChange: (code: CurrencyCode, rate: number) => void;
  onRemove: (code: CurrencyCode) => void;
  onClick?: (code: CurrencyCode) => void;
  isActive?: boolean;
}

function RateRow({ currency, onRateChange, onRemove, onClick, isActive }: RateRowProps) {
  const [val, setVal] = useState(currency.rate.toString());

  const handleBlur = () => {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      onRateChange(currency.code, num);
      setVal(num.toString());
    } else {
      setVal(currency.rate.toString());
    }
  };

  useEffect(() => {
    setVal(currency.rate.toString());
  }, [currency.rate]);

  return (
    <div 
      className={`flex items-center justify-between p-3 rounded-xl transition-colors group cursor-pointer ${isActive ? 'bg-primary/10 border border-primary/20 shadow-sm' : 'hover:bg-slate-50 border border-transparent'}`}
      onClick={() => onClick?.(currency.code)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{currency.flag}</span>
        <div>
          <div className="font-semibold text-sm text-slate-700">{currency.code}</div>
          <div className="text-xs text-slate-500">{currency.symbol}</div>
        </div>
      </div>
      
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-24">
          <input
            type="number"
            step="0.01"
            className={`w-full text-right ${isActive ? 'bg-white border-slate-200' : 'bg-transparent border-transparent group-hover:border-slate-200'} focus:bg-white hover:border-slate-300 focus:border-primary border rounded-lg py-1 px-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleBlur();
                e.currentTarget.blur();
              }
            }}
          />
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove(currency.code);
          }}
          className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
          title="Remove currency"
          aria-label="Remove currency"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CurrencySelector({ 
  onSelect,
  addedCurrencies
}: { 
  onSelect: (code: CurrencyCode) => void;
  addedCurrencies: Record<CurrencyCode, Currency>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const availableCurrencies = useMemo(() => {
    return ALL_AVAILABLE_CURRENCIES
      .filter(c => !addedCurrencies[c.code])
      .filter(c => 
        c.code.toLowerCase().includes(search.toLowerCase()) || 
        c.name.toLowerCase().includes(search.toLowerCase())
      );
  }, [search, addedCurrencies]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-4 pr-10 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-colors text-left flex items-center justify-between"
      >
        <span>Add a currency...</span>
        <Plus className="w-4 h-4 text-slate-400 absolute right-3" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              placeholder="Search currencies..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {availableCurrencies.length === 0 ? (
              <div className="p-3 text-sm text-slate-500 text-center">No currencies found</div>
            ) : (
              availableCurrencies.map(c => (
                <button
                  key={c.code}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                  onClick={() => {
                    onSelect(c.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <span className="text-base shrink-0">{c.flag}</span>
                  <span className="font-medium shrink-0">{c.code}</span>
                  <span className="text-slate-500 truncate">- {c.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      
      {/* Backdrop for closing when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default function PriceSettings() {
  const { pricingCurrencies: currencies, updatePricingCurrencies: setCurrenciesContext, pricingItems: items, updatePricingItems: setItemsContext } = useStore();
  
  const setItems = (action: React.SetStateAction<Item[]>) => {
    const nextItems = typeof action === 'function' ? action(items) : action;
    setItemsContext(nextItems);
  };
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('breakfast');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmoji, setEditEmoji] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editHunger, setEditHunger] = useState<string>('');
  const [editHappiness, setEditHappiness] = useState<string>('');
  const [editUnlockLevel, setEditUnlockLevel] = useState<string>('');
  const [exchangeRateSearch, setExchangeRateSearch] = useState('');
  
  const currency = currencies[selectedCurrency];
  const categories = Object.values(CATEGORIES);
  
  const handleRateChange = (code: CurrencyCode, rate: number) => {
    setCurrenciesContext({ ...currencies, [code]: { ...currencies[code], rate } });
  };

  const handleRemoveCurrency = (code: CurrencyCode) => {
    const next = { ...currencies };
    delete next[code];
    setCurrenciesContext(next);
    if (selectedCurrency === code) {
      setSelectedCurrency('USD');
    }
  };

  const displayedItems = useMemo(() => {
    return items.filter(item => item.categoryId === activeCategory);
  }, [items, activeCategory]);

  const handleUpdate = (itemId: string) => {
    if (editingItemId === itemId) {
      // Save changes
      const val = parseFloat(editValue);
      const hungerVal = parseInt(editHunger, 10);
      const happinessVal = parseInt(editHappiness, 10);
      const unlockLevelVal = parseInt(editUnlockLevel, 10);
      
      setItems(prevItems => prevItems.map(item => {
        if (item.id === itemId) {
          const updates: Partial<Item> = {};
          if (!isNaN(val) && val > 0) {
            updates.basePriceUSD = val / currency.rate;
          }
          if (!isNaN(hungerVal)) {
            updates.hunger = hungerVal;
          }
          if (!isNaN(happinessVal)) {
            updates.happiness = happinessVal;
          }
          if (!isNaN(unlockLevelVal) && unlockLevelVal > 0) {
            updates.unlockLevel = unlockLevelVal;
          }
          if (editName.trim()) {
            updates.name = editName.trim();
          }
          if (editEmoji.trim()) {
            updates.emoji = editEmoji.trim();
          }
          return { ...item, ...updates };
        }
        return item;
      }));
      setEditingItemId(null);
    } else {
      // Start editing
      const item = items.find(i => i.id === itemId);
      if (item) {
        const dynamicPrice = item.basePriceUSD * currency.rate;
        setEditValue(dynamicPrice.toFixed(2));
        setEditHunger(item.hunger.toString());
        setEditHappiness(item.happiness.toString());
        setEditUnlockLevel((item.unlockLevel ?? 1).toString());
        setEditName(item.name);
        setEditEmoji(item.emoji);
      }
      setEditingItemId(itemId);
    }
  };

  const handleManualPriceChange = (itemId: string, newPrice: string) => {
    const val = parseFloat(newPrice);
    if (isNaN(val) || val <= 0) return;

    setItems(prevItems => prevItems.map(item => {
      if (item.id === itemId) {
        const basePriceUSD = val / currency.rate;
        return { ...item, basePriceUSD };
      }
      return item;
    }));
  }

  const handleAddNewItem = () => {
    const newItemId = `new_item_${Date.now()}`;
    const newItem: Item = {
      id: newItemId,
      name: 'New Item',
      emoji: '✨',
      categoryId: activeCategory,
      basePriceUSD: 1.0,
      hunger: 0,
      happiness: 0,
      unlockLevel: 1,
    };
    setItems(prev => [...prev, newItem]);
    
    // Start editing right away
    setEditValue((newItem.basePriceUSD * currency.rate).toFixed(2));
    setEditHunger(newItem.hunger.toString());
    setEditHappiness(newItem.happiness.toString());
    setEditUnlockLevel(newItem.unlockLevel.toString());
    setEditName(newItem.name);
    setEditEmoji(newItem.emoji);
    setEditingItemId(newItemId);
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    if (editingItemId === itemId) {
      setEditingItemId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col text-slate-800 font-sans h-full overflow-hidden">
      <main className="flex-1 w-full flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto pr-2 pb-6 custom-scrollbar">
          {/* Header */}
          <header className="bg-white border border-slate-200 rounded-xl shadow-sm shrink-0 mb-6 flex flex-col p-6 gap-6">
            <div className="flex items-center justify-between w-full h-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-sm">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h1 className="text-lg font-bold text-slate-800 tracking-tight">Price Settings</h1>
              </div>
              
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1 sm:pb-0 hide-scrollbar shrink-0">
              <span className="text-sm font-medium text-slate-500 shrink-0">Currency:</span>
              <div className="relative shrink-0">
                  <select
                    className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none cursor-pointer transition-all"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value as CurrencyCode)}
                  >
                    {(Object.values(currencies) as Currency[]).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
                {selectedCurrency !== 'USD' && (
                  <button
                    onClick={() => setSelectedCurrency('USD')}
                    className="flex items-center justify-center shrink-0 w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary transition-colors shadow-sm"
                    title="Reset to USD"
                  >
                    <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline sm:ml-1.5">Reset to USD</span>
                  </button>
                )}
              </div>
            </div>

            {/* Analytics / Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-500" />
                  Showing prices in {currency.name} ({currency.code})
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {selectedCurrency === 'USD' 
                    ? 'Base currency selected. All prices are stored in USD.'
                    : `Exchange rate: 1 USD = ${currency.symbol}${currency.rate.toFixed(2)} ${currency.code}.`}
                </p>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-full transition-all flex items-center gap-2.5 cursor-pointer ${
                  activeCategory === category.id 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200 hover:text-slate-800'
                }`}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              ))}
            </div>
          </header>

          {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {displayedItems.map(item => {
            const displayPrice = item.basePriceUSD * currency.rate;
            const isEditing = editingItemId === item.id;

            return (
              <div 
                key={item.id} 
                className={`group relative bg-white rounded-2xl p-5 border transition-all duration-200 hover:shadow-lg border-slate-200 shadow-sm flex flex-col h-full`}
              >
              {!isEditing && (
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
                <div className={`flex items-center gap-[14px] mb-[22px] ${isEditing ? '' : 'pr-8'}`}>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        className="w-[58px] h-[58px] rounded-[16px] bg-white border border-slate-200 text-center text-[30px] shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary shrink-0 p-0"
                        value={editEmoji}
                        onChange={(e) => setEditEmoji(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                      />
                      <input
                        type="text"
                        className="font-semibold text-[#0A1A31] text-[17px] flex-1 min-w-0 bg-white border border-slate-200 rounded-[10px] py-1.5 px-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdate(item.id);
                          if (e.key === 'Escape') setEditingItemId(null);
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div className="w-[58px] h-[58px] rounded-[16px] bg-white border border-slate-100 flex items-center justify-center text-[30px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] shrink-0" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.04))' }}>
                        {item.emoji ? (
                          item.emoji
                        ) : item.color ? (
                          <div className="w-[30px] h-[30px] rounded-full shadow-inner border border-black/10" style={{ background: item.color }} />
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-[#0A1A31] text-[17px]">{item.name}</h3>
                    </>
                  )}
                </div>

                <div className="flex-1 flex flex-col">
                  {isEditing ? (
                    <div className="flex flex-col gap-3 w-full">
                       <div className="flex w-full items-center gap-3">
                         <span className="text-[#8B98B4] font-medium w-[24px] text-center text-[19px] shrink-0">{currency.symbol}</span>
                         <input
                            type="number"
                            step="0.01"
                            autoFocus
                            className="w-full bg-white border border-slate-200 rounded-[10px] py-2 px-3 text-slate-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors h-[38px] text-[15px]"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdate(item.id);
                              if (e.key === 'Escape') setEditingItemId(null);
                            }}
                         />
                       </div>
                       {item.categoryId !== 'toys' && (
                         <div className="flex w-full items-center gap-3">
                            <span className="w-6 flex items-center justify-center shrink-0"><Utensils className="w-5 h-5 text-[#B14917]" /></span>
                            <div className="relative w-full">
                                <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-[10px] py-2 pl-3 pr-8 text-slate-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors h-[38px] text-[15px]"
                                    value={editHunger}
                                    onChange={(e) => setEditHunger(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleUpdate(item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98B4] text-sm font-medium pointer-events-none">%</span>
                            </div>
                         </div>
                       )}
                       <div className="flex w-full items-center gap-3">
                          <span className="w-6 flex items-center justify-center shrink-0 w-[24px]"><Smile className="w-5 h-5 text-[#B48316]" /></span>
                          <div className="relative w-full">
                              <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-[10px] py-2 pl-3 pr-8 text-slate-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors h-[38px] text-[15px]"
                                  value={editHappiness}
                                  onChange={(e) => setEditHappiness(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdate(item.id);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98B4] text-sm font-medium pointer-events-none">%</span>
                          </div>
                        </div>
                        <div className="flex w-full items-center gap-3">
                          <span className="w-[24px] flex justify-center text-[#8B98B4] shrink-0"><Unlock className="w-[18px] h-[18px]"/></span>
                          <div className="relative w-full">
                              <input
                                  type="number"
                                  className="w-full bg-white border border-slate-200 rounded-[10px] py-2 pl-3 pr-8 text-slate-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors h-[38px] text-[15px]"
                                  value={editUnlockLevel}
                                  onChange={(e) => setEditUnlockLevel(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdate(item.id);
                                    if (e.key === 'Escape') setEditingItemId(null);
                                  }}
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B98B4] text-sm font-medium pointer-events-none">Lvl</span>
                          </div>
                        </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-[14px]">
                      <div className="flex items-baseline gap-1 mt-[-2px]">
                        <span className="text-[#8B98B4] font-medium text-sm leading-none shrink-0">{currency.symbol}</span>
                        <span className="text-lg font-bold font-[800] text-[#0A1A31] tracking-tight leading-none text-left font-sans">
                          {displayPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.categoryId !== 'toys' && (
                          <span className="flex items-center text-[#B14917] bg-[#FFEDD5] px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium leading-none">
                            <span className="mr-1.5 flex items-center h-5"><Utensils className="w-3.5 h-3.5" /></span>{item.hunger ?? 0}%
                          </span>
                        )}
                        <span className="flex items-center text-[#B48316] bg-[#FEF3C7] px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium leading-none">
                          <span className="mr-1.5 flex items-center h-5"><Smile className="w-3.5 h-3.5" /></span>{item.happiness ?? 0}%
                        </span>
                        <span className="flex items-center text-[#554DB5] bg-[#E0E7FF] px-2.5 py-1.5 rounded-[8px] text-[13px] font-medium leading-none">
                          <span className="mr-1.5 flex items-center h-5"><Unlock className="w-3.5 h-3.5" /></span> Lv {item.unlockLevel ?? 1}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 shrink-0">
                  {isEditing ? (
                    <button 
                      onClick={() => handleUpdate(item.id)}
                      className="w-full h-[42px] flex items-center justify-center rounded-[10px] bg-primary text-white hover:bg-[#238b7e] transition-all shadow-[0_2px_10px_rgba(42,157,143,0.2)] font-semibold text-[14px] tracking-wide cursor-pointer"
                      aria-label="Save properties"
                    >
                       Save Changes
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleUpdate(item.id)}
                      className="w-full h-[42px] flex items-center justify-center rounded-[10px] bg-white border border-slate-200 text-[#2C3E5D] hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-[14px] shadow-sm cursor-pointer"
                      aria-label="Edit properties"
                    >
                      Edit Item
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* Add New Item Button */}
          <div 
            onClick={handleAddNewItem}
            className="group relative bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 transition-all duration-200 hover:border-primary hover:bg-slate-100 flex flex-col items-center justify-center cursor-pointer h-full"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-primary mb-3 shadow-[0_2px_10px_rgba(0,0,0,0.06)] group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <p className="font-medium text-slate-600">Add New Item</p>
          </div>
        </div>
        </div>

        {/* Exchange Rates Sidebar */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col min-h-0 lg:h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                Exchange Rates
              </h2>
              <p className="text-slate-500 text-sm mt-1">Manage conversion rates against 1 USD.</p>
              
              <div className="mt-4 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search active currencies..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400 text-slate-700"
                  value={exchangeRateSearch}
                  onChange={(e) => setExchangeRateSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="p-2 space-y-1 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
              {(Object.values(currencies) as Currency[])
                .filter(c => c.code !== 'USD')
                .filter(c => c.code.toLowerCase().includes(exchangeRateSearch.toLowerCase()) || c.name.toLowerCase().includes(exchangeRateSearch.toLowerCase()))
                .map(c => (
                <RateRow 
                  key={c.code} 
                  currency={c} 
                  onRateChange={handleRateChange} 
                  onRemove={handleRemoveCurrency} 
                  onClick={(code) => setSelectedCurrency(code)}
                  isActive={selectedCurrency === c.code}
                />
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
              <CurrencySelector
                addedCurrencies={currencies}
                onSelect={(code) => {
                  const c = ALL_AVAILABLE_CURRENCIES.find(x => x.code === code);
                  if (c) setCurrenciesContext({ ...currencies, [c.code]: c });
                }}
              />
            </div>
          </div>
      </main>
    </div>
  );
}
