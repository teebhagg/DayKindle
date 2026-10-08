import PostHog from 'posthog-react-native';
const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim();

if (__DEV__ && !projectToken) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
  );
}

if (__DEV__ && !host) {
  console.error(
    'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured',
  );
}

export const posthog = projectToken && host
  ? new PostHog(projectToken, {
      host,
      disableGeoip: true,
      captureAppLifecycleEvents: true,
      enableSessionReplay: false,
      before_send: (event) => {
        if (!event) return event;
        const properties = { ...event.properties };
        Reflect.deleteProperty(properties, 'url');
        return {
          ...event,
          properties: {
            ...properties,
            app_environment: __DEV__ ? 'development' : 'production',
            app_surface: 'mobile',
          },
        };
      },
      logs: {
        serviceName: 'accountability-tracker-mobile',
      },
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    })
  : undefined;
