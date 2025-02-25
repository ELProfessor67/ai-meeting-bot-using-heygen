import { Buffer } from 'node:buffer';
import EventEmitter from 'events';
import WebSocket from 'ws';



export class TranscriptionService extends EventEmitter {
  socket;
  isOpen = false;
  speeh_text = []
  constructor(ws, handleIntrupt) {
    super();
    //  this.socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2-phonecall&language=en&smart_format=true&sample_rate=8000&channels=1&multichannel=false&no_delaytrue&interim_results=true&endpointing=3000&utterance_end_ms=1000', [
    //   'token',
    //    process.env.DEEPGRAM_API_KEY,
    // ]);

    this.socket = new WebSocket('wss://api.deepgram.com/v1/listen?model=nova-2-phonecall&language=en&smart_format=true&sample_rate=8000&channels=1&multichannel=false&no_delay=true&endpointing=400&utterance_end_ms=1000&interim_results=true', [
      'token',
      process.env.DEEPGRAM_API_KEY,
    ]);


    this.socket.onopen = () => {
      this.isOpen = true;
      console.log({ event: 'onopen' });
    }

    this.socket.onmessage = async (message) => {
      const received = JSON.parse(message.data)

      if (!received?.channel?.alternatives) return;
      const transcript = received?.channel?.alternatives[0]?.transcript
      if (transcript) this.speeh_text.push(transcript);

      if (
        (transcript?.split(" ")?.length >= 2) ||
        transcript?.toLowerCase().includes("okay") ||
        transcript?.toLowerCase().includes("great")
      ) {
        handleIntrupt();
      }

      if (transcript && received.speech_final) {

        this.emit("transcription", await this.mergeStrings(this.speeh_text));
        this.speeh_text = []
      }
    }

    this.socket.onclose = () => {
      this.isOpen = false;
      console.log({ event: 'onclose' })
    }

    this.socket.onerror = (error) => {
      this.isOpen = false;
      console.log({ event: 'onerror', error: error.message })
    }

  }

  /**
   * Send the payload to Deepgram
   * @param {String} payload A base64 MULAW/8000 audio stream
   */
  send(payload) {
    if (this.isOpen) {
      this.socket.send(Buffer.from(payload, 'base64'));
    }
  }


  async mergeStrings(fragments) {
    let result = "";

    // Iterate through the fragments
    fragments.forEach(fragment => {
      // Remove unnecessary fragments that are already contained in the result
      if (!result.includes(fragment)) {
        let overlapFound = false;

        // Check for the longest overlap and merge
        for (let i = 0; i <= result.length; i++) {
          if (fragment.startsWith(result.slice(i))) {
            result += fragment.slice(result.length - i);
            overlapFound = true;
            break;
          }
        }

        // If no overlap, just append the fragment
        if (!overlapFound) {
          result += fragment;
        }
      }
    });

    return result.trim();
  }


  close() {
    this.socket.close();
  }
}

