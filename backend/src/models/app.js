const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.url}`, req.body);
  next();
});

// Import routes
const quizRoutes = require('../routes/quiz');
const userProgressRouter = require('../routes/userProgress');

// Mount routes
app.use('/api/quiz', quizRoutes);
app.use('/api/user', userProgressRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;