import { Component, JSX, createSignal, splitProps } from 'solid-js';

export interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  error?: string;
  variant?: 'default' | 'card';
}

const Checkbox: Component<CheckboxProps> = (props) => {
  const [local, others] = splitProps(props, [
    'label',
    'description',
    'error',
    'variant',
    'class',
    'id'
  ]);

  const [checkboxId] = createSignal(local.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`);

  const checkboxClasses = () => {
    let classes = 'h-4 w-4 rounded border border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200';
    
    if (local.error) {
      classes += ' border-red-300 focus:ring-red-500';
    }
    
    return classes;
  };

  const labelClasses = () => {
    let classes = 'text-sm font-medium';
    
    if (local.error) {
      classes += ' text-red-700';
    } else {
      classes += ' text-gray-700';
    }
    
    return classes;
  };

  const descriptionClasses = () => {
    let classes = 'text-sm mt-1';
    
    if (local.error) {
      classes += ' text-red-600';
    } else {
      classes += ' text-gray-500';
    }
    
    return classes;
  };

  const containerClasses = () => {
    let classes = 'flex items-start space-x-3';
    
    if (local.variant === 'card') {
      classes += ' p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200';
      
      if (local.error) {
        classes += ' border-red-300 bg-red-50';
      }
    }
    
    if (local.class) {
      classes += ` ${local.class}`;
    }
    
    return classes;
  };

  const CheckIcon = () => (
    <svg class="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
      <path 
        fill-rule="evenodd" 
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
        clip-rule="evenodd" 
      />
    </svg>
  );

  return (
    <div class={containerClasses()}>
      <div class="flex items-center h-5">
        <input
          id={checkboxId()}
          type="checkbox"
          class={checkboxClasses()}
          aria-invalid={!!local.error}
          aria-describedby={local.error ? `${checkboxId()}-error` : local.description ? `${checkboxId()}-description` : undefined}
          {...others}
        />
      </div>
      
      {(local.label || local.description) && (
        <div class="flex-1">
          {local.label && (
            <label for={checkboxId()} class={labelClasses()}>
              {local.label}
            </label>
          )}
          
          {local.description && (
            <p id={`${checkboxId()}-description`} class={descriptionClasses()}>
              {local.description}
            </p>
          )}
          
          {local.error && (
            <p id={`${checkboxId()}-error`} class="text-sm text-red-600 mt-1" role="alert">
              {local.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Checkbox;