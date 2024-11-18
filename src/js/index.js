import { TeslaCamClip } from "./teslacam";
import { checkForUpdates } from "./updater";

const screenSetup = document.querySelector("#setup-screen");
const screenPlayer = document.querySelector("#player-screen");

const startBtn = document.querySelector(".btn-start");
const fileBrowserInput = document.querySelector("input[type=file][id=fileBrowser]");

const sidebarToggleBtns = document.querySelectorAll(".btn-sidebar-toggle");

const sidebar = document.querySelector("#sidebar");
const sidebarOverlay = document.querySelector("#sidebar .overlay");
const clipsList = document.querySelector("#clips-list");

const clipTitleLabel = document.querySelector("#clip-title");

const infoPopup = document.querySelector("#info-popup");
const infoPopupOpenBtn = document.querySelector(".btn-info-popup-open");
const infoPopupCloseBtn = document.querySelector(".btn-info-popup-close");

const playPauseBtn = document.querySelector(".btn-play-pause");
const next = document.querySelector("button.next");
const previous = document.querySelector("button.previous");
const skipBtns = document.querySelectorAll(".btn-skip");
const autoPlayBtn = document.querySelector(".btn-autoplay");

const playbackRateBtns = document.querySelectorAll(".btn-playback-rate");

const videoPlayers = document.querySelectorAll("#video-players video");
const frontVideoPlayer = document.querySelector("#video-players .video-front");
const backVideoPlayer = document.querySelector("#video-players .video-back");
const leftVideoPlayer = document.querySelector("#video-players .video-left");
const rightVideoPlayer = document.querySelector("#video-players .video-right");

let clipFiles = [];
let currentClipIndex = -1;

let playbackRate = 1;
let playbackIsPaused = true;

//
//  DOM UTILS
//

function pageNavigateTo(destinationPage) {
  switch (destinationPage) {
    case "SETUP":
      screenSetup.classList.remove("hidden");
      screenPlayer.classList.add("hidden");
      break;

    case "PLAYER":
      screenSetup.classList.add("hidden");
      screenPlayer.classList.remove("hidden");
      break;

    default:
      screenSetup.classList.add("hidden");
      screenPlayer.classList.add("hidden");
  }
}

function sidebarToggle() {
  sidebar.classList.toggle("open");
}

function sidebarClose() {
  sidebar.classList.remove("open");
}

function infoPopupOpen() {
  infoPopup.classList.add("open");
}

function infoPopupClose() {
  infoPopup.classList.remove("open");
}

//
//  VideoPlayers Utils
//

function handleVideoPlayerClick(evt) {
  console.debug(">>> video - onClick", evt);

  const currentVideoPlayer = evt.currentTarget;
  if (currentVideoPlayer.classList.contains("active")) {
    // video already zoomed - nothing else to do
    return;
  }

  // de-zoom all video elements
  videoPlayers.forEach((videoPlayer) => {
    videoPlayer.classList.remove("active");
  });

  // zoom selected video element
  currentVideoPlayer.classList.add("active");
}

function playVideos() {
  videoPlayers.forEach((videoPlayer) => {
    videoPlayer.play();
    videoPlayer.playbackRate = playbackRate;
  });
}

function setPlaybackRate(evt) {
  console.debug(">> setPlaybackRate", evt);

  const selectedPlaybackRateBtn = evt.currentTarget;

  playbackRate = parseFloat(selectedPlaybackRateBtn.getAttribute("data-rate"));

  playbackRateBtns.forEach((playbackRateBtn) => playbackRateBtn.classList.remove("active"));
  selectedPlaybackRateBtn.classList.add("active");

  videoPlayers.forEach((videoPlayer) => {
    videoPlayer.playbackRate = playbackRate;
  });
}

function skipTo(evt) {
  console.debug(">> skipTo", evt);

  const skipSeconds = parseInt(evt.currentTarget.getAttribute("data-skip"), 10);

  videoPlayers.forEach((videoPlayer) => {
    videoPlayer.currentTime += skipSeconds;
  });
}

function pauseVideos() {
  videoPlayers.forEach((videoPlayer) => {
    videoPlayer.pause();
  });
}

function playPause() {
  if (playbackIsPaused) {
    playVideos();
  } else {
    pauseVideos();
  }

  playbackIsPaused = !playbackIsPaused;

  updatePlayPauseButton();
}

function isAutoPlayActive() {
  return autoPlayBtn.classList.contains("active");
}

function toggleAutoPlay() {
  autoPlayBtn.classList.toggle("active");
}

function updatePlayPauseButton() {
  playPauseBtn.querySelectorAll("svg").forEach((svg) => {
    svg.classList.toggle("hidden");
  });
}

//
//  APP LOGIC
//

function renderClipsList() {
  // group Clips by type to ease rendering
  const clipsByType = clipFiles.reduce((byType, clip, clipIndex) => {
    return {
      ...byType,
      [clip.type]: [...(byType[clip.type] || []), clipIndex],
    };
  }, {});

  console.debug(">>> tcClipsByType", clipsByType);

  Object.keys(clipsByType).forEach((clipType) => {
    let typeSectionDiv = document.createElement("div");

    const typeSectionTitle = document.createElement("h4");
    typeSectionTitle.textContent = clipType;

    typeSectionDiv.appendChild(typeSectionTitle);

    clipsByType[clipType].forEach((clipIndex) => {
      const clip = clipFiles[clipIndex];

      // create and append Clip details as DIV
      const clipDiv = document.createElement("div");
      clipDiv.className = "clip-container";
      clipDiv.setAttribute("data-clip-index", clipIndex);
      clipDiv.onclick = handleClipSelected;

      const clipThumbnail = document.createElement("img");
      clipThumbnail.src = clip.getThumbnailUrl();

      clipDiv.appendChild(clipThumbnail);

      const clipDetailsContainer = document.createElement("div");
      clipDetailsContainer.className = "clip-details-container";

      const clipTimestampLabel = document.createElement("span");
      clipTimestampLabel.textContent = clip.getTimestamp();

      clipDetailsContainer.appendChild(clipTimestampLabel);

      const clipLocationLabel = document.createElement("span");
      clipLocationLabel.textContent = clip.getLocation();

      clipDetailsContainer.appendChild(clipLocationLabel);

      clipDiv.appendChild(clipDetailsContainer);

      typeSectionDiv.appendChild(clipDiv);
    });

    clipsList.appendChild(typeSectionDiv);
  });
}

