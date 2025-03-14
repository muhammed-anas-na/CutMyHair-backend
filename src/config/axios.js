// src/utils/axiosConfig.js
import axios from 'axios';
import * as https from 'https'; // For ignoring SSL certificate errors (optional)


const axiosInstance = axios.create({
    withCredentials: true, // Enable cookies and sessions
    httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Ignore SSL certificate errors (optional)
    headers: {
        'Content-Type': 'application/json',
    },
});


export default axiosInstance;