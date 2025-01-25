"use client"
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, PhoneOff, MoreVertical } from 'lucide-react'
import Avatar from '../components/Avatar';

const page = () => {
    const [isMuted, setIsMuted] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const mediaRecorderRef = useRef(null);
    const websocketRef = useRef(null);
    const router = useRouter();
    const streamRef = useRef(null);
    const searchParams = useSearchParams();
    const name = searchParams.get('name');


    const videoRefs = useRef({
        sam: null,
        zara: null,
        ben: null,
        max: null,
    });



    const toggleMute = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                if (isMuted) {
                    audioTrack.enabled = true;
                    setIsMuted(false);
                } else {
                    audioTrack.enabled = false;
                    setIsMuted(true);
                }
            }
        }
    }, [isMuted])

    const endCall = useCallback(() => {
        websocketRef.current?.close();
        router.push('/');
    }, []);

    const onConnect = useCallback(() => {
        const data = {
            event: 'start',
            start: {
                user: {
                    name,
                }
            }
        }
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify(data));
            setTimeout(() => sendStream(), 4000);
        } else {
            console.error('WebSocket is not ready to send messages.');
        }
        // websocketRef.current.send(JSON.stringify(data));
        // setTimeout(() => sendStream(),4000);
    }, [websocketRef.current])

    useEffect(() => {
        if (websocketRef.current != null) return;
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_BACKEND_BASE_URL}`);

        websocketRef.current = ws;
        ws.onopen = onConnect;
        ws.onmessage = async (message) => {
            const data = JSON.parse(event.data);

            switch (data.event) {
                case 'media':
                    const name = data.user;
                    console.log(name)
                    const base64Audio = data.media.payload;
                    if (videoRefs.current[name]) {
                        videoRefs.current[name].src = base64Audio;
                        videoRefs.current[name].play();
                    }
                    break;
            }
        };

        ws.onclose = () => {
            console.log('close');
        }

        return () => {
            // ws.close();
        };
    }, []);

    const sendStream = async () => {
        console.log('start voice stream')
        setConnecting(false);
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Your browser does not support audio recording.');
            return;
        }

        streamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                echoCancellation: true,
                autoGainControl: true,
                noiseSuppression: true,
                sampleRate: 48000,
            }
        });


        //noice cancelation process
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(streamRef.current);

        // Low-pass filter to remove high-frequency noise
        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = 3000; // Adjust frequency based on noise profile
        source.connect(lowPassFilter);

        // Destination to pass filtered audio to MediaRecorder
        const destination = audioContext.createMediaStreamDestination();
        lowPassFilter.connect(destination);




        mediaRecorderRef.current = new MediaRecorder(destination.stream);
        mediaRecorderRef.current.ondataavailable = async (event) => {

            if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
                const blob = event.data;
                const reader = new FileReader();
                reader.onload = () => {
                    if (reader.readyState == 2) {
                        const data = {
                            event: 'media',
                            media: {
                                payload: reader?.result?.split('base64,')[1]
                            }
                        }
                        websocketRef.current.send(JSON.stringify(data));
                    }
                }
                reader.readAsDataURL(blob);
            }
        };

        mediaRecorderRef.current.start(100);
    };

    return (
        <>
            <div className="flex flex-col h-[100vh] bg-gradient-to-br from-indigo-100 to-purple-100">
                <div className='h-[90%] grid grid-cols-2 gap-2 p-2'>
                    {/* Video 1 */}
                    <Avatar videoRefs={videoRefs} name="Sam" websocketRef={websocketRef} avatar_id="Bryan_FitnessCoach_public"/>

                    {/* Video 2 */}
                    <Avatar videoRefs={videoRefs} name="Zara" websocketRef={websocketRef} avatar_id="Elenora_IT_Sitting_public"/>

                    {/* Video 3 */}
                    <Avatar videoRefs={videoRefs} name="Ben" websocketRef={websocketRef} avatar_id="SilasHR_public"/>

                    {/* Video 4 */}
                    <Avatar videoRefs={videoRefs} name="Max" websocketRef={websocketRef} avatar_id="cc2984a6003a4d5194eb58a4ad570337"/>
                </div>

                {/* Control Bar */}
                <div className="bg-white shadow-lg p-4">
                    <div className="container mx-auto flex justify-center items-center space-x-6">
                        <button
                            onClick={toggleMute}
                            className={`p-4 rounded-full ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
                                } hover:opacity-80 transition-opacity`}
                        >
                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                        </button>
                        <button
                            onClick={endCall}
                            className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}

export default page