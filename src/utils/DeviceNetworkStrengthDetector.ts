import NetInfo, { NetInfoStateType } from '@react-native-community/netinfo';

export const getAdaptiveTimeout = async (defaultTimeout = 20000): Promise<number> => {
  try {
    const netState = await NetInfo.fetch();
    if (netState.isConnected === false) {
      return 5000; 
    }
    if (netState.type === NetInfoStateType.cellular) {
      const details = netState.details as { cellularGeneration?: string | null };
      const generation = details?.cellularGeneration;

      if (generation === '2g' || generation === '3g') {
        return 45000; 
      }

      return 30000; 
    }
    return defaultTimeout;
  } catch (error) {
    console.warn('Failed to fetch network state, using default timeout.', error);
    return defaultTimeout;
  }
};