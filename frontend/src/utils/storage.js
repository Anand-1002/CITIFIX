
export const getComplaints = () => {
  try {
    const complaints = localStorage.getItem('citifix_complaints');
    return complaints ? JSON.parse(complaints) : [];
  } catch (error) {
    console.error("Failed to parse complaints from localStorage:", error);
    return [];
  }
};

export const saveComplaint = (complaint) => {
  const complaints = getComplaints();
  const newComplaint = {
    ...complaint,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    status: 'open',
    votes: 0,
    votedBy: [],
    tweetPosted: false
  };
  complaints.push(newComplaint);
  localStorage.setItem('citifix_complaints', JSON.stringify(complaints));
  return newComplaint;
};

export const updateComplaint = (id, updates) => {
  const complaints = getComplaints();
  const index = complaints.findIndex(c => c.id === id);
  if (index !== -1) {
    complaints[index] = { ...complaints[index], ...updates };
    localStorage.setItem('citifix_complaints', JSON.stringify(complaints));
    return complaints[index];
  }
  return null;
};

export const voteComplaint = (complaintId, userId) => {
  const complaints = getComplaints();
  const complaint = complaints.find(c => c.id === complaintId);
  
  if (!complaint) return null;
  
  if (complaint.votedBy.includes(userId)) {
    return { error: 'Already voted' };
  }
  
  complaint.votes += 1;
  complaint.votedBy.push(userId);
  
  if (complaint.votes >= 50 && !complaint.tweetPosted) {
    complaint.tweetPosted = true;
    complaint.tweetedAt = new Date().toISOString();
  }
  
  localStorage.setItem('citifix_complaints', JSON.stringify(complaints));
  return complaint;
};

export const getUsers = () => {
  try {
    const users = localStorage.getItem('citifix_users');
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error("Failed to parse users from localStorage:", error);
    return [];
  }
};

export const saveUser = (user) => {
  const users = getUsers();
  const newUser = {
    ...user,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    rewardPoints: 0,
    complaintsSubmitted: 0,
    complaintsResolved: 0
  };
  users.push(newUser);
  localStorage.setItem('citifix_users', JSON.stringify(users));
  return newUser;
};

export const updateUserPoints = (userId, points) => {
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.rewardPoints = (user.rewardPoints || 0) + points;
    user.complaintsResolved = (user.complaintsResolved || 0) + 1;
    localStorage.setItem('citifix_users', JSON.stringify(users));
    return user;
  }
  return null;
};
