const fs = require("fs");
let data = require("./history.json");
const resetHistory = async () => {
  // resetting history
  try {
    console.log("\x1b[36m%s\x1b[0m", "Reseting history.json ...");
    data = { cursor: "earliest", files: 0, cursorCount: 0, index: 0 };
    fs.writeFileSync("./history.json", JSON.stringify(data));
    console.log("\x1b[36m%s\x1b[0m", "Reset complete ...");
  } catch (error) {
    console.log(error);
  }
};

resetHistory();
