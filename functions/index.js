const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.notifyIncomingCall = functions.database
  .ref("/calls/{callId}/status")
  .onWrite(async (change, context) => {
    const newStatus = change.after.val();
    if (newStatus !== "ringing") return null;

    const callSnap = await admin.database().ref(`/calls/${context.params.callId}`).once("value");
    const call = callSnap.val();
    if (!call || !call.to || !call.from) return null;

    const pushSnap = await admin.database().ref(`/users/${call.to}/push`).once("value");
    const push = pushSnap.val();
    if (!push?.token) return null;

    if (push.muted) return null;
    if (push.muteUntil && Date.now() < push.muteUntil) return null;

    const message = {
      token: push.token,
      notification: {
        title: "Incoming Call",
        body: `${call.from} is calling you`
      },
      data: {
        url: `/call-app/?pwa=1&action=incoming&from=${call.from}`
      },
      webpush: {
        notification: {
          icon: "/call-app/icons/icon-192.png",
          requireInteraction: true
        }
      }
    };

    await admin.messaging().send(message);
    return null;
  });
