import express from 'express';

process.chdir('..');

const app = express();

app.use(express.static('browser'));

const PORT = +(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
