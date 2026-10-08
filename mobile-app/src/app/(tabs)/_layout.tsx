import { useEffect } from 'react';
import { Slot } from 'expo-router';
import { useSplashTargetReporter } from '@/features/home/splash-transition-context';

export default function TabsLayout() {
  const { reportNoTarget } = useSplashTargetReporter();
  useEffect(() => {
    reportNoTarget();
  }, [reportNoTarget]);

  return <Slot />;
}
