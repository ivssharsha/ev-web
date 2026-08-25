import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { POPULAR_LOCATIONS } from '../../data/mockData';
import { 
  searchPlacesPublic, 
  reverseGeocodePublic
} from '../../services/mapService';
import type { GeocodeResult } from '../../services/mapService';
import { 
  Navigation, 
  MapPin, 
  LocateFixed, 
  ArrowRightLeft, 
  SlidersHorizontal, 
  Sparkles, 
  Route, 
  Search, 
  Loader2 
} from 'lucide-react';

export const RouteSearch: React.FC<{
  viewMode: 'split' | 'list' | 'map';
  setViewMode: (mode: 'split' | 'list' | 'map') => void;
}> = ({ viewMode, setViewMode }) => {
  const { 
    searchRoute, 
    setSearchRoute, 
    activeFilterCharger, 
    setActiveFilterCharger,
    maxPriceFilter,
    setMaxPriceFilter,
    showOnlyAvailable,
    setShowOnlyAvailable
  } = useApp();

  const [locating, setLocating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Autocomplete state for From & To
  const [fromSuggestions, setFromSuggestions] = useState<GeocodeResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<GeocodeResult[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);

  // Live Geocoding for "From" Input
  useEffect(() => {
    if (!searchRoute.from || searchRoute.from.length < 3 || !showFromDropdown) {
      setFromSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingFrom(true);
      const results = await searchPlacesPublic(searchRoute.from);
      setFromSuggestions(results);
      setLoadingFrom(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchRoute.from, showFromDropdown]);

  // Live Geocoding for "To" Input
  useEffect(() => {
    if (!searchRoute.to || searchRoute.to.length < 3 || !showToDropdown) {
      setToSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingTo(true);
      const results = await searchPlacesPublic(searchRoute.to);
      setToSuggestions(results);
      setLoadingTo(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchRoute.to, showToDropdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(e.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(e.target as Node)) {
        setShowToDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle "Use My Location" GPS with Public Reverse Geocoding API
  const handleUseMyLocation = () => {
    setLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude || 17.4485;
          const lng = position.coords.longitude || 78.3750;
          
          // Get real street address from OpenStreetMap Nominatim
          const address = await reverseGeocodePublic(lat, lng);

          setSearchRoute((prev) => ({
            ...prev,
            from: address || 'Current Location (GPS: Cyber Towers)',
            fromCoords: { lat, lng },
          }));
          setLocating(false);
        },
        async (_error) => {
          const lat = 17.4485;
          const lng = 78.3750;
          const address = await reverseGeocodePublic(lat, lng);
          setSearchRoute((prev) => ({
            ...prev,
            from: address || 'HITEC City Hub, Hyderabad',
            fromCoords: { lat, lng },
          }));
          setLocating(false);
        },
        { timeout: 6000 }
      );
    } else {
      setSearchRoute((prev) => ({
        ...prev,
        from: 'HITEC City Hub, Hyderabad',
        fromCoords: { lat: 17.4485, lng: 78.3750 },
      }));
      setLocating(false);
    }
  };

  // Select From Suggestion
  const handleSelectFrom = (item: GeocodeResult) => {
    setSearchRoute((prev) => ({
      ...prev,
      from: item.shortName,
      fromCoords: { lat: item.lat, lng: item.lng },
    }));
    setShowFromDropdown(false);
  };

  // Select To Suggestion
  const handleSelectTo = (item: GeocodeResult) => {
    setSearchRoute((prev) => ({
      ...prev,
      to: item.shortName,
      toCoords: { lat: item.lat, lng: item.lng },
    }));
    setShowToDropdown(false);
  };

  // Swap From and Destination
  const handleSwap = () => {
    setSearchRoute((prev) => ({
      from: prev.to,
      fromCoords: prev.toCoords,
      to: prev.from,
      toCoords: prev.fromCoords,
    }));
  };

  // Quick preset selected
  const handleSelectDestinationPreset = (loc: { name: string; lat: number; lng: number }) => {
    setSearchRoute((prev) => ({
      ...prev,
      to: loc.name,
      toCoords: { lat: loc.lat, lng: loc.lng },
    }));
  };

  return (
    <div className="w-full space-y-4">
      {/* Route Finder Card */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-slate-800 shadow-xl relative">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Route className="w-4 h-4" />
              <span>Live Public Map & Road Routing Integration</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Space_Grotesk']">
              Plan Your EV Journey & Find Live Stations
            </h2>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs self-start lg:self-auto">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'split' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Split View (Map + List)
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'list' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stations Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                viewMode === 'map' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Map
            </button>
          </div>
        </div>

        {/* Search Input Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          
          {/* FROM Location Input with Live Autocomplete */}
          <div className="lg:col-span-5 relative" ref={fromDropdownRef}>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30"></span>
                From (Starting Point)
              </span>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={locating}
                className="text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/20 transition-all"
              >
                <LocateFixed className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                {locating ? 'Locating...' : 'Use My GPS'}
              </button>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
              <input
                type="text"
                value={searchRoute.from}
                onFocus={() => setShowFromDropdown(true)}
                onChange={(e) => {
                  setSearchRoute((prev) => ({ ...prev, from: e.target.value }));
                  setShowFromDropdown(true);
                }}
                placeholder="Search city, area, or address (e.g. Gachibowli, Banjara Hills)"
                className="w-full pl-10 pr-9 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              {loadingFrom && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 animate-spin" />
              )}
            </div>

            {/* From Location Suggestions Dropdown */}
            {showFromDropdown && fromSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
                <div className="p-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-emerald-400" /> Public Map Suggestions
                </div>
                {fromSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectFrom(item)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 border-b border-slate-800/50 last:border-0"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">{item.shortName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-sm">{item.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <div className="lg:col-span-1 flex justify-center py-1 lg:py-0">
            <button
              type="button"
              onClick={handleSwap}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
              title="Swap From and Destination"
            >
              <ArrowRightLeft className="w-4 h-4 rotate-90 lg:rotate-0" />
            </button>
          </div>

          {/* DESTINATION Location Input with Live Autocomplete */}
          <div className="lg:col-span-6 relative" ref={toDropdownRef}>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30"></span>
              Destination (Trip End / Station)
            </label>
            <div className="relative">
              <Navigation className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                value={searchRoute.to}
                onFocus={() => setShowToDropdown(true)}
                onChange={(e) => {
                  setSearchRoute((prev) => ({ ...prev, to: e.target.value }));
                  setShowToDropdown(true);
                }}
                placeholder="Search destination, airport, mall (e.g. RGIA Airport, Madhapur)"
                className="w-full pl-10 pr-9 py-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              {loadingTo && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-spin" />
              )}
            </div>

            {/* To Location Suggestions Dropdown */}
            {showToDropdown && toSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
                <div className="p-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                  <Search className="w-3 h-3 text-cyan-400" /> Public Map Suggestions
                </div>
                {toSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectTo(item)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-slate-800/80 transition-colors flex items-start gap-2.5 border-b border-slate-800/50 last:border-0"
                  >
                    <Navigation className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white">{item.shortName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-sm">{item.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Popular Presets */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/70 flex items-center flex-wrap gap-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Quick Destinations:
          </span>
          {POPULAR_LOCATIONS.slice(0, 4).map((loc, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectDestinationPreset(loc)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-xs"
            >
              {loc.name.split(' ')[0]} {loc.name.split(' ')[1] || ''}
            </button>
          ))}

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              showFilters
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters & Voltage</span>
          </button>
        </div>

        {/* Expanded Filters Drawer */}
        {showFilters && (
          <div className="mt-3 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Charger Type Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Charger / Port Type
                </label>
                <select
                  value={activeFilterCharger}
                  onChange={(e) => setActiveFilterCharger(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">⚡ All Chargers (Any Voltage)</option>
                  <option value="150kW Ultra-Fast">🔥 150kW Ultra-Fast (800V DC)</option>
                  <option value="CCS2 Fast DC">⚡ CCS2 Fast DC (60kW / 400V)</option>
                  <option value="Type-2 AC">🔌 Type-2 AC (22kW / 240V)</option>
                  <option value="GB/T Fast DC">🔋 GB/T Fast DC</option>
                </select>
              </div>

              {/* Price Range Slider */}
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-300 mb-1.5">
                  <span>Max Price / kWh</span>
                  <span className="text-emerald-400">₹{maxPriceFilter} / unit</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Available Only Toggle */}
              <div className="flex items-center pt-4">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 focus:ring-emerald-500 accent-emerald-500"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    🟢 Show Available Only (Exclude Busy)
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
