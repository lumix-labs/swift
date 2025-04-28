import React from 'react';
import { CommonDropdown } from './CommonDropdown';
import { HeaderActionButton } from './HeaderActionButton';
import { DropdownItem, DropdownProps } from './interfaces';
import { ModalAlert } from './ModalAlert';

export const ModelsDropdown: React.FC<DropdownProps> = ({ 
  show, 
  setShow, 
  resolvedTheme,
  onSelect,
  selectedId 
}) => {
  const [models, setModels] = React.useState<DropdownItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Load models from localStorage on component mount
  React.useEffect(() => {
    const savedData = localStorage.getItem('swift-models');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          setModels(parsed);
        }
      } catch (e) {
        console.error('Failed to parse models from localStorage:', e);
      }
    }
  }, []);

  // Save models to localStorage when updated
  React.useEffect(() => {
    localStorage.setItem('swift-models', JSON.stringify(models));
  }, [models]);

  // Close all other dropdowns when this one is opened
  React.useEffect(() => {
    if (show) {
      // Custom event to signal other dropdowns to close
      const event = new CustomEvent('dropdown-opened', { detail: 'models' });
      window.dispatchEvent(event);

      // Listen for other dropdowns opening
      const handleOtherDropdownOpen = (e: CustomEvent) => {
        if (e.detail !== 'models') {
          setShow(false);
        }
      };

      window.addEventListener('dropdown-opened', handleOtherDropdownOpen as EventListener);
      return () => {
        window.removeEventListener('dropdown-opened', handleOtherDropdownOpen as EventListener);
      };
    }
  }, [show, setShow]);

  const handleAddModel = (values: Record<string, string>) => {
    if (!values.name?.trim() || !values.provider?.trim()) return;
    
    // Check if a model with this name already exists
    if (models.some(m => m.name.toLowerCase() === values.name.toLowerCase())) {
      alert('A model with this name already exists');
      return;
    }

    const newModel: DropdownItem = {
      id: `${values.name}-${Date.now()}`,
      name: values.name.trim(),
      type: values.provider
    };
    
    setModels(prev => [...prev, newModel]);
    setIsAddModalOpen(false);
  };
  
  const handleRemove = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  };

  const handleSelect = (model: DropdownItem) => {
    if (onSelect) {
      onSelect(model);
      setShow(false);
    }
  };

  const toggleDropdown = (): void => {
    setShow(!show);
  };

  return (
    <>
      <CommonDropdown
        show={show}
        setShow={setShow}
        trigger={
          <HeaderActionButton
            href="#"
            label={<span className="hidden sm:inline">Models</span>}
            ariaLabel="Models"
            onClick={e => {
              e.preventDefault();
              toggleDropdown();
            }}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 12l-4-4h3V4h2v4h3l-4 4z" /></svg>}
            className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md transition-colors ${resolvedTheme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
          />
        }
      >
        <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-black dark:text-white">Configured Models</h2>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold px-2" onClick={() => setShow(false)} aria-label="Close">&times;</button>
        </div>
        <div className="p-4 pt-2">
          {models.length === 0 && <div className="text-gray-400 text-sm mb-2">No models configured.</div>}
          <ul className="mb-2 max-h-60 overflow-y-auto">
            {models.map(model => (
              <li 
                key={model.id} 
                className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer ${selectedId === model.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => handleSelect(model)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{model.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{model.type}</span>
                </div>
                <button 
                  className="text-xs text-red-500 hover:text-red-700 ml-2 p-1" 
                  onClick={(e) => { e.stopPropagation(); handleRemove(model.id); }} 
                  aria-label="Remove"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <button 
            className="w-full mt-2 flex items-center justify-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded font-medium" 
            onClick={() => { setIsAddModalOpen(true); setShow(false); }}
          >
            + Add New Model
          </button>
        </div>
      </CommonDropdown>

      <ModalAlert
        open={isAddModalOpen}
        title="Add New Model"
        message="Configure a new AI model"
        fields={[
          { name: 'provider', label: 'Provider', type: 'select', required: true, placeholder: 'Select model provider' },
          { name: 'name', label: 'Model Name', type: 'text', required: true, placeholder: 'Enter model name' },
        ]}
        onSubmit={handleAddModel}
        onCancel={() => setIsAddModalOpen(false)}
        submitLabel="Add Model"
      />
    </>
  );
};
