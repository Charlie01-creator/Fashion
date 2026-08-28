import express from 'express';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${PORT}`);
});
