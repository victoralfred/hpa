import { Component, For, Show, JSX, splitProps } from 'solid-js';
import { TableColumn } from '~/types';

export interface TableProps<T> extends JSX.HTMLAttributes<HTMLTableElement> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (record: T, index: number) => void;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

function Table<T>(props: TableProps<T>): JSX.Element {
  const [local, others] = splitProps(props, [
    'data',
    'columns',
    'loading',
    'onRowClick',
    'emptyMessage',
    'stickyHeader',
    'class'
  ]);

  const tableClasses = () => [
    'min-w-full divide-y divide-gray-200',
    local.class || ''
  ].join(' ');

  const LoadingSkeleton = () => (
    <tbody class="bg-white divide-y divide-gray-200">
      <For each={Array.from({ length: 5 })}>
        {() => (
          <tr>
            <For each={local.columns}>
              {() => (
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="h-4 bg-gray-200 rounded animate-pulse" />
                </td>
              )}
            </For>
          </tr>
        )}
      </For>
    </tbody>
  );

  const EmptyState = () => (
    <tbody class="bg-white">
      <tr>
        <td 
          class="px-6 py-8 text-center text-gray-500" 
          colSpan={local.columns.length}
        >
          {local.emptyMessage || 'No data available'}
        </td>
      </tr>
    </tbody>
  );

  const renderCellContent = (column: TableColumn<T>, record: T) => {
    if (column.render) {
      const value = typeof column.key === 'string' ? (record as any)[column.key] : record[column.key as keyof T];
      return column.render(value, record);
    }
    
    const value = typeof column.key === 'string' ? (record as any)[column.key] : record[column.key as keyof T];
    
    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (value === null || value === undefined) {
      return '-';
    }
    
    return String(value);
  };

  return (
    <div class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
      <table class={tableClasses()} {...others}>
        <thead class={`bg-gray-50 ${local.stickyHeader ? 'sticky top-0 z-10' : ''}`}>
          <tr>
            <For each={local.columns}>
              {(column) => (
                <th
                  scope="col"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={column.width ? { width: column.width } : {}}
                >
                  {column.title}
                </th>
              )}
            </For>
          </tr>
        </thead>
        
        <Show 
          when={!local.loading && local.data.length > 0}
          fallback={local.loading ? <LoadingSkeleton /> : <EmptyState />}
        >
          <tbody class="bg-white divide-y divide-gray-200">
            <For each={local.data}>
              {(record, index) => (
                <tr
                  class={local.onRowClick ? 'hover:bg-gray-50 cursor-pointer' : ''}
                  onClick={() => local.onRowClick?.(record, index())}
                >
                  <For each={local.columns}>
                    {(column) => (
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {renderCellContent(column, record)}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </Show>
      </table>
    </div>
  );
}

export default Table;