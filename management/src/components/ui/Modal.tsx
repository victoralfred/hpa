import { Component, JSX, Show, splitProps, onMount, onCleanup } from 'solid-js';
import { Portal } from 'solid-js/web';

export interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children?: JSX.Element;
  footer?: JSX.Element;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const Modal: Component<ModalProps> = (props) => {
  const [local] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'children',
    'footer',
    'size',
    'closeOnOverlayClick',
    'closeOnEscape',
    'showCloseButton'
  ]);

  const sizeClasses = () => {
    switch (local.size || 'md') {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      case 'full':
        return 'max-w-full m-4';
      default:
        return 'max-w-lg';
    }
  };

  const handleOverlayClick = (e: MouseEvent) => {
    if (local.closeOnOverlayClick !== false && e.target === e.currentTarget) {
      local.onClose?.();
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (local.closeOnEscape !== false && e.key === 'Escape') {
      local.onClose?.();
    }
  };

  onMount(() => {
    if (local.open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'auto';
  });

  const CloseIcon = () => (
    <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <Portal>
      <Show when={local.open}>
        <div class="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleOverlayClick}
          />
          
          {/* Modal */}
          <div class="flex min-h-full items-center justify-center p-4">
            <div class={`relative bg-white rounded-lg shadow-xl transform transition-all w-full ${sizeClasses()}`}>
              {/* Header */}
              <Show when={local.title || local.showCloseButton !== false}>
                <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <Show when={local.title}>
                    <h3 class="text-lg font-semibold text-gray-900">{local.title}</h3>
                  </Show>
                  
                  <Show when={local.showCloseButton !== false}>
                    <button
                      type="button"
                      class="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                      onClick={() => local.onClose?.()}
                    >
                      <span class="sr-only">Close</span>
                      <CloseIcon />
                    </button>
                  </Show>
                </div>
              </Show>
              
              {/* Content */}
              <div class="px-6 py-4">
                {local.children}
              </div>
              
              {/* Footer */}
              <Show when={local.footer}>
                <div class="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                  {local.footer}
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </Portal>
  );
};

export default Modal;