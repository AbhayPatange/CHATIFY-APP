import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];
if (import.meta.env.VITE_TURN_URL) {
  ICE_SERVERS.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}
const ICE = { iceServers: ICE_SERVERS };
let peer = null;
let localStream = null;
let pendingOffer = null;
let pendingCandidates = [];

export const useCallStore = create((set, get) => ({
  status: "idle", // idle | calling | ringing | connected
  kind: "audio",
  peerId: null,
  localStream: null,
  remoteStream: null,
  muted: false,
  error: "",

  start: async (peerId, kind) => {
    if (get().status !== "idle") return;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
      peer = new RTCPeerConnection(ICE);
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
      peer.onicecandidate = ({ candidate }) => candidate && send("call:ice", peerId, { candidate });
      peer.ontrack = ({ streams }) => streams[0] && set({ remoteStream: streams[0], status: "connected" });
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      set({ status: "calling", kind, peerId, localStream, muted: false, error: "" });
      send("call:offer", peerId, { offer, kind });
    } catch (error) {
      get().end();
      set({ error: error.name === "NotAllowedError" ? "Camera or microphone permission was denied." : "Could not start the call." });
    }
  },

  accept: async () => {
    if (!pendingOffer) return;
    const { from, offer, kind } = pendingOffer;
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === "video" });
      peer = new RTCPeerConnection(ICE);
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
      peer.onicecandidate = ({ candidate }) => candidate && send("call:ice", from, { candidate });
      peer.ontrack = ({ streams }) => streams[0] && set({ remoteStream: streams[0], status: "connected" });
      await peer.setRemoteDescription(offer);
      for (const candidate of pendingCandidates) await peer.addIceCandidate(candidate);
      pendingCandidates = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      pendingOffer = null;
      set({ status: "connected", kind, peerId: from, localStream, muted: false, error: "" });
      send("call:answer", from, { answer });
    } catch {
      get().end();
      set({ error: "Could not accept the call." });
    }
  },

  reject: () => {
    if (pendingOffer) send("call:reject", pendingOffer.from, {});
    pendingOffer = null;
    set({ status: "idle", peerId: null, muted: false });
  },

  toggleMute: () => {
    const muted = !get().muted;
    localStream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
    set({ muted });
  },

  end: (notify = true) => {
    const peerId = get().peerId || pendingOffer?.from;
    if (notify && peerId) send("call:end", peerId, {});
    peer?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    peer = null;
    localStream = null;
    pendingOffer = null;
    pendingCandidates = [];
    set({ status: "idle", peerId: null, localStream: null, remoteStream: null, muted: false });
  },

  bindSocket: (socket) => {
    if (!socket) return undefined;
    const onOffer = (payload) => {
      if (get().status !== "idle") return;
      pendingOffer = payload;
      set({ status: "ringing", kind: payload.kind || "audio", peerId: payload.from });
    };
    const onAnswer = async ({ answer }) => {
      try {
        await peer?.setRemoteDescription(answer);
        for (const candidate of pendingCandidates) await peer?.addIceCandidate(candidate);
        pendingCandidates = [];
        set({ status: "connected" });
      } catch {
        set({ error: "The call could not establish a secure connection." });
        get().end();
      }
    };
    const onIce = async ({ candidate }) => {
      if (!peer?.remoteDescription) {
        pendingCandidates.push(candidate);
        return;
      }
      try { await peer.addIceCandidate(candidate); } catch { /* peer may have ended */ }
    };
    const onEnd = () => get().end(false);
    const onReject = () => get().end(false);
    socket.on("call:offer", onOffer).on("call:answer", onAnswer).on("call:ice", onIce).on("call:end", onEnd).on("call:reject", onReject);
    return () => socket.off("call:offer", onOffer).off("call:answer", onAnswer).off("call:ice", onIce).off("call:end", onEnd).off("call:reject", onReject);
  },
}));

function send(event, to, payload) {
  useAuthStore.getState().socket?.emit(event, { to, ...payload });
}
