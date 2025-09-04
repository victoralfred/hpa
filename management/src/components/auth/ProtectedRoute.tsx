// import { Component, JSX, createEffect, onMount } from 'solid-js';
// import { useAuth } from '../../contexts/AuthContext';
// import Auth from '../../pages/Auth';

// interface ProtectedRouteProps {
//   children: JSX.Element;
//   fallback?: JSX.Element;
// }


import { Component, JSX, Show } from "solid-js";
import { useAuth } from "../../contexts/AuthContext";
import Auth from "../../pages/Auth";

interface ProtectedRouteProps {
  children: JSX.Element;
  fallback?: JSX.Element;
}

const ProtectedRoute: Component<ProtectedRouteProps> = (props) => {
  const auth = useAuth();
const renderLoading =()=>{
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-50">
        <div class="text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
}
  return (
    <Show when={!auth.isLoading()} fallback={renderLoading()}>
      <Show when={auth.isAuthenticated()} fallback={props.fallback || <Auth />}>
        {props.children}
      </Show>
    </Show>
  );
};

export default ProtectedRoute;