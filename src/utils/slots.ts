export function generateGroupSlots(): { morning: string[], evening: string[] } {
    const morningSlots: string[] = [];
    const eveningSlots: string[] = [];

    // Morning: 6:00 - 12:45 (Last slot starts at 12:00)
    let currentHour = 6;
    let currentMinute = 0;

    while (currentHour < 12 || (currentHour === 12 && currentMinute === 0)) {
        const startTime = formatTime(currentHour, currentMinute);
        const endTime = addMinutes(currentHour, currentMinute, 45);
        morningSlots.push(`${startTime} - ${endTime}`);

        // Increment by 60 mins (1 hour) for simple batching, or 45 mins?
        // User said "segmented into 45-min slots". Let's assume back-to-back or 15 min break.
        // Let's do hourly batches for simplicity as per "6:00-6:45, 7:00-7:45" example.
        currentHour += 1;
    }

    // Evening: 14:30 - 22:15 (Last slot starts at 21:30)
    currentHour = 14;
    currentMinute = 30;

    while (currentHour < 21 || (currentHour === 21 && currentMinute <= 30)) {
        const startTime = formatTime(currentHour, currentMinute);
        const endTime = addMinutes(currentHour, currentMinute, 45);
        eveningSlots.push(`${startTime} - ${endTime}`);

        // Increment by 1 hour
        currentHour += 1;
    }

    return { morning: morningSlots, evening: eveningSlots };
}

export function generateTherapySlots(): string[] {
    // Mock availability for therapy
    return [
        "08:00 AM - 08:45 AM",
        "10:00 AM - 10:45 AM",
        "04:00 PM - 04:45 PM",
        "06:00 PM - 06:45 PM"
    ];
}

function formatTime(hour: number, minute: number): string {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const displayMinute = minute.toString().padStart(2, '0');
    return `${displayHour}:${displayMinute} ${ampm}`;
}

function addMinutes(hour: number, minute: number, minutesToAdd: number): string {
    let totalMinutes = hour * 60 + minute + minutesToAdd;
    const newHour = Math.floor(totalMinutes / 60);
    const newMinute = totalMinutes % 60;
    return formatTime(newHour, newMinute);
}
