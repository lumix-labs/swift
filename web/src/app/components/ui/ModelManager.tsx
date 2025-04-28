import React from 'react';

import { ModalAlert } from './ModalAlert';

// Model types and their required keys
const MODEL_TYPES = [
  { name: 'Google Gemini', fields: [{ name: 'apiKey', label: 'Gemini API Key', required: true }] },
  { name: 'OpenAI', fields: [{ name: 'apiKey', label: 'OpenAI API Key', required: true }] },
  { name: 'Anthropic', fields: [{ name: 'apiKey', label: 'Anthropic API Key', required: true }] },
];

const STORAGE_KEY = 'swift';

export interface ModelConfig {
  id: string;
  name: string;
  type: string;
  apiKey: string;
}

function getStoredModels(): ModelConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed.models) ? parsed.models : [];
  } catch {
    return [];
  }
}

function setStoredModels(models: ModelConfig[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ models }));
}

export const ModelManager: React.FC = () => {
  const [models, setModels] = React.useState<ModelConfig[]>(getStoredModels());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalStep, setModalStep] = React.useState<'select'|'fields'>('select');
  const [selectedType, setSelectedType] = React.useState<string>('');
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [currentModelId, setCurrentModelId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setModels(getStoredModels());
  }, []);

  const modelLabel = 'Models';

  const handleAdd = () => {
    setModalStep('select');
    setSelectedType('');
    setFieldValues({});
    setModalOpen(true);
    setDropdownOpen(false);
  };

  const handleRemove = (item: { id: string }) => {
    const updated = models.filter(m => m.id !== item.id);
    setModels(updated);
    setStoredModels(updated);
    if (currentModelId === item.id) setCurrentModelId(updated[0]?.id || null);
  };

  const handleSelect = (item: { id: string }) => {
    setCurrentModelId(item.id);
    setDropdownOpen(false);
  };

  const handleModalSubmit = (values: Record<string, string>) => {
    if (modalStep === 'select') {
      setSelectedType(values.type);
      setModalStep('fields');
    } else {
      const id = `${selectedType}-${Date.now()}`;
      const newModel: ModelConfig = {
        id,
        name: selectedType,
        type: selectedType,
        apiKey: values.apiKey,
      };
      const updated = [...models, newModel];
      setModels(updated);
      setStoredModels(updated);
      setCurrentModelId(id);
      setModalOpen(false);
    }
  };

  const modalFields = modalStep === 'select'
    ? [{ name: 'type', label: 'Model Type', type: 'select', required: true }]
    : MODEL_TYPES.find(m => m.name === selectedType)?.fields || [];

  // Dropdown menu
  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center space-x-1 px-3 py-1.5 rounded-md bg-white text-black dark:bg-gray-100 dark:text-black font-medium hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors text-sm"
        onClick={() => setDropdownOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={dropdownOpen}
      >
        <span className="text-sm font-medium">{modelLabel}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {dropdownOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-white border border-gray-200 dark:border-gray-200 rounded-md shadow-lg z-50 flex flex-col py-2">
          {models.map(item => (
            <div key={item.id} className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group">
              <span className="flex-1 text-gray-900 dark:text-gray-100" onClick={() => handleSelect(item)}>{item.name}</span>
              <button
                className="ml-2 text-red-500 opacity-70 group-hover:opacity-100 hover:text-red-700 text-xs p-1"
                onClick={e => { e.stopPropagation(); handleRemove(item); }}
                aria-label="Remove"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            className="flex items-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 w-full font-medium"
            onClick={handleAdd}
            type="button"
          >
            + Add Model
          </button>
        </div>
      )}
      <ModalAlert
        open={modalOpen}
        title={modalStep === 'select' ? 'Add Model' : `Configure ${selectedType}`}
        fields={modalStep === 'select' ? [
          {
            name: 'type',
            label: 'Model Type',
            type: 'select',
            required: true,
            placeholder: 'Select a model',
          },
        ] : modalFields}
        onSubmit={modalStep === 'select'
          ? (values) => handleModalSubmit(values)
          : (values) => handleModalSubmit(values)}
        onCancel={() => setModalOpen(false)}
        initialValues={modalStep === 'fields' ? fieldValues : {}}
        submitLabel={modalStep === 'select' ? 'Next' : 'Save'}
      />
    </div>
  );
};
