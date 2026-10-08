import { createContext, useContext } from 'react';

export type SplashTarget = { x: number; y: number; width: number; height: number };
export type SplashTargetReporter = {
  reportTarget: (target: SplashTarget) => void;
  reportNoTarget: () => void;
};

export const SplashTargetContext = createContext<SplashTargetReporter>({
  reportTarget: () => undefined,
  reportNoTarget: () => undefined,
});
export const SplashStatusTransitionContext = createContext(false);

export function useSplashTargetReporter() {
  return useContext(SplashTargetContext);
}

export function useSplashStatusTransition() {
  return useContext(SplashStatusTransitionContext);
}
