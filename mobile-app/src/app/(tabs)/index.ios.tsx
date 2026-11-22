import HomeScreen from '../../features/home/home-screen';
import { useCheckInRequest } from '../../features/home/use-check-in-request';
export default function TodayTab() { const checkInRequest = useCheckInRequest(); return <HomeScreen initialTab="today" showTabBar={false} checkInRequest={checkInRequest} />; }
