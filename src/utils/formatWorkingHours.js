const formatWorkingHours = (hours) => {
    const formattedHours = {}; // Initialize an empty object to store the formatted working hours.

    // Loop through each day and its corresponding time string.
    for (const [day, time] of Object.entries(hours)) {
        
        // If the salon is closed on a given day
        if (time.toLowerCase() === 'closed') {
            formattedHours[day] = {
                isOpen: false, // Mark as closed
                start: null,   // No start time
                end: null      // No end time
            };
        } else {
            // Split the time string into start and end times (e.g., "09:00-18:00" -> ["09:00", "18:00"])
            const [start, end] = time.split('-');

            // Store the formatted data for the day
            formattedHours[day] = {
                isOpen: true, // Salon is open that day
                start: new Date(`1970-01-01T${start.trim()}:00Z`), // Convert start time string to a valid Date object
                end: new Date(`1970-01-01T${end.trim()}:00Z`)      // Convert end time string to a valid Date object
            };
        }
    }

    return formattedHours; // Return the complete formatted working hours object
};

export default formatWorkingHours;