import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, Search, ChevronDown, PlusCircle } from 'lucide-react';
import { searchCompanies, getCompanyLogoUrl, getCompanyInitials, PRESET_COMPANIES } from '../utils/companyLogoUtils';

const CompanyInput = ({ 
  value = '', 
  onChange, 
  onSelectCompany, 
  placeholder = 'Select or type company name...',
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const dropdownRef = useRef(null);

  const matches = searchCompanies(value);
  const currentLogo = value ? getCompanyLogoUrl(value) : null;
  const initials = getCompanyInitials(value);

  // Reset img error on value change
  useEffect(() => {
    setImgError(false);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (company) => {
    onChange(company.name);
    if (onSelectCompany) {
      onSelectCompany(company);
    }
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      {/* Combobox Field (Select + Text Input) */}
      <div className="relative flex items-center">
        {/* Left Badge: Logo or Initials */}
        <div className="absolute left-3 flex items-center justify-center flex-shrink-0 pointer-events-none z-10">
          {currentLogo && !imgError ? (
            <img 
              src={currentLogo} 
              alt={value}
              className="w-5 h-5 rounded-md object-contain border border-border bg-card p-0.5 shadow-sm"
              onError={() => setImgError(true)}
            />
          ) : value ? (
            <div className="w-5 h-5 rounded-md bg-primary/20 text-primary font-black text-[9px] flex items-center justify-center border border-primary/30 font-mono">
              {initials}
            </div>
          ) : (
            <Building2 size={15} className="text-muted-foreground" />
          )}
        </div>

        {/* Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-card border border-border rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
        />

        {/* Right Dropdown Toggle Chevron */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
        >
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Floating Suggestions Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 4, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 z-[120] bg-card border border-border rounded-2xl shadow-2xl p-1.5 flex flex-col gap-0.5 max-h-64 overflow-y-auto no-scrollbar mt-1"
          >
            <div className="px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground font-mono flex items-center justify-between border-b border-border/60 mb-0.5">
              <span>{value ? 'Matching Companies' : 'Popular Workspaces'}</span>
              <Search size={10} />
            </div>

            {matches.map((company) => {
              const isSelected = value.toLowerCase() === company.name.toLowerCase();
              return (
                <button
                  key={`${company.name}-${company.domain}`}
                  type="button"
                  onClick={() => handleSelect(company)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer group ${
                    isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {company.isCustom ? (
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center flex-shrink-0">
                        <PlusCircle size={14} />
                      </div>
                    ) : (
                      <img 
                        src={company.logoUrl} 
                        alt={company.name} 
                        className="w-6 h-6 rounded-lg object-contain border border-border bg-card p-0.5 flex-shrink-0 group-hover:scale-105 transition-transform"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">
                        {company.isCustom ? `Use "${company.name}"` : company.name}
                      </span>
                      <span className="text-[9px] font-mono text-muted-foreground truncate">{company.domain}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanyInput;
