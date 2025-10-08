"use client";

import { useSyncExternalStore } from "react";

function isFunction(value) {
  return typeof value === "function";
}

const identity = (value) => value;

export default function create(createState) {
  let state;
  const listeners = new Set();

  const getState = () => state;

  const setState = (partial, replace) => {
    const nextState = isFunction(partial) ? partial(state) : partial;
    if (nextState === state) {
      return;
    }
    const value = replace ? nextState : { ...state, ...nextState };
    state = value;
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const api = { setState, getState, subscribe };

  state = createState(setState, getState, api);

  function useStore(selector = identity, equalityFn = Object.is) {
    const sliceSelector = selector ?? identity;
    return useSyncExternalStore(
      subscribe,
      () => sliceSelector(state),
      () => sliceSelector(state),
      equalityFn
    );
  }

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = (listener, selector = identity, equalityFn = Object.is) => {
    let currentSlice = selector(state);
    function handleChange() {
      const nextSlice = selector(state);
      if (!equalityFn(currentSlice, nextSlice)) {
        currentSlice = nextSlice;
        listener(nextSlice);
      }
    }
    listeners.add(handleChange);
    return () => {
      listeners.delete(handleChange);
    };
  };
  useStore.destroy = () => {
    listeners.clear();
  };

  return useStore;
}

