const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const startCallBtn = document.getElementById("startCall");

// Replace with your backend server URL (e.g., Glitch/Heroku)
const socket = io("https://your-backend-server.glitch.me");

let localStream;
let peerConnection;
const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

startCallBtn.onclick = async () => {
  // Get user media
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;

  // Create RTCPeerConnection
  peerConnection = new RTCPeerConnection(config);

  // Add local stream tracks
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  // Handle remote stream
  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  // ICE candidate → send to server
  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };

  // Create offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", offer);
};

// Handle offer from peer
socket.on("offer", async (offer) => {
  peerConnection = new RTCPeerConnection(config);
  localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localVideo.srcObject = localStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);
});

// Handle answer from peer
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

// Handle ICE candidates
socket.on("candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Error adding candidate:", err);
  }
});
