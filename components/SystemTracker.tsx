
import React, { useEffect, useRef } from 'react';
import { logSystemAccess, signIn } from '../services/firebase';

const SystemTracker: React.FC = () => {
  const hasLogged = useRef(false);

  useEffect(() => {
    // Prevent double logging in React Strict Mode
    if (hasLogged.current) return;
    hasLogged.current = true;

    const captureAndLog = async () => {
      // 1. User Agent
      const userAgent = navigator.userAgent;

      // 2. Device Type Detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const deviceType = isMobile ? 'Mobile' : 'Desktop';

      // 3. OS Detection
      let os = 'Unknown OS';
      if (userAgent.indexOf("Win") !== -1) os = "Windows";
      if (userAgent.indexOf("Mac") !== -1) os = "MacOS";
      if (userAgent.indexOf("Linux") !== -1) os = "Linux";
      if (userAgent.indexOf("Android") !== -1) os = "Android";
      if (userAgent.indexOf("like Mac") !== -1) os = "iOS";

      // 4. Browser Detection
      let browser = 'Unknown Browser';
      if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
      else if (userAgent.indexOf("Safari") !== -1) browser = "Safari";
      else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
      else if (userAgent.indexOf("MSIE") !== -1 || !!('documentMode' in document)) browser = "IE"; 
      else if (userAgent.indexOf("Edge") !== -1) browser = "Edge";

      // Prepare basic data
      const logData: any = {
        deviceType,
        os,
        browser,
        userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        locationPermission: 'Pending'
      };

      // 5. Geolocation
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0
            });
          });

          // If successful
          logData.location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          logData.locationPermission = 'Granted';

        } catch (error: any) {
          // If denied or error
          logData.locationPermission = 'Denied/Error';
          logData.locationError = error.message || 'Unknown error';
        }
      } else {
        logData.locationPermission = 'Not Supported';
      }

      // 6. Send to Firebase Firestore
      try {
        // Ensure authentication before writing to fix "Missing or insufficient permissions"
        await signIn();
        await logSystemAccess(logData);
      } catch (e) {
        console.error("Failed to log system access:", e);
      }
    };

    captureAndLog();
  }, []);

  return null; // 7. Render nothing (No UI)
};

export default SystemTracker;
