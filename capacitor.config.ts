import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'rs.filip.planer',
  appName: 'Planer',
  webDir: 'dist',
  android: {
    backgroundColor: '#faf9f6',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_planer',
      iconColor: '#2563eb',
    },
  },
}

export default config
