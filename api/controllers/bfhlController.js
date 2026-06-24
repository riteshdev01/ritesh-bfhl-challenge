const { processData } = require('../models/graph');

exports.postBFHL = (req, res) => {
  const { data } = req.body;

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: '"data" must be an array of strings.' });
  }

  const result = processData(data);
  res.json(result);
};
