const API_BASE_URL = 'http://localhost:3000/api';

// 1. Fetch user progress and country mastery records
export async function loadUserProgress() {
  try {
    // Append a unique timestamp query parameter to force a fresh 200 OK response
    const response = await fetch(`${API_BASE_URL}/user/progress?_t=${Date.now()}`);
    
    if (!response.ok) throw new Error('Failed to fetch user progress');
    
    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.reduce((acc, row) => {
        acc[row.region_id] = row;
        return acc;
      }, {});
    }
    
    return data;
  } catch (error) {
    console.error("Failed to load progress:", error);
    return null;
  }
}

// 2. Send a completed quiz attempt to update the database
export async function saveQuizAttempt(userId, regionId, quality) {
  try {
    const response = await fetch(`${API_BASE_URL}/quiz/attempt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, regionId, quality }),
    });

    if (!response.ok) throw new Error('Failed to save quiz attempt');
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error submitting quiz attempt:", error);
    return null;
  }
}
