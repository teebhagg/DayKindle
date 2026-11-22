import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { CheckInRequest } from './home-screen';

// Reads the route params a check-in reminder tap sends to Today: ?checkIn=morning|evening&at=<timestamp>.
export function useCheckInRequest(): CheckInRequest | undefined {
  const params = useLocalSearchParams<{ checkIn?: string; at?: string }>();
  const { checkIn, at } = params;
  return useMemo(() => {
    if (checkIn !== 'morning' && checkIn !== 'evening') return undefined;
    return { period: checkIn, key: `${checkIn}-${at ?? ''}` };
  }, [checkIn, at]);
}
