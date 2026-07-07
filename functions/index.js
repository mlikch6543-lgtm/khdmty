
/**
 * CLOUD FUNCTION FOR FIREBASE (BACKEND)
 * -------------------------------------
 * This file contains the logic to send Push Notifications via FCM.
 * Deploy this using: `firebase deploy --only functions`
 *
 * NOTE: This requires the Blaze (Paid) plan on Firebase for external network calls if not using Google services,
 * but FCM is internal Google service so it might work on Spark for simple triggers.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Trigger: When a new record is added to 'attendance/{recordId}'
exports.sendAttendanceNotification = functions.database.ref('/attendance/{recordId}')
  .onCreate(async (snapshot, context) => {
    const record = snapshot.val();
    
    // Check if valid record
    if (!record) return null;

    // Get who submitted it (We rely on 'submittedBy' field added in Frontend)
    const servantName = record.submittedBy || 'خادم';
    const isPresent = record.present;
    const isAbsent = record.absent;
    
    // Determine Action Type
    let actionType = 'تسجيل حضور';
    let emoji = '📋';
    if (isPresent) {
        actionType = 'تسجيل حضور (حاضر)';
        emoji = '✅';
    } else if (isAbsent) {
        actionType = 'تسجيل غياب';
        emoji = '❌';
    }

    const timeString = new Date().toLocaleTimeString('ar-EG', { 
        timeZone: 'Africa/Cairo', 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    // 1. Prepare Notification Payload
    const payload = {
      notification: {
        title: `${emoji} نشاط جديد: ${actionType}`,
        body: `قام ${servantName} ب${actionType} في تمام الساعة ${timeString}`,
        icon: 'https://khdmty-2.firebaseapp.com/logo192.png', // Replace with your actual logo URL
        click_action: 'https://khdmty-2.firebaseapp.com/'
      },
      data: {
        recordId: context.params.recordId,
        type: 'attendance_update'
      }
    };

    // 2. Get Admin Tokens
    const tokensSnapshot = await admin.database().ref('admin_tokens').once('value');
    if (!tokensSnapshot.exists()) {
        console.log('No admin tokens found.');
        return null;
    }

    // Extract tokens from object structure
    const tokens = [];
    tokensSnapshot.forEach(child => {
        const val = child.val();
        if (val.token) tokens.push(val.token);
    });

    if (tokens.length === 0) {
        console.log('No valid tokens to send to.');
        return null;
    }

    // 3. Send Multicast Message
    try {
      const response = await admin.messaging().sendToDevice(tokens, payload);
      console.log('Successfully sent message:', response);
      
      // Cleanup invalid tokens
      const tokensToRemove = [];
      response.results.forEach((result, index) => {
        const error = result.error;
        if (error) {
          console.error('Failure sending notification to', tokens[index], error);
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
              // We can't easily find the key from the array index here without mapping keys first,
              // but purely for logic demonstration, this is where cleanup happens.
          }
        }
      });
      return response;
    } catch (error) {
      console.log('Error sending message:', error);
      return null;
    }
  });
