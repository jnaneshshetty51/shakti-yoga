const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

export async function createDailyRoom(name: string) {
    if (!DAILY_API_KEY) {
        throw new Error('DAILY_API_KEY not configured');
    }

    const response = await fetch(`${DAILY_API_URL}/rooms`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
            name: `yoga-${Date.now()}`,
            properties: {
                enable_screenshare: true,
                enable_chat: true,
                start_video_off: false,
                start_audio_off: false,
                max_participants: 50,
                enable_network_ui: true,
                enable_noise_cancellation: true,
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Daily room: ${error}`);
    }

    return response.json();
}

export async function createDailyToken(roomName: string, options: {
    user_name: string;
    is_owner: boolean;
}) {
    if (!DAILY_API_KEY) {
        throw new Error('DAILY_API_KEY not configured');
    }

    const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
            properties: {
                room_name: roomName,
                user_name: options.user_name,
                is_owner: options.is_owner,
                enable_screenshare: options.is_owner,
                enable_recording: options.is_owner ? 'cloud' : 'off',
            }
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create Daily token: ${error}`);
    }

    const data = await response.json();
    return data.token;
}

export async function deleteDailyRoom(roomName: string) {
    if (!DAILY_API_KEY) {
        throw new Error('DAILY_API_KEY not configured');
    }

    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to delete Daily room: ${error}`);
    }

    return response.json();
}
