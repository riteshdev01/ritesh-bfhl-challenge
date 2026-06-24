const express = require('express');
const cors = require('cors');
const { postBFHL } = require('./controllers/bfhlController');

const app = express();
app.use(cors());
app.use(express.json());

// Gracefully handle malformed JSON bodies (prevent server crash)
app.use((err, req, res, next) => {
	if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
		return res.status(400).json({ error: 'Invalid JSON payload' });
	}
	next(err);
});

app.post('/bfhl', postBFHL);

app.get('/', (req, res) => res.json({ status: 'BFHL API running', route: 'POST /bfhl' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
