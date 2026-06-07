import { useEffect } from 'react';
import { deviceApi } from '@/services/api';
import { useDashboardStore } from '@/store/dashboardStore';

/** Detect hub vs device role on startup */
export function useAppMode() {
  const { appMode, setAppMode, setDeviceStatus } = useDashboardStore();

  useEffect(() => {
    deviceApi.detectRole()
      .then((role) => {
        setAppMode(role === 'node' ? 'device' : 'hub');
        if (role === 'node') {
          deviceApi.status().then(setDeviceStatus).catch(() => {});
        }
      })
      .catch(() => setAppMode('hub'));
  }, [setAppMode, setDeviceStatus]);

  return appMode;
}