function loadClip(clipIndex) {
  if (clipIndex < 0 || clipIndex >= clipFiles.length) {
    throw new Error("Invalid clip index selected");
  }

  console.debug(">>> loadClip:", clipFiles[clipIndex]);
  currentClipIndex = clipIndex;

  loadClipVideos();
}

function loadPreviousClip() {
  currentClipIndex = Math.max(0, currentClipIndex - 1);
  loadClip(currentClipIndex);
}

function loadNextClip() {
  currentClipIndex = Math.min(currentClipIndex + 1, clipFiles.length);
  loadClip(currentClipIndex);
}

function loadClipVideos() {
  const currentClip = clipFiles[currentClipIndex];

  clipTitleLabel.textContent = currentClip.getTitle();

  const currentClipVideos = currentClip.getNextVideos();
  if (!currentClipVideos) {
    return false;
  }

  frontVideoPlayer.src = currentClipVideos.front;
  leftVideoPlayer.src = currentClipVideos.left;
  rightVideoPlayer.src = currentClipVideos.right;
  backVideoPlayer.src = currentClipVideos.back;

  return true;
}

//
//  EVENT LISTENERS
//

startBtn.addEventListener("click", function () {
  fileBrowserInput.click();
});

//The following code uses webkitdirectory to get all the videos from a directory
fileBrowserInput.addEventListener("change", async function () {
  // Group files by Folder and SubFolder
  const groupedFiles = {};
  for (const file of fileBrowserInput.files) {
    const filePathSegments = file.webkitRelativePath.split("/");

    const clipType = filePathSegments[1];
    const clipFolderName = filePathSegments[2];

    if (clipType === "RecentClips") {
      groupedFiles[clipType] = [...(groupedFiles[clipType] || []), file];
    } else {
      const clipsGroup = groupedFiles[clipType] || {};

      groupedFiles[clipType] = {
        ...clipsGroup,
        [clipFolderName]: [...(clipsGroup[clipFolderName] || []), file],
      };
    }
  }

  console.debug(">>> groupedFiles", groupedFiles);

  // create TeslaCamClips from files lists
  const tcClips = [];
  for await (const clipType of Object.keys(groupedFiles)) {
    console.log(">>> clipType", clipType);
    console.log(">>> clips", groupedFiles[clipType]);

    if (clipType === "RecentClips") {
      const tcClip = await TeslaCamClip.fromTeslaCamFileList(clipType, groupedFiles[clipType]);
      if (!!tcClip) {
        tcClips.push(tcClip);
      }
    } else {
      for await (const clipFolder of Object.keys(groupedFiles[clipType])) {
        const tcClip = await TeslaCamClip.fromTeslaCamFileList(clipType, groupedFiles[clipType][clipFolder]);
        if (!!tcClip) {
          tcClips.push(tcClip);
        }
      }
    }
  }

  // sort Clips by event date (descending)
  tcClips.sort((a, b) => b.date - a.date);

  console.debug(">>> tcClips", tcClips);

  clipFiles = tcClips;

  loadClip(0);

  renderClipsList();

  pageNavigateTo("PLAYER");
});

sidebarToggleBtns.forEach((sidebarToggleBtn) => {
  sidebarToggleBtn.addEventListener("click", sidebarToggle);
});

sidebarOverlay.addEventListener("click", sidebarClose);

infoPopupOpenBtn.addEventListener("click", infoPopupOpen);

infoPopupCloseBtn.addEventListener("click", infoPopupClose);

playPauseBtn.addEventListener("click", playPause);

skipBtns.forEach((skipBtn) => {
  skipBtn.addEventListener("click", skipTo);
});

previous.addEventListener("click", loadPreviousClip);

next.addEventListener("click", loadNextClip);

autoPlayBtn.addEventListener("click", toggleAutoPlay);

playbackRateBtns.forEach((playbackRateBtn) => {
  playbackRateBtn.addEventListener("click", setPlaybackRate);
});

videoPlayers.forEach((videoPlayer) => {
  videoPlayer.addEventListener("click", handleVideoPlayerClick);
});

frontVideoPlayer.addEventListener("canplaythrough", function (evt) {
  console.debug(">>> frontVideo - onCanPlayThrough", evt, playbackIsPaused);

  if (!playbackIsPaused) {
    playVideos();
  }
});

frontVideoPlayer.addEventListener("ended", function (evt) {
  console.debug(">>> frontVideo - onEnded", evt);

  const hasNext = loadClipVideos();
  // instead of going to next video go to next clip if autoplay is active
  if (!hasNext && isAutoPlayActive()) {
    loadNextClip();
  } else if (!hasNext) {
    playbackIsPaused = true;
  }
});

function handleClipSelected(evt) {
  console.debug(">>> handleClipSelected - evt", evt);

  const selectedClipIndex = parseInt(evt.currentTarget.getAttribute("data-clip-index"), 10);
  console.debug(">>> selectedClipIndex", selectedClipIndex);

  loadClip(selectedClipIndex);

  sidebarClose();
}

checkForUpdates();
