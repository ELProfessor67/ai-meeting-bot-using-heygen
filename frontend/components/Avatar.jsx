'use client'
import React, { useState, useRef, useEffect, useCallback } from "react";
import * as LivekitClient from 'livekit-client'
import { useRouter, useSearchParams } from "next/navigation";

const API_CONFIG = {
    serverUrl: "https://api.heygen.com",
};

const Avatar = ({ videoRefs, name, websocketRef, avatar_id, poster }) => {
 
    const searchParams = useSearchParams();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [sessionInfo, setSessionInfo] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [connected, setConnected] = useState(false);

    const mediaElement = useRef(null);
    const roomRef = useRef(null);
    const webSocket = useRef(null);
    const sessTokenRef = useRef(null);
    const sessionDataRef = useRef(null);
    const isAlreadyRef = useRef(null);
    const diconnectedByMe = useRef(false);

    const sendSessionOnServer = useCallback(async () => {
        const session = {
            event: 'session',
            session: {
                user: name,
                sessionToken: sessTokenRef.current,
                sessionData: sessionDataRef.current,
            }
        }

        websocketRef.current.send(JSON.stringify(session));
    }, [sessTokenRef, sessionDataRef,name, websocketRef]);

    // Fetch session token
    const getSessionToken = async () => {
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}/get-access-token`,
                {
                    method: "POST"
                }
            );
            const data = await response.json();
            setSessionToken(data.token);
            sessTokenRef.current = data.token;
        } catch (error) {
            console.log("Failed to fetch session token");
        }
    };

    // Connect WebSocket
    const connectWebSocket = async (sessionId) => {
        const params = new URLSearchParams({
            session_id: sessionId,
            session_token: sessionToken,
            silence_response: false,
            opening_text: "Hello, how can I help you?",
            stt_language: "en",
        });

        const wsUrl = `wss://${new URL(API_CONFIG.serverUrl).hostname
            }/v1/ws/streaming.chat?${params}`;

        webSocket.current = new WebSocket(wsUrl);

        webSocket.current.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            console.log("WebSocket Event:", eventData);
        };

        webSocket.current.onclose = () => {
            console.log("WebSocket closed");
        };
    };

    // Create new session
    const createNewSession = async () => {
        if (!sessTokenRef.current) {
            await getSessionToken();
        }

        try {
            const response = await fetch(
                `${API_CONFIG.serverUrl}/v1/streaming.new`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessTokenRef.current}`,
                    },
                    body: JSON.stringify({
                        quality: "high",

                        avatar_id: avatar_id,
                        voice: { voice_id: "", rate: 1.4 },
                        version: "v2",
                        video_encoding: "H264",
                    }),
                }
            );


            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message);

            }

            setSessionInfo(data.data);
            sessionDataRef.current = data.data;


            // Create LiveKit Room
            const room = new LivekitClient.Room({
                adaptiveStream: true,
                dynacast: true,
                videoCaptureDefaults: {
                    resolution: LivekitClient.VideoPresets.h720.resolution,
                },
            });

            roomRef.current = room;

            // Handle room events
            room.on(LivekitClient.RoomEvent.DataReceived, (message) => {
                const data = new TextDecoder().decode(message);
                console.log("Room message:", JSON.parse(data));
            });

            // Handle media streams
            let mediaStream = new MediaStream();
            room.on(LivekitClient.RoomEvent.TrackSubscribed, (track) => {
                
                if (track.kind === "video" || track.kind === "audio") {
                    mediaStream.addTrack(track.mediaStreamTrack);
                    if (
                        mediaStream.getVideoTracks().length > 0 &&
                        mediaStream.getAudioTracks().length > 0
                    ) {
                        mediaElement.current.srcObject = mediaStream;
                        setConnected(true)
                        console.log("Media stream ready",mediaStream);
                    }
                }
            });

            // Handle media stream removal
            room.on(LivekitClient.RoomEvent.TrackUnsubscribed, (track) => {
                const mediaTrack = track.mediaStreamTrack;
                if (mediaTrack) {
                    mediaStream.removeTrack(mediaTrack);
                }
            });

            // Handle room connection state changes
            room.on(LivekitClient.RoomEvent.Disconnected, (reason) => {
                setConnected(false)
                console.log(`Room disconnected: ${reason}`);
                if(!diconnectedByMe.current){
                     //reconecction
                    isAlreadyRef.current = false;
                    console.log("I am Calling again...",name);
                    createNewSession();
                }
            });

            room.on(LivekitClient.RoomEvent.Connected, (e) => {
                console.log('Room Connected');
                sendSessionOnServer();
            });

            console.log('data.data.url, data.data.access_token', data.data.url, data.data.access_token)
            await room.prepareConnection(data.data.url, data.data.access_token);

            console.log("Connection prepared");

            setIsSessionActive(true);
            await connectWebSocket(data.data.session_id);
            console.log("Session created successfully");
            startStreamingSession();
        } catch (error) {
            alert(error.message);
            console.log(`Failed to create session ${error.message}`);
        }
    };

    // Start streaming session
    const startStreamingSession = async () => {
        if (!sessionDataRef.current) return;

        try {
            await fetch(`${API_CONFIG.serverUrl}/v1/streaming.start`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessTokenRef.current}`,
                },
                body: JSON.stringify({
                    session_id: sessionDataRef.current.session_id,
                }),
            });

            await roomRef.current.connect(sessionDataRef.current.url, sessionDataRef.current.access_token);
            console.log("Streaming started successfully");
        } catch (error) {
            console.log("Failed to start streaming");
            setConnected(false);

            //reconecction
            isAlreadyRef.current = false;
            console.log("I am Calling again...",name);
            createNewSession();
        }
    };

    // Close session
    const closeSession = async () => {
        if (!sessionDataRef.current) return;
        diconnectedByMe.current = true;

        try {
            await fetch(`${API_CONFIG.serverUrl}/v1/streaming.stop`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessTokenRef.current}`,
                },
                body: JSON.stringify({ session_id: sessionDataRef.current.session_id }),
            });

            webSocket.current?.close();
            roomRef.current?.disconnect();
            mediaElement.current.srcObject = null;

            setSessionInfo(null);
            setIsSessionActive(false);
            console.log("Session closed");
        } catch (error) {
            console.log("Failed to close session");
        }
    };


    useEffect(() => {
        if (!isAlreadyRef.current) {
            isAlreadyRef.current = true;
            console.log(" I am Calling...",name);
            createNewSession();
        }

        return () => {
            closeSession();
        }
    }, []);
    return (
        <div className="w-full h-full relative bg-gray-700 rounded-md">
            <div className={`absolute w-full h-full z-20  bg-black/20 flex items-center justify-center ${connected ? 'hidden' : ''}`}>
                <div className="flex flex-row gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce"></div>
                    <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-4 h-4 rounded-full bg-blue-700 animate-bounce [animation-delay:-.5s]"></div>
                </div>
            </div>
            <video
                ref={(el) => {videoRefs.current[name] = el; mediaElement.current = el}} // Attach ref
                className={`absolute w-full h-full z-10 rounded-md object-contain`}
                poster={poster}
                autoPlay
                
            ></video>
            <div className={`absolute bottom-2 left-2 bg-black text-white text-sm px-2 py-1 rounded z-50 ${!connected ? 'hidden' : ''}`}>
                {name}
            </div>
        </div>
    )
}

export default Avatar