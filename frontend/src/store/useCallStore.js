import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";

const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let peer = null;
let localStream = null;
let pendingOffer = null;

export const useCallStore = create((set, get) => ({
  status: "idle", // idle | calling | ringing | connected
  kind: "audio",
  peerId: null,
  localStream: null,
  remoteStream: null,
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
      set({ status: "calling", kind, peerId, localStream, error: "" });
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
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      pendingOffer = null;
      set({ status: "connected", kind, peerId: from, localStream, error: "" });
      send("call:answer", from, { answer });
    } catch {
      get().end();
      set({ error: "Could not accept the call." });
    }
  },

  reject: () => {
    if (pendingOffer) send("call:reject", pendingOffer.from, {});
    pendingOffer = null;
    set({ status: "idle", peerId: null });
  },

  end: (notify = true) => {
    const peerId = get().peerId || pendingOffer?.from;
    if (notify && peerId) send("call:end", peerId, {});
    peer?.close();
    localStream?.getTracks().forEach((track) => track.stop());
    peer = null;
    localStream = null;
    pendingOffer = null;
    set({ status: "idle", peerId: null, localStream: null, remoteStream: null });
  },

  bindSocket: (socket) => {
    if (!socket) return undefined;
    const onOffer = (payload) => {
      if (get().status !== "idle") return;
      pendingOffer = payload;
      set({ status: "ringing", kind: payload.kind || "audio", peerId: payload.from });
    };
    const onAnswer = async ({ answer }) => {
      await peer?.setRemoteDescription(answer);
      set({ status: "connected" });
    };
    const onIce = async ({ candidate }) => { try { await peer?.addIceCandidate(candidate); } catch { /* peer may have ended */ } };
    const onEnd = () => get().end(false);
    const onReject = () => get().end(false);
    socket.on("call:offer", onOffer).on("call:answer", onAnswer).on("call:ice", onIce).on("call:end", onEnd).on("call:reject", onReject);
    return () => socket.off("call:offer", onOffer).off("call:answer", onAnswer).off("call:ice", onIce).off("call:end", onEnd).off("call:reject", onReject);
  },
}));

function send(event, to, payload) {
  useAuthStore.getState().socket?.emit(event, { to, ...payload });
}
