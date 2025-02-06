import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import dotenv from 'dotenv';
import {TranscriptionService} from './services/TranscribtionService.js';
import { SYSTEM_PROMTP } from './constant/promptConstant.js';
import {promptLLM} from './services/promptLLM.js'
import axios from 'axios';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables
const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
    console.error('Missing OpenAI API key. Please set it in the .env file.');
    process.exit(1);
}

// Initialize Express
const app = express();
expressWs(app);

// Use CORS middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

const PORT = process.env.PORT || 5002;

// Root Route
app.get('/', (req, res) => {
    res.send("hello world");
});


app.post('/get-access-token',async (req, res) => {
    const API_KEY = process.env.HEYGEN_API_KEY;
    try {
        //Ask the server for a secure Access Token
        const response = await axios.post('https://api.heygen.com/v1/streaming.create_token', {}, {
            headers: {
                'x-api-key': API_KEY
            }
        });
        res.status(200).json({token: response.data.data.token});
    } catch (error) {
        console.error('Error retrieving access token:', error);
        res.status(500).json({ error: 'Failed to retrieve access token' });
    }
});

const sendTextToHeyGenServer = async (session_id,token,text) => {
    try {
        const response = await axios.post(
            `https://api.heygen.com/v1/streaming.task`,
            {
              session_id: session_id,
              text,
              task_type: 'repeat',
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
        );


    
        
    } catch (error) {
        console.log(error?.response?.data?.message || error?.message)
    }
}

const interruptAvatar = async (session_id,token,name) => {
    try {
        const response = await axios.post(
            `https://api.heygen.com/v1/streaming.interrupt`,
            {
              session_id: session_id,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
        );

        console.log(`${name } interrupt `,response.data.message);
    } catch (error) {
        console.log(error?.response?.data?.message || error?.message)
    }
}

// WebSocket route for media-stream
app.ws('/', (ws, req) => {
    const config = {
        user: {
            name: undefined,
            email: undefined
        },
        selectedBots: [],
        administrator: "",
        prompts: {},
        isSomeoneSpeaking: false,
        currentSpeakingBot: undefined
    };

    const sessesions = new Map();
    const transcriptionService = new TranscriptionService(ws,handleIntrupt);
    const userChat = [];


    

    // Handle incoming messages from Twilio
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);             
            switch (data.event) {

                case 'start':
                    config.user.name = data?.start?.user?.name;
                    config.user.email = data?.start?.user?.email;
                    config.selectedBots = data?.start?.user?.selectedBots;
                    config.administrator= data?.start?.user?.administrator;
                    config.prompts = data?.start?.user?.prompts;

                    const systemPrompt = SYSTEM_PROMTP(config.prompts,config.selectedBots);
                    
                    userChat.push({ role: "system", content: systemPrompt});
                    break;
                case 'media':
                    transcriptionService.send(data.media.payload);
                    break;
                case 'session':
                    const name = data.session.user?.toLowerCase() || "sam";
                    console.log('Session:', name);
                    const sessionData = data.session.sessionData;
                    const sessionToken = data.session.sessionToken;
                    sessesions.set(name, { sessionData, sessionToken });
            }
        } catch (error) {
            console.error('Error parsing message:', error, 'Message:', message);
        }
    });


    function handleIntrupt () {
        if(config.currentSpeakingBot){
            console.log('interupting...',config.currentSpeakingBot);
            const name = config.currentSpeakingBot;
            const session = sessesions.get(name);
            if (session) {
                const session_id = session.sessionData.session_id;
                const token = session.sessionToken;
                Promise.all([interruptAvatar(session_id,token,name)]);
            }
        }
    }

    transcriptionService.on('transcription', async (transcript_text) => {
        if (!transcript_text) return;

        console.log(`user: ${transcript_text}`)

        //bots
        userChat.push({ role: "user", content:  transcript_text});
        const response = await promptLLM(userChat);
        userChat.push({ role: "assistant", content: response });

      
        let parRes;
        try {            
            parRes = JSON.parse(response);
        } catch (error) {
            console.log('error during parsing: ', error.message);
            return;
        }

        //parse renponse
        let name = parRes.user?.toLowerCase() || "sam";       
        let text = parRes.output;
        config.currentSpeakingBot = name;
        
        const session = sessesions.get(name);
        if (!session) {
            console.error('Session not found:', name);
            return;
        }

        const session_id = session.sessionData.session_id;
        const token = session.sessionToken;

        await sendTextToHeyGenServer(session_id,token,text);
        console.log(`${name}: ${text}`);
    });

    // Handle connection close and log transcript
    ws.on('close', async () => {
        console.log('Client disconnected');
        transcriptionService.close();
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
