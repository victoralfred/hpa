import { Component, createSignal, onMount } from 'solid-js';

const TestSignal: Component = () => {
  const [loading, setLoading] = createSignal(true);
  
  console.log('TestSignal: Initial loading state:', loading());
  
  onMount(() => {
    console.log('TestSignal: onMount triggered, loading:', loading());
    setTimeout(() => {
      console.log('TestSignal: About to set loading to false');
      setLoading(false);
      console.log('TestSignal: After setting, loading is:', loading());
    }, 2000);
  });
  
  return (
    <div>
      <h1>Test Signal Component</h1>
      <p>Loading state: {loading() ? 'TRUE' : 'FALSE'}</p>
      <button onClick={() => setLoading(!loading())}>
        Toggle Loading
      </button>
    </div>
  );
};

export default TestSignal;