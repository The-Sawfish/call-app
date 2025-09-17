const statusEl = document.getElementById("status");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");
const muteBtn = document.getElementById("muteBtn");

const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");

// 👇 Replace with your deployed backend server URL
const socket = io("https://your-backend-server.onrender.com");

let localStream;
let peerConnection;
let isMuted = false;

const config = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

async function startCall() {
  statusEl.textContent = "Starting Call...";

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  localAudio.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
    statusEl.textContent = "In Call 🎤";
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);

  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
  muteBtn.disabled = false;
}

async function handleOffer(offer) {
  statusEl.textContent = "Incoming Call...";

  peerConnection = new RTCPeerConnection(config);
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  localAudio.srcObject = localStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = event => {
    remoteAudio.srcObject = event.streams[0];
    statusEl.textContent = "In Call 🎤";
  };

  peerConnection.onicecandidate = event => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);

  startCallBtn.disabled = true;
  endCallBtn.disabled = false;
  muteBtn.disabled = false;
}

function endCall() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  statusEl.textContent = "Call Ended ❌";

  startCallBtn.disabled = false;
  endCallBtn.disabled = true;
  muteBtn.disabled = true;
  muteBtn.textContent = "Mute";
  isMuted = false;
}

function toggleMute() {
  if (!localStream) return;
  const audioTrack = localStream.getAudioTracks()[0];
  isMuted = !isMuted;
  audioTrack.enabled = !isMuted;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
}

// --- Socket.IO handlers ---
socket.on("offer", handleOffer);

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  statusEl.textContent = "In Call 🎤";
});

socket.on("candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.error("Error adding candidate:", err);
  }
});

// --- Button events ---
startCallBtn.onclick = startCall;
endCallBtn.onclick = endCall;
muteBtn.onclick = toggleMute;
