const RENDER_URL = "https://webrtc-server-prun.onrender.com"; // your Render URL
const socket = io(RENDER_URL, { transports: ["websocket"] });

const statusEl = document.getElementById("status");
const startCallBtn = document.getElementById("startCall");
const endCallBtn = document.getElementById("endCall");
const muteBtn = document.getElementById("muteBtn");

const localAudio = document.getElementById("localAudio");
const remoteAudio = document.getElementById("remoteAudio");

// You MUST have an input for a 5-digit code, or set it some other way.
// Recommended HTML: <input id="callCode" maxlength="5" inputmode="numeric" />
const callCodeEl = document.getElementById("callCode");

let localStream = null;
let peerConnection = null;
let isMuted = false;

let room = null;
let isCaller = false;
let started = false;

const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
  console.log(msg);
}

function getRoomCode() {
  const code = (callCodeEl?.value || "").trim();
  if (!/^\d{5}$/.test(code)) return null;
  return code;
}

function setButtons({ canStart, canEnd, canMute }) {
  startCallBtn.disabled = !canStart;
  endCallBtn.disabled = !canEnd;
  muteBtn.disabled = !canMute;
}

async function ensureMedia() {
  if (localStream) return localStream;
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localAudio.srcObject = localStream;
  return localStream;
}

function makePeer() {
  peerConnection = new RTCPeerConnection(config);

  // remote audio
  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
    setStatus("In call 🎤");
  };

  // ICE → server → other peer (scoped to room)
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && room) {
      socket.emit("candidate", { room, candidate: event.candidate });
    }
  };

  return peerConnection;
}

async function attachTracks() {
  const stream = await ensureMedia();
  stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
}

async function startCall() {
  if (started) return;

  room = getRoomCode();
  if (!room) {
    alert("Enter a 5-digit call code first.");
    return;
  }

  started = true;
  isCaller = true;
  setStatus("Joining room...");
  setButtons({ canStart: false, canEnd: false, canMute: false });

  socket.emit("join", { room });

  // Caller creates offer only after joining
  setStatus("Starting call...");
  makePeer();
  await attachTracks();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", { room, offer });

  setButtons({ canStart: false, canEnd: true, canMute: true });
}

async function handleOffer({ room: incomingRoom, offer }) {
  // If user hasn't entered a code, ignore
  const expected = getRoomCode();
  if (!expected || incomingRoom !== expected) return;

  // If already started as caller, ignore incoming offers
  if (started && isCaller) return;

  room = incomingRoom;
  started = true;
  isCaller = false;

  setStatus("Incoming call... (joining)");
  setButtons({ canStart: false, canEnd: false, canMute: false });

  socket.emit("join", { room });

  makePeer();
  await attachTracks();

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", { room, answer });

  setButtons({ canStart: false, canEnd: true, canMute: true });
}

async function handleAnswer({ room: incomingRoom, answer }) {
  if (!peerConnection || !room || incomingRoom !== room) return;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
}

async function handleCandidate({ room: incomingRoom, candidate }) {
  if (!peerConnection || !room || incomingRoom !== room) return;
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (e) {
    console.warn("ICE add failed:", e);
  }
}

function endCall() {
  if (peerConnection) {
    peerConnection.onicecandidate = null;
    peerConnection.ontrack = null;
    peerConnection.close();
  }
  peerConnection = null;

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  localStream = null;

  remoteAudio.srcObject = null;
  localAudio.srcObject = null;

  if (room) socket.emit("leave", { room });

  setStatus("Call ended");
  started = false;
  isCaller = false;
  room = null;

  isMuted = false;
  muteBtn.textContent = "Mute";
  setButtons({ canStart: true, canEnd: false, canMute: false });
}

function toggleMute() {
  if (!localStream) return;
  const track = localStream.getAudioTracks()[0];
  if (!track) return;

  isMuted = !isMuted;
  track.enabled = !isMuted;
  muteBtn.textContent = isMuted ? "Unmute" : "Mute";
}

// Socket events (room-scoped)
socket.on("offer", handleOffer);
socket.on("answer", handleAnswer);
socket.on("candidate", handleCandidate);

// Optional: if your server emits this when the other side hangs up
socket.on("hangup", ({ room: incomingRoom }) => {
  if (room && incomingRoom === room) endCall();
});

// UI bindings
startCallBtn.onclick = startCall;
endCallBtn.onclick = endCall;
muteBtn.onclick = toggleMute;

// initial state
setButtons({ canStart: true, canEnd: false, canMute: false });
setStatus("Idle (enter 5-digit code)");
