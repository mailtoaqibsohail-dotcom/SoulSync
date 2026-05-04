/**
 * Offline Sync API endpoint — receives queued operations from the PWA
 * when the user comes back online.
 *
 * Client-side: store pending form submissions in IndexedDB / localStorage.
 * On reconnect: POST to /api/sync/queue with an array of operations.
 * Server processes them in order, returns results per operation.
 *
 * This is intentionally simple — no conflict resolution, last-write-wins.
 * For oil & gas field use, this means staff fill forms offline, submit on return.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const documentCtrl = require('../controllers/documentController');

router.post('/queue', requireAuth, async (req, res, next) => {
  const { operations } = req.body;  // array of { type, payload }

  if (!Array.isArray(operations)) {
    return res.status(400).json({ error: 'operations must be an array' });
  }

  const results = [];

  for (const op of operations) {
    try {
      // Simulate a fake res to capture controller output
      let captured;
      const fakeRes = {
        status: () => fakeRes,
        json: (data) => { captured = data; },
        _status: 200
      };

      if (op.type === 'create_document') {
        req.body = op.payload;
        await documentCtrl.create(req, fakeRes, (err) => {
          captured = { error: err?.message || 'unknown error' };
        });
        results.push({ client_ref: op.client_ref, success: !captured?.error, data: captured });
      } else {
        results.push({ client_ref: op.client_ref, success: false, error: `Unknown operation type: ${op.type}` });
      }
    } catch (err) {
      results.push({ client_ref: op.client_ref, success: false, error: err.message });
    }
  }

  res.json({ processed: results.length, results });
});

module.exports = router;
