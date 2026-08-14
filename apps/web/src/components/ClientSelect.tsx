import React, { useState, useRef, useEffect } from 'react';
import { useClients, Client } from '../hooks/useClients';
import { getClientDisplayName } from '@printerp/shared';
import { Search, Instagram, MapPin, Phone, Send, User, Check, ChevronsUpDown, X } from 'lucide-react';

interface ClientSelectProps {
  value: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  required?: boolean;
}

export const ClientSelect: React.FC<ClientSelectProps> = ({
  value,
  onChange,
  placeholder = 'Поиск по @instagram, имени, городу или телефону...',
  required = false,
}) => {
  const { data: clients = [] } = useClients();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === value);

  // Sync display text when value or clients load
  useEffect(() => {
    if (selectedClient && !isOpen) {
      setSearchQuery(getClientDisplayName(selectedClient));
    } else if (!value && !isOpen) {
      setSearchQuery('');
    }
  }, [value, selectedClient, isOpen]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedClient) {
          setSearchQuery(getClientDisplayName(selectedClient));
        } else {
          setSearchQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedClient]);

  // Filter clients based on search query
  const filteredClients = clients.filter((client) => {
    if (!searchQuery || (selectedClient && searchQuery === getClientDisplayName(selectedClient))) {
      return true;
    }
    const q = searchQuery.toLowerCase().trim().replace(/^@/, '');
    const insta = (client.instagramUsername || '').toLowerCase().replace(/^@/, '');
    const tg = (client.telegramUsername || '').toLowerCase().replace(/^@/, '');
    const name = (client.name || '').toLowerCase();
    const phone = (client.phone || '').toLowerCase();
    const city = (client.city || '').toLowerCase();

    return (
      insta.includes(q) ||
      name.includes(q) ||
      tg.includes(q) ||
      phone.includes(q) ||
      city.includes(q)
    );
  });

  const handleSelectClient = (client: Client) => {
    onChange(client.id);
    setSearchQuery(getClientDisplayName(client));
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          required
        />
      )}

      {/* Main Searchable Input */}
      <div
        onClick={() => {
          setIsOpen(true);
          if (inputRef.current) inputRef.current.focus();
        }}
        className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-xs flex items-center gap-2 cursor-pointer transition ${
          isOpen
            ? 'border-emerald-500 ring-1 ring-emerald-500/20'
            : value
            ? 'border-slate-700 bg-slate-950/90'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
            title="Очистить выбор"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
      </div>

      {/* Dropdown Suggestions List */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-64 flex flex-col backdrop-blur-md">
          <div className="overflow-y-auto divide-y divide-slate-800/60 p-1 space-y-0.5">
            {filteredClients.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs text-slate-400">
                <p className="font-medium">Клиент не найден</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Попробуйте изменить запрос: &laquo;{searchQuery}&raquo;
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.id === value;
                const instagramHandle = client.instagramUsername
                  ? (client.instagramUsername.startsWith('@')
                      ? client.instagramUsername
                      : `@${client.instagramUsername}`)
                  : null;

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 text-white'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="space-y-0.5 flex-1 min-w-0">
                      {/* Top: Instagram handle & City Badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {instagramHandle ? (
                          <span className="font-bold text-xs text-pink-400 flex items-center gap-1 truncate">
                            <Instagram className="w-3 h-3 text-pink-400 shrink-0" />
                            {instagramHandle}
                          </span>
                        ) : (
                          <span className="font-bold text-xs text-white flex items-center gap-1 truncate">
                            <User className="w-3 h-3 text-blue-400 shrink-0" />
                            {client.name || 'Клиент'}
                          </span>
                        )}

                        {client.city && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md">
                            <MapPin className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            {client.city}
                          </span>
                        )}
                      </div>

                      {/* Bottom Subtitle: Real name, phone, or telegram */}
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 truncate">
                        {instagramHandle && client.name && (
                          <span className="text-slate-300 truncate">{client.name}</span>
                        )}
                        {client.telegramUsername && (
                          <span className="text-sky-400 flex items-center gap-0.5">
                            <Send className="w-2.5 h-2.5" />
                            @{client.telegramUsername.replace(/^@/, '')}
                          </span>
                        )}
                        {client.phone && (
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
