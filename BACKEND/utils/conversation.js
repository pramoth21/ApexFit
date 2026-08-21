// Always produces the same ID no matter which user calls it first,
// by sorting the two user IDs alphabetically before joining them.
const buildConversationId = (userIdA, userIdB) => {
    return [userIdA.toString(), userIdB.toString()].sort().join("_");
};

module.exports = { buildConversationId };