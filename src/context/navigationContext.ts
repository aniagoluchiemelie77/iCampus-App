import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../../App'; 

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params: RootStackParamList[RouteName]
): void;


export function navigate<RouteName extends keyof RootStackParamList>(
  name: undefined extends RootStackParamList[RouteName] ? RouteName : never
): void;


export function navigate(name: any, params?: any) {
  if (navigationRef.isReady()) {
    if (params !== undefined) {
      navigationRef.navigate(name, params);
    } else {
      navigationRef.navigate(name);
    }
  }
}