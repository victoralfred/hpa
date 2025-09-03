import { Component, JSX, splitProps } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
  variant?: 'default' | 'filled';
}

const Input: Component<InputProps> = (props) => {
  const [local, others] = splitProps(props, [
    'label',
    'error',
    'helperText',
    'leftIcon',
    'rightIcon',
    'variant',
    'class'
  ]);

  const baseClasses = () =>
    'block w-full border rounded-md shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = () => {
    if (local.error) {
      return 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500';
    }
    
    switch (local.variant || 'default') {
      case 'filled':
        return 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400';
      default:
        return 'border-gray-300 text-gray-900 placeholder-gray-400';
    }
  };

  const sizeClasses = () => {
    const hasIcons = local.leftIcon || local.rightIcon;
    if (hasIcons) {
      return 'px-10 py-2';
    }
    return 'px-3 py-2';
  };

  const inputClasses = () => [
    baseClasses(),
    variantClasses(),
    sizeClasses(),
    local.class || ''
  ].join(' ');

  return (
    <div class="w-full">
      {local.label && (
        <label class="block text-sm font-medium text-gray-700 mb-1">
          {local.label}
        </label>
      )}
      
      <div class="relative">
        {local.leftIcon && (
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div class="h-5 w-5 text-gray-400">
              {local.leftIcon}
            </div>
          </div>
        )}
        
        <input
          class={inputClasses()}
          {...others}
        />
        
        {local.rightIcon && (
          <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div class="h-5 w-5 text-gray-400">
              {local.rightIcon}
            </div>
          </div>
        )}
      </div>
      
      {local.error && (
        <p class="mt-1 text-sm text-red-600">{local.error}</p>
      )}
      
      {local.helperText && !local.error && (
        <p class="mt-1 text-sm text-gray-500">{local.helperText}</p>
      )}
    </div>
  );
};

export default Input;