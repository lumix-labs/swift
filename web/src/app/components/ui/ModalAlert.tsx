import React, { useEffect, useRef } from 'react';

interface ModalAlertField {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}

interface ModalAlertProps {
  open: boolean;
  title?: string;
  message?: string;
  fields?: ModalAlertField[];
  initialValues?: Record<string, string>;
  onSubmit?: (values: Record<string, string>) => void;
  onCancel?: () => void;
  showCancel?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
}

export const ModalAlert: React.FC<ModalAlertProps> = ({
  open,
  title,
  message,
  fields = [],
  initialValues = {},
  onSubmit,
  onCancel,
  showCancel = true,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = React.useState<Record<string, string>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  const handleClickOutside = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onCancel?.();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClickOutside}>
      <div
        ref={modalRef}
        className="bg-white dark:bg-white border border-gray-200 dark:border-gray-200 rounded-md shadow-lg p-6 w-full max-w-md mx-2 flex flex-col gap-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {title && <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100">{title}</h2>}
        {message && <div className="text-gray-700 dark:text-gray-300 mb-2">{message}</div>}
        {fields.length > 0 && (
          <form
            className="flex flex-col gap-3"
            onSubmit={e => {
              e.preventDefault();
              onSubmit?.(values);
            }}
          >
            {fields.map(field => (
              <label key={field.name} className="flex flex-col gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                {field.label}
                {field.type === 'select' ? (
                  <select
                    name={field.name}
                    required={field.required}
                    value={values[field.name] || ''}
                    onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>{field.placeholder || 'Select an option'}</option>
                    <option value="Google Gemini">Google Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type || 'text'}
                    required={field.required}
                    placeholder={field.placeholder}
                    value={values[field.name] || ''}
                    onChange={e => setValues(v => ({ ...v, [field.name]: e.target.value }))}
                    className="rounded-md border border-gray-300 dark:border-gray-700 p-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </label>
            ))}
            <div className="flex gap-2 mt-4 justify-end">
              {showCancel && (
                <button type="button" className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={onCancel}>
                  {cancelLabel}
                </button>
              )}
              <button type="submit" className="px-4 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200">
                {submitLabel}
              </button>
            </div>
          </form>
        )}
        {fields.length === 0 && (
          <div className="flex gap-2 mt-4 justify-end">
            {showCancel && (
              <button type="button" className="px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600" onClick={onCancel}>
                {cancelLabel}
              </button>
            )}
            <button type="button" className="px-4 py-2 rounded-md bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-gray-800 dark:hover:bg-gray-200" onClick={() => onSubmit?.({})}>
              {submitLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
