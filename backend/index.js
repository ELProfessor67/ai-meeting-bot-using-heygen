import express from 'express';
import expressWs from 'express-ws';
import cors from 'cors';
import dotenv from 'dotenv';
import {TranscriptionService} from './services/TranscribtionService.js';
import { ADMINISTRATOR_PROMT, SYSTEM_PROMTP } from './constant/promptConstant.js';
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

        console.log(response.data.data.token)
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


        console.log(response.data.data)
        
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
        isSomeoneSpeaking: false
    };

    const sessesions = new Map();
    const transcriptionService = new TranscriptionService();
    const userChat = [];
    const administratorChat = [];

    

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
                    administratorChat.push({ role: "system", content:  config.administrator});
                    userChat.push({ role: "system", content: SYSTEM_PROMTP(config.prompts) });
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

    transcriptionService.on('transcription', async (transcript_text) => {
        if (!transcript_text) return;
        if(config.isSomeoneSpeaking) return;
        config.isSomeoneSpeaking = true;
        console.log(`user: ${transcript_text}`)
        
        administratorChat.push({ role: "user", content: transcript_text });
        const administratorRes = await promptLLM(administratorChat);
        console.log(administratorRes);
        
        userChat.push({ role: "user", content: administratorRes });
        const response = await promptLLM(userChat);
        userChat.push({ role: "assistant", content: response });
        const parRes = JSON.parse(response);

        let name = parRes.user?.toLowerCase() || "sam";
        let text = parRes.output;
        const session = sessesions.get(name);
        if (!session) {
            console.error('Session not found:', name);
            return;
        }
        const session_id = session.sessionData.session_id;
        const token = session.sessionToken;
        await sendTextToHeyGenServer(session_id,token,text);
        console.log(name,text)

        const current_user_speaking = {
            user: parRes.user,
            event: "current_user_speaking"
        }

        ws.send(JSON.stringify(current_user_speaking));

        config.isSomeoneSpeaking = false;
        
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
