import { Component, JSX, createSignal, createEffect, splitProps } from 'solid-js';

export interface FormFieldProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  error?: string;
  helperText?: string;
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
  variant?: 'default' | 'filled';
  required?: boolean;
  loading?: boolean;
  success?: boolean;
}

const FormField: Component<FormFieldProps> = (props) => {
  const [local, others] = splitProps(props, [
    'label',
    'type',
    'error',
    'helperText',
    'leftIcon',
    'rightIcon',
    'variant',
    'required',
    'loading',
    'success',
    'class',
    'id'
  ]);

  const [fieldId] = createSignal(local.id || `field-${Math.random().toString(36).substr(2, 9)}`);
  const [focused, setFocused] = createSignal(false);

  const baseClasses = () =>
    'block w-full border rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = () => {
    if (local.error) {
      return 'border-red-300 text-red-900 placeholder-red-400 focus:ring-red-500 focus:border-red-500';
    }
    
    if (local.success) {
      return 'border-green-300 text-green-900 placeholder-green-400 focus:ring-green-500 focus:border-green-500';
    }
    
    switch (local.variant || 'default') {
      case 'filled':
        return 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500 focus:bg-white';
      default:
        return 'border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500';
    }
  };

  const sizeClasses = () => {
    const hasLeftIcon = local.leftIcon;
    const hasRightIcon = local.rightIcon || local.loading;
    
    let classes = 'py-3 text-base';
    
if (hasLeftIcon && hasRightIcon) {
  classes += ' pl-10 pr-10';
} else if (hasLeftIcon) {
  classes += ' pl-10 pr-4';
} else if (hasRightIcon) {
  classes += ' pl-4 pr-10';
} else {
  classes += ' px-4';
}
    
    return classes;
  };

  const inputClasses = () => [
    baseClasses(),
    variantClasses(),
    sizeClasses(),
    local.class || ''
  ].join(' ');

  const labelClasses = () => {
    let classes = 'block text-sm font-medium mb-2 transition-colors duration-200';
    
    if (local.error) {
      classes += ' text-red-700';
    } else if (focused()) {
      classes += ' text-blue-700';
    } else {
      classes += ' text-gray-700';
    }
    
    return classes;
  };

  return (
    <div class="w-full">
      <label for={fieldId()} class={labelClasses()}>
        {local.label}
        {local.required && (
          <span class="text-red-500 ml-1" aria-label="Required">*</span>
        )}
      </label>
      
      <div class="relative">
        {local.leftIcon && (
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div class={`h-5 w-5 ${local.error ? 'text-red-400' : 'text-gray-400'}`}>
              {local.leftIcon}
            </div>
          </div>
        )}
        
        <input
          id={fieldId()}
          type={local.type || 'text'}
          class={inputClasses()}
          aria-invalid={!!local.error}
          aria-describedby={local.error ? `${fieldId()}-error` : local.helperText ? `${fieldId()}-helper` : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...others}
        />
        
        {(local.rightIcon || local.loading) && (
          <div class="absolute inset-y-0 right-0 pr-4 flex items-center">
            <div class={`h-5 w-5 ${local.error ? 'text-red-400' : local.success ? 'text-green-400' : 'text-gray-400'} ${local.loading || local.success ? 'pointer-events-none' : ''}`}>
              {local.loading ? (
                <svg class="animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : local.success ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                local.rightIcon
              )}
            </div>
          </div>
        )}
      </div>
      
      {local.error && (
        <p id={`${fieldId()}-error`} class="mt-2 text-sm text-red-600" role="alert">
          {local.error}
        </p>
      )}
      
      {local.helperText && !local.error && (
        <p id={`${fieldId()}-helper`} class="mt-2 text-sm text-gray-500">
          {local.helperText}
        </p>
      )}
    </div>
  );
};

export default FormField;