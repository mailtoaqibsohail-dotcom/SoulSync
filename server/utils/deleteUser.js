const User = require('../models/User');
const Match = require('../models/Match');
const Message = require('../models/Message');
const Swipe = require('../models/Swipe');
const Report = require('../models/Report');

// Hard-delete a user and cascade to everything that references them. Single
// source of truth shared by the user self-delete flow (routes/auth.js) and the
// admin-initiated delete (routes/admin.js) so the cleanup never drifts.
//
// Removes: their messages, matches, swipes, reports (filed by or against them),
// and pulls their id out of every other user's arrays. Caller is responsible
// for any confirmation/authorization checks.
async function deleteUserCascade(uid) {
  await Promise.all([
    Message.deleteMany({ $or: [{ sender: uid }, { receiver: uid }] }),
    Match.deleteMany({ users: uid }),
    Swipe.deleteMany({ $or: [{ from: uid }, { to: uid }] }),
    Report.deleteMany({ $or: [{ reporter: uid }, { reported: uid }] }),
    // Remove this user from everyone else's arrays.
    User.updateMany(
      {},
      {
        $pull: {
          likedUsers: uid,
          dislikedUsers: uid,
          blockedUsers: uid,
          matches: uid,
          sparksReceived: { from: uid },
        },
      }
    ),
  ]);

  await User.deleteOne({ _id: uid });
}

module.exports = { deleteUserCascade };
