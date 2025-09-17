const RENDER_URL = "https://webrtc-server-prun.onrender.com"; // your Render URL
const socket = io(RENDER_URL);

const statusEl = document.getElementById("status");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");
const muteBtn = document.getElementById("muteBtn");

const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");

let localStream = null;
let peerConnection = null;
let isMuted = false;

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

async function startCall() {
  statusEl.textContent = "Starting call...";
  startCallBtn.disabled = true;

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localAudio.srcObject = localStream;

  peerConnection = new RTCPeerConnection(config);
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    statusEl.textContent = "In call 🎤";
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) socket.emit("candidate", event.candidate);
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);

  endCallBtn.disabled = false;
  muteBtn.disabled = false;
}

async function handleOffer(offer) {
  statusEl.textContent = "Incoming call...";
  peerConnection = new RTCPeerConnection(config);

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localAudio.srcObject = localStream;
  localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    statusEl.textContent = "In call 🎤";
  };

  peerConnection.onicecandidate = (event) => {
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

async function handleAnswer(answer) {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate(candidate) {
  await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
}

function endCall() {
  if (peerConnection) peerConnection.close();
  if (localStream) localStream.getTracks().forEach(track => track.stop());

  statusEl.textContent = "Call ended";
  startCallBtn.disabled = false;
  endCallBtn.disabled = true;
  muteBtn.disabled = true;
  isMuted = false;
  muteBtn.textContent = "Mute";
}

function toggleMute() {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  track.enabled = isMuted;
  isMuted = !isMuted;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
}

socket.on("offer", handleOffer);
socket.on("answer", handleAnswer);
socket.on("candidate", handleCandidate);

startCallBtn.onclick = startCall;
endCallBtn.onclick = endCall;
muteBtn.onclick = toggleMute;
