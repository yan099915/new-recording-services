// dependencies modules
const fs = require("fs");
const axios = require("axios");
const moment = require("moment");
const { finished } = require("stream");
require("dotenv").config();

// DO NOT CHANGE THIS
let nIntervId;
let recordingDataList;
const { Start, End, Domain, Secret, Interval } = process.env;
const startDate = moment(Start).format("YYYY-MM-DD");
const endDate = moment(End).add(-23, "hours").format("YYYY-MM-DD");
const folderName = startDate + " to " + endDate;

const downwnloadRecordingFiles = async () => {
  console.log("\x1b[33m%s\x1b[0m", `Starting ...`);
  const getInitialDataList = await getRecordingList();
  recordingDataList = getInitialDataList;

  nIntervId = setInterval(async () => {
    if (recordingDataList.data.data && recordingDataList.data.data.length > 0) {
      // last cursor stored here in case the application crash so you can continue from the last cursor
      let data = require("./history.json");
      let index = data.index;
      let recordingDetail = recordingDataList.data.data[index];
      let dataLength = recordingDataList.data.data.length;
      if (recordingDetail.fileKey === undefined) {
        console.log(recordingDetail, "recording detailsnya");
        console.log(recordingDataList, "recording datalistnya");
        console.log(index, "indexnya");
      }
      // downloading every recording files from recording list acquired
      const recordingDownloadUrl = `${Domain}/_o/v2/files/${recordingDetail.fileKey}`;
      const fileName = recordingDetail.fileKey.split("/");

      // download recording files from API
      const details = {
        recordingDownloadUrl,
        fileName,
        data,
        dataLength,
        index,
      };

      const downloadAndSaveRecording = await downloadFile(details);
      if (downloadAndSaveRecording.path) {
        console.log("\x1b[32m%s\x1b[0m", `Downloading Success`);
        console.log(downloadAndSaveRecording.path);
        data.index += 1;
        fs.writeFileSync("history.json", JSON.stringify(data));
      } else {
        console.log("\x1b[32m%s\x1b[0m", `Failed to get file retrying ...`);
      }

      // ============= condition to stop loop =============
      if (index + 1 === dataLength) {
        // create files index at recording files
        fs.writeFileSync(
          "./recording/" + folderName + "/" + data.cursor + ".json",
          JSON.stringify(recordingDataList.data)
        );

        // update cursor at history.json
        data = {
          cursor: recordingDataList.data.nextCursor,
          cursorCount: data.cursorCount + 1,
          files: data.files + recordingDataList.data.data.length,
          index: 0,
        };
        fs.writeFileSync("history.json", JSON.stringify(data));

        // if recording data is less than 1k stop looping
        if (dataLength < 1000) {
          console.log(
            "\x1b[36m%s\x1b[0m",
            `All data has been downloaded run "npm run reset" to reset history.json`
          );
          clearInterval(nIntervId);
        } else {
          //  get recording files list from API
          console.log(
            "\x1b[36m%s\x1b[0m",
            `Getting Recording file list from next cursor ("${recordingDataList.data.nextCursor}")`
          );
          const newRecordingData = await getRecordingList();
          recordingDataList = newRecordingData;
        }
      }
    } else {
      console.log(
        "\x1b[36m%s\x1b[0m",
        `Nothing to download please check start and end date or run "npm run reset"`
      );
      clearInterval(nIntervId);
    }
  }, Interval);
};

const getRecordingList = async () => {
  // last cursor stored here in case the application crash so you can continue from the last cursor
  const data = require("./history.json");

  // get recording list
  const recordingListUrl = `${Domain}/_o/v3/callRecordingEvent/${data.cursor}`;

  // make folder for recording files
  fs.mkdirSync(
    "./recording/" + folderName,
    { recursive: true },
    function (err) {
      if (err) {
        console.log(err);
      }
    }
  );

  // get data recording from API
  const GetRecordingList = await axios
    .get(recordingListUrl, {
      params: {
        secret: Secret,
        start: Start,
        end: End,
      },
    })
    .catch((error) => {
      console.log(error);
    });

  return GetRecordingList;
};

const downloadFile = async (details) => {
  try {
    const downloadFile = await axios.get(details.recordingDownloadUrl, {
      responseType: "stream",
      params: {
        secret: Secret,
      },
    });
    const saveFile = await downloadFile.data.pipe(
      fs
        .createWriteStream(
          "./recording/" +
            folderName +
            "/" +
            details.fileName[details.fileName.length - 1]
        )
        .on("finish", () => {
          return true;
        })
        .on("error", () => {
          return false;
        })
    );
    console.log(
      "\x1b[33m%s\x1b[0m",
      `${details.index + 1}/${details.dataLength} - From cursor [${
        details.data.cursor
      }]`
    );
    console.log(
      "\x1b[32m%s\x1b[0m",
      `Downloading ${details.fileName[details.fileName.length - 1]}`
    );

    return saveFile;
  } catch (error) {
    console.log(error);
  }

  // const downloadFile = await axios
  //       .get(recordingDownloadUrl, {
  //         responseType: "stream",
  //         params: {
  //           secret: Secret,
  //         },
  //       })
  //       .then(async (response) => {
  //         await response.data.pipe(
  //           fs.createWriteStream(
  //             "./recording/" + folderName + "/" + fileName[fileName.length - 1]
  //           )
  //         );
  //         console.log(
  //           "\x1b[33m%s\x1b[0m",
  //           `${index + 1}/${dataLength} - From cursor [${data.cursor}]`
  //         );
  //         console.log(
  //           "\x1b[32m%s\x1b[0m",
  //           `Downloading ${fileName[fileName.length - 1]}`
  //         );
  //         data.index += 1;
  //         fs.writeFileSync("history.json", JSON.stringify(data));
  //       })
  //       .catch((error) => {
  //         console.log(error, "Error Axios");
  //       });
};

downwnloadRecordingFiles();
