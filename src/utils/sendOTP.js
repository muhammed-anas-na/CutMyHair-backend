import axios from 'axios'

// Replace with your bot token
const BOT_TOKEN = '8049131646:AAGpyrqfls6Vo5iMMABGU80bPZezx0jLz1A';

/**
 * Function to get the Chat ID of a user by their phone number.
 * Note: The user must have started a conversation with the bot.
 */
async function getChatIdByPhoneNumber(phoneNumber) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;

    try {
        const response = await axios.get(url);

        if (response.data.ok && response.data.result.length > 0) {
            // Loop through all updates to find the user with the matching phone number
            for (const update of response.data.result) {
                if (update.message && update.message.from && update.message.from.phone_number === phoneNumber) {
                    // Return the Chat ID
                    return update.message.chat.id;
                }
            }
            console.log(`No user found with phone number: ${phoneNumber}`);
            return null;
        } else {
            console.log('No updates found. Ask the user to send a message to the bot.');
            return null;
        }
    } catch (error) {
        console.error(`Error fetching updates: ${error.message}`);
        return null;
    }
}

/**
 * Function to send an OTP to a user's Telegram account.
 */
async function sendMessage(phoneNumber) {
    // Step 1: Get the Chat ID using the phone number
    const chatId = await getChatIdByPhoneNumber(phoneNumber);

    if (!chatId) {
        console.log(`Could not find Chat ID for phone number: ${phoneNumber}`);
        return;
    }

    // Step 2: Generate a 5-digit OTP
    const otp = Math.floor(10000 + Math.random() * 90000);

    // Step 3: Send the OTP to the user
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
        const response = await axios.post(url, {
            chat_id: chatId,
            text: `Your OTP is: ${otp}`,
        });

        if (response.data.ok) {
            console.log(`OTP sent successfully to ${phoneNumber}`);
            console.log(`Generated OTP: ${otp}`);
        } else {
            console.log(`Failed to send OTP to ${phoneNumber}`);
        }
    } catch (error) {
        console.error(`Error sending OTP: ${error.message}`);
    }
}

export default sendMessage;