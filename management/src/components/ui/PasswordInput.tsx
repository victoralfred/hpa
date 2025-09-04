import { Component, JSX, createSignal, splitProps } from 'solid-js';
import FormField, { FormFieldProps } from './FormField';
import { PasswordStrength } from '../../types';

export interface PasswordInputProps extends Omit<FormFieldProps, 'type' | 'rightIcon'> {
  showToggle?: boolean;
  showStrength?: boolean;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

// Password strength calculator
const calculatePasswordStrength = (password: string): PasswordStrength => {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      feedback: ['Enter a password'],
      color: 'var(--color-gray-400)'
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include uppercase letters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include lowercase letters');
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include numbers');
  }

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include special characters');
  }

  // Determine label and color based on score
  let label: PasswordStrength['label'];
  let color: string;

  switch (score) {
    case 0:
    case 1:
      label = 'Very Weak';
      color = 'var(--color-error-500)';
      break;
    case 2:
      label = 'Weak';
      color = 'var(--color-warning-500)';
      break;
    case 3:
      label = 'Fair';
      color = 'var(--color-warning-600)';
      break;
    case 4:
      label = 'Good';
      color = 'var(--color-info-500)';
      break;
    case 5:
      label = 'Strong';
      color = 'var(--color-success-500)';
      break;
    default:
      label = 'Very Weak';
      color = 'var(--color-error-500)';
  }

  return {
    score: Math.min(score, 4) as PasswordStrength['score'],
    label,
    feedback: feedback.slice(0, 3), // Limit feedback to 3 items
    color
  };
};

const PasswordInput: Component<PasswordInputProps> = (props) => {
  const [local, others] = splitProps(props, [
    'showToggle',
    'showStrength',
    'onStrengthChange',
    'value',
    'onInput'
  ]);

  const [isVisible, setIsVisible] = createSignal(false);
  const [strength, setStrength] = createSignal<PasswordStrength>(calculatePasswordStrength(''));

  const toggleVisibility = () => {
    setIsVisible(!isVisible());
  };

  const handleInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (event) => {
    const value = (event.target as HTMLInputElement).value;
    const newStrength = calculatePasswordStrength(value);
    setStrength(newStrength);
    
    if (local.onStrengthChange) {
      local.onStrengthChange(newStrength);
    }

    if (local.onInput) {
      if (typeof local.onInput === 'function') {
        local.onInput(event);
      }
    }
  };

  const EyeIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const EyeSlashIcon = () => (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
    </svg>
  );

  const PasswordToggleButton = () => (
    <button
      type="button"
      class="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200 z-10"
      onClick={toggleVisibility}
      aria-label={isVisible() ? 'Hide password' : 'Show password'}
      tabindex="-1"
    >
      <div class="h-5 w-5">
        {isVisible() ? <EyeSlashIcon /> : <EyeIcon />}
      </div>
    </button>
  );

  const PasswordStrengthIndicator = () => {
    const currentStrength = strength();
    const widthPercentage = (currentStrength.score / 4) * 100;

    return (
      <div class="mt-2 space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-gray-600">Password strength:</span>
          <span 
            class="font-medium"
            style={{ color: currentStrength.color }}
          >
            {currentStrength.label}
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-300"
            style={{
              width: `${widthPercentage}%`,
              'background-color': currentStrength.color
            }}
          />
        </div>
        {currentStrength.feedback.length > 0 && (
          <ul class="text-xs text-gray-600 space-y-1">
            {currentStrength.feedback.map((item, index) => (
              <li key={index} class="flex items-center">
                <span class="w-1 h-1 bg-gray-400 rounded-full mr-2 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div class="w-full">
      <FormField
        type={isVisible() ? 'text' : 'password'}
        value={local.value}
        onInput={handleInput}
        rightIcon={local.showToggle !== false ? (
          <button
            type="button"
            onClick={toggleVisibility}
            aria-label={isVisible() ? 'Hide password' : 'Show password'}
            tabindex="-1"
            class="pointer-events-auto"
          >
            {isVisible() ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        ) : undefined}
        {...others}
      />
      {local.showStrength && <PasswordStrengthIndicator />}
    </div>
  );
};

export default PasswordInput;